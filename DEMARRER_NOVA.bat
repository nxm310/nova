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
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:: Revenir dans le dossier du script apres elevation
cd /d "%~dp0"

cls
echo ==================================================================
echo         🚀  NOVA — COMPAGNON VOCAL STAR CITIZEN
echo ==================================================================
echo   ✓ Droits Administrateur : ACTIFS (Star Citizen debloque)
echo.
:: 1. CAS 1 : Exécutable autonome Nova-StarCitizen.exe (Version ZIP sans Python requis)
if exist "Nova-StarCitizen.exe" (
    echo [OK] Version autonome detectee : Nova-StarCitizen.exe
    echo Demarrage du compagnon et du pont clavier...
    echo.
    Nova-StarCitizen.exe
    pause
    exit /b
)

:: 2. CAS 2 : Lancement depuis le dossier source Git avec dossier scripts
if exist "scripts\bridge.py" (
    echo [OK] Depot source detecte. Verification de Python...
    if exist ".git" (
        echo [SYNC] Synchronisation automatique avec GitHub...
        git pull origin main --quiet >nul 2>&1
    )
    python --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERREUR] Python n'est pas installe sur votre ordinateur.
        echo Pour jouer sans installer Python, telechargez directement le fichier
        echo 'Nova-StarCitizen-Windows.zip' sur GitHub :
        echo https://github.com/nxm310/nova/releases
        echo.
        pause
        exit /b
    )

    python -c "import pydirectinput" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [INSTALLATION] Installation automatique de pydirectinput...
        pip install pydirectinput
    )

    echo Demarrage du pont clavier...
    python scripts\bridge.py
    pause
    exit /b
)

:: 3. CAS 3 : Lancement depuis le dossier scripts
if exist "bridge.py" (
    echo [OK] Script bridge.py detecte. Verification de Python...
    python --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERREUR] Python n'est pas installe.
        pause
        exit /b
    )
    python bridge.py
    pause
    exit /b
)

echo [ERREUR] Aucun composant Nova trouve (Nova-StarCitizen.exe ou bridge.py introuvable).
echo Veuillez extraire l'integralite du fichier ZIP avant de lancer ce script.
pause
