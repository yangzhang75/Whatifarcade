# /services — studio-wide backend

Real backend, owned by `POD_ARCADE`. **GitHub Pages can't run a backend** — anything
here deploys to a separate serverless target (Apps Script today; Cloudflare
Workers/D1 later). The static site fires fire-and-forget, no-cors POSTs at these
endpoints; if one is down, the page doesn't care (the failsafe pattern, `CLAUDE.md`
§3.3). **Contract before host** (`CLAUDE.md` §3.4): the front-end depends on the
endpoint *shape*, not the provider — so a service can change hosts without touching
the UI.

Studio-wide services are **Tier-1 serialized** (`GOVERNANCE.md` §7 / §8).

## Tenants today
- `wishes/` — the wish console capture (the original studio backend).
- `votes/` — the arcade-shelf thumbs-up **votes** + "coins inserted" **plays**
  counters (a second, dedicated Apps Script, separate from wishes).

## Later (don't build before a game needs it — §8)
- `shared/` — accounts / login / analytics (cross-game identity). Stand up the
  account service *first*, then a game adds its own game-local saves against that id.
