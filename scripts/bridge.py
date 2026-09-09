#!/usr/bin/env python3
"""
Micro-Pont Clavier pour Star Citizen (Companion Key Bridge)
Permet à l'application compagnon Ami de presser des touches physiques en jeu
(ex: Touche 'N' pour le train d'atterrissage, 'B' pour le quantum drive, etc.)

Installation sur votre PC de jeu (Windows) :
    pip install pydirectinput

Lancement :
    python bridge.py
"""

import json
import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 5005

# Détection de la méthode de frappe
has_directinput = False
has_pyautogui = False

try:
    import pydirectinput
    has_directinput = True
    print("[INFO] Moteur DirectInput activé (optimal pour Star Citizen)")
except ImportError:
    try:
        import pyautogui
        has_pyautogui = True
        print("[INFO] Moteur PyAutoGUI activé")
    except ImportError:
        print("[AVERTISSEMENT] Ni pydirectinput ni pyautogui n'est installé.")
        print("Pour que les touches fonctionnent dans le jeu, lancez : pip install pydirectinput")


def press_key(key_name: str):
    k = key_name.lower().strip()
    print(f"🎮 [COMMANDE REÇUE] Frappe de la touche : '{k.upper()}'")
    
    if has_directinput:
        import pydirectinput
        pydirectinput.keyDown(k)
        time.sleep(0.08)  # Temps d'appui nécessaire pour que le moteur Star Citizen le détecte
        pydirectinput.keyUp(k)
    elif has_pyautogui:
        import pyautogui
        pyautogui.keyDown(k)
        time.sleep(0.08)
        pyautogui.keyUp(k)
    elif sys.platform == "darwin":
        # Secours sur macOS via AppleScript
        import os
        os.system(f"""osascript -e 'tell application "System Events" to keystroke "{k}"'""")
    else:
        print(f"[SIMULATION] Touche '{k.upper()}' pressée (mode test sans driver)")


class BridgeHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        info = {
            "status": "ready",
            "name": "Star Citizen Companion Key Bridge",
            "directInput": has_directinput,
        }
        self.wfile.write(json.dumps(info).encode("utf-8"))

    def do_POST(self):
        if self.path == "/press":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8"))
                key = data.get("key", "")
                if key:
                    press_key(key)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "key": key}).encode("utf-8"))
                    return
            except Exception as e:
                print(f"[ERREUR] {e}")

        self.send_response(400)
        self._send_cors_headers()
        self.end_headers()

    def log_message(self, format, *args):
        # Réduire le spam des logs HTTP
        pass


def run():
    server = HTTPServer(("0.0.0.0", PORT), BridgeHandler)
    print("=" * 60)
    print(f"🚀 Pont Clavier Compagnon démarré sur le port {PORT}")
    print(f"   Prêt à recevoir les ordres vocaux d'Ami pour Star Citizen !")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du pont.")
        server.server_close()


if __name__ == "__main__":
    run()
