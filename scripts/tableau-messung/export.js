// Schritt 0 der Tableau-Messung: `scenario_data` und die Assetliste aus der Produktion lesen.
//
// Läuft **im Backend-Container** (dort liegt `better-sqlite3`) und **nur lesend**; Aufruf nach
// `docs/datenzugriff.md` (Weg 1, das Skript über stdin):
//
//   ssh root@192.168.178.96 "docker exec -i -w /app card-game-engine-backend node -" \
//       < scripts/tableau-messung/export.js > export.raw.txt
//   py scripts/tableau-messung/holen.py --blob export.raw.txt
//
// Die Ausgabe ist base64 zwischen zwei `BLOB`-Marken (Umlaute überleben sonst den Weg nicht);
// `holen.py --blob` packt sie zu `export.json` aus.
const D = require('better-sqlite3');
const db = new D(process.env.CGE_DB_PATH || '/app/data/card-game-engine.db', { readonly: true });
const SETUP = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b'; // TFT Kurzpartie
const row = db.prepare('select game_id, name, scenario_data, grid_data from setups where id = ?').get(SETUP);
const assets = db.prepare('select name, type, image_path, back_image_path, width, height from table_assets where game_id = ?').all(row.game_id);
const out = { setup: SETUP, name: row.name, scenario_data: row.scenario_data, grid_data: row.grid_data, assets };
console.log('BLOB' + Buffer.from(JSON.stringify(out)).toString('base64') + 'BLOB');
