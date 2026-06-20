# /tools/pixel-pipeline — the shared art engine

The game-agnostic art **engine** (the "how"), split from each game's **recipe**
(the "what", which lives in `games/<game>/art-spec/`). See `CLAUDE.md` §8.

- **Engine (here, shared):** renders procedural sprite definitions to PNGs, slices
  sheets, builds animations, handles transparency. No opinions about any one game.
- **Recipe (game-local):** each game's `art-spec/` holds its own sprite definitions
  and palette choices. The game says *what*; this engine knows *how*.

**Transparency gotcha (keep this safeguard):** pixel GIFs must reserve a dedicated
magenta transparent index — skipping it makes fur/dark colors render transparent
(it once turned Noodle white).

## Status (2026-06-20 — post-migration)
Skeleton only. Generalize the engine once IRONLINE's pipeline is stable — don't
build knobs no game needs yet (`CLAUDE.md` §3.6). Build game #2's art by writing a
new recipe, not a new pipeline.
