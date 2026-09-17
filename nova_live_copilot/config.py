"""Configuration centralisée pour le Compagnon de Vol Star Citizen Gemini 3.8 LIVE."""

import os
import json
from pathlib import Path

# --- MODÈLE & VOIX GEMINI LIVE ---
MODEL_ID = "gemini-3.8-live"
VOICE_NAME = "Aoede"  # Voix synthétique féminine demandée

# --- AUDIO TEMPS RÉEL ---
INPUT_SAMPLE_RATE = 16000   # 16 kHz requis pour l'entrée Gemini Live
OUTPUT_SAMPLE_RATE = 24000  # 24 kHz natif en sortie Gemini Live
CHANNELS = 1                # Mono
AUDIO_FORMAT = "int16"      # PCM 16-bit
CHUNK_SIZE_MS = 100         # Envoi de blocs audio toutes les 100ms
INPUT_CHUNK_SAMPLES = int(INPUT_SAMPLE_RATE * (CHUNK_SIZE_MS / 1000.0))

# --- TARIFICATION DES TOKENS & COÛTS FINANCIERS ---
# Tarifs officiels Google Gemini Audio (par 1 000 000 de tokens)
PRICE_AUDIO_INPUT_PER_1M = 0.75    # $0.75 / 1M tokens d'entrée audio
PRICE_AUDIO_OUTPUT_PER_1M = 3.75   # $3.75 / 1M tokens de sortie audio
PRICE_TEXT_INPUT_PER_1M = 0.075    # $0.075 / 1M tokens texte d'entrée
PRICE_TEXT_OUTPUT_PER_1M = 0.30    # $0.30 / 1M tokens texte de sortie
DEFAULT_EUR_PER_USD = 0.92         # Taux de conversion $ ➔ €

# --- SYSTÈME STAR CITIZEN (CLAVIER & DIRECTINPUT) ---
# Durée par défaut des appuis (en secondes)
DEFAULT_TAP_DURATION = 0.18
DEFAULT_HOLD_DURATION = 1.5

# DirectInput Scan Codes matériels pour Windows
DIRECTINPUT_SCANCODES = {
    'u': 0x16,       # Démarrage vaisseau (Power)
    'r': 0x13,       # Prêt au vol (Flight ready)
    'i': 0x17,       # Propulseurs (Engines)
    'o': 0x18,       # Boucliers (Shields)
    'l': 0x26,       # Phares (Lights)
    'n': 0x31,       # Train d'atterrissage (Landing gear)
    'b': 0x30,       # Quantum drive (Spool / Jump)
    'k': 0x25,       # Portes & Sas (Doors)
    'p': 0x19,       # Armes (Weapons)
    'c': 0x2E,       # Cruise control (Régulateur)
    'g': 0x22,       # Leurres thermiques (Decoy / Flares)
    'h': 0x23,       # Brouillage (Noise / Chaff)
    'y': 0x15,       # Quitter le siège (Eject / Exit)
    'alt': 0x38,     # Touche Alt gauche
    'f1': 0x3B,      # mobiGlas
    'f2': 0x3C,      # StarMap
    'f4': 0x3E,      # Caméra 3ème personne
    'f11': 0x57,     # Comms ATC
}

# --- SERVEUR DE TÉLÉMÉTRIE WEB (PORT 5006) ---
TELEMETRY_PORT = 5006
TELEMETRY_HOST = "0.0.0.0"

def get_api_key() -> str:
    """Récupère la clé API Gemini depuis l'environnement ou les fichiers de config locaux."""
    # 1. Variable d'environnement standard
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key

    # 2. Fichier .env local
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("GEMINI_API_KEY="):
                val = line.split("=", 1)[1].strip().strip('"').strip("'")
                if val:
                    return val

    # 3. Fichier de config Nova (si installé sur le PC)
    user_home = Path.home()
    config_paths = [
        user_home / "Library" / "Application Support" / "Nova" / "nova_config.json",
        user_home / "AppData" / "Roaming" / "Nova" / "nova_config.json",
        user_home / ".config" / "nova" / "nova_config.json",
    ]
    for cp in config_paths:
        if cp.exists():
            try:
                data = json.loads(cp.read_text(encoding="utf-8"))
                val = data.get("gemini_api_key") or data.get("apiKey")
                if val:
                    return val
            except Exception:
                pass

    return ""
