"""Oakhaven — server.

Division of labour, and the reason for it:

    browser (60 Hz)   movement, collision, raycasting, sprites, audio
    server  (~8 Hz)   meters, flags, alignment, dialogue, act gating, saves

Anything that decides how the story ends lives here, because a value the
client owns is a value the player can edit in devtools. Anything that has to
happen inside 16 ms lives in the browser, because a network round trip per
frame is not a thing you can do.

Run:  uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from game import world
from game.dialogue import DialogueRunner
from game.state import GameState

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
FRONTEND = ROOT.parent / "frontend"
SAVES = ROOT / "saves"
SAVES.mkdir(exist_ok=True)

app = FastAPI(title="Oakhaven", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SECTORS = world.build_all()
DIALOGUE = json.loads((CONTENT / "dialogue.json").read_text(encoding="utf-8"))
runner = DialogueRunner(DIALOGUE)

# Fail loudly at boot rather than stranding a player in a wall at 2 a.m.
for problem in world.validate(SECTORS) + runner.validate():
    raise RuntimeError(f"content validation failed: {problem}")

SESSIONS: dict[str, GameState] = {}


def get_state(session: str) -> GameState:
    st = SESSIONS.get(session)
    if st is None:
        raise HTTPException(404, "no such session")
    return st


# ── models ───────────────────────────────────────────────────────────────
class NewGame(BaseModel):
    protagonist: str = Field(default="dean", pattern="^(dean|sam)$")


class Position(BaseModel):
    sector: str
    x: float
    y: float
    angle: float
    stress: float | None = None


class Choice(BaseModel):
    tree: str
    node: str
    index: int


class Fragment(BaseModel):
    id: str


# ── session ──────────────────────────────────────────────────────────────
@app.post("/api/session")
def new_session(body: NewGame) -> dict:
    st = GameState(protagonist=body.protagonist)
    spawn = SECTORS["street"]["spawn"]
    st.x, st.y, st.angle = spawn["x"], spawn["y"], spawn["a"]
    st.note(f"Arrived in Oakhaven as {body.protagonist.title()}.")
    SESSIONS[st.session] = st
    return st.snapshot()


@app.get("/api/session/{session}")
def read_session(session: str) -> dict:
    return get_state(session).snapshot()


@app.post("/api/session/{session}/position")
def set_position(session: str, body: Position) -> dict:
    st = get_state(session)
    if body.sector not in SECTORS:
        raise HTTPException(400, f"unknown sector {body.sector!r}")
    st.sector, st.x, st.y, st.angle = body.sector, body.x, body.y, body.angle
    if body.stress is not None:
        st.meters.stress = min(100.0, max(0.0, body.stress))
    return {"ok": True, "glitch_level": st.glitch_level}


# ── world ────────────────────────────────────────────────────────────────
@app.get("/api/sectors")
def list_sectors() -> dict:
    return {sid: {"id": sid, "name": s["name"], "outdoor": s["outdoor"]}
            for sid, s in SECTORS.items()}


@app.get("/api/sector/{sector_id}")
def read_sector(sector_id: str, act: int = 1) -> dict:
    if sector_id not in SECTORS:
        raise HTTPException(404, "no such sector")
    return world.for_act(SECTORS[sector_id], act)


# ── dialogue ─────────────────────────────────────────────────────────────
@app.get("/api/session/{session}/dialogue/{tree}")
def open_dialogue(session: str, tree: str) -> dict:
    st = get_state(session)
    if tree not in DIALOGUE:
        raise HTTPException(404, "no such dialogue tree")
    return runner.open(tree, st)


@app.post("/api/session/{session}/dialogue")
def choose(session: str, body: Choice) -> dict:
    st = get_state(session)
    try:
        result = runner.choose(body.tree, body.node, body.index, st)
    except (KeyError, IndexError) as exc:
        raise HTTPException(400, str(exc)) from exc
    result["state"] = st.snapshot()
    return result


# ── fragments and endings ────────────────────────────────────────────────
@app.post("/api/session/{session}/fragment")
def collect(session: str, body: Fragment) -> dict:
    st = get_state(session)
    fresh = body.id not in st.fragments
    if fresh:
        st.fragments.append(body.id)
        st.note(f"Recovered Enochian fragment {body.id}.")
    return {"new": fresh, "count": st.fragment_count,
            "required": 9, "ascetic": st.is_ascetic()}


@app.get("/api/session/{session}/ending")
def ending(session: str) -> dict:
    st = get_state(session)
    key, blurb = st.ending()
    return {"ending": key, "description": blurb,
            "alignment": {"nihilism": st.alignment.nihilism,
                          "humanism": st.alignment.humanism},
            "fragments": st.fragment_count, "ascetic": st.is_ascetic()}


# ── saves ────────────────────────────────────────────────────────────────
@app.post("/api/session/{session}/save")
def save(session: str) -> dict:
    st = get_state(session)
    path = SAVES / f"{session}.json"
    path.write_text(json.dumps(st.snapshot(), indent=2), encoding="utf-8")
    return {"saved": session}


@app.post("/api/load/{session}")
def load(session: str) -> dict:
    path = SAVES / f"{session}.json"
    if not path.exists():
        raise HTTPException(404, "no save with that id")
    st = GameState.restore(json.loads(path.read_text(encoding="utf-8")))
    SESSIONS[st.session] = st
    return st.snapshot()


@app.delete("/api/session/{session}")
def purge(session: str) -> dict:
    """The secret ending deletes the save. That has to be real, or it's a
    cutscene pretending to be a consequence."""
    SESSIONS.pop(session, None)
    path = SAVES / f"{session}.json"
    existed = path.exists()
    if existed:
        path.unlink()
    return {"purged": existed}


# ── live sync ────────────────────────────────────────────────────────────
@app.websocket("/ws/{session}")
async def ws(sock: WebSocket, session: str) -> None:
    """Client pushes position and stress a few times a second; server answers
    with the derived values that drive presentation."""
    await sock.accept()
    st = SESSIONS.get(session)
    if st is None:
        await sock.close(code=4004)
        return
    try:
        while True:
            msg = await sock.receive_json()
            if msg.get("t") == "pos":
                st.sector = msg.get("sector", st.sector)
                st.x, st.y = msg.get("x", st.x), msg.get("y", st.y)
                st.angle = msg.get("angle", st.angle)
                if "stress" in msg:
                    st.meters.stress = min(100.0, max(0.0, float(msg["stress"])))
            await sock.send_json({
                "t": "sync",
                "glitch": st.glitch_level,
                "act": st.act,
                "stress": round(st.meters.stress, 1),
                "sobriety": round(st.meters.sobriety, 1),
                "blood": round(st.meters.blood, 1),
                "fragments": st.fragment_count,
                "ascetic": st.is_ascetic(),
            })
    except WebSocketDisconnect:
        pass


# ── static frontend ──────────────────────────────────────────────────────
if FRONTEND.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND), name="static")

    @app.get("/")
    def index() -> FileResponse:
        return FileResponse(FRONTEND / "index.html")
