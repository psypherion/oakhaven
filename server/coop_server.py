"""Oakhaven co-op campaign server (optional).

The game works without this: in browser-to-browser mode the host's browser
holds the campaign. Run this when you want the campaign to live somewhere
that is always on, so either brother can play (and the host can be offline).

It speaks exactly the protocol of src/61a_coop_core.js and enforces the same
rules (who may write where, compare-and-set, append-only lists, admin by the
host only). Credentials are stored only as salted SHA-256 hashes; invitation
codes likewise. Campaigns are rows in SQLite; every accepted operation is
written before it is acknowledged, with a version check.

    pip install -r server/requirements.txt
    uvicorn server.coop_server:app --host 0.0.0.0 --port 8765

Players enter  wss://your-host/ws  (or ws://host:8765/ws for local testing)
under "Campaign server" when creating a campaign. Put it behind TLS (Caddy,
nginx, a platform's HTTPS) for anything other than local play: the page on
GitHub Pages is https, and browsers will not let it open a plain ws:// socket
to another machine.

Environment:
    OAK_DB        SQLite path (default: oakhaven_coop.sqlite next to this file)
    OAK_ORIGINS   comma-separated list of allowed page origins, e.g.
                  https://you.github.io  (default: any)
Single process only: campaigns are kept in memory while in use.
"""
from __future__ import annotations

import asyncio
import copy
import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
from pathlib import Path

from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route, WebSocketRoute
from starlette.websockets import WebSocket, WebSocketDisconnect

PROTO = 1
REL_VARS = ["trust", "affection", "respect", "desire", "understanding", "resentment", "safety", "influence"]
REL_CAST = ["dean", "sam", "lilith", "sarah"]
HEROES = ["dean", "sam"]
ROLES = ["observer", "interrogator"]
LIST_CAP = {"chron": 3000, "relLog": 2000, "shared.ledger": 400, "shared.notes": 400, "shared.gifts": 400}
ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
SEG = re.compile(r"^[A-Za-z0-9_:\-]{1,64}$")
MAX_MSG = 16_000


def now_ms() -> int:
    return int(time.time() * 1000)


def rand(n: int) -> str:
    return "".join(ABC[b & 31] for b in secrets.token_bytes(n))


def sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def cred_hash(cid: str, token: str) -> str:
    return sha(f"oakhaven:{cid}:{token}")


def code_hash(cid: str, code: str) -> str:
    return sha(f"invite:{cid}:" + re.sub(r"[^A-Z0-9]", "", str(code).upper()))


def other(x, lst):
    return lst[1] if lst[0] == x else lst[0]


def hero_label(h):
    return "Sam" if h == "sam" else "Dean"


def role_label(r):
    return "Interrogator" if r == "interrogator" else "Observer"


# ── paths ────────────────────────────────────────────────────────────────
def cpath(p):
    if not isinstance(p, str) or not p or len(p) > 200:
        return None
    a = p.split(".")
    for s in a:
        if s in ("__proto__", "constructor", "prototype") or not SEG.match(s):
            return None
    return a


def cget(o, a):
    for k in a:
        if not isinstance(o, dict):
            return None
        o = o.get(k)
    return o


def cset(o, a, v):
    for k in a[:-1]:
        if not isinstance(o.get(k), dict):
            o[k] = {}
        o = o[k]
    if v is None:
        o.pop(a[-1], None)
    else:
        o[a[-1]] = v


# ── the campaign: same shape and rules as the browser ───────────────────
def fresh(title, name, hero, role, token):
    cid = rand(10)
    hero = hero if hero in HEROES else "dean"
    role = role if role in ROLES else "observer"
    t = now_ms()
    C = {
        "proto": PROTO, "id": cid, "title": str(title or "Oakhaven")[:60], "created": t, "closed": False, "v": 0,
        "seats": {
            "A": {"hero": hero, "role": role, "name": str(name or "")[:24], "host": True, "cred": cred_hash(cid, token), "revoked": False, "joined": t},
            "B": {"hero": other(hero, HEROES), "role": other(role, ROLES), "name": "", "host": False, "cred": None, "revoked": False, "joined": 0},
        },
        "invite": None,
        "shared": {"clues": {}, "links": {}, "flags": {}, "votes": {}, "final": {}, "decisions": {}, "ledger": [], "notes": []},
        "priv": {"A": {}, "B": {}}, "rel": {}, "relLog": [], "chron": [], "seen": {"A": [], "B": []},
    }
    C["chron"].append({"kind": "admin", "text": f"Campaign “{C['title']}” opened. {C['seats']['A']['name'] or 'The host'} is {hero_label(hero)}, the {role_label(role)}.", "by": "A", "t": t, "v": 0})
    return C


def acl(C, seat, op):
    if not isinstance(op, dict):
        return "bad op"
    me = C["seats"].get(seat)
    if not me or not me.get("cred") or me.get("revoked"):
        return "removed"
    kind = op.get("op")
    if kind in ("invite", "revoke", "close", "reopen", "title"):
        if not me.get("host"):
            return "host only"
        if kind == "revoke" and (op.get("seat") == seat or op.get("seat") not in C["seats"]):
            return "bad seat"
        if kind == "invite" and (not isinstance(op.get("hash"), str) or len(op["hash"]) != 64):
            return "bad invite"
        if C.get("closed") and kind != "reopen":
            return "closed"
        return None
    if C.get("closed"):
        return "closed"
    if kind not in ("set", "inc", "push"):
        return "bad op"
    a = cpath(op.get("path"))
    if not a:
        return "bad path"
    try:
        if len(json.dumps(op.get("val"), ensure_ascii=False)) > 6000:
            return "too big"
    except (TypeError, ValueError):
        return "bad value"
    root, key = a[0], ".".join(a)
    if root == "shared":
        if len(a) > 1 and a[1] == "votes" and (len(a) != 4 or a[3] != seat or kind != "set"):
            return "not your vote"
        if kind == "push" and key not in LIST_CAP:
            return "not a list"
        if kind != "push" and key in LIST_CAP:
            return "append only"
        return None
    if root == "priv":
        return None if len(a) >= 3 and a[1] == seat and kind != "push" else "not yours"
    if root == "rel":
        if len(a) != 4 or a[1] not in REL_CAST or a[2] not in REL_CAST or a[1] == a[2] or a[3] not in REL_VARS:
            return "bad relationship"
        if kind == "push":
            return "bad op"
        owner = a[1] if a[1] in HEROES else a[2]
        if owner != me["hero"]:
            return "not your character"
        if a[3] == "desire" and a[1] in HEROES and a[2] in HEROES:
            return "they are brothers"
        return None
    if root in ("chron", "relLog"):
        return None if len(a) == 1 and kind == "push" else "append only"
    return "bad path"


def apply(C, seat, op):
    kind = op["op"]
    if kind == "set":
        cset(C, cpath(op["path"]), copy.deepcopy(op.get("val")))
    elif kind == "inc":
        a = cpath(op["path"])
        cur = cget(C, a)
        cur = cur if isinstance(cur, (int, float)) and not isinstance(cur, bool) else 0
        n = op.get("n")
        n = n if isinstance(n, (int, float)) and not isinstance(n, bool) else 0
        cset(C, a, max(-10, min(10, cur + n)))
    elif kind == "push":
        a = cpath(op["path"])
        lst = cget(C, a)
        if not isinstance(lst, list):
            lst = []
            cset(C, a, lst)
        lst.append(copy.deepcopy(op.get("val")))
        cap = LIST_CAP.get(".".join(a), 500)
        del lst[: max(0, len(lst) - cap)]
    elif kind == "invite":
        C["invite"] = {"hash": op["hash"], "exp": op["exp"], "bad": 0}
    elif kind == "revoke":
        s = C["seats"][op["seat"]]
        s["cred"] = None
        s["revoked"] = True
    elif kind == "claim":
        s = C["seats"][op["seat"]]
        s.update(cred=op["cred"], revoked=False, name=str(op.get("name") or "")[:24], joined=op["t"])
        C["invite"] = None
    elif kind == "close":
        C["closed"] = True
    elif kind == "reopen":
        C["closed"] = False
    elif kind == "title":
        C["title"] = str(op.get("title") or C["title"])[:60]
    C["v"] = op["v"] if isinstance(op.get("v"), int) else C["v"] + 1


def view(C, seat):
    V = copy.deepcopy(C)
    V.pop("invite", None)
    V.pop("seen", None)
    for s in V["seats"].values():
        s["claimed"] = bool(s.pop("cred", None))
    V["priv"] = {seat: V["priv"].get(seat, {})}
    V["inviteOpen"] = bool(C.get("invite") and C["invite"]["exp"] > now_ms())
    return V


# ── storage ──────────────────────────────────────────────────────────────
class Store:
    def __init__(self, path):
        self.db = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, state TEXT NOT NULL, v INTEGER NOT NULL, updated INTEGER NOT NULL)")

    def load(self, cid):
        r = self.db.execute("SELECT state FROM campaigns WHERE id=?", (cid,)).fetchone()
        return json.loads(r[0]) if r else None

    def insert(self, C):
        self.db.execute("INSERT INTO campaigns (id,state,v,updated) VALUES (?,?,?,?)", (C["id"], json.dumps(C, ensure_ascii=False), C["v"], now_ms()))

    def save(self, C, prev_v):
        """Version-checked write: refuses if someone else wrote in between."""
        cur = self.db.execute("UPDATE campaigns SET state=?, v=?, updated=? WHERE id=? AND v=?",
                              (json.dumps(C, ensure_ascii=False), C["v"], now_ms(), C["id"], prev_v))
        if cur.rowcount != 1:
            raise RuntimeError("version conflict")


# ── the live campaigns ───────────────────────────────────────────────────
class Conn:
    def __init__(self, ws: WebSocket):
        self.ws, self.seat, self.cid = ws, None, None

    async def send(self, m):
        try:
            await self.ws.send_text(json.dumps(m, ensure_ascii=False))
        except Exception:
            pass


class Hub:
    def __init__(self, store: Store):
        self.store = store
        self.live: dict[str, dict] = {}          # cid -> {"C": state, "conns": set, "lock": Lock}
        self.creates: dict[str, list] = {}       # ip -> recent create times

    def room(self, cid):
        r = self.live.get(cid)
        if r:
            return r
        C = self.store.load(cid)
        if not C:
            return None
        r = self.live[cid] = {"C": C, "conns": set(), "lock": asyncio.Lock()}
        return r

    async def presence(self, r):
        on = {"A": False, "B": False}
        for c in r["conns"]:
            if c.seat:
                on[c.seat] = True
        for c in list(r["conns"]):
            if c.seat:
                await c.send({"type": "presence", "online": on})

    async def kick(self, r, seat, why, keep=None):
        n = 0
        for c in list(r["conns"]):
            if c.seat == seat and c is not keep:
                n += 1
                await c.send({"type": "bye", "why": why})
                c.seat = None
                r["conns"].discard(c)
                try:
                    await c.ws.close()
                except Exception:
                    pass
        if n and why != "elsewhere":
            await self.presence(r)

    async def welcome(self, r, conn, seat):
        await self.kick(r, seat, "elsewhere", keep=conn)
        conn.seat, conn.cid = seat, r["C"]["id"]
        r["conns"].add(conn)
        await conn.send({"type": "welcome", "seat": seat, "state": view(r["C"], seat)})
        await self.presence(r)

    async def refresh(self, r):
        for c in list(r["conns"]):
            if c.seat:
                await c.send({"type": "state", "state": view(r["C"], c.seat)})

    def commit(self, r, prev_v):
        self.store.save(r["C"], prev_v)

    async def handle(self, conn: Conn, m, ip):
        t = m.get("type")
        err = lambda code, id=None: conn.send({"type": "err", "code": code, "id": id})
        if t == "ping":
            return await conn.send({"type": "pong", "t": m.get("t")})
        if t == "create":
            recent = [x for x in self.creates.get(ip, []) if time.time() - x < 3600]
            if len(recent) >= 20:
                return await err("slow down")
            token = m.get("token")
            if not isinstance(token, str) or not re.fullmatch(r"[A-Z0-9]{20,40}", token):
                return await err("denied")
            self.creates[ip] = recent + [time.time()]
            C = fresh(m.get("title"), m.get("name"), m.get("hero"), m.get("role"), token)
            self.store.insert(C)
            r = self.live[C["id"]] = {"C": C, "conns": set(), "lock": asyncio.Lock()}
            return await self.welcome(r, conn, "A")
        cid = m.get("cid") if t in ("hello", "peek", "claim") else conn.cid
        r = self.room(cid) if isinstance(cid, str) else None
        if t == "hello":
            if not r:
                return await err("nocampaign")
            s = r["C"]["seats"].get(m.get("seat"))
            if not s:
                return await err("denied")
            if s.get("revoked"):
                return await err("removed")
            if not s.get("cred") or cred_hash(cid, str(m.get("cred") or "")) != s["cred"]:
                return await err("denied")
            return await self.welcome(r, conn, m["seat"])
        if t in ("peek", "claim"):
            if not r:
                return await err("nocampaign")
            async with r["lock"]:
                C = r["C"]
                if C.get("closed"):
                    return await err("closed")
                seat = next(k for k, v in C["seats"].items() if not v.get("host"))
                s = C["seats"][seat]
                if s.get("cred") and not s.get("revoked"):
                    return await err("taken")
                inv = C.get("invite")
                if not inv or inv["exp"] < now_ms() or inv["bad"] >= 6:
                    return await err("noinvite")
                if code_hash(C["id"], m.get("code") or "") != inv["hash"]:
                    prev = C["v"]
                    inv["bad"] += 1
                    C["v"] += 1
                    self.commit(r, prev)
                    return await err("badcode")
                if t == "peek":
                    return await conn.send({"type": "offer", "title": C["title"], "hero": s["hero"], "role": s["role"], "host": C["seats"]["A"]["name"], "replacing": bool(s.get("revoked"))})
                cred = m.get("cred")
                if not isinstance(cred, str) or len(cred) != 64:
                    return await err("denied")
                name = re.sub(r"[<>]", "", str(m.get("name") or ""))[:24] or hero_label(s["hero"])
                was = s.get("revoked")
                prev, now = C["v"], now_ms()
                apply(C, seat, {"op": "claim", "seat": seat, "cred": cred, "name": name, "t": now})
                apply(C, seat, {"op": "push", "path": "chron", "val": {"kind": "admin", "text": f"{name} {'took over' if was else 'joined as'} {hero_label(s['hero'])}, the {role_label(s['role'])}.", "by": seat, "t": now, "v": C["v"] + 1}})
                self.commit(r, prev)
            await self.welcome(r, conn, seat)
            return await self.refresh(r)
        if t == "op":
            if not conn.seat or not r:
                return await err("denied", m.get("id"))
            seat, op, mid = conn.seat, m.get("op"), m.get("id")
            async with r["lock"]:
                C = r["C"]
                seen = C.setdefault("seen", {}).setdefault(seat, [])
                if mid and mid in seen:
                    return await conn.send({"type": "ack", "id": mid, "ok": True, "dup": True})
                bad = acl(C, seat, op)
                if bad == "removed":
                    await conn.send({"type": "bye", "why": "removed"})
                    return await conn.ws.close()
                if bad:
                    return await err(bad, mid)
                if op.get("op") not in ("revoke", "close") and len(json.dumps(C, ensure_ascii=False)) > 1_500_000:
                    return await err("full", mid)
                if "expect" in op:
                    cur = cget(C, cpath(op["path"])) if op["op"] == "set" else None
                    if cur != op.get("expect"):
                        return await err("conflict", mid)
                now, v = now_ms(), C["v"] + 1
                o = copy.deepcopy(op)
                o.pop("expect", None)
                o.update(by=seat, t=now, v=v)
                if o["op"] == "push":
                    val = o.get("val") if isinstance(o.get("val"), dict) else {"text": str(o.get("val"))}
                    o["val"] = {**val, "by": seat, "t": now, "v": v}
                if o["op"] == "invite":
                    e = o.get("exp") if isinstance(o.get("exp"), int) else 0
                    o["exp"] = min(e, now + 14 * 864e5) if e else now + 7 * 864e5
                prev = C["v"]
                apply(C, seat, o)
                if mid:
                    seen.append(mid)
                    del seen[: max(0, len(seen) - 200)]
                self.commit(r, prev)
            await conn.send({"type": "ack", "id": mid, "ok": True, "v": v})
            if o["op"] == "revoke":
                await self.kick(r, o["seat"], "removed")
                return await self.refresh(r)
            if o["op"] in ("invite", "close", "reopen", "title"):
                if o["op"] == "close":
                    for c in list(r["conns"]):
                        if c.seat:
                            await c.send({"type": "bye", "why": "closed", "soft": True})
                return await self.refresh(r)
            owner = o["path"].split(".")[1] if str(o.get("path", "")).startswith("priv.") else None
            for c in list(r["conns"]):
                if c.seat and (not owner or c.seat == owner):
                    await c.send({"type": "ev", "ev": o})
            return
        if t == "eph" and conn.seat and r:
            for c in list(r["conns"]):
                if c.seat and c.seat != conn.seat:
                    await c.send({"type": "eph", "seat": conn.seat, "d": m.get("d")})


DB = os.environ.get("OAK_DB") or str(Path(__file__).with_name("oakhaven_coop.sqlite"))
ORIGINS = [o.strip() for o in os.environ.get("OAK_ORIGINS", "").split(",") if o.strip()]
hub = Hub(Store(DB))


async def ws_endpoint(ws: WebSocket):
    origin = ws.headers.get("origin")
    if ORIGINS and origin not in ORIGINS:
        await ws.close(code=1008)
        return
    await ws.accept()
    conn = Conn(ws)
    ip = ws.client.host if ws.client else "?"
    try:
        while True:
            raw = await ws.receive_text()
            if len(raw) > MAX_MSG:
                continue
            try:
                m = json.loads(raw)
            except ValueError:
                continue
            if isinstance(m, dict) and isinstance(m.get("type"), str):
                await hub.handle(conn, m, ip)
    except WebSocketDisconnect:
        pass
    finally:
        r = hub.live.get(conn.cid) if conn.cid else None
        if r and conn in r["conns"]:
            r["conns"].discard(conn)
            await hub.presence(r)


async def health(_):
    return JSONResponse({"ok": True, "proto": PROTO, "campaigns_live": len(hub.live)})


app = Starlette(routes=[WebSocketRoute("/ws", ws_endpoint), Route("/health", health)])
