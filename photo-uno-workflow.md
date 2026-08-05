# Snap Deck — Stitch → Figma → Antigravity Build Guide (Multiplayer, Separate Devices)

## 0. Game design (assumptions baked into the prompts below)

- **Players:** 2–10, each on their own device, connected via a shared game session.
- **Invite links, not a shared code:** the host sets the player count and deck mode, and the server generates one **unique invite link per player slot**. The host shares each link individually (text, email, whatever) — Player B gets their own link, Player C gets theirs, etc. There's no single room code that everyone types in; opening your link *is* how you join, and it's how the server knows which slot you're filling.
- **Table visibility:** every device shows the shared discard pile and the sequence of cards played, plus every other player's **remaining card count** (a number, e.g. "Player C: 4 cards") — never the actual cards in anyone else's hand. Each device only ever renders its own player's hand face-up.
- **Photo model — "Quick Custom" (default):** 15 total photos needed (0–9, Skip, Reverse, Draw Two, Wild, Wild Draw Four), reused across the 4 colors with a color frame drawn on by the backend.
- **Equal contribution split:** the total (15, or 54 for Full Custom) is divided evenly across the player slots. `base = total // n_players`, `remainder = total % n_players`. The first `remainder` slots (by join order) upload `base + 1` photos, everyone else uploads `base`.
- **Pooled, anonymized assignment:** once every player has uploaded their quota, the backend shuffles the *combined* pool of photos across the rank slots at random — no player's photos map predictably to specific ranks.
- **Data lifecycle — erase everything after the game ends:** once a winner is declared, the server purges all uploaded photos, generated card images, player names, and the game/room record itself. Nothing about that game persists past the win screen except what's needed to render that final screen for a short grace period.
- **Alt mode — "Full Custom":** 54 photos total, same equal-split logic, one photo per unique color+rank combo.
- **Stack:** Python backend (FastAPI, first-class WebSocket support) owns room state, deck shuffling, turn logic, and image compositing (Pillow). Frontend is HTML/CSS/JS per device, generated in Stitch, refined in Figma, wired to the backend in Antigravity via WebSockets.
- **No accounts, link is the auth:** possessing your invite link is what proves you're that player — enough for friends playing together, not meant to resist someone forwarding their link to a stranger.

Adjust the numbers below if you'd rather use Full Custom or a different player cap.

---

## 1. Google Stitch — generate the screens

One prompt per screen, done in order within the same Stitch project so style carries over. Pick a Mode (2.5 Pro for polish, Flash for speed) and stay consistent.

### Prompt 1 — Host: Create Game screen
```
Design a warm, playful web app screen called "Snap Deck — Create Game".
Mobile-first. Elements, top to bottom:
- App title "Snap Deck" with a small stacked-cards icon
- Host's name input field
- A stepper to choose number of players (2 to 10), default 4
- A toggle "Deck style: Quick Custom (15 photos) / Full Custom (54 photos)"
  with a one-line explanation under each option
- A large primary button "Create Game & Get Invite Links"
Rounded cards, soft shadows, a cheerful palette (deep purple, warm coral
accent, off-white background). Responsive web screen.
```

### Prompt 2 — Invite Links screen (host only)
```
Design the next screen in this same app, "Invite Your Players", shown
only to the host right after creating a game. Show:
- A short instruction line: "Send one link to each player. Each link is
  unique to that player."
- A vertical list of player slots, one row per player (e.g. "Player 1",
  "Player 2", up to the chosen count), each row containing: a truncated
  invite-link text field and a "Copy Link" button, plus a small share
  icon
- Below the list, a live status area matching the lobby: which slots have
  been claimed (someone opened that link and entered a name) vs still
  waiting, shown as small status pills
- A primary button "Continue to Lobby"
Same palette and rounded-card style as the Create Game screen.
```

### Prompt 3 — Player: Join via link screen
```
Design a screen a player lands on after opening their personal invite
link, "You're Invited!". Show:
- A friendly header: "You've been invited to a game of Snap Deck"
- A name input field, "Enter your name to join"
- A primary button "Join Game"
No room code field is needed — the link itself identifies which game and
slot this is. Same palette and rounded-card style as prior screens.
```

### Prompt 4 — Lobby / waiting room screen
```
Design a "Lobby" screen shown to everyone once they've joined, while
waiting for all players to finish uploading photos. Show:
- A vertical list of joined players, each row with an avatar placeholder,
  name, and a status pill: "Not joined yet", "Uploading photos (2/4)",
  or "Ready" (green checkmark)
- A progress bar at the top: "Photos collected: 9 / 15"
- For the host only: a "Start Game" button, disabled and grayed out with
  helper text "Waiting for all players to finish uploading" until every
  slot shows Ready
Same palette and rounded-card style as prior screens.
```

### Prompt 5 — Your Photo Upload screen (per-device)
```
Design a personal upload screen, "Your Photos". Show:
- A header: "Upload your 4 photos" (dynamic number) with a progress bar
  "Uploaded: 2 / 4"
- A grid of upload slots matching that player's quota, each an empty
  dashed-outline tile with a camera/plus icon, filling in with a thumbnail
  and a small "retake" pencil icon once uploaded
- A note under the header: "Your photos will be mixed with everyone
  else's and randomly assigned to cards — no one will know whose photo
  is which"
- A button "Done — Back to Lobby", enabled once this player's quota is
  met
Same palette and rounded-card style as prior screens.
```

### Prompt 6 — Card component (standalone, so Stitch renders it big and clean)
```
Design a single UNO-style playing card component, portrait orientation,
rounded corners like a real card. It should composite a user's uploaded
photo as the full card background, with:
- A colored border frame (red/yellow/green/blue) wrapping the photo, about
  10% of card width, in the classic UNO color-band style
- The rank or symbol (number, skip icon, reverse arrows, draw-two "+2",
  wild swirl, or wild draw four) shown large in a rounded badge in two
  opposite corners, high contrast against the photo
- A subtle white inner border between the photo and the color frame so the
  rank badge stays readable over busy photos
- Also design a face-down card back: a simple pattern in the app's
  palette, no photo — this is what every OTHER player's hand shows
Show 4 example variants side by side: a red "7", a green "Skip", a blue
"Draw Two", and the card back. Same app palette.
```

### Prompt 7 — Game table screen (per-device, this player's view)
```
Design the main gameplay screen for this app, one device's view in a
multiplayer game. Elements:
- Top bar: whose turn it is right now, "Maria's turn", with a small
  avatar, plus this device's own player name shown smaller off to the
  side so it's clear whose screen this is
- If it's NOT this player's turn: an overlay/banner "Waiting for
  Maria..." with this player's own hand dimmed and non-interactive
- A compact player-order strip across the top: every player's name/avatar
  with a face-down mini card-back icon and a count badge next to it
  (e.g. "4") showing how many cards they hold — no card faces, just
  counts, for every player except this device's own hand
- Center: the discard pile showing the top card (card component style,
  face up) and, to its left, a face-down draw pile with a count badge
- Bottom: this player's own hand only, face up, horizontally scrollable,
  fanned cards, active card lifts slightly on tap
- A "Draw Card" button near the draw pile, disabled when it's not this
  player's turn
- A round color-picker overlay (red/yellow/green/blue circles) that
  appears centered when this player plays a Wild
- A small "Direction" indicator with a clockwise/counter-clockwise arrow
Same palette and rounded-card visual language as prior screens.
```

### Prompt 8 — Win screen
```
Design a celebratory "Maria Wins!" end screen: large winner name and
avatar, confetti-style decorative background using the app's palette, a
summary line "Game finished in 24 turns", remaining card counts per other
player, a small reassuring note "Photos and game data have been deleted
from our servers", and one button: "Leave Game".
```

**Export:** for each screen, use Stitch's Figma export ("Paste to Figma") to pull all eight into one Figma file, and grab the HTML/CSS code export per screen for Antigravity.

---

## 2. Figma — refine and lock the design system

1. **Consolidate a design system.** Create shared color styles, text styles, and a corner-radius value from your prompts, then reapply across all 8 pasted screens so they're pixel-consistent.
2. **Componentize the card**, including the face-down back — variants for `color` (red/yellow/green/blue/wild), `rank`, and a `face-down` state.
3. **Componentize the player-status pill** (Not joined / Uploading / Ready) and the opponent count badge from the game table — Antigravity needs exact states for these.
4. **Annotate connection & lifecycle states** Stitch won't show on its own: an invalid or already-used invite link, a player disconnected mid-game, a reconnect state, and what the win screen looks like for a player who reconnects after deletion has already run (should still show final scores from a short-lived cached payload, not an error).
5. **Export assets:** icons (skip, reverse, draw-two, wild swirl, copy-link) as SVG, plus a short style-guide frame to paste into your first Antigravity prompt.

---

## 3. Antigravity IDE — build it

Structure this as sequential prompts, reviewing each Walkthrough before moving on.

### Prompt 1 — Scaffold
```
Set up a new project: Python backend (FastAPI, with WebSocket support) +
a static frontend folder. Backend structure: app/main.py (HTTP + WS
routes), app/rooms.py (room/session + invite-link management),
app/game.py (game state + rules engine, one instance per room),
app/deck.py (deck construction), app/images.py (Pillow-based photo
compositing), app/cleanup.py (post-game data purge), app/models.py
(Pydantic models for Player, Card, Room, GameState). Frontend: static/
folder, plain JS, one file per screen (create-game, invite-links,
join-via-link, lobby, upload, game-table, win). Add requirements.txt
(fastapi, uvicorn[standard], pillow, python-multipart, websockets). Add a
README with run instructions. Just the skeleton and a working dev server
for now.
```

### Prompt 2 — Room, invite links, and photo-quota logic
```
In app/rooms.py implement:
- POST /rooms -> host creates a room with a player count and deck mode
  (quick=15 photos / full=54 photos). Generates one unique, unguessable
  invite token per player slot (e.g. 22-char URL-safe random string), and
  returns a list of {slot_index, invite_url} for the host to share, plus
  a separate host_token so the host's own device can manage the room.
- GET /rooms/{room_id}/join/{invite_token} -> validates the token maps to
  an unclaimed slot in that room; if valid, returns slot info so the
  frontend can show the "You're Invited!" screen.
- POST /rooms/{room_id}/join/{invite_token} -> claims that slot with a
  player name, marks the token used (single use), returns a player_id.
- Once every slot is claimed, compute each player's photo quota using
  equal split with remainder: base = total // n_players, remainder =
  total % n_players, first `remainder` slots (by slot_index) get
  base + 1, rest get base. Store each player's quota and uploaded count.
- POST /rooms/{room_id}/photos (multipart, per player_id) -> saves an
  uploaded photo against that player's quota, rejects uploads beyond
  their quota, returns updated progress.
- A helper `all_photos_collected(room)` -> True once every player's
  uploaded count == their quota.
- Broadcast room state (slot claim status, upload progress) to all
  connected WebSocket clients whenever it changes.
```

### Prompt 3 — WebSocket layer
```
Add a WebSocket endpoint /ws/{room_id}/{player_id} in app/main.py. On
connect, register the client and immediately send current room/game
state. Implement broadcast() in rooms.py to push JSON state updates to
every connected client whenever: a slot is claimed, upload progress
changes, the host starts the game, a card is played, a card is drawn, or
a player disconnects. Handle disconnects gracefully — mark the player
"disconnected" in room state without removing them, and support
reconnection: if the same player_id reconnects (via their original
invite link), resume their connection and resend full current state,
including their own hand.
```

### Prompt 4 — Deck & rules engine
```
In app/deck.py and app/game.py, implement UNO deck rules for 2-10
players:
- Standard 108-card deck: 4 colors x (one 0, two each of 1-9, two Skip,
  two Reverse, two Draw Two) = 100 cards, plus 4 Wild and 4 Wild Draw
  Four = 108 total, tracked as (color, rank) pairs.
- Once all_photos_collected is true for a room, pool every uploaded photo
  from every player together, shuffle the pool, and randomly assign one
  photo to each rank slot (15 in quick mode, 54 in full mode) — this
  assignment must not correlate with who uploaded which photo. Store
  this mapping on the room/game for images.py to use.
- Deal 7 cards per player, rest is the draw pile, flip one to start the
  discard pile (reshuffle if it's a Wild Draw Four).
- Turn logic: play a card matching color or rank of the top discard, or
  any Wild; draw if no valid play; Skip/Reverse/Draw Two effects; Wild
  lets the player choose the next color; Wild Draw Four forces the next
  player to draw 4 and skips them, strictly enforced (only legal if the
  player has no other playable card).
- Reshuffle discard pile into draw pile when the draw pile empties.
- Win condition: first player to empty their hand. When a win occurs,
  build a final summary payload (winner name, turn count, each player's
  remaining card count and score) BEFORE any cleanup runs, and include
  it in the win broadcast so every device can render the win screen
  without needing to re-fetch room data afterward.
- Every state-changing action goes through rooms.py's broadcast(). The
  broadcast a given player receives must only ever include: their own
  hand (full card detail), everyone else's card COUNT only (never their
  cards), and the shared discard/draw pile state. Write game.py with no
  HTTP/WS concerns — pure Python engine — and add pytest unit tests for
  the rules, including a test that a serialized state sent to Player A
  never contains Player B's actual cards.
```

### Prompt 5 — Photo pipeline
```
In app/images.py, implement Pillow compositing:
- For each (color, rank) combination in the rank->photo mapping from
  game.py, generate a card image: crop/center the photo to a portrait
  card aspect ratio, composite a colored border frame (red #E63946,
  yellow #F4A11D, green #2A9D8F, blue #1D3557) with a thin white inner
  border, then stamp the rank symbol/number in rounded corner badges
  using a bundled icon set for Skip/Reverse/Draw Two/Wild/Wild Draw Four.
  Also generate a single shared face-down card-back image (no photo).
- Cache generated images on disk per room, keyed by (color, rank), and
  serve via GET /rooms/{room_id}/card-image/{color}/{rank}, and the card
  back via GET /rooms/{room_id}/card-back.
```

### Prompt 6 — Post-game cleanup
```
In app/cleanup.py, implement automatic data deletion:
- A function purge_room(room_id) that deletes: every uploaded source
  photo file, every generated card-image file for that room, the room's
  player names, the rank->photo mapping, and the room/game object itself
  from memory/storage. Nothing identifying should remain after this
  runs.
- Trigger purge_room automatically a short fixed delay (e.g. 5 minutes)
  after the win broadcast is sent, using an async background task — the
  delay exists only so late-loading devices can still render the win
  screen from the cached final summary payload already sent to them, not
  because any of the underlying photos/state are needed after that.
- Also purge a room if it's abandoned: no activity (no joins, no
  uploads, no game start) for a configurable timeout (default 2 hours).
- Add an endpoint POST /rooms/{room_id}/leave so the host can force an
  immediate purge if everyone chooses to end early.
- Log purges (room id + timestamp only, no player-identifying info) for
  debugging, but never log or persist the deleted content itself.
```

### Prompt 7 — Wire up the Stitch/Figma frontend
```
I have exported HTML/CSS from Stitch for 8 screens (create-game,
invite-links, join-via-link, lobby, upload, card component, game-table,
win) — files are in [paste path/paste code]. Integrate them into
static/ as a small client-routed app. Wire each screen:
- Create Game -> POST /rooms, navigate host to Invite Links screen
- Invite Links -> displays the returned per-slot links with copy
  buttons, opens the WebSocket as host, shows live claim status, links
  to Lobby
- Join via Link -> the URL itself contains room_id + invite_token; on
  load, GET .../join/{invite_token} to validate and show slot info, form
  submit calls POST .../join/{invite_token} with the entered name,
  then opens the WebSocket as that player and navigates to Lobby
- Lobby -> renders live player list/status/progress from broadcast
  state; host-only Start Game button enabled once every slot is Ready
- Upload -> POSTs photos to /rooms/{room_id}/photos, shows this player's
  own quota and progress, "Done" returns to Lobby
- Game Table -> driven entirely by WebSocket state pushes (no polling);
  renders this device's own hand face-up from the state payload, renders
  every other player as a name + face-down card-back icon + count badge
  only, renders the shared discard/draw piles via
  /rooms/{room_id}/card-image/... and /card-back, disables interaction
  when it isn't this player's turn, shows the color picker on Wild plays
- Win screen -> renders from the final summary payload included in the
  win broadcast (not a fresh fetch, since the room may be purged shortly
  after)
Keep the visual design exactly as exported from Stitch/Figma; add only
the JS needed to make it functional and real-time. Run it in the browser
tool with at least three simulated clients/tabs and fix anything broken.
```

### Prompt 8 — Polish pass
```
Test the full flow end-to-end with 3 simulated players in separate
browser tabs: host creates a game, gets 3 invite links, each opens their
own link in its own tab and joins with a name, confirm each tab shows
the correct personal photo quota (test an unequal split like 15/4 ->
4,4,4,3 by testing with 4 slots), upload placeholder images per tab,
confirm Start Game unlocks only once all are Ready, play through turns
including a Skip, a Reverse, a Draw Two, and a Wild across different
tabs, and confirm every tab only ever shows its own hand plus other
players' counts, never other players' actual cards. Confirm a win
broadcasts the same final summary to all tabs, and that ~5 minutes after
a win, hitting any room API for that room_id returns a clean "not found"
rather than any leftover data. Fix any bugs. Add basic validation
(already-used invite link, invalid room id) and a reconnect test: close
and reopen one tab mid-game using its original invite link and confirm
it resumes with its own hand intact.
```

---

## Order of operations recap
1. **Stitch:** 8 prompts above → export code + push to Figma.
2. **Figma:** unify styles, componentize the card (incl. face-down back) + status pills, add missing lifecycle states, export icons.
3. **Antigravity:** scaffold → rooms/invite-links/quota logic → WebSocket layer → rules engine (with strict per-player visibility) → photo pipeline → post-game cleanup → wire frontend → polish/test.

If you want, I can also sketch the actual invite-token generation code, the WebSocket message schema (what exactly gets sent to Player A vs broadcast to everyone), or the cleanup scheduler in more detail — useful to paste straight into Antigravity if you want less agent guesswork on those specifically.
