"""Point d'entrée principal et orchestrateur du Copilote Star Citizen Gemini 3.8 LIVE."""

import os
import sys
import asyncio
import signal
from pathlib import Path

# Ajout du chemin parent au sys.path pour exécution directe
CURRENT_DIR = Path(__file__).resolve().parent
PARENT_DIR = CURRENT_DIR.parent
if str(PARENT_DIR) not in sys.path:
    sys.path.insert(0, str(PARENT_DIR))

import uvicorn
from nova_live_copilot.config import (
    MODEL_ID,
    VOICE_NAME,
    TELEMETRY_PORT,
    TELEMETRY_HOST,
    get_api_key,
)
from nova_live_copilot.audio_manager import audio_manager
from nova_live_copilot.gemini_live import GeminiLiveClient
from nova_live_copilot.telemetry import telemetry
from nova_live_copilot.web_bridge import app as fastapi_app

def print_banner():
    print("=" * 70)
    print("🚀  NOVA — ORDINATEUR DE BORD STAR CITIZEN (GEMINI 3.8 LIVE)")
    print("=" * 70)
    print(f"• Modèle IA        : {MODEL_ID} (Ultra-basse latence temps réel)")
    print(f"• Voix             : {VOICE_NAME} (Audio natif bidirectionnel)")
    print(f"• Audio Entrée/Sortie : 16 kHz PCM ➔ 24 kHz PCM (Barge-in actif)")
    print(f"• Contrôles SC     : DirectInput / pynput (Function Calling natif)")
    print(f"• Télémétrie Widget: ws://localhost:{TELEMETRY_PORT}/telemetry/ws")
    print("=" * 70)

async def telemetry_logger_task():
    """Affiche une ligne de télémétrie et de coût dynamique dans le terminal toutes les 3 secondes."""
    while True:
        await asyncio.sleep(3.0)
        snap = telemetry.get_snapshot()
        if snap.total_tokens > 0 or snap.status != "idle":
            action_str = f" | Dernier ordre: {snap.last_action}" if snap.last_action else ""
            print(
                f"📊 [Télémétrie Live] Tokens: {snap.total_tokens} (In: {snap.prompt_tokens}, Out: {snap.candidate_tokens}) "
                f"| Coût: ${snap.cost_usd:.5f} ({snap.cost_eur:.5f} €) | Débit: {snap.tokens_per_sec} t/s | État: {snap.status}{action_str}"
            )

async def start_web_bridge():
    """Lance le serveur FastAPI de télémétrie en tâche de fond."""
    config = uvicorn.Config(
        app=fastapi_app,
        host=TELEMETRY_HOST,
        port=TELEMETRY_PORT,
        log_level="warning",
    )
    server = uvicorn.Server(config)
    await server.serve()

async def async_main():
    print_banner()

    api_key = get_api_key()
    if not api_key:
        print("❌ ERREUR : Aucune clé API Gemini trouvée !")
        print("Veuillez définir la variable GEMINI_API_KEY ou la renseigner dans nova_live_copilot/.env")
        sys.exit(1)

    loop = asyncio.get_running_loop()

    # Démarrage des flux audio matériels
    audio_manager.start(loop)

    # Démarrage du serveur WebSocket de télémétrie pour le widget
    bridge_task = asyncio.create_task(start_web_bridge())
    logger_task = asyncio.create_task(telemetry_logger_task())

    # Démarrage du client Gemini 3.8 LIVE
    live_client = GeminiLiveClient(api_key=api_key)

    try:
        await live_client.run()
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"[Main Erreur Critique] {e}")
    finally:
        print("\n🛑 Arrêt du copilote...")
        audio_manager.stop()
        bridge_task.cancel()
        logger_task.cancel()
        print("✓ Copilote arrêté proprement.")

def main():
    try:
        asyncio.run(async_main())
    except KeyboardInterrupt:
        print("\nInterrompu par l'utilisateur.")

if __name__ == "__main__":
    main()
