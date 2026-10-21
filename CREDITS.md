# Credits

**Oakhaven** is a free, non-commercial fan work.

- **Design, writing, code, pixel art, sound:** made for this project. Every image and sound is drawn or synthesised in the browser at runtime. There are no image, audio or font files. The one third-party library is PeerJS (below), used only for two-player campaigns.
- **Characters from *Supernatural*:** Dean and Sam Winchester, Castiel, Crowley, Chuck Shurley, Kevin Tran and Juno. *Supernatural* is owned by Kripke Enterprises, Wonderland Sound and Vision and Warner Bros. Television. They are used here non-commercially. Everything else (the town, its people, its cases) is original to Oakhaven.
- **Fonts:** your system's monospace and serif fonts.
- **Touchstones:** *Fatal Frame*, *P.T.*, *Silent Hill*, *Visage*, *Doki Doki Literature Club*, *Inscryption*, *Mouthwashing*, and *Doom*.
- **Test tooling** (not part of the game): Node.js and Playwright with Chromium. `tools/export_assets.js` uses `@napi-rs/canvas` to export PNGs.

**Licence.** The original code and writing are offered for non-commercial sharing with attribution. The *Supernatural* characters remain the property of their owners, so this build must not be sold or distributed commercially. A commercial release would need either the rights or a full conversion to original characters, names, dialogue and branding. Renaming the game would not be enough.


## PeerJS

Two-player campaigns use **PeerJS 1.5.4** (https://peerjs.com), MIT licence, © Michelle Bu, Eric Zhang and the PeerJS contributors. It is embedded in `src/61b_peerjs.js`; the licence is in `vendor/peerjs-LICENSE`. By default the browsers find each other through PeerJS's free public signalling server. The optional campaign server uses Starlette (BSD) and SQLite.

## The Formless One

The figure at the end of Oakhaven is adapted, with respect, from the Krishna of the Mahabharata attributed to Vyasa: the Udyoga Parva's envoy, the teacher of the Bhagavad Gita in the Bhishma Parva, the Sabha Parva, and the Mausala Parva. His look reimagines that figure in a gothic register. Much of his dialogue in the altar scenes comes from the project author's own design notes. The rest was written for this game. None of it quotes the epic. The game makes no theological claim, and it isn't meant to represent any tradition's understanding of Krishna.


## Weapon art

The painted first-person weapons (1.7) come from a reference sheet supplied by the project's author. They were cut out, cleaned and packed into the game's sprite sheet.

## If any of this touches your life

- US: National Domestic Violence Hotline, 1-800-799-7233
- India: Women Helpline 181, Childline 1098
- UK: Refuge, 0808 2000 247
