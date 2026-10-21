# Oakhaven campaign server (optional)

You don't need this to play two-player Oakhaven. By default the host's browser
holds the campaign and the two browsers talk directly. Run this server when
you want the campaign to live somewhere that's always on, so that either
brother can play, and decide things together, whenever both are around,
whether or not the host's browser is open.

It speaks the same protocol as the game (`src/61a_coop_core.js`) and enforces
the same rules:
- who may write where
- compare-and-set
- append-only lists
- admin by the host only
- private notebooks sent only to their owner

It stores credentials and invitation codes only as salted SHA-256 hashes.
Every accepted change is written to SQLite before it's acknowledged.

## Run it

    pip install -r server/requirements.txt
    OAK_ORIGINS=https://YOU.github.io uvicorn server.coop_server:app --host 0.0.0.0 --port 8765

- `OAK_DB` sets the SQLite file. The default is `server/oakhaven_coop.sqlite`.
- `OAK_ORIGINS` limits which pages may connect. Set it to your GitHub Pages origin.
- `GET /health` reports that it's up.

## Put it behind TLS

The game on GitHub Pages is served over https, and browsers won't let an
https page open a plain `ws://` connection to another machine. Put the
server behind anything that terminates TLS and forwards WebSockets. For
example, Caddy:

    coop.example.com {
        reverse_proxy 127.0.0.1:8765
    }

Players then choose **Campaign server** when creating a campaign and enter
`wss://coop.example.com/ws`. For local testing, `ws://127.0.0.1:8765/ws`
works from a page served on localhost.

## Limits

- Run a single process. Campaigns are kept in memory while in use, and every write is version-checked against the database.
- Creating campaigns is limited to 20 an hour per address.
- After six wrong invitation codes, that invitation stops working.
- SQLite is fine for a handful of campaigns. Past that, move `Store` to PostgreSQL: the interface is three methods.

## Tests

    python3 tests/server_test.py            # the server on its own
    node tests/coop_server_interop.js       # the game talking to it
