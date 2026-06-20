# Studio Engine & Tooling — one-page spec

> Noodle Studios / What If Arcade · **v0.2** · updated 2026-06-20
> The shared infrastructure behind every pixel game. Build the **spine** deliberately; harvest the **tools** from shipping games. Always keep a shippable game in hand.
>
> Studio context, brand lock, and the multi-pod operating model live in **[`/CLAUDE.md`](../CLAUDE.md)** — read that first.

## Governing principle
**Extract, don't speculate.** Every shared system is born inside a real game, then lifted out once it's proven (the "rule of three"). This is how `Relight` was born in Firefly's forest. We never pause game-making to build a cathedral.

## The keystone: the Asset Contract
Define *once* what a baked asset is. Every authoring tool emits it; the runtime consumes it without caring who made it.

```jsonc
{
  "id": "forest",
  "kind": "scene" | "sprite",
  "base":      "<base64 PNG>",      // palette-locked diffuse
  "normalMap": "<base64 PNG>",      // surface direction (or null -> derive)
  "aoMap":     "<base64 PNG>",      // ambient occlusion / cavity
  "emissive":  "<base64 PNG|null>", // windows, embers, glow
  "depth":     "<base64 PNG|null>", // optional, for parallax / self-shadow
  "alphaKey":  "center" | "none",   // how sky/subject was cut
  "palette":   ["#0E0B16", "..."],  // brand-locked ramp
  "meta": { "w":144, "h":236, "anim": null }   // sprites add frames/states/hitbox
}
```

## Module / tool boundaries

| Layer | Job | Status |
|---|---|---|
| **Engine kernel** | manifest contract (`init/update/render`), game loop, input, save seam, AI hooks — inlined into each single-file game | mostly built (IRONLINE + Firefly) |
| **Relight runtime** | consumes the asset maps + a light rig → relights live (physical + expressive) | ✅ **shipped** — `tools/relight.js`, live in Firefly Jar (forest + mesa) |
| **Scene Forge** | reference/AI image → palette-lock → sky/subject key → **bake normal/AO/emissive** → emit Asset Contract | partial — `meadow-bake.cjs` is the proof-of-concept baker; generalize next |
| **Sprite Forge** | bespoke sprites → frames, states, sprite-normals, hitboxes, palette-lock → Asset Contract | build by extraction when a game needs it |
| **Audio Forge** | seeded procedural ambience + music seams | sketched (Firefly) |

**Separate authoring tools (different loops), one shared contract + runtime.** Backgrounds are big/static/baked-once; sprites are small/animated/stateful — so they're different tools, but they speak the same data.

## The Relight pipeline (locked order)
**Physical layer (believable):** ambient grade → sun/moon diffuse (normal map) → AO → self-shadow → emitter lights → rim → **god rays (Mitchell post-process)** → bloom.
**Expressive layer (meaningful):** **color grade / mood → focus (vignette + selective desat) →** dither + palette-snap → out.

Physical makes it real; **expressive makes it *feel something*.** Emotion lives in the grade, the light choreography, and where the eye is forced to look — not the normal map.

### Per-game / per-scene config (no core edits)
```jsonc
{ "ray": {"density":0.9,"exposure":0.55,"warmth":0.0},
  "ao": 0.55, "emit": 0.55,
  "mood": "solitude",            // comfort | solitude | tension | wonder | neutral
  "beats": [ {"t":0.0,"mood":"comfort"}, {"t":0.8,"mood":"solitude"} ] }
```
Lighting can be driven by **two clocks**: the world clock (day/night) *and* a **narrative beat timeline** — light as performance, swelling and cooling with the story.

## Where it stands today (shipped state)
- **`Relight` is extracted** into `tools/relight.js` — a UMD kernel that runs **identically** in the browser (`window.Relight`), in Node (`require`), and is **inlined** into each game at build. One source of truth for the Lab, the headless reader, and the games.
- **Firefly Jar** is the first consumer. Per scene:
  - **Forest** — fully relit via `Relight.prepare` → `FOREST_G`; the hand-rolled edge-rim is gone.
  - **Mesa** — fully relit via `MESA_G`, with the sun/moon clipped to a per-column **skyline** so the floor is precise.
  - **Meadow** — **intentionally NOT relit.** It's a hand-drawn dark hilltop (the whimsical "distant hilltop in the dusk") with procedural moon rays. Kept deliberately — don't "fix" it by routing it through the kernel.
- The **expressive layer** (grade/mood + focus + `MOODS` presets) ships inside `relight.js`.

## Build-by-extraction roadmap
1. ✅ **Extract `Relight` → `tools/relight.js`**; wire into Firefly Jar (forest + mesa), delete hand-rolled lighting.
2. ✅ **Expressive layer** (grade/mood + focus + beat hook) in the runtime.
3. **Define the Asset Contract** (above) as the shared format — formalize so bakers/runtime agree.
4. **Scene Forge** — generalize `meadow-bake.cjs` into a real baker: image → palette-lock → key → bake normal/AO/emissive → emit the contract.
5. **Sprite Forge** — only when a game needs richer animated assets.

## Conventions
- **Single-file games:** one canonical `tools/relight.js` source of truth, **inlined** into each game at build (never hand-copied — that's how versions drift).
- Every effect ships with an **off switch** + honors `prefers-reduced-motion`.
- **Slow/fast split** for perf: cache the relit background (update ~6–8fps), run moving lights/bloom/grade at 60fps on top. Hold 60fps on a phone.
- CPU is plenty at pixel resolution; a WebGL backend can implement the same `prepare/cycle/render` API later, behind one interface.

See **[`tools/README.md`](./README.md)** for the kernel API, the Lab, and the headless QA workflow.
