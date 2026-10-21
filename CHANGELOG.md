# Changelog

## 1.9.0: Cinematic, HD, and phones

**Higher resolution**
- **HD 960×540**: more than twice Crisp's pixels, smoothly scaled to your screen.
- **Cinematic**: the widescreen 2.39:1 frame at 1280×536, with a soft bloom on everything that glows, film grain, a vignette and a light grade.
  - It's the heaviest mode. If your computer can't keep up for a few seconds, it drops to 960×402 by itself and tells you.
- On very sharp screens the HUD and text now draw at up to 3× pixel density (was 2×).
- The game now remembers the renderer you chose.

**Phones and tablets, in landscape**
- On a touch screen the game turns on touch controls by itself. You can change that under Settings → Touch.
- The game fills the screen sideways, and goes fullscreen and locks to landscape where the browser allows.
- **Fill screen** is a new renderer made for phones: 270 lines high and exactly as wide as your screen, so there are no black bars. Phones start on it.
- **Left thumb:** a floating stick, wherever you put your thumb down. Push it to the rim to run.
- **Right thumb:** drag anywhere empty to look. The buttons sit in an arc:
  - fire (hold)
  - use
  - jump
  - duck (hold)
  - special
  - next weapon
  - alt / rite
- **Top bar:**
  - pause
  - map
  - case file
  - phone
  - quick wheel (press and slide to pick)
  - torch
  - med kit
  - kick
  - campaign board in co-op
  - fullscreen
- **✕** backs out of the map, phone, shop, camera and wheel. **Skip ›** appears during cutscenes.
- Dialogue, menus, the journal and the board all work by tapping. The controls get out of the way while those are open.
- Holding a phone upright shows a card asking you to turn it sideways.
- Settings → Touch has look speed and button size.

## 1.8.0: two players

**A campaign for two**
- **Play together…** on the title screen. One of you creates a campaign and sends the other an invitation: a link, plus a separate one-time code. The link alone doesn't let anyone in.
- Each of you plays one brother in your own copy of Oakhaven. The case file, the decisions, the people and a running chronicle are shared.
- **Roles.** When you create the campaign you choose your brother and your role. Your partner gets the other brother and the other role, and both are permanent for that campaign, even after a reconnect.
  - **The Observer** reads records. He sees altered documents and missing numbers, gets the pattern read on the case board, and can see which theories the evidence actually supports.
  - **The Interrogator** reads people. Witnesses trust him more, some will talk only to him, and he gets the gut read that rules a theory out.
- **Hosting is admin, not story.** The host invites, removes and closes. The host gets no extra evidence or narrative power.

**Shared evidence, separate knowledge**
- Documents, places, photographs and records go into the shared case file as soon as either of you finds them.
- What people tell you, and what only you saw, goes into your **personal notebook** (board, **I**) until you choose to share it. A deduction made from a private note shares the note.
- The **contradiction ledger** keeps both your accounts of the same thing side by side. It marks what you can both check for yourselves.
- **Theories are sealed.** Each of you answers alone, and neither sees the other's answer until both are in. If you agree, the theory is committed. If you disagree, a debate opens with the evidence on the table. If you still disagree after that, the case is recorded as contested.
- **Joint decisions** are permanent and need both of you. Decisions you make alone are still yours, but your brother hears about them and takes it his own way.
- **Trust between the brothers** is tracked separately from anything supernatural. Disagreeing is never treated as being compromised.

**Chapter One: The Rot**
- A new two-player chapter: *Why are people dying, and why do the records disagree?*
- The Observer finds a page cut from the county death register. The Interrogator gets the doctor who signed it to say why. Neither has the answer alone.
- **The Fracture.** In the library, the two of you see different rooms. You compare what you can both check while the room changes around you. At some point a message arrives from your brother, and your brother never sent it. That message is scripted by the game. Nothing you say or type outside the game is ever recorded or imitated.
- There are three plausible theories and three endings: **Seven**, **Six** and **Two files**.

**Four protagonists**
- **Lilith**, new: the Demon Queen who wants to be human. She waits in the motel lobby. She can make anyone talk, but what she draws out of someone isn't freely given, and it won't survive daylight.
- **Sarah's beast.** She loses an hour in her own archive. What you tell her, you decide together, and how it goes depends on how each of you has treated her.
- **Relationships.** Dean, Sam, Lilith and Sarah each feel something separate, and lopsided, about each of the others: trust, affection, respect, desire, understanding, resentment, emotional safety and supernatural influence. Each changes through structured events.
  - You only ever write your own brother's side.
  - Major changes appear in the chronicle. Small ones stay private.
  - There is no desire between the brothers, ever.

**Keeping a campaign**
- **Asynchronous play.** If your partner drops out, you keep investigating. Whatever you find waits in your outbox, and joint decisions wait for them.
- **Reconnecting** loads the campaign's authoritative state, not what your browser remembers.
- **The campaign panel** (pause menu) has:
  - a new invitation
  - remove your partner (nothing is erased; the seat stays locked to that brother and role, so a new player takes it over as the story left it)
  - close and reopen
  - your recovery code
  - the campaign file
  - signalling and TURN settings
- **Two ways to connect:**
  - **Browser to browser.** This is the default, and it works on GitHub Pages with no server. The host's browser holds the campaign, and your browsers talk directly over WebRTC. PeerJS's public server only introduces them.
  - **Campaign server**, optional. Run `server/coop_server.py` (Starlette + SQLite) and the campaign lives there, so either of you can play while the other is away.
- Single-player is unchanged.

**Under the hood**
- `src/61a`–`61g`: the protocol, connections, game glue, relationships, the chapter and the screens.
- PeerJS 1.5.4 (MIT) is embedded as text and only started when a co-op session begins.
- Tests:
  - `tests/coop.js`: two to five isolated game instances, with joining, rules, the Fracture, theories, endings, disconnects, removal and recovery
  - `tests/coop_browser.js`: two real Chromium pages over WebRTC through a local signalling server
  - `tests/server_test.py` and `tests/coop_server_interop.js`: the Python server, on its own and with the game

## 1.7.0: the arsenal, the guises, and three other places

**Fixed: stranded at Pike's Reservoir**
- Settling the bell case while standing on the old stone path used to sink the path under you, and the water rule then pinned you in place forever.
- The stones now wait until you've stepped off before they go under.
- You can now swim anywhere there's water: it's slow and it costs stamina. If you tire out, you're carried back to the nearest bank.
- Saves made while stuck will free themselves when loaded.

**Weapons**
- The first-person weapons are now painted pixel art: the revolver, sawed-off, flare gun, crowbar, holy water, the demon blade, the angel blade, the archangel's blade and the Ring.
- **Weapon style** (Settings → Weapons, or the quick wheel):
  - **Painted**: the new pixel art
  - **Classic**: the old flat, chunky look, rebuilt properly for all nine weapons:
    - one camera angle and one light, shared by every weapon
    - each part shaded by its material: blued and bright steel, walnut, leather, glass, gold, ivory, cloth
    - hands with a palm and heel, a thumb from the side of the palm, four fingers of different lengths wrapped round the grip, contact shadows, and a sleeve cuff
    - the revolver: a six-flute cylinder wider than the barrel, sights, hammer, guard, and a walnut grip with the index finger resting along the frame
    - the sawed-off: two separate bores, a break-action receiver with a hinge pin, the fore-end cupped in the left hand, a pistol grip and stock
    - the crowbar: a gooseneck with a split claw, and a flat pry end
    - a real glass flask with an engraved cross, a drop-point knife, a ridged angel blade, the archangel's winged guard, and the Ring hovering over an open palm
  - **Original**: exactly as the weapons looked before
- **Blades in slot 4:**
  - the **demon blade** (formerly the knife)
  - the **angel blade**, which Castiel gives you the first time he finds you
  - the **archangel's blade**, found in the ash in 2031, which cuts everything in an arc

  Press 4 again to change blades.
- **The Ring of Severance** (slot 8, from the Formless One): every hold in sight is cut at once. The possessed are freed, everything else takes heavy damage and is stunned. It then needs seven seconds to turn.
- **Armour:**
  - **Mantle of Feathers**: 25% less damage
  - **Ash-plate**: armour refills to 50
  - **Wren's Cloak**: ghosts hit half as hard

**The Formless One, in other shapes**
- He helps before the end, in disguise, and leaves a dark feather each time:
  - a black dog that heals you when you're badly hurt
  - a crow that brings ammunition when your guns are empty in a fight
  - the wind, which knocks a crowd of attackers down when you're outnumbered
  - an old woman whose marigold refuses your death once
- He also opens three tears to other places:
  - a deer at the reservoir
  - a woman at a bus stop with no buses
  - a crow on the wire above the church
- At the altar he admits to every disguise you met.

**Three other places, each with its own look, people, boss and reward**
- **The Drowned Year (Wren's Valley, 1951, sepia).**
  - The valley before the dam, and the Congregation that fed the hunger under the crossroads: eleven names in a register, seven of them children.
  - Margaret Hale, whose husband beats her, and their daughter Hannah, chosen as the last offering.
  - You can let Margaret confront him herself.
  - Boss: **Reverend Silas Ashby, Who Listens**. Amos Wren, the bell keeper, gives you his cloak.
  - Afterwards a letter arrives from Hannah, 84, in Portland.
- **The Ash Morning (Oakhaven, 2031, grey).**
  - The morning after the night goes Chuck's way.
  - Who survived, and whose grave it is, depends on your arcs and on Kevin.
  - Boss: **the Quiet King**, which silences guns, so use blades. Rewards: the archangel's blade, and an Ash-plate made from the Impala's doors.
- **The Inverted Nave (violet, its far half upside down).**
  - Where the hunger keeps the voices of everyone it ate.
  - Boss: **the Choir That Counts**. Silence its four throats, then end it before it reaches zero.
  - The Formless One gives you the Ring and the Mantle.

**Content warning updated** for the cult storyline: ritual murder of children and women is recorded in documents and never shown, and domestic abuse is spoken about and confronted. Help lines are listed on the warning screen.

**Tests**
- `tests/v17.js` covers the reservoir, the arsenal, weapon styles, the guises, and all three places from start to finish.
- `tests/v17_browser.js` takes screenshots of each.

## 1.6.0: names, both brothers, hearts, and the one at the end

**Names**
- A *Names…* page on the title screen and in the pause menu. You can rename both brothers, their family name, Castiel, Crowley, Chuck, Kevin, Rae, Sarah, and the one at the end.
- The new names appear everywhere at once: dialogue, subtitles, menus, notes, the phone, the paper and the case file.

**Switch brothers**
- Press **U** (or use the quick wheel or the pause menu) to play as the other brother.
- Each brother keeps his own weapons, ammunition, rites, costume and health, and saves keep both kits.
- You can't switch during a mission: in a fight, on a call, while chanting, in a cutscene or conversation, while driving, inside St. Brendan's, or while something has hold of you.

**Hearts**
- Good:
  - **Rae Calloway** tows the cars that stop at the town line. She has three scenes with Dean.
  - **Sarah** has two new scenes with Sam.
  - What you say moves her regard for you. At the end of Act III she can become his true love, unless he tells her not to wait.
- Bad: two demons who are excellent company.
  - **Vesper**, at the end of the Velvet Hour's bar (Act II).
  - **Celandine**, in the library stacks after closing (Act III).
- **The enchantment.** Partway through her conversation, the choices on screen rewrite themselves letter by letter into what she wants you to say. She picks from your state: hurt, broke, at odds with your brother, or carrying too much. While the words change you can't pick anything or leave.
- **Breaking it.** Only two things can: your brother, if the night has left you close enough (bond, arc, or the together seed), or your true love, said out loud.
- **The cost.** Without either, Vesper takes your night, your money and your armour, and Celandine takes a page of your case file. If you're freed, she leaves an anchor (a red ribbon or a grey bookmark), and it matters at the end.

**The Formless One**
- A stranger appears three times before the end:
  - with tea in the motel office
  - in a pew at St. Brendan's
  - on the cross street, where he turns the wheel back once to show you Main Street in May
- At the altar a third chair appears beside Chuck's, and the finale runs in four phases:
  - **I · The Stranger.** No combat. Your own evidence against Chuck's story (the seal, the margin, root access, fan fourteen). The brothers challenge him, each in his own way.
  - **II · The Unmaker.** The enchantresses come for the finale and rewrite your choices. He exposes the mechanism: her words stay on screen, blackened and threaded with silver, and dead. Then the brothers have to act, using their bond, what they know, the town, the anchor, or love. Or they can ask him to cut it with the Sudarshana, a black-and-silver ring of blades within blades. Asking is remembered.
  - **III · The Absolute.** His body dissolves into geometry. Overlapping versions of him, the cosmos inside his robes, every face in town, and the Void small in one corner. The interface stops having words for health, distance and time. You answer three questions of perception. A wrong answer turns the wheel back and shows you again.
  - **IV · The Unchosen.** He refuses to choose for you. Three new endings:
    - **E · Liberation**, which needs the brothers together.
    - **F · The Equilibrium**.
    - **G · The Unfinished Sunday**, where you tell him to step back and he does.
  - Chuck's own endings, A to D, are still there if you turn back to him.
- His look: midnight-blue skin, long black hair, pale silver eyes, layered black robes over indigo with silver constellations, a high collar, a feathered mantle, a minimal silver crown, and one dark peacock feather.
- The dead stay dead in every ending.

**The fourth wall**
- When you start or continue a game, before Act I, the browser is asked for your location, so nothing in the story hints at what's coming. Much later, early in Act III, on your next keypress, the game goes fullscreen, tears, and shows the name of your town: *This could be the next Oakhaven.*
- Coordinates go only to BigDataCloud's free reverse-geocoding lookup, and only to get the place name. Only the town's name is kept, in this browser.
- If you decline, or choose *Never* in Settings, the town is guessed from your time zone, offline. *Settings → Fourth wall* turns it off.

**Tests**
- `tests/hearts.js` covers names, switching and its locks, both romances, the enchantment and both ways out, the three meetings, all four phases, endings E to G, and the fourth wall.
- `tests/hearts_browser.js` takes screenshots of each.

## 1.5.0: stories, arcs and a town that notices

**The brothers' arcs**
- Two meters run under the whole night. Dean's: refusing to give up is not the same as refusing to listen. Sam's: sacrificing yourself is not automatically the kind thing.
- Eight car conversations you steer, one after each turning point: the mill, Delia, Kevin, Crowley, the fold, Lily, Chuck, and the last drive before the church. Each is written separately for Dean and for Sam, and it changes with what happened (Delia freed or killed, Kevin rested or used, the deal taken or refused).
- The Impala tells you when something's on your brother's mind, and he nudges you toward the car.
- If both brothers have come far enough and the bond holds, there's a new option at the altar: "We decide this together." It changes the subtitles of endings A to C and adds epilogue lines. It doesn't save anyone for free.

**The supporting cast**
- Story beats for Marla, Earl, Sheriff Ames, Dr. Halvorsen, Sarah, Kevin, Delia, Juno, Castiel, Crowley and Alistair, across Acts I to III. Each plays once, the next time you speak to them.
- Some of the choices carry forward:
  - signing Marla's ledger with your real name or an alias
  - selling Earl a memory for blessed rounds (the memory leaves your case file)
  - telling Ames the truth
  - sparing or freeing Juno
  - an alliance with Crowley in Act III
  - Delia's insight into how to burn the thing
  - Alistair, met early on the church steps

**New main-story beats**
- **The vigil (Act II):** the town gathers with candles on the cross street, and Sarah reads the six names. You can say the names again, say the truth about the fan, give a charge, or stand with them in silence. Each choice has its own consequence and its own epilogue line.
- **A man in a bathrobe** is seen twice from a distance, then gone. The second time, he leaves a note.
- **The gathering (Act IV):** everyone you helped and who trusts you comes to the doors of St. Brendan's, up to sixteen people. Each says a line and some bring something (shells, rounds, a patch-up, armour). The epilogue counts them.

**The town notices**
- Townsfolk have a new line, once each, for most case outcomes and story beats (about 30 in all).
- Walkers who meet in the street talk to each other, and you can overhear them (13 conversations, keyed to what's happened).
- KOAK reads news bulletins between the calls, with nine bulletins that follow what you've done. Case leads on the radio still play first.
- When a case closes, someone texts you about how it ended: Marla, Kevin, Dr. Halvorsen or Crowley, with a different text for each outcome.

**Tests**
- `tests/story.js` covers:
  - every dialogue node reference, for both heroes
  - car scenes, the meters, and the together check
  - the altar option, beats playing once, and the cameo
  - all four vigil outcomes and the gathering
  - reactive lines, overheard talk, bulletins and case texts
  - save round-trips of the new state

## 1.4.0: release pass

**Stability**
- Saves are versioned (`v` plus `build`) and older saves are migrated. A damaged, corrupted, incomplete or newer-version save is listed as *Damaged* with a reason. Autosave never overwrites it.
- A save that fails to load hands over to a clean reload with a message, instead of leaving a half-built world.
- Townspeople and your brother step aside when you push into them, so nobody can block a corridor.
- Chapter select closes the cases it skips.

**Combat**
- Every melee attack is telegraphed (red flash, sound, lunge pose). Step back and it misses.
- Hit markers, kill markers, and a red arc showing where damage came from.
- The revolver and flare gun are redrawn so they read as guns. The shotgun has a rib, a bead sight and a receiver.
- Sam's chant survives its first hit with a stagger. Dean's kick stuns as before.
- The HUD is smaller, and its size is adjustable.

**Settings and accessibility**
- New Settings page:
  - volume for Master, Music, Ambience and Effects
  - text size and subtitles
  - tutorial hints
  - screen shake
  - visual intensity (grain, colour tearing, glitches, lightning)
  - HUD size
- Audio buses, a procedural score that follows dread, ambience beds per place, and enemy sounds positioned in stereo.
- A contextual tutorial: one hint at a time, shown until you do the thing it describes.
- Clues you haven't examined glint, and show as hollow diamonds on the map.
- Keyboard and controller navigation for the journal, phone, settings and autopsy screens.
- Content warning on first launch, and a Credits page.

**Investigation**
- The journal separates Evidence (observed) from Witnesses (claimed), and adds Open Questions and a Transcript of every line.
- Witnesses remember how you treated them. A wary witness gives accurate but incomplete testimony.
- Notes are annotated when a deduction changes them, and a failed theory is crossed out. In Act IV a few entries are edited by someone else, and a chapter you didn't write appears.
- Each case quietly tracks how thoroughly you investigated it, and the autopsy and the paper reflect that.
- The brothers keep score of who wanted which call. The car is where they say so, and the bond shows at the altar and in the epilogue.

**Seven new cases**
- The Dead Man on the Radio
- The Man Who Came Back Wrong
- The Inventory of Things That Never Existed
- The Contract Nobody Signed
- The Saint in the Walls
- The Children Who Draw the Same Sky
- The Last Broadcast

New places for them: the sheriff's station, Price's Hardware, the Reed house, St. Jude's, the elementary school, Coos Ridge Observatory and KOAK-TV. Every new case feeds at least one other case (see `docs/CASEMAP.md`).

## 1.3.0
- Phone, camera and gallery.
- The journal case board, the autopsy, and the morning Ledger with OakhavenTalk.
- Five investigations: The Last Shift, The Bell, The Road, The House With One More Room, The Patient Who Died Tomorrow.
- The 0114 thread, photos you didn't take, payphone calls, Dad's call.
- Connective scenes. Epilogues that remember.

## 1.2.0
- Saving and resuming: autosave, three manual slots and a quicksave.
- Visual pass: fog, ambient occlusion, contact shadows, glow and grain.
- Momentum physics. Movable props.

## 1.1.0
- Acts III and IV, with four endings.
- The Controls page and controller support.
