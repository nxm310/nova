"""Tests unitaires pour la télémétrie et le calcul de coût."""

import unittest
from nova_live_copilot.telemetry import TelemetryTracker
from nova_live_copilot.config import PRICE_AUDIO_INPUT_PER_1M, PRICE_AUDIO_OUTPUT_PER_1M

class TestTelemetry(unittest.TestCase):
    def test_cost_calculation(self):
        tracker = TelemetryTracker(eur_rate=0.92)
        
        # Simule 10 000 tokens d'entrée et 2 000 tokens de sortie
        tracker.update_from_usage_metadata({
            "prompt_token_count": 10000,
            "candidates_token_count": 2000,
            "total_token_count": 12000
        })
        
        snap = tracker.get_snapshot()
        self.assertEqual(snap.prompt_tokens, 10000)
        self.assertEqual(snap.candidate_tokens, 2000)
        self.assertEqual(snap.total_tokens, 12000)
        
        # Coût USD attendu : (10000 / 1e6 * 0.75) + (2000 / 1e6 * 3.75) = 0.0075 + 0.0075 = 0.0150
        expected_usd = round(0.0075 + 0.0075, 6)
        expected_eur = round(expected_usd * 0.92, 6)
        
        self.assertAlmostEqual(snap.cost_usd, expected_usd, places=5)
        self.assertAlmostEqual(snap.cost_eur, expected_eur, places=5)

    def test_listener_notification(self):
        tracker = TelemetryTracker(eur_rate=0.92)
        received = []
        
        tracker.add_listener(lambda snap: received.append(snap))
        tracker.set_status("listening")
        
        self.assertEqual(len(received), 1)
        self.assertEqual(received[0].status, "listening")

if __name__ == "__main__":
    unittest.main()
