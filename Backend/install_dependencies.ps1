# Instalador de Dependências Python - BISS Backend
# Para Windows PowerShell

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "INSTALADOR DE DEPENDÊNCIAS - BISS Backend" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Detectar Python
$pythonExe = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ ERRO: Python não encontrado no PATH!" -ForegroundColor Red
    Write-Host "Instale Python de: https://www.python.org/" -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "✓ Python encontrado" -ForegroundColor Green
Write-Host $pythonExe -ForegroundColor Green

Write-Host ""
Write-Host "Iniciando instalação..." -ForegroundColor Cyan

# Executar o script Python de instalação
$scriptPath = Join-Path $PSScriptRoot "install_dependencies.py"
& python $scriptPath
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "✓ Instalação concluída com sucesso!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
} else {
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "✗ Houve erros durante a instalação" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
}

Read-Host "Pressione Enter para sair"
exit $exitCode
