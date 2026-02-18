#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para instalação de dependências Python do projeto BISS Backend
"""

import subprocess
import sys
import os
from pathlib import Path

def safe_print(*args, **kwargs):
    """Print que funciona em terminais cp1252"""
    text = " ".join(str(a) for a in args)
    enc = (getattr(sys.stdout, "encoding", None) or "utf-8")
    try:
        text.encode(enc, errors="strict")
        print(text, **kwargs)
    except UnicodeEncodeError:
        print(text.encode(enc, errors="replace").decode(enc, errors="replace"), **kwargs)

def run_command(cmd, description):
    """Executa um comando e exibe feedback"""
    safe_print(f"\n{'='*60}")
    safe_print(f"▶ {description}")
    safe_print(f"{'='*60}")
    
    try:
        result = subprocess.run(cmd, shell=True, check=False)
        if result.returncode == 0:
            safe_print(f"✓ {description} - OK")
            return True
        else:
            safe_print(f"✗ {description} - FALHOU (código {result.returncode})")
            return False
    except Exception as e:
        safe_print(f"✗ ERRO ao executar {description}: {e}")
        return False

def main():
    safe_print("\n" + "="*60)
    safe_print("INSTALADOR DE DEPENDÊNCIAS - BISS Backend")
    safe_print("="*60)
    
    # Detectar Python
    python_exe = sys.executable
    safe_print(f"\nUsando Python: {python_exe}")
    safe_print(f"Versão: {sys.version}")
    
    # Diretório do script
    backend_dir = Path(__file__).parent
    requirements_file = backend_dir / "requirements.txt"
    
    if not requirements_file.exists():
        safe_print(f"\n✗ ERRO: {requirements_file} não encontrado!")
        return False
    
    safe_print(f"Arquivo de dependências: {requirements_file}")
    
    # 1. Atualizar pip
    safe_print("\n" + "="*60)
    safe_print("ETAPA 1: Atualizando pip, setuptools e wheel")
    safe_print("="*60)
    run_command(f'"{python_exe}" -m pip install --upgrade pip setuptools wheel', "Upgrade pip")
    
    # 2. Instalar dependências
    safe_print("\n" + "="*60)
    safe_print("ETAPA 2: Instalando dependências do requirements.txt")
    safe_print("="*60)
    
    success = run_command(
        f'"{python_exe}" -m pip install -r "{requirements_file}"',
        "Instalação de dependências"
    )
    
    if not success:
        safe_print("\n✗ FALHOU na instalação de dependências!")
        safe_print("Tente novamente ou instale manualmente com:")
        safe_print(f'  {python_exe} -m pip install -r {requirements_file}')
        return False
    
    # 3. Instalar navegadores para Playwright
    safe_print("\n" + "="*60)
    safe_print("ETAPA 3: Instalando navegadores Playwright")
    safe_print("="*60)
    safe_print("Isso pode levar alguns minutos na primeira execução...")
    
    run_command(
        f'"{python_exe}" -m playwright install chromium firefox',
        "Instalar navegadores Playwright"
    )
    
    # 4. Verificação final
    safe_print("\n" + "="*60)
    safe_print("ETAPA 4: Verificando instalação")
    safe_print("="*60)
    
    modules_to_check = [
        ("playwright", "Playwright"),
        ("seleniumbase", "SeleniumBase"),
        ("pandas", "Pandas"),
        ("requests", "Requests"),
    ]
    
    all_ok = True
    for module_name, display_name in modules_to_check:
        try:
            __import__(module_name)
            safe_print(f"  ✓ {display_name} instalado corretamente")
        except ImportError:
            safe_print(f"  ✗ {display_name} NÃO ENCONTRADO")
            all_ok = False
    
    # Resultado final
    safe_print("\n" + "="*60)
    if all_ok:
        safe_print("✓ INSTALAÇÃO CONCLUÍDA COM SUCESSO!")
        safe_print("="*60)
        safe_print("\nVocê pode agora executar os scripts:")
        safe_print("  python Backend/scraper/betano_multiligas_markets_v1_3.py")
        safe_print("  python Backend/scraper/run_all_updates.py")
        return True
    else:
        safe_print("✗ INSTALAÇÃO CONCLUÍDA COM AVISOS")
        safe_print("="*60)
        safe_print("\nVerifique as mensagens de erro acima")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
