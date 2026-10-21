# Oakhaven

A first-person horror game set in a dying mill town, played as Dean or Sam
Winchester. It's a Doom-style pixel raycaster with an optional ASCII
post-process. You get a drivable Impala, buildings you can walk into, a
paper-doll cast, in-engine cutscenes, and a story that unfolds through
conversations you overhear and conversations you choose.

**Version 1.9.0.** This is a free, non-commercial fan work. See `CREDITS.md` for the licence and the *Supernatural* notice, `CHANGELOG.md` for what changed, and `KNOWN_ISSUES.md` for limitations.

**Supported:** desktop Chrome, Edge, Firefox or Safari 17+, with keyboard and mouse or a standard gamepad; and phones and tablets in landscape, with touch controls (1.9). The game is one HTML file that runs offline, with no server needed. Two-player campaigns need a network connection; see *Two players* below.

## Files

- `oakhaven.html` is **the game.** It's one self-contained file, so open it in any browser.
- `src/` holds the source the game is built from. `python3 build.py` concatenates it into `oakhaven.html`.
- `tests/` has headless tests (`node tests/suite.js`) that play both acts end to end, including every story branch.
- `backend/` is the optional FastAPI server for saves and server-side act gating.
- `server/` is the optional co-op campaign server (Starlette + SQLite). See `server/README.md`.
- `vendor/` holds PeerJS, which the build embeds (`python3 tools/vendor_peerjs.py`).
- `STORY.md` is the story bible. `RENDERING.md` covers how the renderer works.
- `docs/AUDIT.md` is the release audit: defects found, severity and fixes. `docs/CASEMAP.md` is the case dependency map.
- `tests/release.js` checks saves, settings, combat telegraphs, blocking and the investigation systems. `tests/cases.js` plays every case end to end.
- `oakhaven_doom.html` and `oakhaven_prototype.html` are earlier builds, kept for reference.

## The story

Four acts and fourteen chapters, about 90 minutes for a first run. Chapter
cards mark each turn. When an act starts, it is saved as reached in your
browser, and the boot screen then offers **Start at Act I–IV**.

- **Act I · The Wages of Sin.** Six mill workers are dead. You talk to Marla
  at the motel, Sarah at the library and Earl at the pawnshop, then go into
  the mill. Ray Hollis's ghost is still reciting a safety form for fan fourteen.
- **Act II · The Lockdown.** The lamps die and fog seals the town. Delia, a
  possessed teacher, is hiding in the bus shelter, and you decide whether to
  save her or kill her. Kevin Tran is chained up on Bellweather; you use him
  or detox him. Juno pours drinks at the Velvet Hour, and Crowley waits by
  the car.
- **Act III · The Absentee Landlord.** The sky tears and Castiel falls into
  the motel lot. The street loops back on itself, and Earl's door opens into a
  dead girl's house. Father Alistair gives his sermon. The Velvet Hour becomes
  Shurley's, where Chuck is drinking a craft beer.
- **Act IV · Breaking the Script.** The people you helped come back with
  something to give. The church has become a breathing labyrinth with a hall
  where gravity flips. At the altar, Chuck has popcorn.

**All four endings are open at the altar, every run.** The burning, Sam's
martyrdom, walking away, and the secret `sys.exit()`, where you type the
command yourself. What you did along the way decides what each one costs.
Ending A names everyone who was still in town. Ending B depends on whether
Sam ever touched the blood. Ending D depends on whether Kevin was used.
Ending D also erases this browser's record of chapters and endings, after a
warning.

**Dread.** From Act II on, a hidden dread tally rises in the dark and near the
things in the street. Light and your brother bring it down. It never hurts
you. It changes what you can trust:

- whispers that know what you did;
- footsteps behind you;
- your brother standing somewhere he isn't;
- a HUD that lies about your health.

**The husks** in Acts III and IV only move when you aren't looking at them.
Bullets barely touch them; your torch beam burns them.

The **case file (J)** collects what you've learned. In Act III, a note shows
up that you didn't write.

## The cast

The game's characters follow the reference board. Each one is a paper-doll
description in `src/20_art.js`, drawn two ways:

- **Sprites** are 32×56 pixels, with front, side and back views and five frames each (idle, two walk steps, act, hurt).
- **Portraits** are 64×80 busts painted by `src/25_portraits.js` from the same description, in three expressions: steady, grim and hurt. They appear in dialogue and in the case file. The HUD portrait switches expression as your health drops.

Dean, Sam, Kevin, Crowley, the sheriff, Sarah Lindqvist, Dr. Halvorsen, Hank
(the mechanic) and Old Gus all appear in the town now. The girl in the
nightgown shows up on Main Street in Act II. Castiel and Chuck are drawn and
ready for later acts. `node tests/castsheet.js out.png` renders the whole cast
on one sheet.

## Phones, HD and Cinematic (1.9)

- **On a phone:** open the page, turn the phone sideways, and tap Play. The game goes fullscreen where it can, and starts on *Fill screen*, a renderer as wide as your screen.
  - Left thumb: move. Push to the rim to run.
  - Right thumb: look, plus fire, use, jump, duck, special, next weapon and alt.
  - Top bar: pause, map, case file, phone, the quick wheel (press and slide), torch, med kit, kick, and fullscreen.
  - Tap dialogue choices directly. **✕** backs out of the map and phone.
  - Settings → Touch has look speed, button size, and on/off.
  - On iPhone, Safari doesn't allow web pages to go fullscreen. *Add to Home Screen* gives the most screen.
- **HD 960×540** and **Cinematic** (2.39:1 at 1280×536, with bloom, grain and a vignette) are on the title screen's renderer row, and on R in play.
  - Cinematic needs a quick computer. If yours can't keep up, it steps down to 960×402 by itself.

## Two players (1.8)

Press **Play together…** on the title screen.

1. **One of you creates a campaign.** Name it, choose your brother and your role (the Observer or the Interrogator), and press Create.
2. **Send the other person two things, separately:** the invitation link, and the code under it. The code is shown once, works once, and lasts seven days.
3. **The other person opens the link,** types the code and takes the seat. They get the other brother and the other role, and that's permanent for this campaign.
4. **Play.** Each of you walks your own copy of the town. Talk over whatever voice or text chat you already use. The game is built so that each of you finds different things.

**In play:**
- **I**: the campaign board. It shows what's waiting on you (joint decisions, sealed theories, debates), your private notebook, the contradiction ledger, the chronicle, and how things stand between people.
- **J**: the case file. Badges show what came from your partner and what's still only in your notebook.
- **Quick wheel → Signal brother**: short signals ("Come here", "I found something"), for when you're not on voice.
- **Pause menu → Campaign…**:
  - invite
  - remove your partner (host only)
  - close the campaign (host only)
  - your recovery code
  - download the campaign file
  - signalling settings

**Where the campaign lives.**
- **Browser to browser** (default) works on GitHub Pages as it is:
  - The host's browser keeps the authoritative campaign.
  - Your partner can keep playing while the host is away. Anything that needs you both waits for the host to come back.
  - The host should download the campaign file now and then: it's the only backup.
- **Campaign server.** For a campaign that's always available, run `server/coop_server.py` somewhere with TLS and choose *Campaign server* when you create the campaign.

**Coming back.**
- Both browsers remember the campaign: press Play together… → Resume.
- On a new browser, use **Recover access** with your recovery code. If you hosted a browser-to-browser campaign, recover with your campaign file instead.

The chapter written for two is *The Rot* (Act I). After it, the rest of the game carries on in your own towns, and the case file, the chronicle and the relationships stay shared. See `STORY.md` §13.

## The arsenal, the guises, and other places (1.7)

- **Weapons.** Painted weapon art, with a choice of style in Settings → Weapons. Three blades share slot 4, and the Ring of Severance is slot 8.
- **The Formless One's guises.** He helps in disguise: a black dog, a crow, the wind, an old woman with marigolds.
- **Three other places.** He opens tears to 1951, to 2031, and to the Inverted Nave. Each has its own story, boss and reward.
- **Swimming.** You can now swim, so nothing at the reservoir can strand you.

See `STORY.md` §12.

## Names, both brothers, and the one at the end (1.6)

- **Names.** Rename anyone on the Names page (title screen or pause menu).
- **Switching.** Press **U** to switch brothers when nothing is in progress.
- **Hearts.** Rae, for Dean, and Sarah, for Sam, can become true loves.
- **Enchantresses.** Vesper and Celandine rewrite your choices in front of you. Only your brother or your true love can break that.
- **The finale.** A quiet stranger, the Formless One, comes to the altar, and the last act runs in four phases with three new endings.
- **The fourth wall.** The game may ask for your location when you start, and much later it may name your own town on screen. See Settings → Fourth wall.

The details are in `STORY.md` §11.

## Arcs and the town (1.5)

The brothers each have a quiet arc, moved by eight car conversations you steer. The supporting cast have their own beats across the acts. The town holds a vigil in Act II and gathers at the church doors in Act IV. Townsfolk, KOAK and your phone react to what you've done. The details are in `STORY.md` §10.

## Investigations

Every case runs the same loop: **arrive → investigate → build a theory →
prepare → resolve → record.**

- **The journal (J)** is the case board. Each case has its own page. Clues arrive from what you read, who you talk to, what you photograph and where you stand. Clues you haven't found show as redacted cards, so you know something is missing.
- **Connect two clues** to make a deduction. Wrong pairs are refused, and a deduction is never wasted. Each one shows both brothers' readings, and many open something new: a line of dialogue, a way to talk a ghost down, leverage over Crowley.
- **Commit to a theory.** You get one try, and you can be wrong. **Sam's hunch** points out two clues that belong together. **Dean's gut** strikes out one wrong theory.
- **The autopsy.** When a case closes you get a three-layer report: what happened, what caused it, and what is still unresolved. Both brothers read the facts differently.
- **The morning paper.** Next, *The Oakhaven Ledger* prints the case, along with an OakhavenTalk thread. Both are written from what you actually found and chose, and they're kept in the phone's **News** app. Every edition is dated Sunday, October 4. Watch the byline.

There are sixteen cases:

| Act | Case | Notes |
|---|---|---|
| I | **The Green Chain** | main · the mill, fan fourteen |
| I | **The Last Shift** | Frank Dwyer's locked room; three witnesses with one true piece each; the replayed shift |
| I | **The Bell Beneath the Water** | Pike's Reservoir, by Impala |
| I | **The Dead Man on the Radio** | the sheriff's station; a timed call |
| II | **Bodies Are Walls** | main · the farm and who signed for it |
| II | **The Road That Returns** | Route 9, mile markers, the toll station |
| II | **The House With One More Room** | Agnes Bell, Larch Street |
| II | **The Man Who Came Back Wrong** | Glenn Reed, Larch Street |
| II | **The Inventory of Things That Never Existed** | Earl's step |
| II | **The Contract Nobody Signed** | Price's Hardware; a paper chain across town |
| II | **The Saint in the Walls** | St. Jude's chapel |
| II | **The Children Who Draw the Same Sky** | the elementary school and Coos Ridge |
| III | **The Seventh** | main · Lily |
| III | **The Patient Who Died Tomorrow** | the clinic |
| IV | **The Last Broadcast** | KOAK-TV |
| IV | **Twenty to Three** | main · what the finale actually requires |

Leads for the optional cases arrive by text message, on the Impala's radio, or from the people involved. `docs/CASEMAP.md` lists how each case opens, which evidence can be found more than one way, and what each case changes in the others.

The optional cases each end in a three-way decision. The game remembers how
you solved them: the flags carry into later dialogue, Chuck's confidence at the
altar and every epilogue.

## The Impala

Use the car to drive, and also to open its hub menu:

- **Drive to** any location you have a lead on.
- **Talk it over.** The brothers discuss the open case.
- **Turn on the radio.** Broadcasts change as the town gets worse.
- **Open the trunk** or **Change clothes.**

Every remote location has the car parked outside, so you can always get home.

## The phone and camera

- **N** opens the phone. Its apps are Camera, Gallery, Messages, Notes, News, Journal and Flashlight. The world keeps moving while you look at it.
- **Y** goes straight to the camera.
  - **Fire** takes the photo.
  - **Alt fire** flips to a selfie; whoever is near you appears in the frame.
  - **Esc** puts the phone away.
- **The gallery** lasts across runs, kept in this browser's IndexedDB. From the gallery you can:
  - view any photo
  - save it to your real device as a JPEG
  - set it as the phone's wallpaper
  - delete it
  - show it to whoever you're standing next to, which is the evidence mechanic: a photo can change what a character tells you and what they give you
- **The camera sees what you can't.** The six dead men and two others are still standing where it happened, and only the lens shows them. The viewfinder hums when one is near. A photo of one adds their last minute to the journal and a clue to the case.
- **Calls and messages** come in while you play. Some you'll want to answer, and some you won't. Phone (541) 555-0114 texts you all night.
- **Ending D** erases the gallery and the messages along with your saves.

## Saving and resuming

The game saves to this browser.

- **Autosave.** The game saves at every chapter card, completed objective and
  doorway. It waits for a quiet moment, so never mid-fight, mid-cutscene or
  while you're driving. A small *saving…* appears bottom right.
- **Manual saves.** There are three slots in the pause menu.
- **Pause menu.** Open it with **P** or **Esc**, or the controller's Menu
  button. The game also pauses itself if you lose the mouse, for example by
  alt-tabbing. The menu has Resume, Save game, Load game, Controls and Quit
  to title.
- **Title screen.** **Continue** picks up the most recent save, and every slot
  is listed under it. Starting a new game never touches your saves.
- **What a save holds.** Everything that changes: your kit, health, money and
  costume; every story flag, choice and case-file note; who you freed; the
  current objective; and every place as it now stands, including the fold's
  flesh walls, dead lamps, who is where and what you've seen on the map.
- **Loading during a game** reloads the page first, so nothing from the run you
  left leaks into the one you load.
- **Ending D** erases every save, as the story promises. It warns you first.

**Save compatibility policy.**
- Every save records a format version and the build that wrote it.
- A save from an older format is upgraded on load.
- A save from a newer build, or one that's corrupted or incomplete, is shown as *Damaged* with the reason. It is never deleted, and autosave never writes over it.
- If a load fails partway, the game reloads to the title and leaves the slot as it was.
- Settings and control bindings are stored separately from saves, and survive Ending D.

## Images

`assets/` holds every character, portrait, prop, pickup and vehicle as a
transparent PNG: sprite sheets, single frames, 64×80 portraits in three
expressions, and 4× previews. `assets/README.md` explains the layout.
`reference/` holds the concept board the cast was matched to. The game doesn't
need either folder to run, because it draws the same art itself when it loads.

## If the screen stays blank

That was a real bug in the previous build, and it's fixed. A browser could
hand the first frame a slightly negative time step, the boot screen crashed,
and the game loop never started again. The loop now survives any error. If
something does go wrong, a message appears in-game instead of a frozen screen.
To check a build yourself, run `node tests/browser.js`, which needs Playwright.
It plays both heroes in a real Chromium and reports any errors.
`node tests/save_browser.js` saves, loads and continues in a real browser.
`node tests/controls_browser.js` does the same for the Controls page. It uses a simulated
controller to test rebinding, conflicts, saving, analog movement, RT fire and
rumble.

## Settings

Open **Settings** from the pause menu (P or Esc) or from the title screen. It covers:
- master, music, ambience and effects volume
- text size and subtitles
- tutorial hints
- screen shake
- visual intensity: grain, colour tearing, glitches and lightning flashes; turn it down if flashing images bother you
- HUD size

Everything is saved in this browser.

## Combat, briefly

Enemies telegraph their attacks with a red flash and a sound before they strike. Step back and the attack misses. Ghosts want salt and iron, demons want the knife or a rite, and the things from the fold burn under your torch. A hit marker confirms your hits, and a red arc shows where damage came from. Sam's chant survives one hit with a stagger; a second hit breaks it.

## Controls

**Cursor camera.** Turn on *Cursor looks around* on the Controls page and the
camera follows the mouse cursor without capturing it. Push the cursor to the
edge of the screen to keep turning. The **quick wheel** (hold Tab) slows time
while it's open and has the phone, camera, med kit, torch, map, journal,
quicksave and pause.


Every control can be rebound. Open the **Controls page** with **O** (or F1),
the Menu button on a controller, or *Controls & controller…* on the boot
screen. The game pauses while the page is open.

- Each action has two keyboard/mouse slots and one controller slot. Click a slot, then press the key, mouse button, wheel direction or pad button you want.
- **Esc** cancels a capture, and **Backspace** clears the slot.
- If the input already belonged to another action, the page moves it to the new one and tells you which action lost it.
- You can also adjust mouse sensitivity, stick look speed, deadzone, invert-Y for mouse and pad separately, and rumble.
- **Reset keys**, **Reset pad** and **Reset all** restore the defaults.
- Settings are saved in this browser.
- On-screen hints (the interact prompt, your special, "close" hints) show your real bindings. They switch to controller button names when you're using a pad.

**Esc is reserved.** It always backs out of whatever is open, because the
browser also uses it to release the mouse.

### Defaults

| Action | Keyboard / mouse | Controller (Xbox layout) |
|---|---|---|
| Move / look | `WASD` + mouse, arrows | left stick / right stick |
| Run · jump · crouch | `Shift` · `Space` · `C` | L-stick click · A · B |
| Fire / hold to chant | left click, `K` | RT |
| Alt fire / next rite | right click | LT |
| Special · kick | `Q` · `V` | Y · R-stick click |
| Weapons | `1`–`7`, wheel, `X` last | RB / LB, D-pad ← last |
| Med kit · cycle rite | `B` · `T` | D-pad ↓ · D-pad → |
| Interact · torch | `E` · `F` | X · D-pad ↑ |
| Map · journal (case board) | `M` · `J` | View · — |
| Phone · camera | `N` · `Y` | — |
| Quick wheel (hold) | `Tab`, `G` | — |
| Pause | `P`, `Esc` | Menu |
| Controls page | `O`, `F1` | Menu |
| Renderer · light · high beams | `R` · `L` · `H` | — |
| Skip cutscene | `Enter` | A (or Menu) |
| Dialogue choices | `1`–`4` | A / B / X / Y |
| Driving | `W`/`S` throttle, `A`/`D` steer | RT/LT or left stick |

Controllers use the browser's standard gamepad mapping, which covers Xbox,
PlayStation and most generic pads. Press any button once after plugging one
in so the browser reports it.

## If you can't see

Three independent controls, in the order worth trying:

1. **`L` for Day.** Full ambient, bright overcast sky, no torch needed. This is
   the mode to build levels in — you cannot design a room you cannot see.
2. **`[` and `]`** adjust brightness from 50% to 220%. Monitor calibration
   varies enough that a fixed value can't be right for everyone.
3. **`G`** removes the scanline and vignette pass. It looks good and it costs
   real contrast; turn it off if the image is muddy.

Dusk is the default because it reads clearly while keeping the horror tone.
Night is the intended register but assumes you use the torch.

### What was making it dark

Four compounding things, all fixed:

- **No background fill.** Cells drew a glyph on black, so the image was sparse
  characters floating in a void. Every cell now paints a background block two
  palette steps below its glyph, which turns the render into solid shaded
  geometry. This was by far the biggest single improvement, and it's batched by
  run-length across each row so it costs almost nothing.
- **Palettes bottomed out near black.** Rebuilt so the low end is a legible
  dark grey and the top end is genuinely bright.
- **Ground textures were authored too dark** to show a background even under
  full light. Asphalt, dirt, and floorboards all raised.
- **The CRT overlay ate about a third of the contrast.** Lightened, and now
  defeatable with `G`.

Indoor and outdoor darkness scale separately per preset. At night you can see
outdoors by sky-bounce, but the mill is genuinely black — which is what makes
the torch a tool rather than a decoration.

## What's here

```
oakhaven.html             the game — standalone, no server needed
STORY.md                  four-act story bible, characters, script-ready dialogue
backend/
  main.py                 FastAPI: REST + WebSocket
  game/state.py           meters, flags, alignment, ending resolution
  game/dialogue.py        declarative condition/effect engine (no eval)
  game/world.py           sector generation, act folding, validation
  content/dialogue.json   dialogue trees
frontend/
  index.html              the game, wired to the backend
  js/net.js               glue, with offline fallback
oakhaven_prototype.html   the earlier v1 build, kept for reference
```

## The renderer

DDA raycasting, one ray per screen column, four passes per frame:

1. **Walls** — grid march to the first solid tile, then a vertical span shaded
   by distance. Each material carries an 8×8 brightness texture, so brick reads
   as brick and corrugated steel reads as steel.
2. **Floors** — per-column floor casting samples the actual ground tile at each
   screen row, which is what makes roads, sidewalks, and the centre line exist
   as surfaces rather than being painted on.
3. **Sprites** — two hand-drawn LODs per model. The small one is *drawn* to work
   at eight rows tall, not shrunk from the large one. When downsampling, the
   *brightest* glyph in each source block wins, so an eye or an outline never
   drops into a gap — point-sampling was what made the old sprites mush.
4. **Glitch** — a post-pass over the character buffer, driven by act number and
   unmanaged stress.

**Lighting.** Static light is baked per cell with a line-of-sight test, so it
pools under a streetlight and stops at walls instead of bleeding through. Torch,
headlights, and muzzle flash are added per ray at render time — and since every
screen column *is* a ray, the cone falloff is a function of the column alone,
precomputed once per frame.

Switching time of day rescales every sector's ambient term and rebakes the
lightmaps (~10 ms per sector, one-off).

**Cost:** about 4.5 ms per frame at 136×56 including the blit, well inside a
16 ms budget.

## Combat is the philosophical argument

Dean fires; the target drops in two seconds. Sam channels a Latin rite that
takes two to three seconds and **breaks if he moves** — but leaves a living host
where Dean leaves a body.

Fight the same mill phantom as each. Dean disperses it instantly and the tear in
the air eats it. Sam takes twenty seconds, gets the words out, and it says
**fourteen** before it goes. Neither of them saved him. One found out his name.

## Authoring content

Dialogue conditions and effects are data, never expressions — nothing calls
`eval`, so trees stay safe to hot-reload or accept from an editor.

```json
{"text": "[Show him the fragments.] Look at the syntax.",
 "next": "k_syntax",
 "requires": {"fragments": {"gte": 4}, "ascetic": true},
 "effects": {"alignment": {"humanism": 2}, "fragment": "kevin:recognition"}}
```

`DialogueRunner.validate()` and `world.validate()` both run at server import, so
it refuses to boot on a dangling `next` or a door that would drop the player
inside a wall. Keep it that way — those are the two mistakes that actually
strand players.

## Endings

| Ending | Condition |
|---|---|
| `sys_exit` | No drinks, no doses, no brothel visits, ≥9 fragments, Kevin detoxed, no civilians killed |
| `martyrdom` | Humanism > nihilism and blood > 40 |
| `match` | Nihilism ≥ humanism |
| `hollow` | Everything else |

`DELETE /api/session/{id}` really removes the save file. The fourth-wall ending
only lands if the deletion is real.

## Build order from here

1. **Act III geometry.** `world.fold()` corrupts the map the player already
   learned rather than swapping in a bespoke strange one. Extend it to re-link
   doors so corridors loop.
2. **Act IV vertical movement.** The renderer already supports `posZ` and pitch;
   ceiling-walking is a gravity sign flip plus swapping the floor and ceiling
   passes.
3. **Audio.** Earlier than feels reasonable. Half of horror is sound, and an
   ASCII game has to carry more with it than a textured one does.

## Two notes on the source material

**Rights.** The Winchesters, Castiel, Crowley, Chuck, and Kevin Tran belong to
Warner Bros. Fine for something personal or unlisted; a problem the moment it
goes on itch.io or Steam. The original material — the harvest premise, the
rust-belt setting, scripture-as-source-code — carries the game on its own. Two
hunters, no franchise names, and it ships.

**Depiction.** The mature themes are present as written: addiction, sex work,
the mill deaths, a town farmed for despair. Explicit sexual content stays
off-screen. Dean's coping mechanic exists and costs what it should — you see the
aftermath and the meter, not the act. What makes it land is the cost.
