@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo =========================================
echo    Sincronizando com o GitHub...
echo =========================================
echo.

echo 1. Puxando alteracoes do servidor (git pull)...
git pull origin main

echo.
echo 2. Verificando alteracoes locais nos arquivos...
git status --porcelain > "%temp%\git_status.tmp"
for %%I in ("%temp%\git_status.tmp") do set FS=%%~zI

if %FS% EQU 0 (
    del "%temp%\git_status.tmp" 2>nul
    echo.
    echo =========================================
    echo [INFORMACAO] Nenhuma alteracao nova foi encontrada.
    echo Lembre-se de SALVAR os arquivos no editor - pressione Ctrl + S antes de rodar este script.
    echo =========================================
    echo.
    pause
    exit /b 0
)
del "%temp%\git_status.tmp" 2>nul

echo Alteracoes encontradas! Preparando para enviar...
echo.

echo 3. Adicionando arquivos alterados (git add)...
git add .

echo.
echo 4. Criando commit das alteracoes...
git commit -m "Atualizacao automatica via script"

echo.
echo 5. Enviando para o GitHub (git push)...
git push origin main

echo.
echo =========================================
if %ERRORLEVEL% EQU 0 (
    echo [SUCESSO] Suas alteracoes foram enviadas para o GitHub!
) else (
    echo [ERRO] Ocorreu uma falha ao enviar. Verifique a mensagem de erro acima.
)
echo =========================================
echo.
pause
