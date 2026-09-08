@echo off
chcp 65001 > nul
cd /d "%~dp0"

where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\bin"
)

echo =========================================
echo    Enviando suas alteracoes para o GitHub...
echo =========================================
echo.

echo 1. Verificando alteracoes locais...
set FS=0
set AHEAD=0

git status --porcelain > "%temp%\git_status.tmp" 2>nul
for %%I in ("%temp%\git_status.tmp") do set FS=%%~zI
del "%temp%\git_status.tmp" 2>nul

git rev-list origin/main..HEAD > "%temp%\git_ahead.tmp" 2>nul
for %%I in ("%temp%\git_ahead.tmp") do set AHEAD=%%~zI
del "%temp%\git_ahead.tmp" 2>nul

if not defined FS set FS=0
if not defined AHEAD set AHEAD=0

if %FS% EQU 0 if %AHEAD% EQU 0 (
    echo.
    echo =========================================
    echo [INFORMACAO] Nenhuma alteracao nova foi encontrada para enviar.
    echo Lembre-se de SALVAR os arquivos no editor - pressione Ctrl + S.
    echo =========================================
    echo.
    pause
    exit /b 0
)

if %FS% GTR 0 (
    echo 2. Adicionando arquivos alterados...
    git add .
    echo.
    echo 3. Criando commit das alteracoes...
    git commit -m "Atualizacao automatica via script"
) else (
    echo [INFORMACAO] Alteracoes ja salvas localmente, enviando ao GitHub...
)

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
