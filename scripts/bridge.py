#!/usr/bin/env python3
"""
🚀 NOVA — Compagnon Tout-en-un pour Star Citizen
Serveur Web Local + Micro-Pont Clavier DirectInput

Lancez ce script ou double-cliquez sur DEMARRER_NOVA.bat :
1. Démarre le serveur local sur le port 5005
2. Ouvre automatiquement votre navigateur sur l'application Nova
3. Permet les frappes physiques en jeu sans aucune configuration requise !
"""

import os
import sys
import json
import time
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 5005

# Déterminer le dossier des fichiers statiques de l'application (out)
if getattr(sys, 'frozen', False):
    # Mode binaire autonome PyInstaller (.exe)
    BASE_DIR = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    OUT_DIR = os.path.join(BASE_DIR, 'out')
else:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    OUT_DIR = os.path.join(BASE_DIR, 'out')

if not os.path.exists(OUT_DIR):
    alt = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
    if os.path.exists(alt):
        OUT_DIR = alt

# Détection des modules d'injection clavier
has_directinput = False
has_pyautogui = False
is_windows = sys.platform == "win32"

try:
    import pydirectinput
    has_directinput = True
except ImportError:
    pass

try:
    import pyautogui
    has_pyautogui = True
except ImportError:
    pass

SCANCODES = {
    'u': 0x16, 'r': 0x13, 'i': 0x17, 'o': 0x18, 'n': 0x31, 'b': 0x30,
    'l': 0x26, 'p': 0x19, 'c': 0x2E, 'k': 0x25, 'j': 0x24, 'v': 0x2F,
    'm': 0x32, 'g': 0x22, 'space': 0x39,
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
            code = 0x16

    extra = ctypes.c_ulong(0)
    ii_ = Input_I()
    ii_.ki = KeyBdInput(0, code, KEYEVENTF_SCANCODE, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(1), ii_)
    ctypes.windll.user32.SendInput(1, ctypes.pointer(x), ctypes.sizeof(x))

    time.sleep(0.12)

    ii_.ki = KeyBdInput(0, code, KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(1), ii_)
    ctypes.windll.user32.SendInput(1, ctypes.pointer(x), ctypes.sizeof(x))


def press_key(key_name: str):
    k = key_name.lower().strip()
    heure = time.strftime("%H:%M:%S")
    print(f"🎮 [{heure}] ORDRE VOCAL ➔ Touche : [{k.upper()}]")

    if is_windows:
        if has_directinput:
            import pydirectinput
            pydirectinput.keyDown(k)
            time.sleep(0.12)
            pydirectinput.keyUp(k)
            print(f"   ✓ [{k.upper()}] envoyée via PyDirectInput dans Star Citizen !")
        else:
            send_directinput_native_windows(k)
            print(f"   ✓ [{k.upper()}] envoyée via DirectInput Natif dans Star Citizen !")
    elif has_pyautogui:
        import pyautogui
        pyautogui.keyDown(k)
        time.sleep(0.12)
        pyautogui.keyUp(k)
        print(f"   ✓ [{k.upper()}] envoyée via PyAutoGUI.")
    elif sys.platform == "darwin":
        import os
        os.system(f"""osascript -e 'tell application "System Events" to keystroke "{k}"' 2>/dev/null || true""")
        print(f"   ✓ [{k.upper()}] simulée sur macOS.")
    else:
        print(f"   ✓ [{k.upper()}] test simulation.")


class UnifiedCompanionHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=OUT_DIR, **kwargs)

    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def translate_path(self, path):
        cleaned = path.split('?')[0].split('#')[0]
        if cleaned.startswith('/nova/'):
            cleaned = cleaned[5:]
        elif cleaned == '/nova':
            cleaned = '/'

        local_path = super().translate_path(cleaned)

        if not os.path.exists(local_path) and not '.' in os.path.basename(local_path):
            return os.path.join(OUT_DIR, 'index.html')

        return local_path

    def do_GET(self):
        clean = self.path.split('?')[0]
        if clean in ('/status', '/nova/status'):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors()
            self.end_headers()
            info = {
                "status": "ready",
                "name": "Nova Star Citizen Unified Companion",
                "directInput": has_directinput or is_windows,
                "platform": sys.platform,
            }
            self.wfile.write(json.dumps(info).encode("utf-8"))
            return

        if clean in ('', '/'):
            self.send_response(302)
            self.send_header('Location', '/nova/')
            self.end_headers()
            return

        return super().do_GET()

    def do_POST(self):
        clean = self.path.split('?')[0]
        if clean in ('/press', '/nova/press'):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8"))
                key = data.get("key", "")
                if key:
                    press_key(key)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self._send_cors()
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "key": key}).encode("utf-8"))
                    return
            except Exception as e:
                print(f"[ERREUR] {e}")

        self.send_response(400)
        self._send_cors()
        self.end_headers()

    def log_message(self, format, *args):
        pass


def open_browser():
    time.sleep(1.2)
    url = f"http://localhost:{PORT}/nova/"
    try:
        webbrowser.open(url)
    except Exception:
        pass


def run():
    server = HTTPServer(("0.0.0.0", PORT), UnifiedCompanionHandler)
    print("=" * 68)
    print(f"🚀 NOVA — COMPAGNON STAR CITIZEN TOUT-EN-UN (PORT {PORT})")
    print("=" * 68)
    print(f"  ✓ Application & Pont clavier disponibles sur : http://localhost:{PORT}/nova/")
    print(f"  ✓ Ouverture automatique de votre navigateur...")
    print(f"  ✓ Commandes vocales Star Citizen prêtes (U, R, N, B, L, P, C, K...)")
    print("  ✓ Gardez simplement cette fenêtre ouverte pendant votre session de jeu !")
    print("=" * 68)

    threading.Thread(target=open_browser, daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du compagnon.")
        server.server_close()


if __name__ == "__main__":
    run()
