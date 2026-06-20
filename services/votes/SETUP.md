# Votes + coins backend — setup

The thumbs-up counters **and** the "coins inserted" play counters on the arcade
shelf read/write to a **dedicated** Google Apps Script web app (separate from the
wish console, so your wishes are never touched). This is a one-time setup.

> **Already deployed the votes-only version?** Just replace `Code.gs` with the
> script below (it now also tracks **plays**) and **Deploy → Manage deployments →
> edit → New version**. The site reads both `{votes, plays}`; until you redeploy,
> votes keep working and the coin counters simply read 0.

## 1. Make the sheet

1. Go to [sheets.new](https://sheets.new) and create a spreadsheet — call it
   something like **What If Arcade — Votes**.

## 2. Add the script

1. In that sheet: **Extensions → Apps Script**.
2. Delete whatever's in `Code.gs` and paste this in:

```javascript
// What If Arcade — Votes + Coins backend
// GET  (JSONP): returns { votes:{game:count}, plays:{game:count} }
// POST: type=vote  game=g  delta=±1   -> Votes sheet (clamped >= 0)
//       type=play  game=g             -> Plays sheet (coins inserted, +1 only)
var VOTES_SHEET = 'Votes';
var PLAYS_SHEET = 'Plays';

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(['game', 'count']); }
  return sh;
}

function readMap_(name) {
  var vals = sheet_(name).getDataRange().getValues();
  var out = {};
  for (var i = 1; i < vals.length; i++) {
    var g = String(vals[i][0] || '').trim();
    if (g) out[g] = Number(vals[i][1]) || 0;
  }
  return out;
}

function bump_(name, game, delta, allowNegative) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    var sh = sheet_(name);
    var vals = sh.getDataRange().getValues();
    var row = -1;
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][0]).trim() === game) { row = i + 1; break; }
    }
    if (row < 0) {
      sh.appendRow([game, Math.max(0, delta)]);
    } else {
      var cur = Number(sh.getRange(row, 2).getValue()) || 0;
      var next = cur + delta;
      sh.getRange(row, 2).setValue(allowNegative ? next : Math.max(0, next));
    }
  } catch (err) {
    // swallow — a dropped count is better than a 500
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function doGet(e) {
  var cb = e && e.parameter && e.parameter.callback;
  var json = JSON.stringify({ votes: readMap_(VOTES_SHEET), plays: readMap_(PLAYS_SHEET) });
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.type === 'vote' && p.game) {
    var delta = (parseInt(p.delta, 10) < 0) ? -1 : 1;
    bump_(VOTES_SHEET, p.game, delta, false);
  } else if (p.type === 'play' && p.game) {
    bump_(PLAYS_SHEET, p.game, 1, false);   // a coin inserted
  }
  return ContentService.createTextOutput('ok')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

3. **Save** (disk icon).

## 3. Deploy as a web app

1. **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. **Execute as:** Me. **Who has access:** **Anyone**.
4. **Deploy**, authorize when prompted, and copy the **Web app URL**
   (ends in `/exec`).

## 4. Wire it up

Send me that `/exec` URL and I'll drop it into `VOTE_ENDPOINT` in `index.html`
and ship it. (Or set it yourself: find `var VOTE_ENDPOINT = "";` near the bottom
of `index.html` and paste the URL between the quotes.)

## Notes

- **Game keys** (the `data-game` values, which become rows in the **Votes** and
  **Plays** tabs): `ironline`, `firefly`, `sailing`, `pixelwar`, `warhammer`,
  `noodle`, `koi`.
- **Coins inserted** = a play. Clicking an active cabinet's "Peek inside →"
  link sends `type=play` (via `sendBeacon`, so it lands even as the page
  navigates to the game) and increments that game's row in the **Plays** tab.
  Only playable cabinets have a link, so coming-soon games stay at 0.
- One vote per browser is enforced client-side via `localStorage`; clicking
  again removes the vote (-1). It's friendly, not Fort Knox — fine for a "what
  should we build next" signal. (Plays are not de-duped — every coin counts.)
- Until the URL is set, the buttons still work locally (your own vote persists
  in your browser); they just aren't shared across visitors yet.
- You can pre-seed or correct any count by editing the number in the **Votes**
  or **Plays** tab directly.
