"""Client WebSocket bidirectionnel officiel Gemini 3.8 LIVE (SDK google-genai)."""

import asyncio
import base64
from typing import Optional
from google import genai
from google.genai import types

from nova_live_copilot.config import (
    MODEL_ID,
    VOICE_NAME,
    get_api_key,
)
from nova_live_copilot.audio_manager import audio_manager
from nova_live_copilot.input_simulator import input_simulator
from nova_live_copilot.telemetry import telemetry

SYSTEM_INSTRUCTION = """
Tu es Nova, copilote IA et ordinateur de bord tactique Star Citizen à bord du vaisseau du Commandant.
Ton style d'expression est militaire, précis, laconique et très immersif.
Directives strictes :
1. Dès que le Commandant te donne un ordre de vol ou de combat (train, boucliers, phares, saut quantique, leurres, portes, etc.), tu DOIS impérativement déclencher la fonction / l'outil Star Citizen correspondant.
2. Tes confirmations verbales doivent être ultra-courtes, directes et percutantes (ex: "Train sorti, Commandant.", "Contre-mesures déployées.", "Boucliers à pleine puissance.").
3. Zéro bavardage inutile, pas de politesse superflue : tu es en plein vol spatial.
""".strip()

def build_star_citizen_tools() -> types.Tool:
    """Déclare les outils natifs de contrôle Star Citizen pour le Function Calling Gemini Live."""
    declarations = [
        types.FunctionDeclaration(
            name="toggle_landing_gear",
            description="Sortir, rentrer ou basculer le train d'atterrissage du vaisseau.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "action": types.Schema(
                        type=types.Type.STRING,
                        description="Action spécifique : 'deploy', 'retract' ou 'toggle'.",
                    )
                },
            ),
        ),
        types.FunctionDeclaration(
            name="toggle_shields",
            description="Activer, couper ou réinitialiser les boucliers énergétiques du vaisseau.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "state": types.Schema(
                        type=types.Type.STRING,
                        description="'on', 'off' ou 'toggle'.",
                    )
                },
            ),
        ),
        types.FunctionDeclaration(
            name="quantum_drive",
            description="Calibrer le moteur quantique (spool) ou engager le saut quantique (jump).",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "mode": types.Schema(
                        type=types.Type.STRING,
                        description="'spool' pour calibrer, 'jump' pour lancer le saut.",
                    )
                },
                required=["mode"],
            ),
        ),
        types.FunctionDeclaration(
            name="deploy_countermeasures",
            description="Larguer des contre-mesures : leurres thermiques (decoy/flares) ou brouillage électromagnétique (noise/chaff).",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "type": types.Schema(
                        type=types.Type.STRING,
                        description="'decoy' pour missiles infrarouges, 'noise' pour radars.",
                    )
                },
            ),
        ),
        types.FunctionDeclaration(
            name="toggle_lights",
            description="Allumer ou éteindre les phares et l'éclairage extérieur du vaisseau.",
        ),
        types.FunctionDeclaration(
            name="toggle_vtol",
            description="Basculer les propulseurs en mode décollage/atterrissage vertical VTOL.",
        ),
        types.FunctionDeclaration(
            name="toggle_doors",
            description="Ouvrir ou fermer les portes extérieures, rampes et sas du vaisseau.",
        ),
        types.FunctionDeclaration(
            name="power_systems",
            description="Allumer ou couper l'alimentation générale ou les propulseurs du vaisseau.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "system": types.Schema(
                        type=types.Type.STRING,
                        description="'all' pour alimentation générale, 'engines' pour propulseurs.",
                    )
                },
            ),
        ),
        types.FunctionDeclaration(
            name="request_atc_landing",
            description="Contacter la tour de contrôle ATC locale pour demander l'autorisation d'atterrissage ou de décollage.",
        ),
        types.FunctionDeclaration(
            name="cruise_control",
            description="Activer ou couper le régulateur de vitesse automatique.",
        ),
    ]

    return types.Tool(function_declarations=declarations)

class GeminiLiveClient:
    """Client asynchrone pour la session WebSocket Gemini 3.8 LIVE."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or get_api_key()
        if not self.api_key:
            raise ValueError(
                "Clé API Gemini non trouvée. Veuillez renseigner GEMINI_API_KEY dans votre environnement ou .env"
            )
        self.client = genai.Client(api_key=self.api_key)
        self.session = None

    async def run(self):
        """Démarre la session Live, la transmission audio montante et l'écoute descendante."""
        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=VOICE_NAME,
                    )
                )
            ),
            system_instruction=types.Content(
                parts=[types.Part.from_text(text=SYSTEM_INSTRUCTION)]
            ),
            tools=[build_star_citizen_tools()],
        )

        telemetry.set_status("connecting")
        print(f"🛰️ Connexion au modèle {MODEL_ID} en cours (Voix: {VOICE_NAME})...")

        async with self.client.aio.live.connect(model=MODEL_ID, config=config) as session:
            self.session = session
            telemetry.set_status("listening")
            print(f"✅ Ordinateur de bord connecté à Gemini 3.8 LIVE ! Parlez librement.")

            # Lancement concurrent : envoi audio micro + réception événements
            send_task = asyncio.create_task(self._send_audio_loop(session))
            receive_task = asyncio.create_task(self._receive_events_loop(session))

            try:
                await asyncio.gather(send_task, receive_task)
            except asyncio.CancelledError:
                pass
            finally:
                send_task.cancel()
                receive_task.cancel()

    async def _send_audio_loop(self, session):
        """Envoie en continu les chunks microphone (16kHz PCM) vers Gemini Live."""
        try:
            async for chunk in audio_manager.get_audio_chunks():
                if chunk and len(chunk) > 0:
                    await session.send_realtime_input(
                        audio=types.Blob(data=chunk, mime_type="audio/pcm;rate=16000")
                    )
        except Exception as e:
            print(f"[GeminiLive Erreur Envoi Audio] {e}")

    async def _receive_events_loop(self, session):
        """Écoute et traite les réponses du serveur (Audio 24kHz, Tool Calls, Télémétrie)."""
        try:
            async for chunk in session.receive():
                # 1. Traitement des Tool Calls (Function Calling Star Citizen)
                if chunk.tool_call:
                    telemetry.set_status("executing_action")
                    responses = []
                    for call in chunk.tool_call.function_calls:
                        action_desc = await input_simulator.execute_ship_action(call.name, call.args or {})
                        telemetry.record_action(action_desc)
                        print(f"🎮 [Star Citizen] Action exécutée : {action_desc}")

                        responses.append(
                            types.FunctionResponse(
                                id=call.id,
                                name=call.name,
                                response={"status": "executed", "summary": action_desc},
                            )
                        )
                    # Renvoi immédiat de l'accusé de réception pour que l'IA formule sa confirmation vocale
                    await session.send_tool_response(function_responses=responses)
                    telemetry.set_status("listening")

                # 2. Traitement du contenu du serveur (Audio 24kHz & Barge-in)
                server_content = chunk.server_content
                if server_content:
                    # Support du Barge-in : interruption immédiate dès que l'utilisateur coupe la parole
                    if server_content.interrupted:
                        audio_manager.stop_playback()
                        telemetry.set_status("interrupted")
                        print("⚡ [Barge-in] Interruption détectée, audio coupé.")

                    model_turn = server_content.model_turn
                    if model_turn:
                        telemetry.set_status("speaking")
                        for part in model_turn.parts:
                            if part.inline_data and part.inline_data.data:
                                audio_data = part.inline_data.data
                                # Décodage base64 si nécessaire
                                if isinstance(audio_data, str):
                                    pcm_bytes = base64.b64decode(audio_data)
                                else:
                                    pcm_bytes = audio_data
                                audio_manager.enqueue_audio_output(pcm_bytes)

                    # Si le tour de réponse de l'IA est terminé
                    if server_content.turn_complete:
                        telemetry.set_status("listening")

                # 3. Traitement des métadonnées d'usage (Tokens consommés & Coût cumulé)
                if chunk.usage_metadata:
                    telemetry.update_from_usage_metadata(chunk.usage_metadata)

        except Exception as e:
            print(f"[GeminiLive Erreur Réception] {e}")
