@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  DTAO — Lancement du serveur de développement
REM
REM  Pourquoi ce script ?
REM  Le projet est sur Google Drive (G:) qui ne supporte pas l'écriture de
REM  node_modules. Les dépendances sont installées dans :
REM    C:\Users\gesti\AppData\Local\dtao-packages\node_modules
REM
REM  Pour réinstaller les dépendances (après mise à jour de package.json) :
REM    cd C:\Users\gesti\AppData\Local\dtao-packages
REM    npm install
REM ─────────────────────────────────────────────────────────────────────────────

REM  Usage : dev.bat [port]
REM  Exemple : dev.bat 3000  → lance sur http://localhost:3000
REM  Par défaut : port 5173

if "%1"=="" (set PORT=5173) else (set PORT=%1)

echo.
echo   .A DTAO Travaux PAY — Editeur interactif
echo   Demarrage du serveur de developpement sur le port %PORT%...
echo   Ouvrir : http://localhost:%PORT%
echo.

set PROJECT_DIR=%~dp0
if "%PROJECT_DIR:~-1%"=="\" set PROJECT_DIR=%PROJECT_DIR:~0,-1%
cd /d "C:\Users\maelb\AppData\Local\dtao-packages"
"node_modules\.bin\vite.cmd" "%PROJECT_DIR%" --port %PORT%
