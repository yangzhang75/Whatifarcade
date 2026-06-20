# games/_template — copy-to-start a new game

Starting point for a new game package. To start game N:

1. `cp -r games/_template games/<new-game>`
2. Point its files at `/shared/*` (brand, ident bumper, chrome, fx).
3. Build the game's own `attract.html` + assets (its identity).
4. If it needs art, add an `art-spec/` recipe and run the shared pixel-pipeline.
5. Add the game's **cabinet** to the arcade shelf in `/index.html`
   (title card → `/games/<new-game>/`), with a `data-game` key for votes/plays.
6. If it needs a backend: game-only → `games/<new-game>/api/`; studio-wide →
   extend `/services/`. Deploy to the serverless target, not Pages.
7. Give it `CLAUDE.md`, `DESIGN.md`, `CHANGELOG.md`, and a `BRIEF.md` promoted from
   its pod's Drive folder.
8. Confirm remote/branch, commit, push; verify the cabinet and play flow live.

See `CLAUDE.md` §11. A game in a different tech (Unity WebGL, a framework) follows
the same checklist — it still wears the bumper, exposes a cabinet, documents
itself; only its internals differ (`CLAUDE.md` §14).

> Skeleton only — the template's actual starter files (a `/shared`-wired
> `play.html`, a blank `attract.html`) get filled in once the first game's
> `/shared` references exist to copy from.
