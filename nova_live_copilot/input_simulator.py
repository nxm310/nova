"""Simulation de touches physiques et DirectInput pour Star Citizen."""

import sys
import time
import asyncio
from typing import Optional
from nova_live_copilot.config import (
    DIRECTINPUT_SCANCODES,
    DEFAULT_TAP_DURATION,
    DEFAULT_HOLD_DURATION,
)

IS_WINDOWS = sys.platform.startswith("win")

# --- IMPLÉMENTATION DIRECTINPUT WINDOWS (NATIVE POUR STAR CITIZEN) ---
if IS_WINDOWS:
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32

    # Structures Win32 SendInput
    class KEYBDINPUT(ctypes.Structure):
        _fields_ = [
            ("wVk", wintypes.WORD),
            ("wScan", wintypes.WORD),
            ("dwFlags", wintypes.DWORD),
            ("time", wintypes.DWORD),
            ("dwExtraInfo", ctypes.POINTER(wintypes.ULONG)),
        ]

    class INPUT(ctypes.Structure):
        class _INPUT(ctypes.Union):
            _fields_ = [("ki", KEYBDINPUT)]
        _anonymous_ = ("_input",)
        _fields_ = [
            ("type", wintypes.DWORD),
            ("_input", _INPUT),
        ]

    INPUT_KEYBOARD = 1
    KEYEVENTF_SCANCODE = 0x0008
    KEYEVENTF_KEYUP = 0x0002

    def _win_press_scancode(scancode: int):
        extra = ctypes.c_ulong(0)
        ii = INPUT()
        ii.type = INPUT_KEYBOARD
        ii.ki.wVk = 0
        ii.ki.wScan = scancode
        ii.ki.dwFlags = KEYEVENTF_SCANCODE
        ii.ki.time = 0
        ii.ki.dwExtraInfo = ctypes.pointer(extra)
        user32.SendInput(1, ctypes.byref(ii), ctypes.sizeof(INPUT))

    def _win_release_scancode(scancode: int):
        extra = ctypes.c_ulong(0)
        ii = INPUT()
        ii.type = INPUT_KEYBOARD
        ii.ki.wVk = 0
        ii.ki.wScan = scancode
        ii.ki.dwFlags = KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP
        ii.ki.time = 0
        ii.ki.dwExtraInfo = ctypes.pointer(extra)
        user32.SendInput(1, ctypes.byref(ii), ctypes.sizeof(INPUT))

# --- IMPLÉMENTATION CROSS-PLATFORM / REPLI (MACOS & LINUX VIA PYNPUT) ---
pynput_controller = None
try:
    from pynput.keyboard import Controller, Key
    pynput_controller = Controller()
except ImportError:
    pass

class InputSimulator:
    """Gère la simulation des frappes clavier en mode DirectInput ou pynput."""

    @staticmethod
    async def press_key(key_name: str, duration: Optional[float] = None, is_hold: bool = False):
        """Presse et relâche une touche matérielle."""
        dur = duration if duration is not None else (DEFAULT_HOLD_DURATION if is_hold else DEFAULT_TAP_DURATION)
        key_name = key_name.lower().strip()

        # Détection des combinaisons de touches (ex: alt+n, alt+j)
        keys_to_press = key_name.split('+')

        if IS_WINDOWS:
            # Envoi DirectInput natif pour Star Citizen
            scancodes = [DIRECTINPUT_SCANCODES.get(k, 0) for k in keys_to_press]
            valid_scancodes = [sc for sc in scancodes if sc != 0]

            for sc in valid_scancodes:
                _win_press_scancode(sc)
            
            await asyncio.sleep(dur)

            for sc in reversed(valid_scancodes):
                _win_release_scancode(sc)
        else:
            # Repli macOS/Linux via pynput
            if pynput_controller:
                pressed_keys = []
                for k in keys_to_press:
                    if k == 'alt':
                        obj = Key.alt
                    elif k.startswith('f') and k[1:].isdigit():
                        obj = getattr(Key, k, k)
                    else:
                        obj = k
                    pynput_controller.press(obj)
                    pressed_keys.append(obj)

                await asyncio.sleep(dur)

                for obj in reversed(pressed_keys):
                    pynput_controller.release(obj)
            else:
                # Mode simulation / log
                print(f"[InputSimulator MOCK] Touche simulée : {key_name} (durée: {dur}s)")
                await asyncio.sleep(dur)

    @classmethod
    async def execute_ship_action(cls, function_name: str, args: dict) -> str:
        """Exécute l'action Star Citizen correspondante à l'appel d'outil Gemini Live."""
        name = function_name.lower()

        if name == "toggle_landing_gear":
            await cls.press_key('n')
            action = args.get("action", "toggle")
            return f"Train d'atterrissage actionné ({action})."

        elif name == "toggle_shields":
            await cls.press_key('o')
            state = args.get("state", "toggle")
            return f"Générateurs de boucliers basculés ({state})."

        elif name == "quantum_drive":
            mode = args.get("mode", "spool").lower()
            if mode == "jump":
                await cls.press_key('b', duration=DEFAULT_HOLD_DURATION, is_hold=True)
                return "Saut quantique engagé."
            else:
                await cls.press_key('b', duration=DEFAULT_TAP_DURATION)
                return "Moteur quantique en cours de calibration (spooling)."

        elif name == "deploy_countermeasures":
            cm_type = args.get("type", "decoy").lower()
            if cm_type == "noise":
                await cls.press_key('h')
                return "Brouillage électromagnétique (chaff/noise) déployé."
            else:
                await cls.press_key('g')
                return "Leurres thermiques (flares/decoy) largués."

        elif name == "toggle_lights":
            await cls.press_key('l')
            return "Éclairage extérieur basculé."

        elif name == "toggle_vtol":
            await cls.press_key('alt+j')
            return "Propulseurs verticaux VTOL basculés."

        elif name == "toggle_doors":
            await cls.press_key('k')
            return "Portes et sas actionnés."

        elif name == "power_systems":
            target = args.get("system", "all").lower()
            if target == "engines":
                await cls.press_key('i')
                return "Propulseurs principaux basculés."
            else:
                await cls.press_key('u')
                return "Alimentation générale du vaisseau basculée."

        elif name == "request_atc_landing":
            await cls.press_key('alt+n')
            return "Canal ATC contacté, autorisation d'atterrissage demandée."

        elif name == "cruise_control":
            await cls.press_key('c')
            return "Régulateur de vitesse (Cruise Control) basculé."

        else:
            # Action générique par touche
            key = args.get("key", "")
            if key:
                await cls.press_key(key)
                return f"Touche physique [{key}] envoyée au vaisseau."
            return f"Ordre {function_name} traité."

input_simulator = InputSimulator()
