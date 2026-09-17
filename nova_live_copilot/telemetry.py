"""Module de télémétrie et de calcul de coût en temps réel pour Gemini 3.8 LIVE."""

import time
import threading
from dataclasses import dataclass, asdict
from typing import Callable, List, Optional
from nova_live_copilot.config import (
    PRICE_AUDIO_INPUT_PER_1M,
    PRICE_AUDIO_OUTPUT_PER_1M,
    DEFAULT_EUR_PER_USD,
)

@dataclass
class TelemetrySnapshot:
    prompt_tokens: int = 0
    candidate_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    cost_eur: float = 0.0
    tokens_per_sec: float = 0.0
    session_duration_sec: float = 0.0
    status: str = "idle"  # idle, connecting, listening, speaking, interrupted
    last_action: Optional[str] = None
    timestamp: float = 0.0

class TelemetryTracker:
    def __init__(self, eur_rate: float = DEFAULT_EUR_PER_USD):
        self.lock = threading.Lock()
        self.eur_rate = eur_rate
        self.start_time = time.time()
        self.prompt_tokens = 0
        self.candidate_tokens = 0
        self.total_tokens = 0
        self.tokens_per_sec = 0.0
        self.status = "idle"
        self.last_action = None
        self._listeners: List[Callable[[TelemetrySnapshot], None]] = []

    def set_status(self, status: str):
        with self.lock:
            self.status = status
        self._notify()

    def record_action(self, action_name: str):
        with self.lock:
            self.last_action = action_name
        self._notify()

    def update_from_usage_metadata(self, metadata: any):
        """Met à jour les compteurs de tokens et recalcule le coût financier."""
        with self.lock:
            now = time.time()
            elapsed = max(0.1, now - self.start_time)

            # Extraction robuste des champs d'usage metadata google-genai
            # Peut être un objet types.GenerateContentResponseUsageMetadata ou un dict
            if isinstance(metadata, dict):
                p_tokens = metadata.get("prompt_token_count", 0) or metadata.get("promptTokenCount", 0)
                c_tokens = metadata.get("candidates_token_count", 0) or metadata.get("candidatesTokenCount", 0)
                t_tokens = metadata.get("total_token_count", 0) or metadata.get("totalTokenCount", 0)
            else:
                p_tokens = getattr(metadata, "prompt_token_count", 0) or getattr(metadata, "promptTokenCount", 0) or 0
                c_tokens = getattr(metadata, "candidates_token_count", 0) or getattr(metadata, "candidatesTokenCount", 0) or 0
                t_tokens = getattr(metadata, "total_token_count", 0) or getattr(metadata, "totalTokenCount", 0) or 0

            # Les métadonnées de session peuvent être cumulatives ou par tour
            if p_tokens > 0:
                self.prompt_tokens = max(self.prompt_tokens, p_tokens)
            if c_tokens > 0:
                self.candidate_tokens = max(self.candidate_tokens, c_tokens)
            if t_tokens > 0:
                self.total_tokens = max(self.total_tokens, t_tokens)
            else:
                self.total_tokens = self.prompt_tokens + self.candidate_tokens

            self.tokens_per_sec = round(self.total_tokens / elapsed, 1)

        self._notify()

    def get_snapshot(self) -> TelemetrySnapshot:
        with self.lock:
            now = time.time()
            elapsed = round(now - self.start_time, 1)

            # Calcul des coûts en temps réel
            # Entrée audio : $0.75 / 1M tokens
            # Sortie audio : $3.75 / 1M tokens
            cost_in = (self.prompt_tokens / 1_000_000.0) * PRICE_AUDIO_INPUT_PER_1M
            cost_out = (self.candidate_tokens / 1_000_000.0) * PRICE_AUDIO_OUTPUT_PER_1M
            total_cost_usd = round(cost_in + cost_out, 6)
            total_cost_eur = round(total_cost_usd * self.eur_rate, 6)

            return TelemetrySnapshot(
                prompt_tokens=self.prompt_tokens,
                candidate_tokens=self.candidate_tokens,
                total_tokens=self.total_tokens,
                cost_usd=total_cost_usd,
                cost_eur=total_cost_eur,
                tokens_per_sec=self.tokens_per_sec,
                session_duration_sec=elapsed,
                status=self.status,
                last_action=self.last_action,
                timestamp=now,
            )

    def to_dict(self) -> dict:
        return asdict(self.get_snapshot())

    def add_listener(self, callback: Callable[[TelemetrySnapshot], None]):
        self._listeners.append(callback)

    def _notify(self):
        snap = self.get_snapshot()
        for cb in self._listeners:
            try:
                cb(snap)
            except Exception:
                pass

# Instance globale partagée
telemetry = TelemetryTracker()
