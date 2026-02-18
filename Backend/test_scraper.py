#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de teste para o Scraper Betano
Ajuda a diagnosticar problemas de acesso
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def safe_print(*args, **kwargs):
    """Print seguro para Windows"""
    text = " ".join(str(a) for a in args)
    enc = (getattr(sys.stdout, "encoding", None) or "utf-8")
    try:
        text.encode(enc, errors="strict")
        print(text, **kwargs)
    except UnicodeEncodeError:
        print(text.encode(enc, errors="replace").decode(enc, errors="replace"), **kwargs)

def test_website_access():
    """Testa acesso ao site Betano com um navegador normal"""
    safe_print("\n" + "="*60)
    safe_print("TESTE 1: Acesso ao Website Betano")
    safe_print("="*60)
    safe_print("\nVou abrir uma URL do Betano. Se conseguir acessar, o problema")
    safe_print("é que o scraper está sendo bloqueado como bot.")
    
    try:
        import webbrowser
        safe_print("\nAbrindo URL no seu navegador padrão...")
        webbrowser.open("https://www.betano.bet.br/sport/futebol/brasil/brasileirao-serie-a-betano/10016/")
        safe_print("✓ URL aberta. Você conseguiu acessar?")
        safe_print("  [S]im - Acesso funcionou (problema é o scraper)")
        safe_print("  [N]ão - Acesso bloqueado (problema é seu IP)")
        safe_print("  [O]utro - Cancelar teste")
        
        choice = input("\nResposta [S/N/O]: ").strip().upper()
        
        if choice == "S":
            safe_print("\n✓ Acesso manual funciona!")
            safe_print("Solução: aumentar delays no scraper (veja SCRAPER_ACESSO_NEGADO.md)")
            return True
        elif choice == "N":
            safe_print("\n✗ Seu IP pode estar bloqueado no Brasil")
            safe_print("Verifique sua localização ou tente com VPN brasileira")
            return False
        else:
            safe_print("\nTeste cancelado")
            return None
    except Exception as e:
        safe_print(f"Erro ao abrir navegador: {e}")
        return None

def test_scraper_debug():
    """Testa o scraper com modo debug (janela aberta)"""
    safe_print("\n" + "="*60)
    safe_print("TESTE 2: Executar Scraper em Modo Debug (com janela aberta)")
    safe_print("="*60)
    safe_print("\nIsso abrirá o Chrome com o scraper rodando.")
    safe_print("Você poderá ver o que está acontecendo em tempo real.")
    safe_print("\n⚠️  AVISO: Será muito mais lento!")
    
    safe_print("\nExecutando scraper... (pode levar alguns minutos)")
    
    backend_dir = Path(__file__).parent
    scraper_py = backend_dir / "scraper" / "betano_multiligas_markets_v1_3.py"
    ligas_csv = backend_dir / "scraper" / "ligas_auto.csv"
    
    if not scraper_py.exists():
        safe_print(f"\n✗ Scraper não encontrado em: {scraper_py}")
        return False
    
    if not ligas_csv.exists():
        safe_print(f"\n✗ Arquivo de ligas não encontrado em: {ligas_csv}")
        return False
    
    # Rodar com headless=0 (janela aberta) e dump=1 (verbose)
    cmd = [
        sys.executable,
        str(scraper_py),
        "--headless", "0",  # Abre janela
        "--ligas_csv", str(ligas_csv),
        "--saida", str(backend_dir / "test_output.csv"),
        "--dump", "1",      # Debug verboso
        "--limite_eventos", "2",  # Apenas 2 eventos para testar
    ]
    
    try:
        result = subprocess.run(cmd, timeout=120)  # timeout de 2 min
        
        if result.returncode == 0:
            safe_print("\n✓ Scraper executou com sucesso!")
            output_file = backend_dir / "test_output.csv"
            if output_file.exists():
                with open(output_file) as f:
                    lines = f.readlines()
                safe_print(f"✓ Arquivo gerado com {len(lines)-1} linhas")
            return True
        else:
            safe_print(f"\n✗ Scraper retornou código {result.returncode}")
            return False
            
    except subprocess.TimeoutExpired:
        safe_print("\n⏱️  Timeout - o scraper demorou muito")
        return False
    except Exception as e:
        safe_print(f"\n✗ Erro ao executar: {e}")
        return False

def test_scraper_with_longer_delays():
    """Testa o scraper com delays mais longos"""
    safe_print("\n" + "="*60)
    safe_print("TESTE 3: Scraper com Delays Maiores")
    safe_print("="*60)
    safe_print("\nVou criar uma cópia do scraper com delays aumentados")
    safe_print("e testar com isso.")
    
    backend_dir = Path(__file__).parent
    scraper_py = backend_dir / "scraper" / "betano_multiligas_markets_v1_3.py"
    scraper_backup = backend_dir / "scraper" / "betano_multiligas_markets_v1_3_backup.py"
    
    if not scraper_py.exists():
        safe_print(f"\n✗ Scraper não encontrado")
        return False
    
    # Lê o arquivo
    with open(scraper_py, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Aumenta os delays (simples find/replace)
    original_delays = content
    content = content.replace('time.sleep(0.8)', 'time.sleep(2.5)')
    content = content.replace('time.sleep(1.0)', 'time.sleep(3.0)')
    
    if content == original_delays:
        safe_print("⚠️  Nenhum delay foi modificado (padrão pode estar diferente)")
    else:
        # Salva backup
        with open(scraper_backup, 'w', encoding='utf-8') as f:
            f.write(original_delays)
        safe_print(f"✓ Backup salvo em: {scraper_backup}")
        
        # Salva versão com delays maiores
        with open(scraper_py, 'w', encoding='utf-8') as f:
            f.write(content)
        safe_print(f"✓ Scraper modificado com delays maiores")
    
    safe_print("\nExecutando com delays aumentados...")
    time.sleep(1)
    
    ligas_csv = backend_dir / "scraper" / "ligas_auto.csv"
    
    cmd = [
        sys.executable,
        str(scraper_py),
        "--headless", "1",  # Headless
        "--ligas_csv", str(ligas_csv),
        "--saida", str(backend_dir / "test_output_longer_delays.csv"),
        "--dump", "1",
        "--limite_eventos", "2",
    ]
    
    try:
        result = subprocess.run(cmd, timeout=180)  # 3 min
        
        if result.returncode == 0:
            safe_print("\n✓ Scraper com delays maiores funcionou!")
            return True
        else:
            safe_print(f"\n✗ Ainda com erro (código {result.returncode})")
            return False
            
    except subprocess.TimeoutExpired:
        safe_print("\n⏱️  Timeout mesmo com delays maiores")
        return False
    except Exception as e:
        safe_print(f"\n✗ Erro: {e}")
        return False
    finally:
        # Restaura backup
        if scraper_backup.exists():
            with open(scraper_backup, 'r', encoding='utf-8') as f:
                original = f.read()
            with open(scraper_py, 'w', encoding='utf-8') as f:
                f.write(original)
            scraper_backup.unlink()
            safe_print("✓ Arquivo original restaurado")

def main():
    safe_print("\n" + "="*60)
    safe_print("FERRAMENTA DE DIAGNÓSTICO - Scraper Betano")
    safe_print("="*60)
    safe_print("\nEsta ferramenta testa 3 hipóteses:")
    safe_print("1. Você consegue acessar o site normalmente?")
    safe_print("2. O scraper funciona com janela aberta (mais lento)?")
    safe_print("3. O scraper funciona com delays maiores?")
    safe_print("\n" + "="*60)
    
    while True:
        safe_print("\n📋 MENU:")
        safe_print("  [1] Teste 1: Acessar site manualmente")
        safe_print("  [2] Teste 2: Rodar scraper com janela (muito lento)")
        safe_print("  [3] Teste 3: Rodar scraper com delays maiores")
        safe_print("  [4] Sair")
        
        choice = input("\nEscolha [1-4]: ").strip()
        
        if choice == "1":
            test_website_access()
        elif choice == "2":
            test_scraper_debug()
        elif choice == "3":
            test_scraper_with_longer_delays()
        elif choice == "4":
            safe_print("\nFechando...")
            break
        else:
            safe_print("Opção inválida")
    
    safe_print("\n" + "="*60)
    safe_print("Para mais informações, veja: SCRAPER_ACESSO_NEGADO.md")
    safe_print("="*60)

if __name__ == "__main__":
    main()
