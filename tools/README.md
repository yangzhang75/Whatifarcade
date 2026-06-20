# `/tools` — the Relight toolchain

Shared pixel-lighting tooling for Noodle Studios / What If Arcade. Everything
here orbits **one source of truth**: `relight.js`. For studio context, the brand
lock, and the multi-pod operating model, read **[`/CLAUDE.md`](../CLAUDE.md)**
first; for the architectural spec read
**[`STUDIO_ENGINE_AND_TOOLING.md`](./STUDIO_ENGINE_AND_TOOLING.md)**.

## What's in here

| File | What it is |
|---|---|
| **`relight.js`** | The canonical relight **kernel**. UMD module — runs in the browser (`window.Relight`) *and* Node (`require`). Inlined into each game at build. **Edit lighting here and nowhere else.** |
| **`relight-lab.html`** | The **Lab** — a browser tool to drop a baked background, scrub the evening, and drag the sun/moon. Loads `relight.js` via `<script src="relight.js">`, so keep it in the same folder. Runs the *exact* code the games ship. |
| **`relight-reader.cjs`** | The **headless reader** — Node + a hand-rolled zlib PNG codec. Renders the kernel to PNGs *and reads them back*, so lighting can be QA'd without a human in the loop (the agent can't see rendered HTML, only image files). |
| **`mesa-qa.cjs`, `forest-qa.cjs`, `meadow-bake.cjs`** | Per-scene QA harnesses / the meadow baker. Reference rigs showing how each scene's light path was tuned and validated. |

## The kernel API (`relight.js`)

```js
const R = require('./relight.js');           // node    — or window.Relight in the browser
const g   = R.prepare(img);                  // image -> G-buffer {W,H,base,alpha,height,nx,ny,nz,edge,ao}
const rig = R.cycle(t, W, H, opt);           // t:0..1 -> directional sun/moon rig (azimuth/elevation/traverse/horizon)
const out = R.compose(g, rig, cfg);          // full locked pipeline -> RGBA Uint8ClampedArray
```

Lower-level stages are exported too and run in this **locked order**:
`prepare → cycle → render → emitters → godRays → shaftsManual → bloom → grade → focus → ditherPalette → paintSky → compose`.
`MOODS` holds the expressive presets (`neutral | comfort | solitude | tension | wonder`).

The pixel-art rule: do the lighting at native low res, then **dither + palette-snap**
so the output stays crisp pixel art rather than smooth gradients.

## Using the Lab

Open `relight-lab.html` in a browser (it's self-contained apart from the sibling
`relight.js`). Drop a baked PNG, scrub the evening slider, drag the sun/moon. It
loads the real Firefly Jar forest by default. Because it calls `Relight.compose`,
what you see is what the games render.

## Headless QA workflow (no human eyes needed)

The reader is the unlock for an agent that can't see rendered HTML:

1. Feed it a baked background (the harnesses read a base64 PNG from `/tmp/*_b64.txt`).
2. It runs the kernel and **writes PNGs** (`qa_*.png`), then can **decode them back**
   to inspect actual pixel values — so the agent verifies lighting objectively.
3. Tune the per-scene rig, re-render, re-read until the floor/horizon/rim are right.

```bash
node tools/relight-reader.cjs     # renders the map + a lighting contact sheet
node tools/mesa-qa.cjs            # mesa: skyline floor + relit-vs-flat diagnostics
node tools/forest-qa.cjs         # forest: trunk relight dusk/night
node tools/meadow-bake.cjs       # bakes a meadow layer + QA (proof-of-concept Scene Forge)
```

> The harnesses use absolute scratch paths (`/tmp/*_b64.txt`, `/home/user/qa_*.png`)
> from the workspace they were authored in. They're preserved as **reference rigs**
> for how each scene was tuned — point the input/output paths at your own files to
> re-run.

## Integration state (Firefly Jar)

- **Forest & mesa** are relit live through `relight.js` (`Relight.prepare` → `FOREST_G` / `MESA_G`).
- **Meadow** is **intentionally hand-drawn** (dark hilltop + moon rays), *not* routed
  through the kernel. This is a deliberate art call — leave it.

## Golden rule

**One kernel.** The Lab, the reader, and every game inline the *same* `relight.js`.
Never hand-copy or fork the lighting math into a game — change it here, re-inline,
re-QA. That's how versions stay in sync across pods.
