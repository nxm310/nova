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
echo Verification de Python sur votre systeme...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas detecte sur votre ordinateur.
    echo 1. Rendez-vous sur https://www.python.org/downloads/
    echo 2. Important : Cochez "Add Python to PATH" lors de l'installation.
    echo.
    pause
    exit /b
)

:: Verification de pydirectinput
python -c "import pydirectinput" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INSTALLATION] Installation automatique de pydirectinput pour Star Citizen...
    pip install pydirectinput
)

echo.
echo Demarrage du compagnon et du pont clavier...
echo Votre navigateur va s'ouvrir automatiquement sur l'application !
echo.
python scripts/bridge.py
pause
