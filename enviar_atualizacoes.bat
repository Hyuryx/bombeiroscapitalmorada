@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo =========================================
echo    Enviando suas alteracoes para o GitHub...
echo =========================================
echo.

echo 1. Verificando alteracoes locais...
git status --porcelain > "%temp%\git_status.tmp"
for %%I in ("%temp%\git_status.tmp") do set FS=%%~zI

if %FS% EQU 0 (
    del "%temp%\git_status.tmp" 2>nul
    echo.
    echo =========================================
    echo [INFORMACAO] Nenhuma alteracao nova foi encontrada para enviar.
    echo Lembre-se de SALVAR os arquivos no editor - pressione Ctrl + S.
    echo =========================================
    echo.
    pause
    exit /b 0
)
del "%temp%\git_status.tmp" 2>nul

echo 2. Adicionando arquivos alterados...
git add .

echo.
echo 3. Criando commit das alteracoes...
git commit -m "Atualizacao automatica via script"

echo.
echo 4. Baixando possiveis alteracoes novas do seu amigo (git pull)...
git pull origin main --no-edit

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo =========================================
    echo [ERRO DE CONFLITO] Ocorreu um conflito! 
    echo Seu amigo alterou as mesmas partes do codigo que voce.
    echo O Git nao conseguiu juntar automaticamente.
    echo Voce precisa abrir os arquivos no VS Code, resolver os conflitos, e tentar enviar de novo.
    echo =========================================
    echo.
    pause
    exit /b 1
)

echo.
echo 5. Enviando para o GitHub (git push)...
git push origin main

echo.
echo =========================================
if %ERRORLEVEL% EQU 0 (
    echo [SUCESSO] Suas alteracoes foram enviadas para o GitHub!
) else (
    echo [ERRO] Ocorreu uma falha ao enviar. Verifique a mensagem de erro.
)
echo =========================================
echo.
pause
