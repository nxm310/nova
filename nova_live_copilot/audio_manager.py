"""Gestionnaire audio temps réel pour Gemini 3.8 LIVE (Capture 16kHz, Restitution 24kHz et Barge-in)."""

import time
import queue
import threading
import asyncio
from typing import Optional, AsyncGenerator
from nova_live_copilot.config import (
    INPUT_SAMPLE_RATE,
    OUTPUT_SAMPLE_RATE,
    CHANNELS,
    INPUT_CHUNK_SAMPLES,
)

sounddevice = None
try:
    import sounddevice as sd
    sounddevice = sd
except ImportError:
    pass

class AudioManager:
    """Gère le streaming audio bidirectionnel asynchrone avec détection d'interruption (barge-in)."""

    def __init__(self):
        self.input_queue: asyncio.Queue[bytes] = asyncio.Queue()
        self.output_queue: queue.Queue[Optional[bytes]] = queue.Queue()
        self.is_running = False
        self.is_playing = False
        self._interrupted = threading.Event()
        self.in_stream = None
        self.out_stream = None
        self._playback_thread: Optional[threading.Thread] = None

    def start(self, loop: asyncio.AbstractEventLoop):
        """Démarre les flux de capture microphone et de restitution haut-parleur."""
        self.is_running = True
        self._interrupted.clear()

        if sounddevice is None:
            print("[AudioManager WARN] 'sounddevice' non installé. Mode simulation audio actif.")
            return

        try:
            # 1. Flux d'enregistrement microphone (16 kHz, 16-bit PCM mono)
            def input_callback(indata, frames, time_info, status):
                if not self.is_running:
                    return
                # Copie des octets bruts (int16 mono)
                chunk_bytes = bytes(indata)
                loop.call_soon_threadsafe(self.input_queue.put_nowait, chunk_bytes)

            self.in_stream = sounddevice.RawInputStream(
                samplerate=INPUT_SAMPLE_RATE,
                blocksize=INPUT_CHUNK_SAMPLES,
                channels=CHANNELS,
                dtype="int16",
                callback=input_callback,
            )
            self.in_stream.start()

            # 2. Flux de restitution haut-parleur (24 kHz, 16-bit PCM mono)
            self.out_stream = sounddevice.RawOutputStream(
                samplerate=OUTPUT_SAMPLE_RATE,
                channels=CHANNELS,
                dtype="int16",
            )
            self.out_stream.start()

            # Démarrage du thread de lecture du buffer avec barge-in
            self._playback_thread = threading.Thread(target=self._playback_loop, daemon=True)
            self._playback_thread.start()

            print("🎧 Flux Audio initialisés : Micro (16 kHz) ➔ Sortie (24 kHz).")
        except Exception as e:
            print(f"[AudioManager ERREUR] Initialisation sounddevice échouée: {e}")
            print("Mode dégradé sans périphérique physique.")

    def _playback_loop(self):
        """Boucle dédiée à l'écriture des chunks 24kHz dans la carte son."""
        while self.is_running:
            try:
                # Récupère un bloc audio de 24kHz
                chunk = self.output_queue.get(timeout=0.05)
                if chunk is None:
                    continue

                if self._interrupted.is_set():
                    # Si interrompu (barge-in), vider la file et passer
                    while not self.output_queue.empty():
                        try:
                            self.output_queue.get_nowait()
                        except queue.Empty:
                            break
                    self._interrupted.clear()
                    self.is_playing = False
                    continue

                self.is_playing = True
                if self.out_stream and not self.out_stream.closed:
                    self.out_stream.write(chunk)

            except queue.Empty:
                self.is_playing = False
            except Exception as e:
                self.is_playing = False

    def enqueue_audio_output(self, pcm_bytes: bytes):
        """Ajoute des données PCM 24kHz reçues de Gemini Live dans la file de lecture."""
        if not self._interrupted.is_set():
            self.output_queue.put(pcm_bytes)

    def stop_playback(self):
        """Interrompt immédiatement la lecture audio locale (Barge-in)."""
        self._interrupted.set()
        self.is_playing = False
        # Vider immédiatement la queue
        while not self.output_queue.empty():
            try:
                self.output_queue.get_nowait()
            except queue.Empty:
                break

    async def get_audio_chunks(self) -> AsyncGenerator[bytes, None]:
        """Générateur asynchrone délivrant les trames microphone pour Gemini Live."""
        while self.is_running:
            chunk = await self.input_queue.get()
            yield chunk

    def stop(self):
        """Arrête proprement les périphériques audio."""
        self.is_running = False
        self.stop_playback()
        if self.in_stream:
            try:
                self.in_stream.stop()
                self.in_stream.close()
            except Exception:
                pass
        if self.out_stream:
            try:
                self.out_stream.stop()
                self.out_stream.close()
            except Exception:
                pass

audio_manager = AudioManager()
