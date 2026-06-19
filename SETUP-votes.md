# Votes backend — setup

The thumbs-up counters on the arcade shelf read/write to a **dedicated** Google
Apps Script web app (separate from the wish console, so your wishes are never
touched). This is a one-time setup.

## 1. Make the sheet

1. Go to [sheets.new](https://sheets.new) and create a spreadsheet — call it
   something like **What If Arcade — Votes**.

## 2. Add the script

1. In that sheet: **Extensions → Apps Script**.
2. Delete whatever's in `Code.gs` and paste this in:

```javascript
// What If Arcade — Votes backend
// Reads counts (JSONP GET) and applies +1/-1 vote deltas (POST).
var SHEET_NAME = 'Votes';

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(['game', 'count']); }
  return sh;
}

function readCounts_() {
  var vals = sheet_().getDataRange().getValues();
  var out = {};
  for (var i = 1; i < vals.length; i++) {
    var g = String(vals[i][0] || '').trim();
    if (g) out[g] = Number(vals[i][1]) || 0;
  }
  return out;
}

function doGet(e) {
  var cb = e && e.parameter && e.parameter.callback;
  var json = JSON.stringify(readCounts_());
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
    var delta = parseInt(p.delta, 10);
    delta = (delta < 0) ? -1 : 1;
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(5000);
      var sh = sheet_();
      var vals = sh.getDataRange().getValues();
      var row = -1;
      for (var i = 1; i < vals.length; i++) {
        if (String(vals[i][0]).trim() === p.game) { row = i + 1; break; }
      }
      if (row < 0) {
        sh.appendRow([p.game, Math.max(0, delta)]);
      } else {
        var cur = Number(sh.getRange(row, 2).getValue()) || 0;
        sh.getRange(row, 2).setValue(Math.max(0, cur + delta));
      }
    } catch (err) {
      // swallow — a dropped vote is better than a 500
    } finally {
      try { lock.releaseLock(); } catch (_) {}
    }
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

- **Game keys** (the `data-game` values, which become rows in the sheet):
  `ironline`, `sailing`, `pixelwar`, `warhammer`, `noodle`, `koi`.
- One vote per browser is enforced client-side via `localStorage`; clicking
  again removes the vote (-1). It's friendly, not Fort Knox — fine for a "what
  should we build next" signal.
- Until the URL is set, the buttons still work locally (your own vote persists
  in your browser); they just aren't shared across visitors yet.
- You can pre-seed or correct any count by editing the number in the **Votes**
  tab directly.
