import Database from 'better-sqlite3';

const db = new Database('server/data/card-game-engine.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found:', tables.map(t => t.name));

const requiredTables = ['games', 'categories', 'card_backs', 'cards', 'setups', 'save_states'];
const missingTables = requiredTables.filter(t => !tables.find(x => x.name === t));
if (missingTables.length > 0) {
  console.log('MISSING TABLES:', missingTables);
} else {
  console.log('All required tables present!');
}

for (const table of tables) {
  if (table.name === 'sqlite_sequence') continue;
  const cols = db.prepare('PRAGMA table_info(' + table.name + ')').all();
  console.log('\n--- ' + table.name + ' ---');
  cols.forEach(c => {
    const flags = [];
    if (c.pk) flags.push('PK');
    if (c.notnull) flags.push('NOT NULL');
    if (c.dflt_value) flags.push('DEFAULT ' + c.dflt_value);
    console.log('  ' + c.name + ' (' + c.type + ')' + (flags.length ? ' ' + flags.join(', ') : ''));
  });
  const fks = db.prepare('PRAGMA foreign_key_list(' + table.name + ')').all();
  if (fks.length > 0) {
    console.log('  Foreign keys:');
    fks.forEach(fk => console.log('    ' + fk.from + ' -> ' + fk.table + '(' + fk.to + ') ON DELETE ' + fk.on_delete));
  }
}

db.close();
console.log('\nSchema verification complete.');
