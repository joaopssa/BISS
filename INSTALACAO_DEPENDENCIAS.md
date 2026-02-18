# 📦 Instalação de Dependências Python - Backend BISS

## ⚠️ Problema Encontrado

O erro que você está recebendo:
```
ModuleNotFoundError: No module named 'playwright'
```

Significa que as dependências Python não estão instaladas no seu ambiente.

---

## ✅ Solução

### Opção 1: Instalação Automática (RECOMENDADO)

#### No PowerShell (Windows):
```powershell
cd Backend
python install_dependencies.py
```

#### No CMD (Windows):
```cmd
cd Backend
install_dependencies.bat
```

#### No PowerShell (com script específico):
```powershell
cd Backend
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\install_dependencies.ps1
```

---

### Opção 2: Instalação Manual

Se preferir fazer manualmente, execute:

```bash
# 1. Atualizar pip
python -m pip install --upgrade pip setuptools wheel

# 2. Instalar dependências
pip install -r Backend/requirements.txt

# 3. Instalar navegadores Playwright
python -m playwright install chromium firefox
```

---

## 📋 O que será instalado?

O arquivo `Backend/requirements.txt` contém:

| Pacote | Versão | Uso |
|--------|--------|-----|
| **playwright** | ≥1.40.0 | Automação de navegador para scraping |
| **seleniumbase** | ≥4.27.0 | Framework de testes/automação |
| **beautifulsoup4** | ≥4.12.3 | Parsing de HTML |
| **pandas** | ≥2.1.0 | Processamento de dados |
| **requests** | ≥2.31.0 | Requisições HTTP |
| **scikit-learn** | ≥1.3.0 | Machine Learning (ML) |
| **xgboost** | ≥2.0.0 | Modelos de previsão (ML) |

---

## 🔍 Verificação

Após a instalação, teste se tudo está funcionando:

```python
python -c "from playwright.sync_api import sync_playwright; print('✓ Playwright OK')"
python -c "from seleniumbase import SB; print('✓ SeleniumBase OK')"
python -c "import pandas; print('✓ Pandas OK')"
```

---

## 🚀 Próximo Passo

Após instalar as dependências, você pode executar:

```bash
# Rodar o script de scraping principal
python Backend/scraper/run_all_updates.py

# Ou rodar o projeto completo
python src/run/run_biss.py
```

---

## ❓ Problemas Comuns

### Erro: "Cannot install... because these package versions have conflicting dependencies"
**Solução:** Este erro foi corrigido na versão atual. Se ainda encontrar:
```bash
# Limpe o cache do pip e tente novamente
pip cache purge
pip install -r Backend/requirements.txt --force-reinstall
```

### "Permission denied" ao instalar Playwright
**Solução:** Execute como administrador ou use `--user`:
```bash
python -m playwright install --with-deps
```

### "pip not found"
**Solução:** Use `python -m pip` em vez de `pip`:
```bash
python -m pip install -r Backend/requirements.txt
```

### Erro ao instalar seleniumbase
**Solução:** Certifique-se que Chrome está instalado ou:
```bash
pip install seleniumbase --no-deps
pip install webdriver-manager selenium
```

---

## 📞 Suporte

Se continuar tendo problemas:
1. Verifique se Python está instalado: `python --version`
2. Atualize pip: `python -m pip install --upgrade pip`
3. Execute em modo verboso para ver erros: `pip install -v -r Backend/requirements.txt`

---

**Última atualização:** 18/02/2026
