# CLAUDE.md — What If Arcade / Noodle Studios

Context anchor for any agent (or pod) working in this repo. Read this first.

## What this is

**What If Arcade** (`whatifarcade.com`) — a brand-locked **static GitHub Pages**
site: an arcade shelf of pixel games made by **Noodle Studios** (the solo studio;
Noodle is the family mascot). Each game is a **single self-contained HTML file**
with its assets inlined as base64. No build step, no framework, no server — Pages
serves the files as-is.

## Operating model — multiple pods, in parallel

The studio runs **multiple projects across multiple surface areas at once**, so
agents work asynchronously while the human is away ("down time while tasks
execute"), and that human time is spent coordinating across pods. Consequences
for how you work here:

- **This file is the shared brain.** If you learn or decide something a sibling
  pod would need (a convention, a gotcha, a deliberate art call), write it down
  here or in the nearest README — don't leave it only in chat.
- **Leave the tree shippable.** `main` auto-deploys. Never park it broken.
- **Be explicit about deliberate exceptions** (see the meadow note below) so
  another pod doesn't "fix" them.

## Brand lock (do not drift)

Palette (from the site `:root`):

| Token | Hex | Use |
|---|---|---|
| night / night2 | `#0e0b16` / `#15101f` | base background |
| dusk / dusk2 | `#1c1530` / `#281b3c` | gradients |
| rust / rust-deep | `#d2743f` / `#8a3a28` | primary accent / shadow |
| amber | `#f0cf86` | highlights, CTAs |
| dust | `#c98f4a` | secondary text/labels |
| cream | `#f6e7c4` | lightest ink |
| teal | `#9fd8d8` | **sacred / rare** — reserve for special moments |
| muted | `#a8927e` | body muted |

Rules: **never pure white.** **Teal is rare** — don't sprinkle it. **Gold is
reserved for Noodle.** Fonts (Google Fonts CDN): **Bricolage Grotesque**
(`--display`), **Press Start 2P** (`--pixel`), **Inter** (body). Every motion
effect ships an off-switch and honors `prefers-reduced-motion`.

## Repo layout

```
index.html              the arcade shelf (cabinets, votes, "coins inserted" credits)
play.html               entrance boot loop -> battle-train-hd.html
firefly-jar.html        Firefly Jar (the pixel game; relight.js inlined)
battle-train-hd.html    IRONLINE
CNAME                   whatifarcade.com
SETUP-votes.md          votes + coins backend (Google Apps Script) setup
tools/                  shared engine tooling — see tools/README.md
  relight.js            canonical pixel-lighting kernel (ONE source of truth)
  relight-lab.html      browser Lab for tuning light
  relight-reader.cjs    headless PNG render+read for QA
  *-qa.cjs / *-bake.cjs per-scene QA harnesses / Scene Forge proof-of-concept
  STUDIO_ENGINE_AND_TOOLING.md   the engine spec
```

## Engine philosophy

**Extract, don't speculate.** Shared systems are born inside a real game, then
lifted out once proven. `Relight` was born in Firefly's forest and now lives in
`tools/relight.js`, **inlined** into each game at build — never hand-copied (that
is how versions drift). Full detail: `tools/README.md` +
`tools/STUDIO_ENGINE_AND_TOOLING.md`.

**Deliberate art call — Firefly Jar meadow:** forest & mesa are relit through the
kernel; the **meadow is intentionally hand-drawn** (dark "distant hilltop in the
dusk" + procedural moon rays) and is *not* routed through `relight.js`. Leave it.

## Deploy & workflow conventions

- **Branch + PR.** Develop on a feature branch; open a PR into `main`; squash-merge.
  Do **not** push to `main` directly without explicit permission.
- **Pages auto-deploys** from `main` (the "pages build and deployment" workflow).
- **CDN edge caching** is aggressive. After a deploy, verify with a cache-bust
  query string — `whatifarcade.com/firefly-jar.html?v=N` — before concluding a
  change "didn't ship."
- **Never commit a stale `cp`.** Edit files in place and assert your change is
  present before committing. (A stale `cp` once silently reverted a fix.)
- Mobile-first: games are portrait-native (144×256). Desktop shows the portrait
  cabinet centered in brand-night margins with quiet ambiance — this is intended,
  not a bug; we do **not** maintain separate desktop/mobile builds.

## Backends (Google Apps Script)

- **Votes + coins** (`index.html`): one Apps Script web app. Reads via **JSONP GET**
  (`{votes, plays}`); writes via **no-cors POST** (`type=vote`) and **`sendBeacon`**
  (`type=play`, so a "coin" lands even as the page navigates into the game). Setup
  + the script: `SETUP-votes.md`.
- **Wish console**: separate endpoint (`WISH_ENDPOINT` in `index.html`).
- Sandbox note: `script.google.com` and the live domain are often outside the
  agent's network allowlist — endpoint/live-site verification usually needs the
  human.
