// M6-Nachtrag: die Adresse des Raum-WebSockets.
//
// Der Client hing an einem fest verdrahteten `:3001`. Oeffentlich liegt das
// Backend hinter nginx (nur 80/443 erreichbar, `location /ws/` proxyt bereits),
// die Verbindung scheiterte darum ueber die Domain immer. Jetzt gilt dieselbe
// Regel wie fuer `apiFetch`: gleiche Herkunft, Pfad statt Port.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomSocketUrl } from '../../client/src/utils/roomSocketUrl.js';

test('https wird zu wss und behaelt den Host ohne Port', () => {
  const url = roomSocketUrl(
    { protocol: 'https:', host: 'gaming.benjathi.de' }, 'NPG9UM', 'p-1'
  );
  assert.equal(url, 'wss://gaming.benjathi.de/ws/rooms/NPG9UM?player_id=p-1');
});

test('kein fest verdrahteter Port 3001 mehr', () => {
  const url = roomSocketUrl(
    { protocol: 'https:', host: 'gaming.benjathi.de' }, 'ABC123', 'p-1'
  );
  assert.ok(!url.includes('3001'), `Port 3001 steckt noch in der Adresse: ${url}`);
});

test('http wird zu ws', () => {
  const url = roomSocketUrl({ protocol: 'http:', host: 'localhost:5173' }, 'ABC123', 'p-2');
  assert.equal(url, 'ws://localhost:5173/ws/rooms/ABC123?player_id=p-2');
});

test('der Port der Seite bleibt erhalten', () => {
  // In der Entwicklung laeuft Vite auf 5173 und proxyt /ws weiter - die
  // Adresse muss also den Port der SEITE tragen, nicht den des Backends.
  const url = roomSocketUrl({ protocol: 'http:', host: '192.168.178.96:5173' }, 'X1', 'p');
  assert.ok(url.startsWith('ws://192.168.178.96:5173/ws/'), url);
});

test('Code und Spieler-ID werden kodiert', () => {
  const url = roomSocketUrl(
    { protocol: 'https:', host: 'h' }, 'A B', 'id&x=1'
  );
  assert.equal(url, 'wss://h/ws/rooms/A%20B?player_id=id%26x%3D1');
});

test('ohne location faellt nichts auf die Nase', () => {
  assert.equal(roomSocketUrl(null, 'A', 'b'), null);
  assert.equal(roomSocketUrl({ protocol: 'https:' }, 'A', 'b'), null);
});
