"""The optional campaign server: same rules as the browser authority.
   python3 tests/server_test.py"""
import os, sys, json, tempfile, hashlib
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["OAK_DB"] = os.path.join(tempfile.mkdtemp(), "t.sqlite")
from starlette.testclient import TestClient
from server import coop_server as S

fails = 0
def ok(c, m):
    global fails
    if not c:
        print("  FAIL:", m); fails += 1

def recv_until(ws, t, n=12):
    for _ in range(n):
        m = ws.receive_json()
        if m["type"] == t:
            return m
    raise AssertionError("no " + t)

c = TestClient(S.app)
host_tok = S.rand(26)
with c.websocket_connect("/ws") as h:
    h.send_json({"type": "create", "proto": 1, "title": "Srv", "name": "Ana", "hero": "dean", "role": "observer", "token": host_tok})
    w = recv_until(h, "welcome"); cid = w["state"]["id"]
    ok(w["seat"] == "A" and w["state"]["seats"]["B"]["hero"] == "sam" and w["state"]["seats"]["B"]["role"] == "interrogator", "seats")
    ok("cred" not in json.dumps(w["state"]["seats"]), "credential leaked")
    code = S.rand(10)
    h.send_json({"type": "op", "id": "i1", "op": {"op": "invite", "hash": S.code_hash(cid, code), "exp": S.now_ms() + 10**6}})
    ok(recv_until(h, "ack")["ok"], "invite")
    with c.websocket_connect("/ws") as g:
        g.send_json({"type": "peek", "cid": cid, "code": "WRONGWRONG"}); ok(recv_until(g, "err")["code"] == "badcode", "bad code accepted")
        g.send_json({"type": "peek", "cid": cid, "code": code}); o = recv_until(g, "offer"); ok(o["hero"] == "sam", "offer")
        gtok = S.rand(26)
        g.send_json({"type": "claim", "cid": cid, "code": code, "name": "Ben", "cred": S.cred_hash(cid, gtok)})
        ok(recv_until(g, "welcome")["seat"] == "B", "claim")
        # rules
        g.send_json({"type": "op", "id": "x1", "op": {"op": "set", "path": "priv.A.x", "val": 1}}); ok(recv_until(g, "err")["code"] == "not yours", "wrote other notebook")
        g.send_json({"type": "op", "id": "x2", "op": {"op": "inc", "path": "rel.sam.dean.desire", "n": 2}}); ok(recv_until(g, "err")["code"] == "they are brothers", "desire between brothers")
        g.send_json({"type": "op", "id": "x3", "op": {"op": "inc", "path": "rel.dean.sarah.trust", "n": 2}}); ok(recv_until(g, "err")["code"] == "not your character", "wrote Dean's feelings")
        g.send_json({"type": "op", "id": "x4", "op": {"op": "revoke", "seat": "A"}}); ok(recv_until(g, "err")["code"] == "host only", "guest admin")
        g.send_json({"type": "op", "id": "x5", "op": {"op": "set", "path": "priv.B.notes.n1", "val": {"title": "secret"}}}); recv_until(g, "ack")
        g.send_json({"type": "op", "id": "x6", "op": {"op": "set", "path": "shared.clues.rot:stub", "val": {"by": "B"}, "expect": None}}); recv_until(g, "ack")
        g.send_json({"type": "op", "id": "x7", "op": {"op": "set", "path": "shared.clues.rot:stub", "val": {"by": "B"}, "expect": None}}); ok(recv_until(g, "err")["code"] == "conflict", "compare-and-set")
        g.send_json({"type": "op", "id": "x6", "op": {"op": "set", "path": "shared.clues.rot:stub", "val": {"by": "B"}, "expect": None}}); ok(recv_until(g, "ack").get("dup"), "duplicate not deduplicated")
        evs = []
        for _ in range(8):
            m = h.receive_json()
            if m["type"] == "ev": evs.append(m["ev"]["path"])
            if "shared.clues.rot:stub" in evs: break
        ok("shared.clues.rot:stub" in evs and not any(p.startswith("priv.B") for p in evs), "host got the wrong events: %r" % evs)
        # removal
        h.send_json({"type": "op", "id": "r1", "op": {"op": "revoke", "seat": "B"}})
        ok(recv_until(h, "ack")["ok"], "revoke not accepted")
        ok(recv_until(g, "bye")["why"] == "removed", "guest not removed")
    with c.websocket_connect("/ws") as g2:
        g2.send_json({"type": "hello", "cid": cid, "seat": "B", "cred": gtok}); ok(recv_until(g2, "err")["code"] == "removed", "removed credential works")
    h.send_json({"type": "op", "id": "c1", "op": {"op": "close"}}); recv_until(h, "ack")
    h.send_json({"type": "op", "id": "c2", "op": {"op": "set", "path": "shared.flags.x", "val": 1}}); ok(recv_until(h, "err")["code"] == "closed", "closed campaign writable")
    h.send_json({"type": "op", "id": "c3", "op": {"op": "reopen"}}); recv_until(h, "ack")
# persistence: a new hub reads the same database
hub2 = S.Hub(S.Store(os.environ["OAK_DB"])); C = hub2.room(cid)["C"]
ok(C["shared"]["clues"].get("rot:stub") and C["seats"]["B"]["revoked"] and not C["closed"], "not persisted")
ok(C["seats"]["A"]["cred"] == hashlib.sha256(f"oakhaven:{cid}:{host_tok}".encode()).hexdigest(), "credential hash differs from the browser's")
print("\n%d failure(s)" % fails if fails else "\nAll checks passed")
sys.exit(1 if fails else 0)
