# /shared — the studio library

Lives once, referenced everywhere. **Update here = updates every game.** This is
`POD_ARCADE`'s keystone turf: changes here ripple to every game, so they are
**Tier-1 serialized** — one at a time, human-ratified, landed *between* game-pod
sessions (see `GOVERNANCE.md` §7).

Share by identity layer (`CLAUDE.md` §6): **share what the studio says; silo what
the game says.** A game's own sprites/scenes/attract screens never live here.

## Layout (target — `CLAUDE.md` §7)
- `brand.css` — palette + type as CSS variables
- `marks/` — Dusk Coin · Noodle paw coin · wordmark · favicon
- `ident/` — the studio bumper (the shared boot moment) — **stub present:** `ident/bumper.html`
- `chrome/` — nav · footer · back-to-arcade · cabinet frame · wish console
- `fx/` — CRT power-on · scanlines · dusk gradient · teal shimmer
- `fonts/` — the actual font files (Google Fonts CDN today)
- `audio/` — studio sting · UI blips (later)

## Status (2026-06-20 — post-migration)
The migration relocated the studio bumper into `ident/`. The rest of the commons
still live **inline inside `/index.html`**; extracting them into `brand.css`,
`marks/`, `chrome/`, and `fx/` is the "self-contained → referenced" graduation
(`CLAUDE.md` §10) — a separate, visually-verified step.
