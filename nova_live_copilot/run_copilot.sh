#!/bin/bash
# Script de lancement pour Nova Copilote Star Citizen (Gemini 3.8 LIVE)

echo "🛰️ Initialisation de Nova Copilote Star Citizen (Gemini 3.8 LIVE)..."

# Aller dans le dossier du script
cd "$(dirname "$0")"

# Vérification ou création du venv
if [ ! -d "venv" ]; then
    echo "📦 Création de l'environnement virtuel Python..."
    python3 -m venv venv
    source venv/bin/activate
    echo "⬇️ Installation des dépendances..."
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Lancement
python3 main.py
