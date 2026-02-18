@echo off
REM Instalador de Dependências Python - BISS Backend
REM Para Windows PowerShell/CMD

echo.
echo ============================================================
echo INSTALADOR DE DEPENDÊNCIAS - BISS Backend
echo ============================================================
echo.

REM Detectar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado no PATH!
    echo Instale Python de: https://www.python.org/
    pause
    exit /b 1
)

echo ✓ Python encontrado
python --version

REM Executar o script Python de instalação
echo.
echo Iniciando instalação...
python "%~dp0install_dependencies.py"
set INSTALL_EXIT=%errorlevel%

echo.
if %INSTALL_EXIT% equ 0 (
    echo ============================================================
    echo ✓ Instalação concluída com sucesso!
    echo ============================================================
) else (
    echo ============================================================
    echo ✗ Houve erros durante a instalação
    echo ============================================================
)

pause
exit /b %INSTALL_EXIT%
