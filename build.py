"""Concatenate src/ parts into a single self-contained main.html."""
from pathlib import Path
root = Path(__file__).parent
parts = sorted((root / "src").glob("*"))
out = "".join(p.read_text(encoding="utf-8") + ("\n" if p.suffix == ".js" else "") for p in parts)
(root / "main.html").write_text(out, encoding="utf-8")
print(f"built main.html from {len(parts)} parts, {len(out):,} bytes")
