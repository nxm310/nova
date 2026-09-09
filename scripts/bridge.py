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
import socket
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 5005

def find_out_dir() -> str:
    """Détermine le dossier des fichiers statiques exportés de l'application."""
    candidates = []
    if getattr(sys, 'frozen', False):
        # Mode binaire autonome PyInstaller (.exe)
        exe_dir = os.path.dirname(sys.executable)
        meipass = getattr(sys, '_MEIPASS', None)
        if meipass:
            candidates.append(os.path.join(meipass, 'out'))
            candidates.append(meipass)
        candidates.append(os.path.join(exe_dir, 'out'))
        candidates.append(os.path.join(exe_dir, '_internal', 'out'))
    else:
        # Mode script Python direct
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        candidates.append(os.path.join(base_dir, 'out'))
        candidates.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'))
        candidates.append(os.path.join(os.getcwd(), 'out'))

    # Priorité 1 : candidat contenant index.html
    for c in candidates:
        if os.path.exists(c) and os.path.isdir(c) and os.path.exists(os.path.join(c, 'index.html')):
            return c

    # Priorité 2 : premier dossier candidat existant
    for c in candidates:
        if os.path.exists(c) and os.path.isdir(c):
            return c

    return candidates[0] if candidates else os.path.join(os.getcwd(), 'out')

OUT_DIR = find_out_dir()
BASE_DIR = os.path.dirname(OUT_DIR)

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
    # Lettres
    'a': 0x1E, 'b': 0x30, 'c': 0x2E, 'd': 0x20, 'e': 0x12, 'f': 0x21,
    'g': 0x22, 'h': 0x23, 'i': 0x17, 'j': 0x24, 'k': 0x25, 'l': 0x26,
    'm': 0x32, 'n': 0x31, 'o': 0x18, 'p': 0x19, 'q': 0x10, 'r': 0x13,
    's': 0x1F, 't': 0x14, 'u': 0x16, 'v': 0x2F, 'w': 0x11, 'x': 0x2D,
    'y': 0x15, 'z': 0x2C,
    # Chiffres
    '1': 0x02, '2': 0x03, '3': 0x04, '4': 0x05, '5': 0x06,
    '6': 0x07, '7': 0x08, '8': 0x09, '9': 0x0A, '0': 0x0B,
    # Touches de fonction
    'f1': 0x3B, 'f2': 0x3C, 'f3': 0x3D, 'f4': 0x3E, 'f5': 0x3F, 'f6': 0x40,
    'f7': 0x41, 'f8': 0x42, 'f9': 0x43, 'f10': 0x44, 'f11': 0x57, 'f12': 0x58,
    # Modificateurs Star Citizen (LALT est le modificateur standard du jeu)
    'alt': 0x38, 'lalt': 0x38, 'ralt': (0x38, True),
    'ctrl': 0x1D, 'lctrl': 0x1D, 'rctrl': (0x1D, True),
    'shift': 0x2A, 'lshift': 0x2A, 'rshift': 0x36,
    # Touches spéciales
    'space': 0x39, 'espace': 0x39, 'tab': 0x0F, 'enter': 0x1C, 'return': 0x1C,
    'esc': 0x01, 'escape': 0x01, 'backspace': 0x0E,
    'up': (0x48, True), 'down': (0x50, True), 'left': (0x4B, True), 'right': (0x4D, True),
    'insert': (0x52, True), 'delete': (0x53, True), 'home': (0x47, True), 'end': (0x4F, True),
    'pageup': (0x49, True), 'pagedown': (0x51, True),
}

MODIFIER_NAMES = {'alt', 'lalt', 'ralt', 'ctrl', 'lctrl', 'rctrl', 'shift', 'lshift', 'rshift'}

def parse_key_combo(key_str: str):
    """Découpe une combinaison comme 'alt+n', 'lalt+j', 'shift+u', 'ctrl+c'."""
    raw = key_str.lower().replace(' ', '+').replace('-', '+')
    parts = [p.strip() for p in raw.split('+') if p.strip()]
    if not parts:
        return [], 'u'

    mods = []
    keys = []
    for p in parts:
        if p in MODIFIER_NAMES:
            mods.append(p)
        else:
            keys.append(p)

    main_key = keys[0] if keys else (mods[-1] if mods else 'u')
    if not keys and mods:
        mods = mods[:-1]

    return mods, main_key

def is_admin_windows() -> bool:
    if not is_windows:
        return True
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False

def ensure_star_citizen_focus():
    """Tente de donner le focus à Star Citizen s'il est en arrière-plan."""
    if not is_windows:
        return
    try:
        import ctypes
        hwnd = ctypes.windll.user32.FindWindowA(None, b"Star Citizen")
        if not hwnd:
            hwnd = ctypes.windll.user32.FindWindowA(b"CryENGINE", None)
        if hwnd:
            fg = ctypes.windll.user32.GetForegroundWindow()
            if fg != hwnd:
                ctypes.windll.user32.ShowWindow(hwnd, 9)  # SW_RESTORE
                ctypes.windll.user32.SetForegroundWindow(hwnd)
                time.sleep(0.04)
    except Exception:
        pass

def send_directinput_native_key(k: str, key_up: bool = False):
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
    KEYEVENTF_EXTENDEDKEY = 0x0001

    entry = SCANCODES.get(k)
    is_extended = False
    if isinstance(entry, tuple):
        code, is_extended = entry
    elif isinstance(entry, int):
        code = entry
    else:
        try:
            vk = ctypes.windll.user32.VkKeyScanA(ctypes.c_char(k[:1].encode('ascii', 'ignore') or b'a')) & 0xFF
            code = ctypes.windll.user32.MapVirtualKeyA(vk, 0)
        except Exception:
            code = 0x16

    flags = KEYEVENTF_SCANCODE
    if is_extended:
        flags |= KEYEVENTF_EXTENDEDKEY
    if key_up:
        flags |= KEYEVENTF_KEYUP

    extra = ctypes.c_ulong(0)
    ii_ = Input_I()
    ii_.ki = KeyBdInput(0, code, flags, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(1), ii_)
    ctypes.windll.user32.SendInput(1, ctypes.pointer(x), ctypes.sizeof(x))

def to_pydirectinput_key(k: str) -> str:
    mapping = {
        'lalt': 'altleft',
        'ralt': 'altright',
        'alt': 'alt',
        'lctrl': 'ctrlleft',
        'rctrl': 'ctrlright',
        'ctrl': 'ctrl',
        'lshift': 'shiftleft',
        'rshift': 'shiftright',
        'shift': 'shift',
        'espace': 'space',
        'return': 'enter',
        'escape': 'esc',
    }
    return mapping.get(k, k)

def press_key(key_name: str):
    mods, main_key = parse_key_combo(key_name)
    combo_str = '+'.join(mods + [main_key]).upper()
    heure = time.strftime("%H:%M:%S")
    print(f"🎮 [{heure}] ORDRE VOCAL ➔ Combinaison : [{combo_str}]")

    # Tenter d'assurer le focus sur Star Citizen
    ensure_star_citizen_focus()

    if is_windows:
        if not is_admin_windows():
            print("   ⚠️ AVERTISSEMENT : Le script ne tourne pas en Administrateur !")
            print("   Star Citizen peut bloquer cette frappe. Utilisez DEMARRER_NOVA.bat en Administrateur.")

        if has_directinput:
            import pydirectinput
            try:
                # 1. Enfoncer les modificateurs (ex: ALT, CTRL)
                for m in mods:
                    pydirectinput.keyDown(to_pydirectinput_key(m))
                time.sleep(0.02)

                # 2. Enfoncer la touche principale
                pydirectinput.keyDown(to_pydirectinput_key(main_key))

                # 3. Maintien de 180ms (essentiel pour la détection frame par frame de Star Citizen)
                time.sleep(0.18)

                # 4. Relâcher la touche principale
                pydirectinput.keyUp(to_pydirectinput_key(main_key))
                time.sleep(0.02)

                # 5. Relâcher les modificateurs dans l'ordre inverse
                for m in reversed(mods):
                    pydirectinput.keyUp(to_pydirectinput_key(m))

                print(f"   ✓ [{combo_str}] injectée avec succès (PyDirectInput 180ms) !")
                return
            except Exception as ex:
                print(f"   ℹ Bascule sur DirectInput natif suite à: {ex}")

        # Fallback DirectInput natif Windows (SendInput ScanCodes)
        for m in mods:
            send_directinput_native_key(m, key_up=False)
        time.sleep(0.02)

        send_directinput_native_key(main_key, key_up=False)
        time.sleep(0.18)
        send_directinput_native_key(main_key, key_up=True)
        time.sleep(0.02)

        for m in reversed(mods):
            send_directinput_native_key(m, key_up=True)

        print(f"   ✓ [{combo_str}] injectée avec succès (DirectInput Natif Windows 180ms) !")

    elif has_pyautogui:
        import pyautogui
        for m in mods:
            pyautogui.keyDown(m)
        time.sleep(0.02)
        pyautogui.keyDown(main_key)
        time.sleep(0.18)
        pyautogui.keyUp(main_key)
        time.sleep(0.02)
        for m in reversed(mods):
            pyautogui.keyUp(m)
        print(f"   ✓ [{combo_str}] envoyée via PyAutoGUI.")

    elif sys.platform == "darwin":
        import os
        # Simulation macOS pour tests de développement
        using_clause = ""
        if 'alt' in mods or 'lalt' in mods:
            using_clause = "using {option down}"
        elif 'ctrl' in mods or 'lctrl' in mods:
            using_clause = "using {control down}"
        elif 'shift' in mods or 'lshift' in mods:
            using_clause = "using {shift down}"
        os.system(f"""osascript -e 'tell application "System Events" to keystroke "{main_key}" {using_clause}' 2>/dev/null || true""")
        print(f"   ✓ [{combo_str}] simulée sur macOS.")
    else:
        print(f"   ✓ [{combo_str}] simulation console.")


def get_persistent_config_path() -> str:
    """Renvoie le chemin du fichier de configuration persistant utilisateur.
    Sur Windows : %APPDATA%\\Nova\\nova_config.json (conserve tous les réglages lors des mises à jour du .exe).
    Sur macOS : ~/Library/Application Support/Nova/nova_config.json
    Sur Linux : ~/.config/nova/nova_config.json
    """
    if sys.platform == "win32":
        appdata = os.getenv("APPDATA") or os.path.expanduser("~\\AppData\\Roaming")
        folder = os.path.join(appdata, "Nova")
    elif sys.platform == "darwin":
        folder = os.path.expanduser("~/Library/Application Support/Nova")
    else:
        folder = os.path.expanduser("~/.config/nova")

    try:
        os.makedirs(folder, exist_ok=True)
    except Exception:
        folder = BASE_DIR

    return os.path.join(folder, "nova_config.json")

def load_persistent_config() -> dict:
    config_path = get_persistent_config_path()
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[CONFIG] Erreur lecture {config_path}: {e}")

    # Fallback : vérifier s'il existe un nova_config.json local
    local_cfg = os.path.join(BASE_DIR, "nova_config.json")
    if os.path.exists(local_cfg):
        try:
            with open(local_cfg, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    return {}

def save_persistent_config(data: dict) -> bool:
    config_path = get_persistent_config_path()
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"💾 [CONFIG] Configuration utilisateur persistée : {config_path}")
        return True
    except Exception as e:
        print(f"[CONFIG] Erreur écriture {config_path}: {e}")
        return False

class UnifiedCompanionHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=OUT_DIR, **kwargs)

    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")

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
                "isAdmin": is_admin_windows(),
                "configPath": get_persistent_config_path(),
                "platform": sys.platform,
            }
            self.wfile.write(json.dumps(info).encode("utf-8"))
            return

        if clean in ('/config', '/nova/config'):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors()
            self.end_headers()
            cfg = load_persistent_config()
            self.wfile.write(json.dumps(cfg).encode("utf-8"))
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

        if clean in ('/config', '/nova/config'):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8"))
                if isinstance(data, dict):
                    ok = save_persistent_config(data)
                    self.send_response(200 if ok else 500)
                    self.send_header("Content-Type", "application/json")
                    self._send_cors()
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": ok, "path": get_persistent_config_path()}).encode("utf-8"))
                    return
            except Exception as e:
                print(f"[CONFIG ERREUR] {e}")

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
    admin_ok = is_admin_windows()

    print("=" * 68)
    print(f"🚀 NOVA — COMPAGNON STAR CITIZEN TOUT-EN-UN (PORT {PORT})")
    print("=" * 68)
    print(f"  ✓ Application & Pont clavier disponibles sur : http://localhost:{PORT}/nova/")
    print(f"  ✓ Dossier des fichiers web : {OUT_DIR}")
    print(f"  ✓ Frappes DirectInput Star Citizen : {'ACTIF (180ms)' if (has_directinput or is_windows) else 'SIMULATION'}")
    if is_windows:
        if admin_ok:
            print("  ✓ Privilèges Administrateur : ACTIFS (Star Citizen débloqué)")
        else:
            print("  ⚠️ ATTENTION : Droits Administrateur NON DÉTECTÉS !")
            print("     Star Citizen bloque les touches si le script n'est pas Administrateur.")
            print("     👉 Relancez via 'DEMARRER_NOVA.bat' ou Clic droit > Exécuter en tant qu'administrateur.")
    print(f"  ✓ Configurations conservées dans : {get_persistent_config_path()}")
    print("-" * 68)
    print("  💡 Gardez cette fenêtre ouverte en arrière-plan pendant votre jeu !")
    print("=" * 68)

    # Démarrage du serveur web et pont (DualStack IPv4/IPv6 avec repli IPv4)
    server = None
    try:
        class DualStackServer(HTTPServer):
            address_family = socket.AF_INET6
            def server_bind(self):
                try:
                    self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
                except Exception:
                    pass
                super().server_bind()

        server = DualStackServer(("", PORT), UnifiedCompanionHandler)
    except Exception:
        try:
            server = HTTPServer(("0.0.0.0", PORT), UnifiedCompanionHandler)
        except Exception as err:
            print(f"[ERREUR FATALE] Impossible de démarrer le serveur sur le port {PORT}: {err}")
            return

    threading.Thread(target=open_browser, daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du compagnon.")
        server.server_close()


if __name__ == "__main__":
    run()
