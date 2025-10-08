#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Descobridor de Ligas Betano (Futebol)
- Visita a raiz de futebol (PT e EN), coleta países e entra em cada país
- Extrai todas as ligas (nome + URL com ID)
- Exporta CSV: pais, liga, url_liga
Requer: seleniumbase, pandas
"""

from __future__ import annotations
import argparse, re, sys, time
from dataclasses import dataclass, asdict
from typing import List, Dict, Tuple, Optional
import pandas as pd
from seleniumbase import SB

# padrões para reconhecer URL de liga (termina com ID numérico)
PAT_LEAGUE = re.compile(r"/sport/(futebol|soccer)/.+/\d+/?$")
# raiz PT/EN
ROOTS = [
    "https://www.betano.bet.br/sport/futebol/",
    "https://www.betano.bet.br/en/sport/soccer/",
]

@dataclass
class LigaRow:
    pais: str
    liga: str
    url_liga: str

def _norm(s:str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

def _slug_to_name(slug: str) -> str:
    # heurística simples p/ mostrar país legível a partir do slug
    s = slug.replace("-", " ").strip()
    s = s.title()
    # ajustes comuns
    s = s.replace("Eua", "Estados Unidos")
    s = s.replace("Uae", "Emirados Árabes Unidos")
    s = s.replace("Ng", "Nigéria")
    return s

def _collect_country_links(sb: SB, dump: bool=False, max_paises: int=0) -> List[Tuple[str, str]]:
    """
    Retorna lista [(pais_nome, url_pais), ...]
    A partir da raiz (PT/EN), tenta achar todos os países exibidos na lista de futebol.
    """
    encontrados = []
    # Em muitas regiões, os países aparecem como cards/links dentro de anchors
    # Tentamos várias estratégias (XPath) + scroll.
    try:
        for _ in range(10):
            sb.scroll_to_bottom()
            time.sleep(0.5)
    except Exception:
        pass

    # candidatos: todos <a> que apontem para um país de futebol
    try:
        links = sb.find_elements("xpath", "//a[@href]")
    except Exception:
        links = []

    for a in links:
        try:
            href = a.get_attribute("href") or ""
            if not href:
                continue
            if not ("/sport/futebol/" in href or "/en/sport/soccer/" in href):
                continue
            # deve terminar com /pais/ (não com /ID/)
            if PAT_LEAGUE.search(href):
                continue
            # heurística: país é o terceiro segmento após /sport/futebol/ ou /en/sport/soccer/
            # ex: /sport/futebol/brasil/
            m = re.search(r"/sport/(futebol|soccer)/([^/]+)/?$", href)
            if not m:
                continue
            slug = m.group(2)
            pais_nome = _slug_to_name(slug)
            encontrados.append((pais_nome, href.split("?")[0]))
        except Exception:
            continue

    # dedup por URL
    uniq = list(dict.fromkeys(encontrados))
    if dump:
        print(f"[discover] países candidatos: {len(uniq)}")
    if max_paises and len(uniq) > max_paises:
        uniq = uniq[:max_paises]
    return uniq

def _collect_leagues_from_country(sb: SB, pais_nome: str, pais_url: str, dump: bool=False) -> List[LigaRow]:
    """
    Abre a página do país e coleta anchors que batem com padrão de LIGA (com ID no final).
    Usa texto do anchor como nome da liga. Se vazio, tenta fallback em atributos ou no pathname.
    """
    rows: List[LigaRow] = []
    sb.open(pais_url)
    sb.wait_for_ready_state_complete()
    time.sleep(0.8)
    _accept(sb)
    _dismiss(sb)

    # scroll para carregar listas longas
    for _ in range(12):
        try:
            sb.scroll_to_bottom()
            time.sleep(0.4)
        except Exception:
            break

    try:
        anchors = sb.find_elements("xpath", "//a[@href]")
    except Exception:
        anchors = []

    seen = set()
    for a in anchors:
        try:
            href = (a.get_attribute("href") or "").split("?")[0]
            if not href or not PAT_LEAGUE.search(href):
                continue
            if href in seen:
                continue

            # nome da liga pelo texto do link; fallback no title/aria-label
            liga_txt = _norm(a.text)
            if not liga_txt:
                liga_txt = _norm(a.get_attribute("title") or a.get_attribute("aria-label") or "")
            if not liga_txt:
                # como último recurso, pega penúltimo segmento da URL
                parts = [p for p in href.strip("/").split("/") if p]
                if len(parts) >= 2:
                    liga_txt = _norm(parts[-2].replace("-", " ").title())
                else:
                    liga_txt = "Liga"

            rows.append(LigaRow(pais_nome, liga_txt, href))
            seen.add(href)
        except Exception:
            continue

    # dedup (às vezes a mesma liga aparece repetida)
    uniq = list({r.url_liga: r for r in rows}.values())
    if dump:
        print(f"[{pais_nome}] ligas encontradas: {len(uniq)}")
    return uniq

def _accept(sb: SB):
    # banner de cookies (PT/EN)
    xps = [
        "//button[contains(.,'Aceitar') or contains(.,'Concordo') or contains(.,'Accept') or contains(.,'Agree')]",
        "//button[@aria-label and (contains(@aria-label,'Aceitar') or contains(@aria-label,'Accept'))]"
    ]
    for xp in xps:
        try:
            if sb.is_element_visible(xp, timeout=1.2):
                sb.click(xp); time.sleep(0.2); break
        except Exception:
            pass

def _dismiss(sb: SB):
    try: sb.send_keys("body","\u001B")
    except Exception: pass
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

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--headless", type=int, default=1)
    ap.add_argument("--saida", type=str, default="ligas_auto.csv")
    ap.add_argument("--max_paises", type=int, default=0, help="0 = sem limite")
    ap.add_argument("--dump", type=int, default=0)
    args = ap.parse_args()

    all_rows: List[LigaRow] = []

    with SB(uc=True, headed=not args.headless, locale_code="pt-BR",
            ad_block_on=True, incognito=True, do_not_track=True,
            disable_csp=True, pls="none") as sb:

        # Tenta PT e EN para maximizar cobertura
        paises_total: List[Tuple[str, str]] = []
        for root in ROOTS:
            try:
                sb.open(root)
                sb.wait_for_ready_state_complete()
                time.sleep(1.2)
                _accept(sb)
                _dismiss(sb)
                paises = _collect_country_links(sb, dump=bool(args.dump), max_paises=args.max_paises)
                if args.dump:
                    for p in paises:
                        print(f"  - {p[0]} -> {p[1]}")
                paises_total.extend(paises)
            except Exception:
                continue

        # dedup por URL de país
        paises_total = list(dict.fromkeys(paises_total))
        if args.dump:
            print(f"[paises] únicos: {len(paises_total)}")

        # Coleta ligas por país
        for pais_nome, pais_url in paises_total:
            try:
                rows = _collect_leagues_from_country(sb, pais_nome, pais_url, dump=bool(args.dump))
                all_rows.extend(rows)
            except Exception:
                if args.dump:
                    print(f"[warn] falha ao ler {pais_nome}: {pais_url}")
                continue

    # Dedup por URL de liga
    dedup: Dict[str, LigaRow] = {}
    for r in all_rows:
        dedup[r.url_liga] = r
    final_rows = list(dedup.values())

    df = pd.DataFrame([asdict(r) for r in final_rows], columns=["pais","liga","url_liga"])
    if args.saida:
        df.to_csv(args.saida, index=False, encoding="utf-8")
        print(f"CSV salvo em: {args.saida} ({len(df)} ligas)")

    # Mostra amostra
    print(df.head(20))

if __name__ == "__main__":
    sys.exit(main())
