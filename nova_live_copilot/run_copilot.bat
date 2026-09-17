@echo off
TITLE Nova Copilote Star Citizen (Gemini 3.8 LIVE)
chcp 65001 > nul

echo ======================================================================
echo 🚀 NOVA — COPILOTE STAR CITIZEN (GEMINI 3.8 LIVE)
echo ======================================================================

cd /d "%~dp0"

IF NOT EXIST "venv" (
    echo [INFO] Creation de l'environnement virtuel Python...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo [INFO] Installation des dependances...
    pip install -r requirements.txt
) ELSE (
    call venv\Scripts\activate.bat
)

python main.py
pause
