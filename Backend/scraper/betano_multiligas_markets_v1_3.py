#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import argparse, json, re, sys, time, csv
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, UTC
from typing import Dict, List, Optional, Tuple

import pandas as pd
from seleniumbase import SB

ODD_MIN, ODD_MAX = 1.01, 100.0
TIT_1X2 = ["Resultado Final","1x2","Resultado 1X2","Resultado","Match Result","Full Time Result"]
TIT_DC  = ["Chance Dupla","Dupla Chance","Double Chance"]
TIT_OU  = ["Total de Gols","Total de Gols Mais/Menos","Mais/Menos","Total Goals","Over/Under"]

@dataclass
class LinhaMercado:
    data_extracao: str
    campeonato: str
    partida: str
    casa: str
    fora: str
    data_hora: str
    mercado: str
    selecao: str
    linha: str
    odd: Optional[float]
    url_evento: str
    url_liga: str

def _norm(s:str)->str:
    return re.sub(r"\s+"," ",(s or "").strip())

def _to_float(s:str)->Optional[float]:
    try:
        return float(s.replace(",",".").strip())
    except:
        return None

def _in_odd_range(v:Optional[float])->bool:
    return v is not None and ODD_MIN <= v <= ODD_MAX

def _split_teams(title:str)->Tuple[str,str,str]:
    t=_norm(title)
    for sep in [" - "," x "," X "," – "," vs "," VS "]:
        if sep in t:
            a,b=t.split(sep,1)
            return f"{a} x {b}",a.strip(),b.strip()
    return t,"",""

def _iso_now()->str:
    return datetime.now(UTC).isoformat()

def _safe_open(sb, url:str, tries:int=2)->bool:
    for _ in range(tries):
        try:
            sb.open(url)
            sb.wait_for_ready_state_complete()
            return True
        except Exception:
            time.sleep(0.8)
    return False

def _smart_scroll(sb, max_steps:int=10, pause:float=0.4):
    last1 = last2 = 0
    for _ in range(max_steps):
        try:
            sb.scroll_to_bottom()
            time.sleep(pause)
            cur = sb.execute_script("return document.body.scrollHeight||0") or 0
            if cur in (last1, last2):
                break
            last2, last1 = last1, cur
        except Exception:
            break

class BetanoScraper:
    def __init__(self, headless:bool, janela_horas:int, dump:bool):
        self.headless=headless
        self.janela_horas=janela_horas
        self.dump=dump

    def run(self, liga_urls: List[str], limite_eventos:int)->pd.DataFrame:
        with SB(uc=True, headed=not self.headless, locale_code="pt-BR",
                ad_block_on=True, incognito=True, do_not_track=True,
                disable_csp=True, pls="none") as sb:
            try:
                if getattr(sb,"driver",None):
                    sb.driver.set_page_load_timeout(20)
                sb.set_window_size(1400,900)
                sb.activate_cdp_mode()
                sb.execute_cdp_cmd("Network.enable", {})
                sb.execute_cdp_cmd("Network.setBlockedURLs", {
                    "urls": ["*.png","*.jpg","*.jpeg","*.gif","*.webp","*.svg",
                             "*.woff","*.woff2","*.ttf","*.otf","*.mp4","*.webm"]
                })
                sb.driver.execute_cdp_cmd("Network.setUserAgentOverride", {
                    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                 "AppleWebKit/537.36 (KHTML, like Gecko) "
                                 "Chrome/141.0.0.0 Safari/537.36",
                    "acceptLanguage": "pt-BR,pt;q=0.9"
                })
                sb.driver.execute_cdp_cmd("Browser.grantPermissions", {
                    "origin": "https://www.betano.bet.br",
                    "permissions": ["geolocation"]
                })
                sb.driver.execute_cdp_cmd("Emulation.setGeolocationOverride", {
                    "latitude": -23.55, "longitude": -46.63, "accuracy": 100
                })
            except Exception:
                pass

            now_utc = datetime.now(UTC)
            cutoff = now_utc + timedelta(hours=self.janela_horas)
            regs: List[LinhaMercado] = []

            for liga_url in liga_urls:
                try:
                    _safe_open(sb, liga_url)
                    time.sleep(1.0)
                    self._dismiss(sb); self._cookies(sb); _smart_scroll(sb)
                    links, meta = self._league_events_jsonld(sb)

                    eventos=[]
                    for href in links:
                        start_iso = meta.get(href,{}).get("startDate","")
                        try:
                            dt = datetime.fromisoformat(start_iso.replace("Z","+00:00"))
                        except Exception:
                            dt=None
                        if dt and now_utc <= dt <= cutoff:
                            eventos.append(href)

                    if self.dump:
                        print(f"[liga] {liga_url} -> {len(eventos)} eventos válidos")

                    for href in eventos[:limite_eventos] if limite_eventos>0 else eventos:
                        try:
                            casa = meta.get(href,{}).get("homeTeam","")
                            fora = meta.get(href,{}).get("awayTeam","")
                            partida = f"{casa} x {fora}" if (casa or fora) else ""
                            data_hora = meta.get(href,{}).get("startDate","")
                            campeonato = meta.get(href,{}).get("league","")

                            _safe_open(sb, href)
                            time.sleep(0.8)
                            self._dismiss(sb); self._cookies(sb)
                            self._inject_capture(sb)

                            titulo = self._first_text(sb, ["//h1","//h2","//*[@data-event-title]"])
                            if titulo and (not casa or not fora):
                                p2,c2,f2=_split_teams(titulo)
                                partida = partida or p2
                                casa=casa or c2
                                fora=fora or f2

                            extracao=_iso_now()

                            oc,oe,ofor = self._extract_1x2(sb)
                            regs += self._linhas(extracao,campeonato,partida,casa,fora,data_hora,
                                                 "1X2",[("1",None,oc),("X",None,oe),("2",None,ofor)],href,liga_url)

                            dc = self._extract_dc(sb)
                            if any(_in_odd_range(v) for v in dc.values()):
                                regs += self._linhas(extracao,campeonato,partida,casa,fora,data_hora,
                                                     "Dupla Chance",[("1X",None,dc.get("1X")),("12",None,dc.get("12")),("X2",None,dc.get("X2"))],
                                                     href,liga_url)

                            for linha,(ov,un) in self._extract_totais(sb):
                                regs += self._linhas(extracao,campeonato,partida,casa,fora,data_hora,
                                                     "Total de Gols",[("Over",linha,ov),("Under",linha,un)],href,liga_url)
                        except Exception as e:
                            if self.dump:
                                print(f"[evento erro] {href}: {e}")
                            continue
                except Exception as e:
                    if self.dump:
                        print(f"[liga erro] {liga_url}: {e}")
                    continue

            cols=["data_extracao","campeonato","partida","casa","fora","data_hora",
                  "mercado","selecao","linha","odd","url_evento","url_liga"]
            df=pd.DataFrame([asdict(r) for r in regs], columns=cols)
            df["odd"]=pd.to_numeric(df["odd"],errors="coerce")
            return df

    def _league_events_jsonld(self, sb:SB)->Tuple[List[str], Dict[str,Dict[str,str]]]:
        links:set[str]=set()
        meta:Dict[str,Dict[str,str]]={}
        try:
            scripts=sb.find_elements("css selector","script[type='application/ld+json']")
            for sc in scripts:
                raw=sc.get_attribute("innerText") or sc.get_attribute("textContent") or ""
                if not raw.strip():
                    continue
                try:
                    data=json.loads(raw.strip())
                except Exception:
                    continue
                items = data if isinstance(data,list) else [data]
                for it in items:
                    if isinstance(it,dict) and it.get("@type")=="SportsEvent":
                        url=it.get("url") or ""
                        if "/odds/" in url:
                            links.add(url)
                            meta[url]={
                                "homeTeam": (it.get("homeTeam") or {}).get("name","") if isinstance(it.get("homeTeam"),dict) else (it.get("homeTeam") or ""),
                                "awayTeam": (it.get("awayTeam") or {}).get("name","") if isinstance(it.get("awayTeam"),dict) else (it.get("awayTeam") or ""),
                                "startDate": it.get("startDate",""),
                                "league": (it.get("location") or {}).get("name","") if isinstance(it.get("location"),dict) else "Liga"
                            }
        except Exception:
            pass
        return list(dict.fromkeys(links)), meta

    def _inject_capture(self, sb:SB):
        try:
            sb.execute_script("""
            (function(){
              if (window._BISS) return;
              window._BISS = { dumps: [] };
              const push = (u,b)=>{try{_BISS.dumps.push({url:u,body:b});}catch(e){}};
              const _fetch = window.fetch;
              window.fetch = async function(u,opt){
                const r = await _fetch(u,opt);
                try{const c=r.clone();c.text().then(t=>push(u,t));}catch(e){}
                return r;
              };
              const _open=XMLHttpRequest.prototype.open;
              const _send=XMLHttpRequest.prototype.send;
              XMLHttpRequest.prototype.open=function(m,u){this._url=u;return _open.apply(this,arguments);};
              XMLHttpRequest.prototype.send=function(){
                this.addEventListener('load',()=>{try{push(this._url,this.responseText);}catch(e){}});
                return _send.apply(this,arguments);
              };
            })();
            """)
        except Exception:
            pass

    def _extract_1x2(self, sb:SB)->Tuple[Optional[float],Optional[float],Optional[float]]:
        region=self._find_region(sb,TIT_1X2)
        got={"1":None,"X":None,"2":None}
        items=[]
        if region is not None:
            try:
                items=region.find_elements("xpath",".//button|.//*[@role='button']|.//a|.//*[@data-testid][contains(@data-testid,'selection')]")
            except Exception:
                items=[]
        if not items:
            try:
                items=sb.find_elements("xpath","//button|//*[@role='button']|//a|//*[@data-testid][contains(@data-testid,'selection')]")
            except Exception:
                items=[]
        for it in items[:150]:
            txt=_norm(it.text)
            lab=self._lab_1x2(txt)
            price=self._last_price(txt)
            if lab and _in_odd_range(price) and got[lab] is None:
                got[lab]=price
        return got["1"],got["X"],got["2"]

    def _extract_dc(self, sb:SB)->Dict[str,Optional[float]]:
        out={"1X":None,"12":None,"X2":None}
        region=self._find_region(sb,TIT_DC)
        items=[]
        if region is not None:
            try:
                items=region.find_elements("xpath",".//button|.//*[@role='button']|.//a|.//*[@data-testid][contains(@data-testid,'selection')]")
            except Exception:
                items=[]
        if not items:
            try:
                items=sb.find_elements("xpath","//button|//*[@role='button']|//a|//*[@data-testid][contains(@data-testid,'selection')]")
            except Exception:
                items=[]
        for it in items[:150]:
            txt=_norm(it.text)
            lab=self._lab_dc(txt)
            price=self._last_price(txt)
            if lab and _in_odd_range(price) and out[lab] is None:
                out[lab]=price
        return out

    def _extract_totais(self, sb:SB)->List[Tuple[str,Tuple[Optional[float],Optional[float]]]]:
        res=[]
        region=self._find_region(sb,TIT_OU)
        containers=[region] if region is not None else []
        if not containers:
            try:
                containers=[sb.driver]
            except Exception:
                containers=[]
        for cont in containers:
            try:
                rows=cont.find_elements("xpath",".//div|.//section|.//li")
            except Exception:
                rows=[]
            for r in rows[:250]:
                try:
                    txt=_norm(r.text)
                except Exception:
                    continue
                linha=self._first_line_total(txt)
                if not linha:
                    continue
                over=under=None
                try:
                    btns=r.find_elements("xpath",".//button|.//*[@role='button']|.//a")
                except Exception:
                    btns=[]
                for b in btns[:16]:
                    btxt=_norm(b.text)
                    p=self._last_price(btxt)
                    if not _in_odd_range(p):
                        continue
                    if re.search(r"\b(over|mais|over\s*de|mais\s*de)\b",btxt,re.I):
                        over = over or p
                    elif re.search(r"\b(under|menos|under\s*de|menos\s*de)\b",btxt,re.I):
                        under = under or p
                if (over is not None) and (under is not None):
                    res.append((linha,(over,under)))
        seen=set()
        uniq=[]
        for ln,pair in res:
            key=(ln,pair[0],pair[1])
            if key in seen:
                continue
            seen.add(key)
            uniq.append((ln,pair))
        return uniq

    def _find_region(self, sb:SB, titles:List[str]):
        for t in titles:
            t_low = t.lower()
            xp = (
                f"//section[.//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÂÃÀÉÊÍÓÔÕÚÇ', "
                f"'abcdefghijklmnopqrstuvwxyzáâãàéêíóôõúç'), '{t_low}')]]"
                f"|//div[@role='region'][.//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÂÃÀÉÊÍÓÔÕÚÇ', "
                f"'abcdefghijklmnopqrstuvwxyzáâãàéêíóôõúç'), '{t_low}')]]"
                f"|//div[.//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÂÃÀÉÊÍÓÔÕÚÇ', "
                f"'abcdefghijklmnopqrstuvwxyzáâãàéêíóôõúç'), '{t_low}')]]"
            )
            try:
                if sb.is_element_visible(xp, timeout=0.8):
                    return sb.find_element(xp)
            except Exception:
                pass
        return None

    def _lab_1x2(self,text:str)->Optional[str]:
        if re.search(r"(^|\s)1(\s|$)",text):
            return "1"
        if re.search(r"(^|\s)X(\s|$)",text,re.I) or re.search(r"\bempate\b",text,re.I):
            return "X"
        if re.search(r"(^|\s)2(\s|$)",text):
            return "2"
        return None

    def _lab_dc(self,text:str)->Optional[str]:
        for lab in ["1X","12","X2","1x","x2"]:
            if re.search(rf"(^|\s){lab}(\s|$)",text,re.I):
                return lab.upper()
        if re.search(r"(casa\s+ou\s+empate|home\s+or\s+draw)",text,re.I):
            return "1X"
        if re.search(r"(casa\s+ou\s+fora|home\s+or\s+away)",text,re.I):
            return "12"
        if re.search(r"(empate\s+ou\s+fora|draw\s+or\s+away)",text,re.I):
            return "X2"
        return None

    def _last_price(self,text:str)->Optional[float]:
        found=re.findall(r"\b(\d{1,2}(?:[.,]\d{1,2})?)\b",text)
        for raw in reversed(found):
            v=_to_float(raw)
            if _in_odd_range(v):
                return v
        return None

    def _first_line_total(self, text:str) -> Optional[str]:
        cand = re.findall(r"(?:over|under|mais|menos|total|gols?).{0,20}?(\d+(?:[.,]\d)?)", text, re.I)
        if not cand:
            return None
        def ok(x:str)->bool:
            try:
                v=float(x.replace(",",".")) 
                return 0.5 <= v <= 7.5 and abs(v*2 - round(v*2)) < 1e-9
            except:
                return False
        for c in cand:
            if ok(c):
                return c.replace(",", ".")
        return None

    def _linhas(self,data_extracao,campeonato,partida,casa,fora,data_hora,
                mercado,triplets,url_evento,url_liga)->List[LinhaMercado]:
        out=[]
        for selecao,linha,odd in triplets:
            if odd is None:
                continue
            out.append(LinhaMercado(
                data_extracao=_iso_now(),
                campeonato=_norm(campeonato),
                partida=_norm(partida),
                casa=_norm(casa),
                fora=_norm(fora),
                data_hora=_norm(data_hora),
                mercado=mercado,
                selecao=selecao,
                linha=str(linha or ""),
                odd=float(odd),
                url_evento=url_evento,
                url_liga=url_liga
            ))
        return out

    def _first_text(self, sb:SB, xpaths:List[str])->str:
        for xp in xpaths:
            try:
                if sb.is_element_visible(xp, timeout=0.6):
                    txt = _norm(sb.get_text(xp))
                    if txt:
                        return txt
            except Exception:
                continue
        return ""

    def _cookies(self,sb:SB):
        xps = [
            "//button[contains(.,'Aceitar') or contains(.,'Concordo') or contains(.,'Accept') or contains(.,'Agree')]",
            "//button[@aria-label and (contains(@aria-label,'Aceitar') or contains(@aria-label,'Accept'))]"
        ]
        for xp in xps:
            try:
                if sb.is_element_visible(xp, timeout=1.0):
                    sb.click(xp); time.sleep(0.2); break
            except Exception:
                pass

    def _dismiss(self,sb:SB):
        try:
            sb.send_keys("body","\u001B")
        except Exception:
            pass
        closers = [
            "//button[contains(.,'Fechar') or contains(.,'Close')]",
            "//*[@data-testid and contains(@data-testid,'close')]",
            "//button[contains(.,'Agora não') or contains(.,'Agora nao') or contains(.,'Not now')]"
        ]
        for xp in closers:
            try:
                if sb.is_element_visible(xp, timeout=0.8):
                    sb.click(xp); time.sleep(0.2)
            except Exception:
                pass

    def _scroll(self,sb:SB,steps=8,pause=0.7):
        last=0
        for _ in range(steps):
            try:
                sb.scroll_to_bottom(); time.sleep(pause)
                cur=sb.execute_script("return document.body.scrollHeight")
                if cur==last:
                    break
                last=cur
            except Exception:
                break

def _read_ligas_csv(path:str)->List[str]:
    urls=[]
    with open(path,"r",encoding="utf-8") as f:
        for row in csv.DictReader(f):
            u=_norm(row.get("url_liga",""))
            if u:
                urls.append(u)
    return list(dict.fromkeys(urls))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--headless",type=int,default=1)
    ap.add_argument("--janela_horas",type=int,default=24)
    ap.add_argument("--ligas_csv",type=str,required=True, help="CSV com coluna url_liga")
    ap.add_argument("--ligas_extras",type=str,default="", help="URLs separadas por vírgula")
    ap.add_argument("--limite_eventos",type=int,default=0)
    ap.add_argument("--saida",type=str,default="odds_betano_multiligas.csv")
    ap.add_argument("--dump",type=int,default=0)
    args=ap.parse_args()

    liga_urls=_read_ligas_csv(args.ligas_csv)
    extra=[_norm(u) for u in args.ligas_extras.split(",") if _norm(u)]
    liga_urls = list(dict.fromkeys(liga_urls + extra))
    if not liga_urls:
        print("[erro] Nenhuma liga no CSV/args. Informe --ligas_csv com url_liga.")
        return 2

    scraper=BetanoScraper(headless=bool(args.headless), janela_horas=args.janela_horas, dump=bool(args.dump))
    df=scraper.run(liga_urls, limite_eventos=args.limite_eventos)
    print(df.head(30))
    if args.saida:
        df.to_csv(args.saida,index=False,encoding="utf-8")
        print(f"CSV salvo em: {args.saida} ({len(df)} linhas)")

if __name__=="__main__":
    sys.exit(main())
