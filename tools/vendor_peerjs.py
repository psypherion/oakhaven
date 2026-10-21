"""Embed vendor/peerjs-1.5.4.min.js into src/61b_peerjs.js as a string.

The game is one HTML file with one script. PeerJS is kept as text and only
turned into a <script> (through a Blob URL) when a co-op session starts, so
single-player never runs it and "use strict" stays at the top of the game."""
import json
from pathlib import Path
root = Path(__file__).resolve().parent.parent
src = (root / "vendor" / "peerjs-1.5.4.min.js").read_text(encoding="utf-8")
src = src.replace("//# sourceMappingURL=peerjs.min.js.map", "")
lit = json.dumps(src).replace("<", "\\u003c")
out = ("/* PeerJS 1.5.4 (MIT, https://peerjs.com), embedded as text; see tools/vendor_peerjs.py\n"
       "   and vendor/peerjs-LICENSE. Loaded only when a co-op session starts. */\n"
       f"const PEERJS_SRC={lit};\n")
(root / "src" / "61b_peerjs.js").write_text(out, encoding="utf-8")
print(f"wrote src/61b_peerjs.js ({len(out):,} bytes)")
