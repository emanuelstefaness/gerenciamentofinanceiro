@echo off
echo ========================================
echo   TESTE RAPIDO - SISTEMA FINANCEIRO
echo ========================================
echo.
echo 1. Verificando Node.js...
node --version
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Instale Node.js de https://nodejs.org
    pause
    exit
)
echo.
echo 2. Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
)
echo.
echo 3. Iniciando servidor...
echo.
echo ========================================
echo   SERVIDOR INICIANDO...
echo   Acesse: http://localhost:3000
echo   Login: admin / admin123
echo ========================================
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
node server.js

