/**
 * Oche sheet logger. Appends one row per finished match to the "Matches" tab.
 *
 * Setup (once):
 * 1. Open your Google Sheet, then Extensions > Apps Script. Paste this file in place of Code.gs.
 * 2. Replace PASTE_YOUR_TOKEN_HERE below with a long random string you choose.
 * 3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 * 4. Copy the web app URL. In Oche, open Settings, paste the URL and the same token, then save.
 *
 * The app sends rows as text/plain JSON. Duplicate match ids are skipped, so resending is safe.
 */
const TOKEN = "PASTE_YOUR_TOKEN_HERE";
const SHEET_NAME = "Matches";
const HEADER = ["id", "finished_at", "mode", "players", "winner", "match_json"];

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (error) {
    return reply({ ok: false, error: "Could not read the match." });
  }
  if (body.token !== TOKEN) return reply({ ok: false, error: "Wrong token." });

  const row = body.row;
  const sheet = matchSheet();
  const ids = sheet.getRange(2, 1, Math.max(1, sheet.getLastRow() - 1), 1).getValues().flat();
  if (ids.indexOf(row.id) !== -1) return reply({ ok: true, duplicate: true });

  sheet.appendRow([
    row.id,
    row.finishedAt,
    row.mode,
    row.players.join(", "),
    row.winner || "",
    row.json,
  ]);
  return reply({ ok: true });
}

function matchSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function reply(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
