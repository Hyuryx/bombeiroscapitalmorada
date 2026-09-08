@echo off
chcp 65001 > nul
cd /d "%~dp0"

where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\bin"
)

echo =========================================
echo    Baixando atualizacoes do GitHub...
echo =========================================
echo.

echo Puxando alteracoes do servidor (git pull)...
git pull origin main

echo.
echo =========================================
if %ERRORLEVEL% EQU 0 (
    echo [SUCESSO] Seu projeto esta atualizado com a ultima versao!
) else (
    echo [ERRO] Falha ao baixar as atualizacoes. Pode haver alteracoes nao salvas que conflitam.
)
echo =========================================
echo.
pause
