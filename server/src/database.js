import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data', 'card-game-engine.db');

let db;

export async function setupDatabase() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Checkpoint any existing WAL data first (recover from crashes)
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (e) {
    // Checkpoint may fail on first run, that's ok
  }

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  // Ensure writes are synced to disk
  db.pragma('synchronous = FULL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      table_background TEXT DEFAULT 'felt-green',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      parent_category_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS card_backs (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      image_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      category_id TEXT,
      card_back_id TEXT,
      name TEXT NOT NULL,
      image_path TEXT NOT NULL,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (card_back_id) REFERENCES card_backs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS setups (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      state_data TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS save_states (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_auto_save INTEGER DEFAULT 0,
      state_data TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      confirmed INTEGER NOT NULL DEFAULT 0,
      confirmation_token TEXT,
      confirmation_expires INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Multiplayer tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_rooms (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      room_code TEXT UNIQUE NOT NULL,
      host_player_id TEXT,
      status TEXT NOT NULL DEFAULT 'waiting',
      live_state_data TEXT DEFAULT '{}',
      setup_id TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS room_players (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      color TEXT NOT NULL,
      seat INTEGER NOT NULL,
      is_host INTEGER DEFAULT 0,
      is_connected INTEGER DEFAULT 0,
      hand_card_count INTEGER DEFAULT 0,
      joined_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
      UNIQUE (room_id, color),
      UNIQUE (room_id, seat)
    );
  `);

  // Migrations: add new columns to existing tables if they don't exist yet
  const cardColumns = db.prepare("PRAGMA table_info(cards)").all().map(c => c.name);
  if (!cardColumns.includes('width')) {
    db.exec('ALTER TABLE cards ADD COLUMN width INTEGER DEFAULT 0');
    console.log('[DB] Migration: added width column to cards');
  }
  if (!cardColumns.includes('height')) {
    db.exec('ALTER TABLE cards ADD COLUMN height INTEGER DEFAULT 0');
    console.log('[DB] Migration: added height column to cards');
  }

  // Migration: add zone_data to setups
  const setupColumns = db.prepare("PRAGMA table_info(setups)").all().map(c => c.name);
  if (!setupColumns.includes('zone_data')) {
    db.exec("ALTER TABLE setups ADD COLUMN zone_data TEXT DEFAULT '[]'");
    console.log('[DB] Migration: added zone_data column to setups');
  }
  if (!setupColumns.includes('sequence_data')) {
    db.exec("ALTER TABLE setups ADD COLUMN sequence_data TEXT DEFAULT '[]'");
    console.log('[DB] Migration: added sequence_data column to setups');
  }

  console.log('[DB] Database initialized at:', DB_PATH);
  console.log('[DB] Tables created/verified: games, categories, card_backs, cards, setups, save_states, game_rooms, room_players');

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase() first.');
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Database connection closed');
  }
}
