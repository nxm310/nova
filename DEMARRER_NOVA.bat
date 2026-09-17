@echo off
chcp 65001 >nul
title NOVA — Compagnon Star Citizen
color 0b

:: --- 🛡️ ÉLÉVATION AUTOMATIQUE EN ADMINISTRATEUR POUR STAR CITIZEN ---
:: Star Citizen et Easy Anti-Cheat tournent en Administrateur.
:: Pour que Windows autorise l'envoi de touches dans le jeu, ce script doit tourner en Administrateur.
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Demande d'elevation Administrateur pour controler Star Citizen...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -WorkingDirectory '%~dp0' -Verb RunAs"
    exit /b
)

:: Revenir dans le dossier du script apres elevation
cd /d "%~dp0"

:: --- 🔗 ENREGISTREMENT DU PROTOCOLE URL nova:// (1-CLIC DEPUIS LE WEB/PWA) ---
reg add "HKCU\Software\Classes\nova" /ve /d "URL:Nova Star Citizen Protocol" /f >nul 2>&1
reg add "HKCU\Software\Classes\nova" /v "URL Protocol" /d "" /f >nul 2>&1
reg add "HKCU\Software\Classes\nova\shell\open\command" /ve /d "\"cmd.exe\" /c \"\"%~f0\"\"" /f >nul 2>&1

cls
echo ==================================================================
echo         🚀  NOVA — COMPAGNON VOCAL STAR CITIZEN
echo ==================================================================
echo   ✓ Droits Administrateur : ACTIFS (Star Citizen débloqué)
echo.

:: 1. CAS 1 : Exécutable autonome Nova-StarCitizen.exe (Version ZIP sans Python requis)
if exist "Nova-StarCitizen.exe" (
    echo [OK] Version autonome détectée : Nova-StarCitizen.exe
    echo Démarrage du compagnon et du pont clavier...
    echo.
    Nova-StarCitizen.exe
    pause
    exit /b
)

:: 2. DÉTECTION MULTI-CHEMINS DE PYTHON (python, py -3, LocalAppData, ProgramFiles)
set "PY_CMD="
python --version >nul 2>&1 && set "PY_CMD=python"
if not defined PY_CMD (
    py -3 --version >nul 2>&1 && set "PY_CMD=py -3"
)
if not defined PY_CMD (
    py --version >nul 2>&1 && set "PY_CMD=py"
)
if not defined PY_CMD (
    for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*") do (
        if exist "%%D\python.exe" set "PY_CMD=\"%%D\python.exe\""
    )
)
if not defined PY_CMD (
    for /d %%D in ("C:\Program Files\Python3*") do (
        if exist "%%D\python.exe" set "PY_CMD=\"%%D\python.exe\""
    )
)
if not defined PY_CMD (
    for /d %%D in ("C:\Python3*") do (
        if exist "%%D\python.exe" set "PY_CMD=\"%%D\python.exe\""
    )
)

:: 3. CAS 2 : Lancement depuis le dossier source Git avec dossier scripts
if exist "scripts\bridge.py" (
    echo [OK] Dépôt source détecté.
    if exist ".git" (
        echo [SYNC] Synchronisation automatique avec GitHub...
        git pull origin main --quiet >nul 2>&1
    )

    if not defined PY_CMD (
        echo [ERREUR] Python n'a pas été détecté sur votre système.
        echo Pour jouer sans installer Python, téléchargez la version autonome :
        echo https://github.com/nxm310/nova/releases
        echo.
        pause
        exit /b
    )

    echo [OK] Interpréteur Python actif : %PY_CMD%
    %PY_CMD% -c "import pydirectinput" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [INSTALLATION] Installation automatique de pydirectinput...
        %PY_CMD% -m pip install pydirectinput
    )

    echo Démarrage du pont clavier Nova...
    %PY_CMD% scripts\bridge.py
    pause
    exit /b
)

:: 4. CAS 3 : Lancement depuis le dossier scripts
if exist "bridge.py" (
    if not defined PY_CMD (
        echo [ERREUR] Python n'est pas installé.
        pause
        exit /b
    )
    echo Démarrage de bridge.py...
    %PY_CMD% bridge.py
    pause
    exit /b
)

echo [ERREUR] Aucun composant Nova trouvé (Nova-StarCitizen.exe ou bridge.py introuvable).
echo Veuillez extraire l'intégralité du fichier ZIP avant de lancer ce script.
pause
