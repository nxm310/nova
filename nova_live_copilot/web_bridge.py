"""Pont Web / WebSocket pour diffuser la télémétrie et le coût en direct au widget UI."""

import asyncio
import json
from typing import Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from nova_live_copilot.telemetry import telemetry
from nova_live_copilot.input_simulator import input_simulator

app = FastAPI(title="Nova Copilot Telemetry Bridge")

# Activation CORS pour communication fluide avec le frontend Next.js (port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_websockets: Set[WebSocket] = set()

@app.get("/telemetry/status")
async def get_telemetry_status():
    """Renvoie l'état instantané de la télémétrie et du coût."""
    return telemetry.to_dict()

@app.post("/action")
async def trigger_action(payload: dict):
    """Permet de déclencher une action Star Citizen manuellement depuis l'interface."""
    func_name = payload.get("action", "")
    args = payload.get("args", {})
    res = await input_simulator.execute_ship_action(func_name, args)
    telemetry.record_action(res)
    return {"status": "success", "result": res}

@app.websocket("/telemetry/ws")
async def telemetry_websocket_endpoint(websocket: WebSocket):
    """Diffuse en temps réel les mises à jour de tokens et de coût en WebSocket."""
    await websocket.accept()
    active_websockets.add(websocket)
    try:
        # Envoi initial
        await websocket.send_text(json.dumps(telemetry.to_dict()))

        # Boucle de diffusion continue
        while True:
            await asyncio.sleep(0.5)
            await websocket.send_text(json.dumps(telemetry.to_dict()))
    except WebSocketDisconnect:
        pass
    finally:
        active_websockets.discard(websocket)

def broadcast_telemetry(snapshot):
    """Envoie un événement push aux clients WebSocket connectés."""
    data_str = json.dumps(telemetry.to_dict())
    for ws in list(active_websockets):
        try:
            asyncio.create_task(ws.send_text(data_str))
        except Exception:
            pass

# Enregistre la diffusion automatique à chaque mise à jour de télémétrie
telemetry.add_listener(broadcast_telemetry)
