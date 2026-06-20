# CLAUDE.md — Noodle Studios
**v1.3 · 2026-06-20**

> This is the studio brain. In the repo it must live at the root, named exactly `CLAUDE.md`.
> Claude Code reads it at the start of every session. It is the single source of truth for
> who we are, how we work, and how the studio is built. If a one-off instruction conflicts
> with this file, pause and ask.
> Coordination across many agents/pods lives in its companion, `GOVERNANCE.md`.

---

## 0 · Read this first
You're the build partner for **Noodle Studios** — a tiny studio (one human + Claude) that makes the games people wish existed. Start every session by reading this file, then propose a plan before you touch anything.

---

## 1 · Who we are
- **Noodle Studios** is the maker. Named after **Noodle** — the human's toy poodle of twenty years, the family mascot. Gold is Noodle's color, reserved for his mark alone.
- **What If Arcade** (whatifarcade.com) is the studio's storefront / arcade brand.
  - Tagline: **"The games you wish existed."**
  - Subline: *"Some you've wanted since you were a kid. Some you thought of last night. We build them anyway."*
- **The catalog so far:** **IRONLINE** (shipped first) — a pixel-art idle game about an upgradeable armored battle-train crossing a post-apocalyptic rail-ocean. More cabinets are coming.
- The feeling we're always building toward: **a dusk arcade at the end of the world.** Warm, wry, a little nostalgic, grounded in IRONLINE's sunset palette. Never corporate, never the AI-default cream-and-serif look.

---

## 2 · How we work together
- **Real partnership.** Be opinionated, warm, and honest about tradeoffs. The human owns the studio and makes the final call; you give your best recommendation *and the reasoning*, then defer.
- **Validate between steps.** Propose a plan, check in, then build. Don't run ahead.
- **Narrate your reasoning.** The human is learning the craft and the toolset on purpose — show your work.
- **You can't see rendered HTML.** The human's eyes are the final judge of anything visual. Describe what changed and let them look in the browser before moving on.
- **Before the first push of a session, confirm the remote and branch** so nothing lands by surprise.
- **Validate game/JS changes** (e.g. run them through node) before declaring them done.
- **Stay curious.** New tools, languages, and platforms are welcome guests — the architecture is built to grow into them (see §14). The studio's identity is permanent; its technology is not.
- **Version your Drive docs.** Every chat or Design agent (no repo write access) must save its documents to Google Drive with a **date and version number in the filename — every time, no exceptions.** Drive has no git, so the filename carries the history; this is how the next session finds the latest. Format, folders, and the pod workflow: see `GOVERNANCE.md`. (Repo files are the opposite — stable names, history in git; never version a repo filename.)

---

## 3 · Engineering principles
Build for a studio that will grow — but a *solo* studio, so complexity is as much the enemy as fragility. Hold two north stars in tension: **make it scale** and **keep it simple.** When they conflict, simple-now with a clean seam beats clever-abstraction-for-later.

**3.1 Reusability — DRY, but earned.** Write it for one game first; promote to `/shared` on the *second* real use (rule of three), not in anticipation. A thing earns `/shared` only when it speaks for the studio (see §6). Prefer composition — small pieces that combine — over one big component with a dozen config flags.

**3.2 Modularity & isolation — clusters that fail independently.** Hard boundaries: a game lives in its folder and may use `/shared` and `/tools`, **never another game**. One game breaking can't touch another. Shared components are self-describing units with a documented interface (inputs/outputs) — you should be able to edit or swap one without reading the rest. Keep concerns separated: brand tokens (CSS vars) apart from structure (HTML) apart from behavior (JS), so you can change a color without touching logic.

**3.3 Failsafes & graceful degradation.** The page must still render and be usable if a non-core piece fails. **The wish console is the model:** it posts fire-and-forget; if the endpoint is down, the site is unaffected and the UI degrades quietly. Wrap anything that can fail (network, storage, external API) in try/catch with a sensible fallback; never let one widget's error blank the screen. The core path — read the story, reach a game — must never depend on an optional enhancement (sound, analytics, live counts).

**3.4 Scalability & future integrations.** Design **seams, not implementations**: when a backend arrives, define the *contract* (the endpoint shape) first, so the front-end depends on the interface, not the host — that's what lets wishes graduate from Apps Script to Workers without the UI noticing. The same seam-thinking is what lets the *stack itself* change later (static -> dynamic, HTML game -> Unity build) without disturbing the studio (see §14). Make data explicit and external where it repeats — e.g. the arcade shelf should read a *list* of games so adding a cabinet is adding an entry, not hand-editing markup — but do this *when* the second or third game arrives, not before. Keep the static/serverless split clean (see §9) so each scales on its own.

**3.5 Documentation — write it as you build.** Every shared component carries a short header: what it is, its interface, how to use it. Comments explain **why, not what** (the code already says what). Update a game's `CHANGELOG.md` when behavior changes; keep `DESIGN.md` current. A new contributor — or a future Claude — should be able to start cold from `CLAUDE.md` plus the component headers.

**3.6 The counterweight — read this before you abstract.** Simplest thing that works, first. No speculative layers, config systems, or plugin frameworks until a real second use demands them. A little duplication is cheaper than the wrong abstraction — wait for the pattern to repeat before extracting it. **If a change makes the codebase harder to explain to the human, it's probably wrong.**

---

## 4 · The brand is LOCKED
Match it exactly. Don't drift the palette, type, or marks.

### Palette
- Night `#0E0B16`
- Dusk `#1C1530` -> `#281B3C` (gradient)
- Rust `#D2743F` (primary)
- Rust-deep `#8A3A28`
- Amber `#F0CF86` (glow)
- Dust `#C98F4A`
- Cream `#F6E7C4`
- Teal `#9FD8D8` — **rare.** The AI's one shimmer (the wish-console cursor). Use it once, on purpose.
- Gold `#fbe7a6` -> `#e3a948` -> `#c8902f` — **Noodle only.** Never decorate anything else with gold. *(Under active review: a possible switch to a black + royal-red "Noodle Red" signature, garnet `#9E1B32` range, drawn from his collar/leash. Not yet ratified — gold stays locked until the human calls it.)*

### Type
- **Bricolage Grotesque** — display / wordmark. The wordmark is "What If Arcade." with a **rust-colored period.**
- **Press Start 2P** — arcade chrome only (labels, marquees). Never body text.
- **Inter** — body.

### Marks
- **The Dusk Coin** — What If Arcade's primary logo: a ring + a setting-sun semicircle + a coin-slot that is also the horizon. Sunset rays/bands appear at large sizes and **drop at ~16px** (ring + sun + slot must survive small). Keep it flat and minted — no gradients the brief didn't ask for.
- **The Noodle paw coin** — Noodle Studios' signet: a paw pad + four toe-beans, struck like the Dusk Coin, in Noodle's gold.
- **The glowing amber dot** — sits in the nav beside the wordmark.
- **The Noodle-face GIF** — animated easter egg, footer only.

### Rules of the brand
1. Lives on dusk/sunset — **never pure white.**
2. Gold is Noodle's signature alone.
3. Teal shimmers **once** (the wish cursor).
4. The coin stays flat/minted.
5. Signature FX (CRT power-on, drifting scanlines, dusk gradient) are part of the brand — they make every game feel like it runs on the same arcade hardware.

---

## 5 · Architecture — one studio, one monorepo
Everything lives in one repo, one Claude Code project. The folder layout:

```
noodle-studios/
├─ CLAUDE.md                  ← this file (studio brain)
├─ GOVERNANCE.md              ← how agents/pods coordinate
├─ CNAME                      ← whatifarcade.com
├─ index.html                 ← What If Arcade storefront (static -> Pages)
├─ shared/                    ← the studio library — update once, referenced everywhere
│   ├─ brand.css              ← palette + type tokens
│   ├─ marks/                 ← Dusk Coin · Noodle paw coin · wordmark · favicon
│   ├─ ident/                 ← the studio bumper (shared boot moment)
│   ├─ chrome/                ← nav · footer · back-to-arcade · cabinet frame · wish console
│   ├─ fx/                    ← CRT power-on · scanlines · dusk gradient · teal shimmer
│   ├─ audio/                 ← studio sting · UI blips (later)
│   └─ fonts/
├─ tools/
│   └─ pixel-pipeline/        ← the shared art ENGINE (game-agnostic "how")
├─ games/
│   ├─ ironline/
│   │   ├─ play.html          ← references /shared/* + its own art
│   │   ├─ attract.html       ← IRONLINE's OWN demo screen (game identity)
│   │   ├─ assets/            ← sprites · scenes (game identity)
│   │   ├─ art-spec/          ← the "recipe" the shared pipeline consumes
│   │   ├─ api/               ← game-only backend (leaderboard, saves) — if any
│   │   ├─ BRIEF.md           ← promoted from Drive; read on session start
│   │   ├─ CLAUDE.md          ← game-specific context (nested)
│   │   └─ DESIGN.md · CHANGELOG.md
│   └─ _template/             ← copy-to-start a new game (bumper handoff pre-wired)
└─ services/                  ← studio-wide backend (wishes, accounts, analytics)
    ├─ wishes/
    └─ shared/                ← auth · accounts · analytics (cross-game)
```

A game folder is a **black box behind a contract**: it must wear the studio bumper and expose a cabinet to the arcade. *What's inside* — vanilla HTML/JS today, a Unity WebGL build tomorrow — is the game's business (see §14).

**This tree is the migration target for the repo.** Claude Code's first organizing job is to take the *current* repo — where IRONLINE and the storefront sit flat together — and reorganize it into exactly this structure: move IRONLINE into `games/ironline/`, stand up `/shared`, `/tools`, and `/services`, keep stable filenames, and land it as one clean restructuring commit. Hand Code this tree as the destination map. (Pattern name for the briefing: a monorepo with a package-per-domain layout, Nx/Turborepo-style — see `GOVERNANCE.md` §5.)

---

## 6 · The rule that decides shared vs. game-local
**Share by identity layer.**
- Anything that speaks for **Noodle Studios / the arcade as one place** is shared and lives once in `/shared` (or `/tools`, `/services`).
- Anything that expresses **one particular game** lives in that game's own folder and nothing else touches it.

> Share what the *studio* says. Silo what the *game* says.

This is why the **studio bumper** (the shared boot moment that grounds every cabinet back to the arcade) is shared, but a game's **attract screen** (its own pixel demo) is local. The full entrance experience composes both:
**`shared/ident` (studio bumper) -> `games/<game>/attract` (game demo) -> `play`.**

The shared half is literally the same file for every game, so continuity comes free. *(This same rule governs the Drive layout in `GOVERNANCE.md`: studio-wide folders are shared; each game's docs live in its own pod folder.)*

---

## 7 · The shared studio library (`/shared`)
Lives once, referenced everywhere. Update here = updates every game.
- **marks** — Dusk Coin, Noodle paw coin, wordmark, favicon
- **brand.css** — palette + type as CSS variables
- **ident** — the studio bumper / boot moment
- **chrome** — nav, footer, back-to-arcade button, cabinet frame, wish console
- **fx** — CRT power-on, scanlines, dusk gradient, teal shimmer
- **audio** — studio sting, UI blips (when sound arrives)
- **fonts** — the actual font files
- **the Noodle-face easter egg**

**Never put a game's sprites/scenes/levels in `/shared`.** That line keeps `/shared` a design system, not a junk drawer.

Each shared component carries a short header documenting its interface (see §3.5), so a game can adopt it without reading its internals. Changes to `/shared` are **serialized** (one at a time, human-ratified) so they can't corrupt games building in parallel — see `GOVERNANCE.md` §7.

---

## 8 · The pixel-art pipeline (`/tools/pixel-pipeline`)
Split the **engine** from the **recipe**:
- **Engine (shared, game-agnostic):** renders procedural definitions to PNGs, slices sheets, builds animations, handles transparency. Takes a spec, produces assets. Has no opinions about any specific game.
- **Recipe (game-local):** each game's `art-spec/` holds its own sprite definitions and palette choices. The game says *what* to make; the shared engine knows *how*.

Build game #2 by writing a new recipe, not a new pipeline. Generalize the engine once IRONLINE's pipeline is stable — don't over-engineer knobs no game needs yet (see §3.6).

This pipeline serves the *current* art style. A future game in a different medium (3D, Unity, hand-drawn) may not use it at all — that's fine; tools are per-medium, the brand is universal (see §14).

**Transparency gotcha:** pixel GIFs reserve a dedicated magenta transparent index. Skipping this makes fur/dark colors render as transparent (it once turned Noodle white). Keep that safeguard in the engine.

---

## 9 · Backend & deploy
- **Static (the site + games) -> GitHub Pages**, served at whatifarcade.com. Folders become URLs (`/games/ironline/`).
- **GitHub Pages cannot run a backend.** Anything under `services/` or a game's `api/` is real backend and deploys to a **separate serverless target** (e.g. Cloudflare Workers/Vercel/Netlify functions). We already live in this hybrid: the wish console is a tiny backend bolted onto a static site.
- **The wish console pattern:** the front-end fires a **fire-and-forget, no-cors POST** to an endpoint; the UI optimistically shows "filed." This avoids CORS on a static host, and it's also our reference **failsafe** (see §3.3) — if the endpoint is down, the page doesn't care. Reuse this pattern for lightweight capture.
- **Contract before host (see §3.4):** define the endpoint shape first so the front-end depends on the interface, not the provider. That's what lets a service move hosts without touching the UI.
- **Future migration pin (not now):** once backend becomes central — or the storefront needs to be **dynamic** rather than static — consider moving the whole site onto a host that does static + serverless together (Cloudflare Pages + Workers is the natural fit, given the planned Workers+D1 wish wall). The monorepo is exactly what makes that migration painless — everything re-points at once. This is a §14 "ground shift": document the why, isolate it, update the brain.

---

## 10 · Conventions & gotchas
- **Self-contained -> referenced.** Launch files were single self-contained HTML (base64 assets) — great for shipping fast, but "update once" is impossible if assets are copied into every file. As games adopt the shared library, slim them to **reference `/shared/*`** (`<link href="/shared/brand.css">`, shared ident/chrome scripts). The monorepo serves `/shared` alongside every game, so references Just Work.
- **Versioning shared components — not yet.** Once games share an ident, changing it changes every game (usually what you want). If a shared change ever *breaks* an older game, the fix is a `v2` of that one component, **not** a copied fork.
- **Always honor** reduced-motion and visible focus states (already in the site).
- **You can't render HTML headlessly** — the human's eyes are final.

---

## 11 · Starting a new game (checklist)
1. `cp -r games/_template games/<new-game>`.
2. Point its files at `/shared/*` (brand, ident bumper, chrome, fx).
3. Build the game's own `attract.html` + assets (its identity).
4. If it needs art, add an `art-spec/` recipe and run the shared pipeline.
5. Add the game's **cabinet** to the arcade shelf on `index.html` (title card -> `/games/<new-game>/`).
6. If it needs a backend, add a game `api/` (game-only) or extend `services/` (studio-wide) — deploy to the serverless target, not Pages.
7. Give it a nested `games/<new-game>/CLAUDE.md`, `DESIGN.md`, `CHANGELOG.md`, and a `BRIEF.md` promoted from its pod's Drive folder.
8. Confirm remote/branch, commit, push; verify the cabinet and the play flow live.

*A game built in a different technology (Unity WebGL, a framework, etc.) follows the same checklist — it still wears the bumper (step 2, adapted), still exposes a cabinet (step 5), still documents itself (step 7). Only its internals differ. See §14.*

---

## 12 · Pinned facts
- **Domain:** whatifarcade.com (GitHub Pages). `CNAME` at repo root = `whatifarcade.com`.
- **Wish endpoint:** `https://script.google.com/macros/s/AKfycbyQbRGNnaqp1jOrYC79tetdUyh-UfTDgF1fAWyGLp5VO3E7rSULbr90_cozUWDNIlf2xw/exec`
- **Wishes sheet:** "What If Arcade — Wishes", id `1NIJ0CBMbIyC7We6IV3JrVIQkL__UTtWzz4ix_Sgrm6I` (cols: Timestamp, Wish, Referrer, ClientTime). Apps Script already deployed — don't touch unless changing the capture contract.
- **Google Drive working area:** the "IRONLINE" folder, id `1zfRouxOvRZgAhAFh89WeOMwLJncTS3Po` — organized by pod (`00_GOVERNANCE`, `01_BRAND`, `POD_<game>`, `99_ARCHIVE`). See `GOVERNANCE.md` §4.
- **Upcoming cabinets (named):** "Game for Megan to practice Sailing", "Even more pixel war", "Something about Warhammer 100%", "A game about Noodle, duh."

---

## 13 · The point
Turn "I made a game" into "I have a machine that makes games" — without ever losing the dusk, the coin, or the reason the studio is named after a dog. Build the games people wish existed.

---

## 14 · When the ground shifts (growth & new technology)
The studio is built to **grow into new tools, languages, and platforms** — Unity, a dynamic site, a framework, 3D, native apps, whatever a future game wants. Curiosity is a feature, not a risk, *because* the architecture separates what's permanent from what's replaceable.

**What's permanent (the soul):** the brand (§4), the voice (§1–2), the share-by-identity rule (§6), and the studio promise — every game wears the bumper and slots a cabinet into the arcade.

**What's replaceable (the stack):** static vs. dynamic, GitHub Pages vs. a serverless host, vanilla HTML/JS vs. a framework, an HTML game vs. a Unity WebGL build vs. something not yet invented. None of these are sacred. They serve the soul; they are not the soul.

**The test for any new technology:** not "does it fit our current setup?" but **"can it wear the studio bumper and slot into the arcade?"** If yes, it belongs — whatever it's built in. A Unity game is still a folder under `games/` that boots the shared ident and exposes a cabinet. A dynamic storefront is still What If Arcade — it just serves `/shared` differently.

**The "ground shift" protocol** — when we adopt something genuinely new (new runtime, new host, new language, static->dynamic):
1. **Write down the why.** A short note in the relevant `CHANGELOG.md` / `DESIGN.md`: what's changing, what problem it solves, what it costs.
2. **Isolate it behind a clean boundary.** The new thing goes in its own folder/service with a documented interface, so it can't destabilize what already ships (§3.2, §3.3). The rest of the studio keeps running unchanged.
3. **Prove it on one surface first.** Adopt it for a single game or a single service before it touches the storefront or other games.
4. **Update this brain.** If the change alters how the studio is built, amend `CLAUDE.md` so it stays the single source of truth. Growth is *documented*, never improvised.
5. **Keep the soul intact.** Whatever the new stack, the brand and the bumper survive the transition. If they can't, it's the wrong move — or the wrong moment.

Stay curious. Stay motivated. The architecture can take it — that's the whole point of building it this way.
