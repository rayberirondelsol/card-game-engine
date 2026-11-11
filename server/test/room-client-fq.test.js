// FQ / Spec M32.5, M32.6, M32.8 — Client und Lobby: die reinen Teile (`addToHand`, `pickupPlan`, `seenCard`,
// `lobbyView`) werden gerechnet geprüft, die Verdrahtung in `GameTable.jsx`, `useGameRoom.js`,
// `MultiplayerGame.jsx` und `RoomLobby.jsx` am Quelltext (Muster: `context-menu-name.test.js`) — der Client hat
// keine Testinfrastruktur (`CLAUDE.md`). **Was dieser Test nicht sieht:** den Bildschirm. Die Sichtprobe zweier
// Tabs steht in `docs/tasks-m32-eigentum.md` (FQ, „Sichtprobe") und ist **nicht** Teil der Tests.
//
// Run with: npm test  (node --test, keine Test-Dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { seesFace, seenCard, bindZones, ownersOfPlayers } from '../../shared/ownership.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import * as dz from '../../scripts/doerflerzahl-daten.mjs';

const { addToHand, pickupPlan, handFromServer } = await import('../../client/src/utils/roomHand.js');
const { lobbyView, platzLabel } = await import('../../client/src/utils/roomLobby.js');

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const quelle = (rel) => fs.readFileSync(fileURLToPath(new URL(`../../client/src/${rel}`, import.meta.url)), 'utf8');
const copy = (x) => JSON.parse(JSON.stringify(x));

// ── Die Hand ────────────────────────────────────────────────────────────────

test('FQ 3: `addToHand` hängt neue Karten an und kennt die `handId` – ein Echo doppelt nichts', () => {
  const a = handFromServer([{ handId: 'h1', cardId: 'c1', name: 'A' }]);
  const b = handFromServer([{ handId: 'h2', cardId: 'c2', name: 'B' }]);
  const hand = addToHand(a, b);
  assert.deepEqual(hand.map(c => c.handId), ['h1', 'h2']);
  // dieselbe Karte noch einmal (welcome + draw_response, oder ein verspätetes Echo): unverändert
  assert.equal(addToHand(hand, b), hand);
  assert.deepEqual(addToHand(hand, b).map(c => c.handId), ['h1', 'h2']);
});

test('FQ 3: `addToHand` mit Unsinn: die Hand bleibt, was sie war', () => {
  const hand = handFromServer([{ handId: 'h1', cardId: 'c1' }]);
  assert.equal(addToHand(hand, null), hand);
  assert.equal(addToHand(hand, []), hand);
  assert.deepEqual(addToHand(undefined, handFromServer([{ handId: 'h9', cardId: 'c9' }])).map(c => c.handId), ['h9']);
});

test('FQ 4: `pickupPlan` – lose Karten werden einzeln aufgenommen, Stapelkarten über den Zugweg gezählt', () => {
  const tisch = [
    { tableId: 'a', inStack: null },
    { tableId: 'b', inStack: 's1' },
    { tableId: 'c', inStack: 's1' },
    { tableId: 'd', inStack: 's2' },
    { tableId: 'e', inStack: null },
  ];
  assert.deepEqual(pickupPlan(tisch, ['a', 'e']), { pickups: ['a', 'e'], draws: [] });
  // zwei Karten des Stapels s1 ausgewählt: **ein** Zug mit Anzahl 2 (nicht zwei Züge — der Stapel löst sich nach dem ersten auf)
  assert.deepEqual(pickupPlan(tisch, ['b', 'c']), { pickups: [], draws: [{ stack_id: 's1', count: 2 }] });
  assert.deepEqual(pickupPlan(tisch, ['a', 'b', 'd', 'c']), {
    pickups: ['a'],
    draws: [{ stack_id: 's1', count: 2 }, { stack_id: 's2', count: 1 }],
  });
});

test('FQ 4: `pickupPlan` kennt keine unbekannte Id und ändert die Eingabe nicht', () => {
  const tisch = [{ tableId: 'a', inStack: null }];
  const vor = copy(tisch);
  assert.deepEqual(pickupPlan(tisch, ['x', 'a', 'a']), { pickups: ['a'], draws: [] });
  assert.deepEqual(pickupPlan(tisch, []), { pickups: [], draws: [] });
  assert.deepEqual(pickupPlan(null, ['a']), { pickups: [], draws: [] });
  assert.deepEqual(tisch, vor);
});

// ── Der Blick: `seenCard` ───────────────────────────────────────────────────

const auszug = lies('auslagen-kurzpartie.json');
const FF = dz.patchHaende(dz.patchZonen(auszug.zones).zone).zone;
const MIT_PLATZ = FF.map(z => (/^zhand(\d)$/.test(z.id) ? { ...z, platz: Number(z.id.slice(5)) } : z));
const OWNERS = ownersOfPlayers({ players: 2, villagers: 4, kind: 'mehrfach' }, [
  { id: 'p1', seat: 1, color: 'red' }, { id: 'p2', seat: 2, color: 'blue' },
]);
const ZONES = resolveZones(bindZones(MIT_PLATZ, OWNERS).zones, anchorBoxes([]));
const hand1 = ZONES.find(z => z.id === 'zhand1');
const mitte = (z) => ({ x: z.x + z.width / 2, y: z.y + z.height / 2 });

test('FQ 1: `seenCard` deckt für den Eigentümer auf – nur fürs Zeichnen, der Zustand bleibt verdeckt', () => {
  const karte = { tableId: 't1', ...mitte(hand1), faceDown: true, name: 'Geheim' };
  const vor = copy(karte);
  const gesehen = seenCard(ZONES, karte, 'red');
  assert.equal(gesehen.faceDown, false);
  assert.equal(gesehen.name, 'Geheim');
  assert.equal(seesFace(ZONES, karte, 'red'), true);
  assert.deepEqual(karte, vor, 'die Quellkarte bleibt `faceDown: true`');
});

test('FQ 1: `seenCard` gibt jedem anderen **dieselbe** Karte zurück (`===`) – kein Gesicht für Mitspieler', () => {
  const karte = { tableId: 't1', ...mitte(hand1), faceDown: true };
  assert.equal(seenCard(ZONES, karte, 'blue'), karte);   // der Gast sieht die Hand des Hosts nicht
  assert.equal(seenCard(ZONES, karte, null), karte);     // Hotseat, kein Raum
  assert.equal(seenCard(ZONES, karte, undefined), karte);
  assert.equal(seenCard([], karte, 'red'), karte);
  const offen = { ...karte, faceDown: false };
  assert.equal(seenCard(ZONES, offen, 'red'), offen);
});

// ── Die Lobby ───────────────────────────────────────────────────────────────

const LAGE_2_4 = { players: 2, villagers: 4, kind: 'mehrfach' };
const PLAETZE_2_4 = [{ platz: 1, rang: 1 }, { platz: 2, rang: 1 }, { platz: 3, rang: 2 }, { platz: 4, rang: 2 }];
const host = { id: 'p1', seat: 1, display_name: 'Host', color: 'red' };
const gast = { id: 'p2', seat: 2, display_name: 'Gast', color: 'blue' };

test('FQ 7: `platzLabel` — Bereich, Einzelplatz, Liste', () => {
  assert.equal(platzLabel([1, 2]), 'Platz 1–2');
  assert.equal(platzLabel([3]), 'Platz 3');
  assert.equal(platzLabel([1, 3]), 'Platz 1, 3');
  assert.equal(platzLabel([2, 3, 4]), 'Platz 2–4');
  assert.equal(platzLabel([]), '');
});

test('FQ 7: mit `lage` zählt die Lobby „n/S Spieler“ und zeigt jedem, welche Plätze er führt', () => {
  const v = lobbyView({ lage: LAGE_2_4, plaetze: PLAETZE_2_4, players: [gast, host] }); // Reihenfolge der Liste ist gleichgültig
  assert.equal(v.needed, 2);
  assert.equal(v.countLabel, '2/2 Spieler');
  assert.equal(v.canStart, true);
  assert.equal(v.startHint, '');
  assert.equal(v.seatsOf.p1, 'Platz 1–2');   // Rang nach Sitz: der Host zuerst
  assert.equal(v.seatsOf.p2, 'Platz 3–4');
  assert.equal(v.emptySeats, 0);
});

test('FQ 7: ein Spieler fehlt – „Start“ gesperrt, der Titel nennt, was fehlt; die leere Hälfte zeigt ihre Plätze', () => {
  const v = lobbyView({ lage: LAGE_2_4, plaetze: PLAETZE_2_4, players: [host] });
  assert.equal(v.countLabel, '1/2 Spieler');
  assert.equal(v.canStart, false);
  assert.match(v.startHint, /1 Spieler/);
  assert.match(v.startHint, /1\/2/);
  assert.equal(v.seatsOf.p1, 'Platz 1–2');
  assert.equal(v.emptySeats, 1);
  assert.deepEqual(v.openSeats, ['Platz 3–4']);
});

test('FQ 7: zu viele Spieler — gesperrt, der Titel sagt es; der Dritte führt nichts', () => {
  const dritter = { id: 'p3', seat: 3, display_name: 'Dritter', color: 'green' };
  const v = lobbyView({ lage: LAGE_2_4, plaetze: PLAETZE_2_4, players: [host, gast, dritter] });
  assert.equal(v.canStart, false);
  assert.match(v.startHint, /3\/2/);
  assert.equal(v.seatsOf.p3, '');
  assert.equal(v.seatsOf.p1, 'Platz 1–2');
});

test('FQ 7: Sitze haben Lücken (jemand ging vor dem Start) — der Rang folgt der Reihenfolge, nicht der Nummer', () => {
  const v = lobbyView({ lage: LAGE_2_4, plaetze: PLAETZE_2_4, players: [{ ...gast, seat: 5 }, host] });
  assert.equal(v.seatsOf.p1, 'Platz 1–2');
  assert.equal(v.seatsOf.p2, 'Platz 3–4');
});

test('FQ 7: drei Spieler, fünf Dörfler — die Blöcke 2/2/1', () => {
  const lage = { players: 3, villagers: 5, kind: 'mehrfach' };
  const plaetze = [1, 1, 2, 2, 3].map((rang, i) => ({ platz: i + 1, rang }));
  const dritter = { id: 'p3', seat: 3, display_name: 'Dritter', color: 'green' };
  const v = lobbyView({ lage, plaetze, players: [host, gast, dritter] });
  assert.deepEqual([v.seatsOf.p1, v.seatsOf.p2, v.seatsOf.p3], ['Platz 1–2', 'Platz 3–4', 'Platz 5']);
  assert.equal(v.countLabel, '3/3 Spieler');
});

test('FQ 7: ohne `lage` (solo, anderer Aufbau, ältere Räume) bleibt die Lobby wie heute: /6 und „mindestens 2“', () => {
  for (const lage of [null, undefined, { players: 1, villagers: 2, kind: 'solo' }]) {
    const v = lobbyView({ lage, plaetze: null, players: [host] });
    assert.equal(v.needed, null);
    assert.equal(v.countLabel, 'Players (1/6)');
    assert.equal(v.canStart, false);
    assert.equal(v.startHint, 'Need at least 2 players');
    assert.deepEqual(v.seatsOf, {});
    assert.equal(v.emptySeats, 1);
    const zwei = lobbyView({ lage, plaetze: null, players: [host, gast] });
    assert.equal(zwei.canStart, true);
    assert.equal(zwei.startHint, '');
    assert.equal(zwei.emptySeats, 0);
  }
});

// ── Verdrahtung am Quelltext ────────────────────────────────────────────────

/** Quelltext ohne reine Kommentarzeilen: gesucht wird, was **aufgerufen** wird. */
const ohneKommentar = (text) => text.split('\n').filter(l => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n');
const GT = ohneKommentar(quelle('pages/GameTable.jsx'));
const HOOK = ohneKommentar(quelle('hooks/useGameRoom.js'));
const MP = ohneKommentar(quelle('pages/MultiplayerGame.jsx'));
const LOBBY = ohneKommentar(quelle('pages/RoomLobby.jsx'));

test('FQ 2: im Raum sendet das Ausspielen `card_play_from_hand { hand_id, x, y }` und ändert lokal nichts', () => {
  const start = GT.indexOf('function playCardFromHand(');
  assert.ok(start > 0);
  const rumpf = GT.slice(start, GT.indexOf('// Reorder cards in hand via drag', start));
  assert.match(rumpf, /if \(room\)/);
  assert.match(rumpf, /type: 'card_play_from_hand', hand_id: handId, x: [a-zA-Z.]+, y: [a-zA-Z.]+/);
  // der Raum-Zweig kehrt zurück, **bevor** der lokale Teil `setTableCards` / `setHandCards` aufruft
  const raum = rumpf.slice(rumpf.indexOf('if (room)'));
  assert.ok(raum.indexOf('return;') < raum.indexOf('setTableCards'));
  assert.ok(raum.indexOf('return;') < raum.indexOf('setHandCards'));
});

test('FQ 4: im Raum sendet `pickUpToHand` `card_pickup_to_hand { table_id }` und ändert lokal nichts', () => {
  const start = GT.indexOf('function pickUpToHand(');
  const rumpf = GT.slice(start, GT.indexOf('// Draw N cards from a stack', start));
  assert.match(rumpf, /if \(room\)/);
  assert.match(rumpf, /type: 'card_pickup_to_hand', table_id/);
  const raum = rumpf.slice(rumpf.indexOf('if (room)'));
  assert.ok(raum.indexOf('return;') < raum.indexOf('setHandCards'));
  assert.ok(raum.indexOf('return;') < raum.indexOf('removeCardFromTable'));
});

test('FQ 4: die Aufnahme mehrerer Karten geht über `pickupPlan` (ein Zug je Stapel), nicht über N Einzelzüge', () => {
  assert.match(GT, /pickupPlan\(/);
  assert.doesNotMatch(GT, /selected\.forEach\(tid => pickUpToHand\(tid\)\)/);
  assert.doesNotMatch(GT, /selectedCards\.forEach\(tid => pickUpToHand\(tid\)\)/);
});

test('FQ 3: „Draw Card“ im Stapelmenü nimmt im Raum den Weg der Zahlentasten (`drawCardsFromStack`), ohne lokal zu entstapeln', () => {
  const i = GT.indexOf('data-testid="context-draw"');
  const knopf = GT.slice(GT.lastIndexOf('<button', i), i);
  assert.match(knopf, /if \(room\) \{ drawCardsFromStack\(sid, 1\)/);
  assert.ok(knopf.indexOf('drawCardsFromStack') < knopf.indexOf('setTableCards'));
});

test('FQ 3/2/4/6: `applyRemoteAction` kennt die neuen Rückmeldungen und wendet sie mit den reinen Teilen an', () => {
  const start = GT.indexOf('function applyRemoteAction(');
  const rumpf = GT.slice(start, GT.indexOf('// Sync hand card count', start) > 0 ? GT.indexOf('// Load zones from room welcome', start) : undefined);
  assert.match(rumpf, /case 'stack_size_update':\s*setTableCards\(prev => removeDrawn\(prev, msg\)\)/);
  assert.match(rumpf, /case 'card_play_from_hand':[\s\S]*playedCard\(prev, msg, /);
  assert.match(rumpf, /isOwnEcho\(msg, room\?\.myPlayerId\)[\s\S]*removeHandCard\(/);
  assert.match(rumpf, /case 'draw_response':[\s\S]*addToHand\(prev, handFromServer\(msg\.cards\)\)/);
  assert.match(rumpf, /case 'card_removed':[\s\S]*c\.tableId !== msg\.table_id/);
  assert.match(rumpf, /case 'error':/);
  // die alte Anwendung (jede empfangene Karte offen, eigene `handId`) ist weg
  assert.doesNotMatch(rumpf, /faceDown: false,\s*rotation: 0,\s*zIndex: maxZIndex \+ 1/);
  assert.doesNotMatch(rumpf, /handId: crypto\.randomUUID\(\)/);
});

test('FQ 6: `error` wird als Hinweis gezeigt (amtliche Meldung des Servers, deutsch) — und verschwindet wieder', () => {
  assert.match(GT, /const \[roomNotice, setRoomNotice\] = useState\(null\)/);
  assert.match(GT, /case 'error':[\s\S]{0,300}setRoomNotice\(/);
  assert.match(GT, /data-testid="room-notice"/);
  assert.match(GT, /setRoomNotice\(null\)/);
});

test('FQ 5: das `welcome` setzt die Hand **nach** `loadGameState` (das sie sonst leert)', () => {
  const i = GT.indexOf('loadGameState(room.boardState, room.grids || null)');
  assert.ok(i > 0);
  const nach = GT.slice(i, i + 700);
  assert.match(nach, /handFromServer\(room\.hand\)/);
  assert.match(nach, /room\.handVersion/);
  // eine Hand, die der Server nicht neu geschickt hat (`room_started`, `board_sync`), bleibt wie sie ist
  assert.match(nach, /handCardsRef\.current/);
  assert.match(HOOK, /case 'welcome':[\s\S]*setHand\(Array\.isArray\(msg\.hand\) \? msg\.hand : \[\]\)/);
  assert.match(HOOK, /setHandVersion\(/);
  assert.match(MP, /hand,/);
  assert.match(MP, /handVersion,/);
});

test('FQ 5: der Client sendet `hand_count_update` nicht mehr (der Server leitet den Zähler ab und ignoriert es)', () => {
  assert.doesNotMatch(GT, /sendHandCountUpdate/);
  assert.doesNotMatch(HOOK, /hand_count_update/);
  assert.doesNotMatch(HOOK, /sendHandCountUpdate/);
  assert.doesNotMatch(MP, /sendHandCountUpdate/);
});

test('FQ 1: der Blick steht an **einer** Stelle im Tisch und nutzt `seenCard` aus `shared/ownership.js`', () => {
  assert.match(GT, /import \{ seenCard \} from '\.\.\/\.\.\/\.\.\/shared\/ownership\.js'/);
  // ohne Raum kein Pfad: die Hilfe fragt `room?.myColor`; `null` heißt Hotseat
  assert.match(GT, /const blick = \(card\) => seenCard\(tableZones, card, room\?\.myColor \?\? null\)/);
  // gezeichnet, Vorschau (Langdruck, Vergrößern) und ALT-Vorschau bekommen dasselbe Objekt
  const aufrufe = GT.match(/blick\(/g) || [];
  assert.ok(aufrufe.length >= 4, `blick( steht ${aufrufe.length}× (Zeichnen, Langdruck, ALT, Kopfzeile)`);
  assert.match(GT, /data-own-sight=/);
});

test('FQ 1: die Hand-Zone zeigt dem Eigentümer das Zeichen „nur du siehst es“', () => {
  assert.match(GT, /Nur du siehst diese Karte/);
});

test('FQ 7: die Lobby rechnet mit `lobbyView` und zeigt „n/S Spieler“ und die Plätze', () => {
  assert.match(LOBBY, /lobbyView\(/);
  assert.match(LOBBY, /room\.lage/);
  assert.match(LOBBY, /room\.plaetze/);
  assert.match(LOBBY, /view\.seatsOf\[player\.id\]/);
  assert.match(LOBBY, /disabled=\{starting \|\| !view\.canStart\}/);
  assert.match(LOBBY, /title=\{view\.startHint\}/);
  // der feste Wert 6 und das feste „2“ stehen nicht mehr in der Lobby selbst
  assert.doesNotMatch(LOBBY, /players\.length < 2/);
  assert.doesNotMatch(LOBBY, /Players \(\$\{players\.length\}\/6\)/);
});

test('FQ 7: `MultiplayerGame` reicht dem Tisch `myPlayerId` für das Echo (`isOwnEcho`)', () => {
  assert.match(MP, /myPlayerId: playerId/);
});

test('Close-Code 4000 (von einem anderen Tab ersetzt): der Hook verbindet nicht neu', () => {
  const start = HOOK.indexOf('ws.onclose');
  const rumpf = HOOK.slice(start, HOOK.indexOf('ws.onerror', start));
  assert.match(rumpf, /ws\.onclose = \(\w+\)/);
  assert.match(rumpf, /\.code === 4000/);
  // der 4000-Zweig kehrt zurueck, **bevor** scheduleReconnect() aufgerufen wird
  assert.ok(rumpf.indexOf('return;', rumpf.indexOf('4000')) < rumpf.indexOf('scheduleReconnect()'));
});
