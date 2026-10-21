# Known issues and limitations

- **Phones.** Phones play in landscape with touch controls. On small phones the journal, the board and the in-game phone are cramped but scroll. iPhone Safari can't go fullscreen from a web page, so use *Add to Home Screen* for the most room. Older or budget phones should stay on *Fill screen* or Doom.
- **Browsers.** Tested in Chromium (Chrome, Edge, Brave). Firefox and Safari 17 or later should work. Older Safari lacks CSS `zoom`, so the Text size setting doesn't scale the journal and phone there.
- **Saves live in this browser** (localStorage). The phone's gallery lives in IndexedDB. Clearing site data erases both. Private windows forget everything when closed.
- **Audio starts after your first click or key press,** because browsers block sound until you interact with the page.
- **The Crisp renderer** (640×400) runs at about 8–9 ms per frame on a mid-range laptop. On older machines, use Doom or Build.
- **Camera photos** are captured from the game canvas at up to 640 px wide. "Save to device" downloads a JPEG through the browser's normal download prompt.
- **The Last Broadcast** is only available in Act IV, before you enter the cathedral.
- Some optional cases have a time window: the Act I cases close when Act II starts if you never opened them, and chapter select skips them.

To report a bug, open the pause menu and note the chapter shown there, the renderer and what you were doing. Then attach your save. You can export it from the browser's devtools: `localStorage['oakhaven.save.auto']`.

- **Fourth wall.**
  - Fullscreen needs a user gesture, so the moment waits for your next keypress or click.
  - Some browsers, and embedded previews, refuse fullscreen. The moment then plays in the window.
  - Location lookup needs network access to BigDataCloud. Offline, or if you decline, the town comes from your time zone. A UTC time zone shows "your town".
- **Names.** Very short custom names can collide with ordinary words, because the substitution matches whole words. Renaming Dean to "Sam", for example, makes the two brothers indistinguishable on screen.

- **Weapon art.** The painted weapons always show dark sleeves, whatever outfit you're wearing. The Classic and Original styles still match the outfit.
- **The Inverted Nave.** Its far half is drawn upside down on purpose. If that's uncomfortable, lower Visual intensity in Settings.

- **Two players.**
  - **Browser to browser needs the host's browser.** The host's browser holds the campaign. While it's closed, your partner can play and review, but joint decisions wait. If the host clears their browser without a campaign file, the campaign is gone. Use a campaign server if that matters.
  - **The host's browser stores both notebooks.** In browser-to-browser mode the authority (the host's browser) holds your partner's private notebook too, just as a server would. The game never shows it to the host. Someone who opens devtools could read it. On a campaign server it stays on the server.
  - **Some networks block direct connections.** Strict corporate and mobile networks can stop two browsers connecting directly. Add a TURN server in the campaign panel, or use a campaign server.
  - **PeerJS's free public signalling server** introduces the two browsers. If it's down, nobody can join until it's back, or until you point both browsers at your own (`npx peerjs --port 9000`).
  - **One tab per campaign.** Opening the same campaign in a second tab makes the first step aside.
  - **Combat isn't shared.** Each of you fights in your own copy of the town. What's shared is the case, the decisions, the relationships and where your brother is standing.
  - **Written for two: Chapter One only.** Acts II–IV play as before in each town, with evidence, theories and decisions shared.
  - **The campaign server** keeps campaigns in memory while they're in use, so run it as a single process.

- **Cinematic and HD** cost roughly 3× and 2× what Crisp does per frame. Cinematic steps down to 960×402 by itself if the frame rate drops for more than four seconds; HD doesn't, so switch back with **R** if it stutters.
