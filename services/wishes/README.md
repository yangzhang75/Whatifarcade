# /services/wishes — the wish console

The studio's original backend: the storefront's "wish" capture. The front-end
(in `/index.html`) fires a fire-and-forget, no-cors POST; the UI optimistically
shows "filed." If the endpoint is down, the page is unaffected — this is the
studio's reference failsafe (`CLAUDE.md` §3.3).

## Contract
- **POST** form body: `wish`, `ref`, `ts` → appended to the Wishes sheet.
- **Endpoint (deployed):**
  `https://script.google.com/macros/s/AKfycbyQbRGNnaqp1jOrYC79tetdUyh-UfTDgF1fAWyGLp5VO3E7rSULbr90_cozUWDNIlf2xw/exec`
- **Sheet:** "What If Arcade — Wishes" (cols: Timestamp, Wish, Referrer, ClientTime).

## Status (2026-06-20 — post-migration)
The Apps Script source itself lives in Drive (`POD_ARCADE`) and is **already
deployed** — don't touch it unless the capture contract changes. The live wiring
(the `WISH_ENDPOINT` constant) sits inline in `/index.html`. This README documents
the contract; the `.gs` source migrates into this folder when it next changes.
