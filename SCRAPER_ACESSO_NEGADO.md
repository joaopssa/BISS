# 🚨 Problema: "Acesso negado" no Scraper Betano

## ❌ O Problema

Ao executar o scraper, você recebe:
```
[scraper] Running FULL scrape (only)...
Acesso negado.
```

Isso significa que o site Betano está **bloqueando as requisições** do scraper (comum em sites de apostas com proteção anti-bot).

---

## ✅ Possíveis Soluções

### Solução 1: Adicionar Delay Maior Entre Requisições

O scraper está acessando o site muito rápido. Aumentar o delay pode ajudar:

Edite `Backend/scraper/betano_multiligas_markets_v1_3.py` e procure por:
```python
time.sleep(0.8)  # Linha ~145
time.sleep(1.0)  # Linha ~135
```

Aumente para valores maiores (ex: 2-3 segundos):
```python
time.sleep(3.0)  # Mais espera entre requisições
```

---

### Solução 2: Desabilitar Headless e Verificar Manualmente

Para debug, você pode rodar com a janela do navegador aberta:

```bash
cd Backend
python scraper/betano_multiligas_markets_v1_3.py \
  --headless 0 \
  --ligas_csv scraper/ligas_auto.csv \
  --saida test_odds.csv \
  --dump 1
```

Isso abrirá um navegador Chrome onde você pode ver o que está acontecendo em tempo real.

---

### Solução 3: Rotacionar User-Agent

O código já tenta user-agent do Chrome, mas pode precisar variar. Procure por:
```python
"userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
```

---

### Solução 4: Usar Proxy (se necessário)

Se o IP está bloqueado, você pode precisar usar um proxy. Isso é mais avançado e pode ser adicionado depois se necessário.

---

### Solução 5: Verificar se Geolocalização está Bloqueada

O site pode estar bloqueando por geolocalização. O código já tenta emular localização do Brasil:
```python
"latitude": -23.55, "longitude": -46.63  # São Paulo
```

Mas pode ser que o Betano requeira uma conexão REAL do Brasil.

---

## 🔍 Como Testar Manualmente

1. **Abra um navegador normalmente** e acesse:
   ```
   https://www.betano.bet.br/sport/futebol/brasil/brasileirao-serie-a-betano/10016/
   ```

2. **Se conseguir acessar:** o problema é específico do scraper (acesso muito rápido/robótico)

3. **Se NÃO conseguir:** o seu IP pode estar bloqueado no site

---

## 📋 Próximos Passos Recomendados

1. **Teste manual a URL** com seu navegador
2. **Se funcionar:** coloque delays maiores no scraper (Solução 1)
3. **Se não funcionar:** pode ser bloqueio de IP/geolocalização
4. **Se precisar de proxy:** me avise

---

## 🛠️ Arquivo a Editar

Se decidir tentar aumentar delays:

**Arquivo:** `Backend/scraper/betano_multiligas_markets_v1_3.py`

**Linhas a procurar:**
- Linha ~134: `time.sleep(1.0)` → aumentar para `time.sleep(3.0)`
- Linha ~145: `time.sleep(0.8)` → aumentar para `time.sleep(2.0)`
- Linha ~160: `time.sleep(0.8)` → aumentar para `time.sleep(2.0)`

Isso tornará o scraper **muito mais lento** mas aumentará chances de sucesso.

---

## 📞 Se o Problema Persistir

1. Teste se você consegue acessar https://www.betano.bet.br normalmente
2. Se NÃO conseguir → pode ser bloqueio regional
3. Se conseguir → o problema é que o scraper está sendo detectado como bot

Me avise qual é o caso e ajudarei com a solução apropriada!

---

**Criado:** 18/02/2026
