#!/usr/bin/env python3
"""
Micro-Pont Clavier DirectInput pour Star Citizen (Companion Key Bridge)
Permet à l'application compagnon Ami / Nova de presser des touches physiques en jeu
(ex: Touche 'U' pour le démarrage du vaisseau, 'N' pour le train d'atterrissage, 'B' pour le quantum, etc.)

Sur votre PC Windows de jeu :
    Double-cliquez sur LANCER_PONT_PC.bat
    ou lancez dans un terminal : python scripts/bridge.py
"""

import json
import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 5005

# Détection des modules d'injection clavier
has_directinput = False
has_pyautogui = False
is_windows = sys.platform == "win32"

try:
    import pydirectinput
    has_directinput = True
    print("[INFO] Moteur PyDirectInput detecte.")
except ImportError:
    pass

try:
    import pyautogui
    has_pyautogui = True
    print("[INFO] Moteur PyAutoGUI detecte.")
except ImportError:
    pass

# DirectInput natif Windows via ctypes (zero dependance requise)
SCANCODES = {
    'u': 0x16,  # Power toggle
    'r': 0x13,  # Flight ready
    'i': 0x17,  # Engines toggle
    'o': 0x18,  # Shields toggle
    'n': 0x31,  # Landing gear
    'b': 0x30,  # Quantum drive
    'l': 0x26,  # Headlights
    'p': 0x19,  # Weapons
    'c': 0x2E,  # Cruise control
    'k': 0x25,  # Doors
    'j': 0x24,  # VTOL
    'v': 0x2F,  # Decoupled
    'm': 0x32,  # Mining mode
    'g': 0x22,  # Gimbal lock
    'space': 0x39,
}


def send_directinput_native_windows(k: str):
    import ctypes
    PUL = ctypes.POINTER(ctypes.c_ulong)

    class KeyBdInput(ctypes.Structure):
        _fields_ = [("wVk", ctypes.c_ushort),
                    ("wScan", ctypes.c_ushort),
                    ("dwFlags", ctypes.c_ulong),
                    ("time", ctypes.c_ulong),
                    ("dwExtraInfo", PUL)]

    class HardwareInput(ctypes.Structure):
        _fields_ = [("uMsg", ctypes.c_ulong),
                    ("wParamL", ctypes.c_short),
                    ("wParamH", ctypes.c_ushort)]

    class MouseInput(ctypes.Structure):
        _fields_ = [("dx", ctypes.c_long),
                    ("dy", ctypes.c_long),
                    ("mouseData", ctypes.c_ulong),
                    ("dwFlags", ctypes.c_ulong),
                    ("time", ctypes.c_ulong),
                    ("dwExtraInfo", PUL)]

    class Input_I(ctypes.Union):
        _fields_ = [("ki", KeyBdInput),
                    ("mi", MouseInput),
                    ("hi", HardwareInput)]

    class Input(ctypes.Structure):
        _fields_ = [("type", ctypes.c_ulong),
                    ("ii", Input_I)]

    KEYEVENTF_SCANCODE = 0x0008
    KEYEVENTF_KEYUP = 0x0002

    code = SCANCODES.get(k)
    if not code:
        try:
            vk = ctypes.windll.user32.VkKeyScanA(ctypes.c_char(k[:1].encode('ascii', 'ignore') or b'a')) & 0xFF
            code = ctypes.windll.user32.MapVirtualKeyA(vk, 0)
        except Exception:
            code = 0x16  # fallback u

    extra = ctypes.c_ulong(0)
    ii_ = Input_I()

    # Appui de la touche (KeyDown)
    ii_.ki = KeyBdInput(0, code, KEYEVENTF_SCANCODE, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(1), ii_)
    ctypes.windll.user32.SendInput(1, ctypes.pointer(x), ctypes.sizeof(x))

    time.sleep(0.12)  # Durée requise pour que le moteur Star Citizen détecte la pression

    # Relâchement de la touche (KeyUp)
    ii_.ki = KeyBdInput(0, code, KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(1), ii_)
    ctypes.windll.user32.SendInput(1, ctypes.pointer(x), ctypes.sizeof(x))


def press_key(key_name: str):
    k = key_name.lower().strip()
    heure = time.strftime("%H:%M:%S")
    print(f"🎮 [{heure}] ORDRE RECU ➔ Touche : '{k.upper()}'")

    if is_windows:
        if has_directinput:
            import pydirectinput
            pydirectinput.keyDown(k)
            time.sleep(0.12)
            pydirectinput.keyUp(k)
            print(f"   ✓ Touche '{k.upper()}' envoyee via PyDirectInput dans Star Citizen !")
        else:
            send_directinput_native_windows(k)
            print(f"   ✓ Touche '{k.upper()}' envoyee via DirectInput Windows Natif (ctypes) !")
    elif has_pyautogui:
        import pyautogui
        pyautogui.keyDown(k)
        time.sleep(0.12)
        pyautogui.keyUp(k)
        print(f"   ✓ Touche '{k.upper()}' envoyee via PyAutoGUI.")
    elif sys.platform == "darwin":
        import os
        os.system(f"""osascript -e 'tell application "System Events" to keystroke "{k}"' 2>/dev/null || true""")
        print(f"   ✓ Touche '{k.upper()}' simulee sur macOS.")
    else:
        print(f"   ✓ Simulation mode test pour la touche '{k.upper()}'.")


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
            "directInput": has_directinput or is_windows,
            "platform": sys.platform,
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
        pass


def run():
    server = HTTPServer(("0.0.0.0", PORT), BridgeHandler)
    print("=" * 65)
    print(f"🚀 PONT CLAVIER STAR CITIZEN OPERATIONNEL (PORT {PORT})")
    print("   L'application compagnon Ami / Nova peut maintenant presser")
    print("   physiquement vos touches en jeu des que vous parlez !")
    print("=" * 65)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du pont.")
        server.server_close()


if __name__ == "__main__":
    run()
