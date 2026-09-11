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
import shutil
import zipfile
import threading
import webbrowser
import subprocess
import re
import urllib.request
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
try:
    from http.server import ThreadingHTTPServer
except ImportError:
    ThreadingHTTPServer = HTTPServer

try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except Exception:
    pass

PORT = 5005
CURRENT_VERSION = "1.2.0"

def find_root_dir() -> str:
    """Détermine le dossier racine de l'application Nova (dossier contenant Nova-StarCitizen.exe, DEMARRER_NOVA.bat ou package.json)."""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    # Mode script Python (bridge.py se trouve dans scripts/ ou à la racine)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(script_dir)
    if os.path.exists(os.path.join(parent_dir, "package.json")) or os.path.exists(os.path.join(parent_dir, "DEMARRER_NOVA.bat")):
        return parent_dir
    return script_dir

def find_out_dir() -> str:
    """Détermine le dossier des fichiers statiques exportés de l'application."""
    root = find_root_dir()
    candidates = []
    if getattr(sys, 'frozen', False):
        # Mode binaire autonome PyInstaller (.exe)
        meipass = getattr(sys, '_MEIPASS', None)
        if meipass:
            candidates.append(os.path.join(meipass, 'out'))
            candidates.append(meipass)
        candidates.append(os.path.join(root, '_internal', 'out'))
        candidates.append(os.path.join(root, 'out'))
    else:
        # Mode script Python direct
        candidates.append(os.path.join(root, 'out'))
        candidates.append(os.path.join(root, '_internal', 'out'))
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

    return os.path.join(root, 'out')

ROOT_DIR = find_root_dir()
OUT_DIR = find_out_dir()
BASE_DIR = ROOT_DIR

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

# Table DirectInput Hardware ScanCodes pour clavier Français AZERTY (ISO 105 touches)
SCANCODES_AZERTY = {
    # Lettres rangée 2 (haut) : A Z E R T Y U I O P
    'a': 0x10, 'z': 0x11, 'e': 0x12, 'r': 0x13, 't': 0x14,
    'y': 0x15, 'u': 0x16, 'i': 0x17, 'o': 0x18, 'p': 0x19,
    # Lettres rangée 3 (milieu) : Q S D F G H J K L M
    'q': 0x1E, 's': 0x1F, 'd': 0x20, 'f': 0x21, 'g': 0x22,
    'h': 0x23, 'j': 0x24, 'k': 0x25, 'l': 0x26, 'm': 0x27,
    # Lettres rangée 4 (bas) : W X C V B N
    'w': 0x2C, 'x': 0x2D, 'c': 0x2E, 'v': 0x2F, 'b': 0x30, 'n': 0x31,
    # Ponctuation & symboles AZERTY
    ',': 0x32, ';': 0x33, ':': 0x34, '!': 0x35,
    '^': 0x1A, '$': 0x1B, 'ù': 0x28, '*': 0x2B, '<': 0x56, '>': 0x56,
    # Rangée supérieure chiffres / caractères spéciaux
    '1': 0x02, '&': 0x02,
    '2': 0x03, 'é': 0x03,
    '3': 0x04, '"': 0x04,
    '4': 0x05, "'": 0x05,
    '5': 0x06, '(': 0x06,
    '6': 0x07, '-': 0x07,
    '7': 0x08, 'è': 0x08,
    '8': 0x09, '_': 0x09,
    '9': 0x0A, 'ç': 0x0A,
    '0': 0x0B, 'à': 0x0B,
    ')': 0x0C, '°': 0x0C,
    '=': 0x0D, '+': 0x0D,
    # Pavé numérique (Numpad)
    'num0': 0x52, 'numpad0': 0x52,
    'num1': 0x4F, 'numpad1': 0x4F,
    'num2': 0x50, 'numpad2': 0x50,
    'num3': 0x51, 'numpad3': 0x51,
    'num4': 0x4B, 'numpad4': 0x4B,
    'num5': 0x4C, 'numpad5': 0x4C,
    'num6': 0x4D, 'numpad6': 0x4D,
    'num7': 0x47, 'numpad7': 0x47,
    'num8': 0x48, 'numpad8': 0x48,
    'num9': 0x49, 'numpad9': 0x49,
    'numlock': 0x45,
    'num/': (0x35, True), 'numpad/': (0x35, True),
    'num*': 0x37, 'numpad*': 0x37,
    'num-': 0x4A, 'numpad-': 0x4A,
    'num+': 0x4E, 'numpad+': 0x4E,
    'numenter': (0x1C, True), 'numpadenter': (0x1C, True),
    'num.': 0x53, 'numpad.': 0x53, 'numpaddot': 0x53,
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

# Table DirectInput Hardware ScanCodes pour clavier Américain QWERTY (ANSI)
SCANCODES_QWERTY = {
    # Lettres rangée 2 : Q W E R T Y U I O P
    'q': 0x10, 'w': 0x11, 'e': 0x12, 'r': 0x13, 't': 0x14,
    'y': 0x15, 'u': 0x16, 'i': 0x17, 'o': 0x18, 'p': 0x19,
    # Lettres rangée 3 : A S D F G H J K L ; '
    'a': 0x1E, 's': 0x1F, 'd': 0x20, 'f': 0x21, 'g': 0x22,
    'h': 0x23, 'j': 0x24, 'k': 0x25, 'l': 0x26, ';': 0x27, "'": 0x28,
    # Lettres rangée 4 : Z X C V B N M , . /
    'z': 0x2C, 'x': 0x2D, 'c': 0x2E, 'v': 0x2F, 'b': 0x30, 'n': 0x31,
    'm': 0x32, ',': 0x33, '.': 0x34, '/': 0x35,
    # Chiffres rangée supérieure
    '1': 0x02, '2': 0x03, '3': 0x04, '4': 0x05, '5': 0x06,
    '6': 0x07, '7': 0x08, '8': 0x09, '9': 0x0A, '0': 0x0B,
    '-': 0x0C, '=': 0x0D,
    # Pavé numérique (Numpad)
    'num0': 0x52, 'numpad0': 0x52,
    'num1': 0x4F, 'numpad1': 0x4F,
    'num2': 0x50, 'numpad2': 0x50,
    'num3': 0x51, 'numpad3': 0x51,
    'num4': 0x4B, 'numpad4': 0x4B,
    'num5': 0x4C, 'numpad5': 0x4C,
    'num6': 0x4D, 'numpad6': 0x4D,
    'num7': 0x47, 'numpad7': 0x47,
    'num8': 0x48, 'numpad8': 0x48,
    'num9': 0x49, 'numpad9': 0x49,
    'numlock': 0x45,
    'num/': (0x35, True), 'numpad/': (0x35, True),
    'num*': 0x37, 'numpad*': 0x37,
    'num-': 0x4A, 'numpad-': 0x4A,
    'num+': 0x4E, 'numpad+': 0x4E,
    'numenter': (0x1C, True), 'numpadenter': (0x1C, True),
    'num.': 0x53, 'numpad.': 0x53, 'numpaddot': 0x53,
    # Touches de fonction
    'f1': 0x3B, 'f2': 0x3C, 'f3': 0x3D, 'f4': 0x3E, 'f5': 0x3F, 'f6': 0x40,
    'f7': 0x41, 'f8': 0x42, 'f9': 0x43, 'f10': 0x44, 'f11': 0x57, 'f12': 0x58,
    # Modificateurs
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

CURRENT_KEYBOARD_LAYOUT = "azerty"

def get_active_keyboard_layout() -> str:
    global CURRENT_KEYBOARD_LAYOUT
    return CURRENT_KEYBOARD_LAYOUT

def set_active_keyboard_layout(layout: str):
    global CURRENT_KEYBOARD_LAYOUT
    clean = (layout or "").lower().strip()
    if clean in ("azerty", "qwerty"):
        CURRENT_KEYBOARD_LAYOUT = clean
    sync_pydirectinput_scancodes(CURRENT_KEYBOARD_LAYOUT)

def get_scancode_entry(k: str, layout: str = None):
    use_layout = layout if layout in ("azerty", "qwerty") else CURRENT_KEYBOARD_LAYOUT
    table = SCANCODES_AZERTY if use_layout == "azerty" else SCANCODES_QWERTY
    entry = table.get(k.lower())
    if entry is not None:
        return entry
    fallback_table = SCANCODES_QWERTY if use_layout == "azerty" else SCANCODES_AZERTY
    return fallback_table.get(k.lower(), 0x16)

def sync_pydirectinput_scancodes(layout_name: str = "azerty"):
    if not has_directinput:
        return
    try:
        import pydirectinput
        table = SCANCODES_AZERTY if layout_name.lower() == "azerty" else SCANCODES_QWERTY
        for k, v in table.items():
            code = v[0] if isinstance(v, tuple) else v
            pydirectinput.KEYBOARD_MAPPING[k] = code
    except Exception as e:
        print(f"⚠️ [LAYOUT] Erreur synchronisation pydirectinput: {e}")

# Compatibilité descendante
SCANCODES = SCANCODES_AZERTY

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
    """Restaure Star Citizen s'il est minimisé sans perturber le micro du navigateur."""
    if not is_windows:
        return
    try:
        import ctypes
        hwnd = ctypes.windll.user32.FindWindowA(None, b"Star Citizen")
        if not hwnd:
            hwnd = ctypes.windll.user32.FindWindowA(b"CryENGINE", None)
        if hwnd:
            if ctypes.windll.user32.IsIconic(hwnd):
                ctypes.windll.user32.ShowWindow(hwnd, 9)  # SW_RESTORE
                time.sleep(0.04)
    except Exception:
        pass

def send_directinput_native_key(k: str, key_up: bool = False, layout: str = None):
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

    entry = get_scancode_entry(k, layout)
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

def press_key(key_name: str, duration: float = 0.18, layout: str = None):
    eff_layout = layout.lower() if layout in ("azerty", "qwerty") else CURRENT_KEYBOARD_LAYOUT
    sync_pydirectinput_scancodes(eff_layout)
    mods, main_key = parse_key_combo(key_name)
    combo_str = '+'.join(mods + [main_key]).upper()
    dur_ms = int(round(duration * 1000))
    duration_label = f" (APPUI LONG {duration:.1f}s)" if duration >= 0.8 else f" (APPUI COURT {dur_ms}ms)"
    heure = time.strftime("%H:%M:%S")
    sc_val = get_scancode_entry(main_key, eff_layout)
    sc_code = sc_val[0] if isinstance(sc_val, tuple) else sc_val
    print(f"🎮 [{heure}] ORDRE VOCAL [{eff_layout.upper()}] ➔ Combinaison : [{combo_str}] (ScanCode 0x{sc_code:02X}){duration_label}")

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

                # 3. Maintien selon durée (ex: 0.18s pour court, 1.5s pour appui long)
                time.sleep(duration)

                # 4. Relâcher la touche principale
                pydirectinput.keyUp(to_pydirectinput_key(main_key))
                time.sleep(0.02)

                # 5. Relâcher les modificateurs dans l'ordre inverse
                for m in reversed(mods):
                    pydirectinput.keyUp(to_pydirectinput_key(m))

                dur_text = f"{duration:.1f}s" if duration >= 0.8 else f"{dur_ms}ms"
                print(f"   ✓ [{combo_str}] injectée avec succès (PyDirectInput [{eff_layout.upper()}] {dur_text}) !")
                return
            except Exception as ex:
                print(f"   ℹ Bascule sur DirectInput natif suite à: {ex}")

        # Fallback DirectInput natif Windows (SendInput ScanCodes)
        for m in mods:
            send_directinput_native_key(m, key_up=False, layout=eff_layout)
        time.sleep(0.02)

        send_directinput_native_key(main_key, key_up=False, layout=eff_layout)
        time.sleep(duration)
        send_directinput_native_key(main_key, key_up=True, layout=eff_layout)
        time.sleep(0.02)

        for m in reversed(mods):
            send_directinput_native_key(m, key_up=True, layout=eff_layout)

        dur_text = f"{duration:.1f}s" if duration >= 0.8 else f"{dur_ms}ms"
        print(f"   ✓ [{combo_str}] injectée avec succès (DirectInput Natif Windows [{eff_layout.upper()}] {dur_text}) !")

    elif has_pyautogui:
        import pyautogui
        for m in mods:
            pyautogui.keyDown(m)
        time.sleep(0.02)
        pyautogui.keyDown(main_key)
        time.sleep(duration)
        pyautogui.keyUp(main_key)
        time.sleep(0.02)
        for m in reversed(mods):
            pyautogui.keyUp(m)
        dur_text = f"{duration:.1f}s" if duration >= 0.8 else f"{dur_ms}ms"
        print(f"   ✓ [{combo_str}] envoyée via PyAutoGUI ({dur_text}).")

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
        dur_text = f"{duration:.1f}s" if duration >= 0.8 else f"{dur_ms}ms"
        if duration >= 0.8:
            os.system(f"""osascript -e 'tell application "System Events" to key down "{main_key}"' -e 'delay {duration}' -e 'tell application "System Events" to key up "{main_key}"' 2>/dev/null || true""")
        else:
            os.system(f"""osascript -e 'tell application "System Events" to keystroke "{main_key}" {using_clause}' 2>/dev/null || true""")
        print(f"   ✓ [{combo_str}] simulée sur macOS ({dur_text}).")
    else:
        dur_text = f"{duration:.1f}s" if duration >= 0.8 else f"{dur_ms}ms"
        print(f"   ✓ [{combo_str}] simulation console ({dur_text}).")


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
    cfg = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        except Exception as e:
            print(f"[CONFIG] Erreur lecture {config_path}: {e}")

    # Fallback : vérifier s'il existe un nova_config.json local
    if not cfg:
        local_cfg = os.path.join(BASE_DIR, "nova_config.json")
        if os.path.exists(local_cfg):
            try:
                with open(local_cfg, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
            except Exception:
                pass

    if isinstance(cfg, dict) and "keyboardLayout" in cfg:
        set_active_keyboard_layout(cfg["keyboardLayout"])

    return cfg or {}

def save_persistent_config(data: dict) -> bool:
    if isinstance(data, dict) and "keyboardLayout" in data:
        set_active_keyboard_layout(data["keyboardLayout"])
    config_path = get_persistent_config_path()
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"💾 [CONFIG] Configuration utilisateur persistée : {config_path}")
        return True
    except Exception as e:
        print(f"[CONFIG] Erreur écriture {config_path}: {e}")
        return False

def check_github_update() -> dict:
    """Vérifie si une mise à jour est disponible sur GitHub Releases et Commits."""
    api_release = "https://api.github.com/repos/nxm310/nova/releases/latest"
    api_commits = "https://api.github.com/repos/nxm310/nova/commits/main"

    commit_info = {}
    local_commit = ""

    # 1. Vérifier si un dépôt Git local existe et récupérer son commit
    git_dir = os.path.join(BASE_DIR, ".git")
    if os.path.exists(git_dir):
        try:
            res = subprocess.run(["git", "rev-parse", "HEAD"], cwd=BASE_DIR, capture_output=True, text=True, timeout=3)
            if res.returncode == 0:
                local_commit = res.stdout.strip()
        except Exception:
            pass

    # 2. Récupérer le dernier commit sur GitHub
    try:
        req_commit = urllib.request.Request(
            api_commits,
            headers={"User-Agent": "Nova-Companion-Updater", "Accept": "application/vnd.github.v3+json"}
        )
        with urllib.request.urlopen(req_commit, timeout=5) as res:
            if res.status == 200:
                c_data = json.loads(res.read().decode("utf-8"))
                commit_info = {
                    "sha": c_data.get("sha", "")[:7],
                    "fullSha": c_data.get("sha", ""),
                    "message": c_data.get("commit", {}).get("message", ""),
                    "author": c_data.get("commit", {}).get("author", {}).get("name", ""),
                    "date": c_data.get("commit", {}).get("author", {}).get("date", ""),
                    "url": c_data.get("html_url", ""),
                }
    except Exception as ce:
        print(f"[MISE À JOUR] Info commit distant non disponible : {ce}")

    # 3. Récupérer la dernière release GitHub
    tag = ""
    notes = ""
    download_url = ""
    try:
        req_rel = urllib.request.Request(
            api_release,
            headers={"User-Agent": "Nova-Companion-Updater", "Accept": "application/vnd.github.v3+json"}
        )
        with urllib.request.urlopen(req_rel, timeout=5) as res:
            if res.status == 200:
                r_data = json.loads(res.read().decode("utf-8"))
                tag = r_data.get("tag_name", "v1.0.0")
                notes = r_data.get("body", "")
                for asset in r_data.get("assets", []):
                    if asset.get("name", "").endswith(".zip"):
                        download_url = asset.get("browser_download_url")
                        break
    except Exception as re:
        print(f"[MISE À JOUR] Info release distante non disponible : {re}")

    if not download_url:
        download_url = "https://github.com/nxm310/nova/releases/download/v1.0.1/Nova-StarCitizen-Windows.zip"

    # Comparaison de version / commit
    remote_version = tag.lstrip('v') if tag else CURRENT_VERSION
    has_update = False

    if local_commit and commit_info.get("fullSha"):
        has_update = (local_commit != commit_info["fullSha"])
    elif tag:
        has_update = (remote_version != CURRENT_VERSION)

    return {
        "success": True,
        "currentVersion": CURRENT_VERSION,
        "latestVersion": remote_version,
        "hasUpdate": has_update,
        "notes": notes or commit_info.get("message", ""),
        "downloadUrl": download_url,
        "commit": commit_info,
        "localCommit": local_commit[:7] if local_commit else ""
    }

def schedule_restart(root_dir: str):
    """Programme le redémarrage propre de Nova en tâche de fond pour appliquer la mise à jour."""
    def _do_restart():
        time.sleep(1.2)
        staging_dir = os.path.join(root_dir, ".update_staging")
        if sys.platform == "win32":
            import tempfile
            bat_path = os.path.join(tempfile.gettempdir(), "nova_restart_updater.bat")
            launcher = "Nova-StarCitizen.exe" if getattr(sys, 'frozen', False) else "DEMARRER_NOVA.bat"
            bat_content = f"""@echo off
chcp 65001 >nul
timeout /t 2 /nobreak >nul
if exist "{staging_dir}" (
    xcopy /s /e /y /i "{staging_dir}\\*" "{root_dir}\\" >nul 2>&1
    rmdir /s /q "{staging_dir}" >nul 2>&1
)
cd /d "{root_dir}"
if exist "{launcher}" (
    start "" "{launcher}"
) else if exist "DEMARRER_NOVA.bat" (
    start "" "DEMARRER_NOVA.bat"
) else if exist "Nova-StarCitizen.exe" (
    start "" "Nova-StarCitizen.exe"
)
exit
"""
            try:
                with open(bat_path, "w", encoding="utf-8") as f:
                    f.write(bat_content)
                flags = 0
                if hasattr(subprocess, "CREATE_NEW_PROCESS_GROUP"):
                    flags |= subprocess.CREATE_NEW_PROCESS_GROUP
                if hasattr(subprocess, "DETACHED_PROCESS"):
                    flags |= subprocess.DETACHED_PROCESS
                subprocess.Popen(["cmd.exe", "/c", bat_path], shell=True, creationflags=flags)
                print("🔄 [RESTART] Script de mise à jour et relance lancé avec succès.")
            except Exception as be:
                print(f"⚠️ [RESTART] Erreur script batch : {be}")
            os._exit(0)
        else:
            # macOS / Linux
            try:
                cmd = [sys.executable] + sys.argv
                subprocess.Popen(cmd, cwd=root_dir)
                print("🔄 [RESTART] Nova redémarré sur macOS / Linux.")
            except Exception as ex:
                print(f"⚠️ [RESTART] Erreur relance macOS : {ex}")
            os._exit(0)

    t = threading.Thread(target=_do_restart, daemon=True)
    t.start()

def apply_github_update(download_url: str = "") -> dict:
    """Télécharge la mise à jour depuis GitHub ou exécute git pull, puis redémarre Nova."""
    root_dir = find_root_dir()
    git_dir = os.path.join(root_dir, ".git")

    git_success = False
    git_msg = ""
    if os.path.exists(git_dir):
        try:
            print("🔄 [MISE À JOUR] Dépôt Git local détecté. Exécution de 'git pull'...")
            proc = subprocess.run(["git", "pull", "origin", "main"], cwd=root_dir, capture_output=True, text=True, timeout=30)
            if proc.returncode == 0:
                print(f"✓ [MISE À JOUR] git pull réussi : {proc.stdout.strip()}")
                git_success = True
                git_msg = proc.stdout.strip()
            else:
                print(f"⚠️ [MISE À JOUR] git pull a échoué ({proc.stderr.strip()}), repli sur ZIP...")
        except Exception as ge:
            print(f"⚠️ [MISE À JOUR] git non disponible ({ge}), repli sur ZIP...")

    if not git_success:
        if not download_url:
            download_url = f"https://github.com/nxm310/nova/releases/download/v{CURRENT_VERSION}/Nova-StarCitizen-Windows.zip"

        temp_zip = os.path.join(root_dir, "nova_update_temp.zip")
        staging_dir = os.path.join(root_dir, ".update_staging")
        try:
            print(f"📥 [MISE À JOUR] Téléchargement depuis {download_url}...")
            req = urllib.request.Request(download_url, headers={"User-Agent": "Nova-Companion-Updater"})
            with urllib.request.urlopen(req, timeout=60) as response, open(temp_zip, 'wb') as out_file:
                shutil.copyfileobj(response, out_file)

            print("📦 [MISE À JOUR] Extraction des nouveaux fichiers...")
            if os.path.exists(staging_dir):
                shutil.rmtree(staging_dir, ignore_errors=True)
            os.makedirs(staging_dir, exist_ok=True)

            with zipfile.ZipFile(temp_zip, 'r') as zip_ref:
                zip_ref.extractall(staging_dir)

            if os.path.exists(temp_zip):
                try:
                    os.remove(temp_zip)
                except Exception:
                    pass

            # Copie immédiate des fichiers statiques d'interface web (fichiers non verrouillés)
            for sub in [os.path.join("_internal", "out"), "out"]:
                src_out = os.path.join(staging_dir, sub)
                if os.path.exists(src_out):
                    for dst_out in [os.path.join(root_dir, "_internal", "out"), os.path.join(root_dir, "out")]:
                        try:
                            shutil.copytree(src_out, dst_out, dirs_exist_ok=True)
                        except Exception:
                            pass
                    print("✓ [MISE À JOUR] Fichiers web mis à jour !")
                    break

            print("✓ [MISE À JOUR] Archive ZIP extraite avec succès !")
        except Exception as e:
            print(f"❌ [MISE À JOUR] Erreur téléchargement/extraction : {e}")
            if os.path.exists(temp_zip):
                try:
                    os.remove(temp_zip)
                except Exception:
                    pass
            return {"success": False, "error": f"Erreur lors de la mise à jour : {e}"}

    # Programmer le redémarrage automatique en tâche de fond
    schedule_restart(root_dir)

    return {
        "success": True,
        "message": f"Mise à jour v{CURRENT_VERSION} appliquée avec succès ! Nova redémarre..."
    }
# Cache mémoire pour la synthèse vocale instantanée
TTS_CACHE = {}

def synthesize_google_tts(text: str, lang: str = "fr") -> bytes:
    """Synthèse vocale native Google haute fidélité sans clé API requise."""
    clean_text = (text or "").strip()
    if not clean_text:
        return b""

    cache_key = f"{lang}:{clean_text}"
    if cache_key in TTS_CACHE:
        return TTS_CACHE[cache_key]

    # Découpage intelligent en segments de 180 caractères max
    sentences = re.split(r'([.?!:;\n,]+)', clean_text)
    chunks = []
    curr = ""
    for part in sentences:
        if len(curr) + len(part) <= 180:
            curr += part
        else:
            if curr.strip():
                chunks.append(curr.strip())
            curr = part
    if curr.strip():
        chunks.append(curr.strip())

    if not chunks:
        chunks = [clean_text[:180]]

    audio_bytes = bytearray()
    for chunk in chunks[:15]:
        enc = urllib.parse.quote(chunk)
        url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={lang}&client=tw-ob&q={enc}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=7) as res:
                audio_bytes.extend(res.read())
        except Exception as e:
            print(f"[TTS Segment Erreur] {chunk[:30]}... : {e}")

    result = bytes(audio_bytes)
    if result:
        # Garder le cache à une taille raisonnable (max 200 entrées)
        if len(TTS_CACHE) > 200:
            TTS_CACHE.clear()
        TTS_CACHE[cache_key] = result

    return result

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

    def end_headers(self):
        # Éviter la mise en cache de index.html et des pages principales pour actualiser immédiatement les mises à jour
        if hasattr(self, 'path') and (self.path.endswith('.html') or self.path.endswith('/') or '/nova' in self.path):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

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
                "version": CURRENT_VERSION,
                "appVersion": CURRENT_VERSION,
                "keyboardLayout": get_active_keyboard_layout(),
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

        if clean in ('/update/check', '/nova/update/check'):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors()
            self.end_headers()
            info = check_github_update()
            self.wfile.write(json.dumps(info).encode("utf-8"))
            return

        if clean in ('/api/tts', '/nova/api/tts', '/tts', '/nova/tts', '/api/tts/google', '/nova/api/tts/google'):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            text = params.get('text', [''])[0] or params.get('q', [''])[0]
            lang = params.get('lang', ['fr'])[0]
            if not text.strip():
                self.send_response(400)
                self._send_cors()
                self.end_headers()
                return

            audio_data = synthesize_google_tts(text, lang)
            if audio_data:
                self.send_response(200)
                self.send_header("Content-Type", "audio/mpeg")
                self.send_header("Content-Length", str(len(audio_data)))
                self.send_header("Cache-Control", "public, max-age=86400")
                self._send_cors()
                self.end_headers()
                self.wfile.write(audio_data)
            else:
                self.send_response(502)
                self._send_cors()
                self.end_headers()
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
                press_type = data.get("pressType") or data.get("type", "tap")
                layout = data.get("layout") or get_active_keyboard_layout()
                default_dur = 1.5 if press_type in ("hold", "long") else 0.18
                if "durationMs" in data and data["durationMs"] is not None:
                    try:
                        duration = float(data["durationMs"]) / 1000.0
                    except (ValueError, TypeError):
                        duration = default_dur
                else:
                    try:
                        duration = float(data.get("duration", default_dur))
                    except (ValueError, TypeError):
                        duration = default_dur

                if key:
                    press_key(key, duration=duration, layout=layout)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self._send_cors()
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": True,
                        "key": key,
                        "layout": layout,
                        "pressType": press_type,
                        "duration": duration,
                        "durationMs": int(round(duration * 1000))
                    }).encode("utf-8"))
                    return
            except Exception as e:
                print(f"[ERREUR] {e}")

        if clean in ('/sequence', '/nova/sequence'):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8"))
                actions = data.get("actions") or data.get("sequence") or []
                layout = data.get("layout") or get_active_keyboard_layout()
                results = []
                for i, action in enumerate(actions):
                    if i > 0:
                        delay = float(action.get("delayBefore", 0.2))
                        time.sleep(max(0.05, min(delay, 2.0)))
                    k = action.get("key", "")
                    ptype = action.get("pressType") or action.get("type", "tap")
                    default_dur = 1.5 if ptype in ("hold", "long") else 0.18
                    dur = float(action.get("duration", default_dur))
                    if "durationMs" in action and action["durationMs"] is not None:
                        dur = float(action["durationMs"]) / 1000.0
                    if k:
                        press_key(k, duration=dur, layout=layout)
                        results.append({"key": k, "duration": dur, "pressType": ptype})

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "results": results}).encode("utf-8"))
                return
            except Exception as e:
                print(f"[ERREUR SEQUENCE] {e}")

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

        if clean in ('/update/apply', '/nova/update/apply'):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            dl_url = ""
            try:
                data = json.loads(body.decode("utf-8"))
                dl_url = data.get("downloadUrl", "")
            except Exception:
                pass
            res = apply_github_update(dl_url)
            ok = bool(res and res.get("success"))
            self.send_response(200 if ok else 500)
            self.send_header("Content-Type", "application/json")
            self._send_cors()
            self.end_headers()
            self.wfile.write(json.dumps(res or {"success": False, "error": "Erreur lors de la mise à jour"}).encode("utf-8"))
            return

        if clean in ('/api/tts', '/nova/api/tts', '/tts', '/nova/tts', '/api/tts/google', '/nova/api/tts/google'):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8"))
                text = data.get("text", "") or data.get("q", "")
                lang = data.get("lang", "fr")
                audio_data = synthesize_google_tts(text, lang)
                if audio_data:
                    self.send_response(200)
                    self.send_header("Content-Type", "audio/mpeg")
                    self.send_header("Content-Length", str(len(audio_data)))
                    self.send_header("Cache-Control", "public, max-age=86400")
                    self._send_cors()
                    self.end_headers()
                    self.wfile.write(audio_data)
                    return
                else:
                    self.send_response(502)
                    self._send_cors()
                    self.end_headers()
                    return
            except Exception as e:
                print(f"[TTS POST ERREUR] {e}")
                self.send_response(500)
                self._send_cors()
                self.end_headers()
                return

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
    cfg = load_persistent_config()
    layout = cfg.get("keyboardLayout", "azerty") if isinstance(cfg, dict) else "azerty"
    set_active_keyboard_layout(layout)

    print("=" * 68)
    print(f"🚀 NOVA — COMPAGNON STAR CITIZEN TOUT-EN-UN (PORT {PORT}) v{CURRENT_VERSION}")
    print("=" * 68)
    print(f"  ✓ Application & Pont clavier disponibles sur : http://localhost:{PORT}/nova/")
    print(f"  ✓ Dossier des fichiers web : {OUT_DIR}")
    print(f"  ✓ Disposition Clavier Star Citizen : {CURRENT_KEYBOARD_LAYOUT.upper()} (Touches A, Z, Q, W, M adaptées)")
    print(f"  ✓ Frappes DirectInput Star Citizen : {'ACTIF' if (has_directinput or is_windows) else 'SIMULATION'}")
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

    # Démarrage du serveur web multi-thread (DualStack IPv4/IPv6 avec repli IPv4)
    server = None
    try:
        class DualStackThreadingServer(ThreadingHTTPServer):
            address_family = socket.AF_INET6
            daemon_threads = True
            def server_bind(self):
                try:
                    self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
                except Exception:
                    pass
                super().server_bind()

        server = DualStackThreadingServer(("", PORT), UnifiedCompanionHandler)
    except Exception:
        try:
            server = ThreadingHTTPServer(("0.0.0.0", PORT), UnifiedCompanionHandler)
            server.daemon_threads = True
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
