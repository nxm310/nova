@echo off
title Pont Clavier Star Citizen pour Nova / Ami
color 0b
echo ============================================================
echo   PONT CLAVIER DIRECTINPUT POUR STAR CITIZEN
echo ============================================================
echo Verification de Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas installe ou pas dans le PATH Windows.
    echo Veuillez installer Python depuis https://python.org en cochant "Add Python to PATH".
    echo.
    pause
    exit /b
)

echo Verification des dependances...
pip install pydirectinput >nul 2>&1

echo.
echo ============================================================
echo Demarrage du pont sur le port 5005...
echo Gardez cette fenetre ouverte pendant vos sessions de jeu !
echo ============================================================
python scripts/bridge.py
pause
