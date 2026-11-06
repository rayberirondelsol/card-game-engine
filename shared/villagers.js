/**
 * Die Dörfler am Tisch (Spec M26.2) – wer sitzt wo, und was daran hängt.
 *
 * Die Daten stehen in `setups.scenario_data.villagers`, neben den Bösewichten
 * (M7), und werden aus `scripts/doerfler-daten.mjs` geschrieben:
 *
 *   { fightZone,
 *     seats:  [{ anchor, zones, markers, vorrat }],
 *     roster: { "<voller Name>": { short, start: {Leben,Bewegung,Mumm,Präzision},
 *                                  gear: [{ card, slot? }], unverified? } } }
 *
 * **Ein Platz kennt seinen Dörfler nicht.** Wer an Platz *n* sitzt, steht im
 * Tableau-Token, das dort liegt – nicht in einer zweiten Liste, die der Tisch
 * mitführen und beim Laden wiederherstellen müsste (M22: der Spielstand ist die
 * Summe seiner Stücke, nicht eines Gedächtnisses daneben). Dieselbe Frage
 * beantwortet damit jeder, der sie stellt: `swap_villager`, die Platzhalter
 * `$V1`/`$F1` und das Menü am Tisch.
 *
 * Der Executor weiß nichts über Townsfolk Tussle (M7). Die Namen der Zähler,
 * Marker und Zonen stehen hier als **Regel**, die die Daten füllen: ein Zähler
 * heißt `<Kurzname>: <Wert>`, ein Marker `<seat.markers>: <Wert>`, eine Zone
 * `<seat.zones>: <Platz>`.
 */
import { findCardByName } from './cardSearch.js';

const norm = (s) => String(s ?? '').trim().toLowerCase();

/**
 * Die vier Werte eines Dörflers. `tag` ist die Kurzform für Platzhalter
 * (`$V1LEB`) – ein Platzhalter darf nur Buchstaben und Ziffern tragen.
 *
 * `life`: der Wert ist ein **Vorrat** – er trägt `max` (= Startwert, Regel
 * „Maximales LEBEN"), die anderen drei tragen `base`.
 */
export const STATS = [
  { key: 'Leben', tag: 'LEB', life: true, range: [1, 10] },
  { key: 'Bewegung', tag: 'BEW', range: [1, 10] },
  { key: 'Mumm', tag: 'MUM', range: [1, 10] },
  { key: 'Präzision', tag: 'PRZ', range: [-4, 5] },
];

/** Die sechs Plätze eines Dörflers – so heißen die Zonen `Dörfler <n>: <Platz>`. */
export const SLOTS = ['Kopf', 'Brust', 'Beine', 'Linke Hand', 'Rechte Hand', 'Mitbringsel'];

/** Das Tableau eines Dörflers heißt als Asset `Tableau: <voller Name>`. */
export const TABLEAU_PREFIX = 'Tableau: ';

/** Der Name des Zählers, wie er am Tisch steht: `Henlo: Präzision`. */
export const counterName = (villager, stat) => `${villager.short}: ${stat}`;

/** Gibt es Dörferdaten, mit denen sich etwas anfangen lässt? */
export const hasVillagers = (v) =>
  Boolean(v) && Array.isArray(v.seats) && v.seats.length > 0
  && v.roster && typeof v.roster === 'object';

/** Der Eintrag eines Dörflers, nach vollem Namen (Groß-/Kleinschreibung egal). */
export function findVillager(villagers, name) {
  if (!hasVillagers(villagers)) return null;
  const wanted = norm(name);
  if (!wanted) return null;
  const key = Object.keys(villagers.roster).find(k => norm(k) === wanted);
  return key === undefined ? null : { name: key, ...villagers.roster[key] };
}

/**
 * Der Name hinter einem Tableau-Token: `Tableau: Henlo Bulwark` → `Henlo
 * Bulwark`. Aus dem Asset, wenn es da ist, sonst aus dem Etikett – ein Token
 * aus einem alten Spielstand trägt beides.
 */
export function tableauOwner(token, assets = []) {
  const asset = (Array.isArray(assets) ? assets : []).find(a => token?.assetId && a.id === token.assetId);
  const label = String(asset?.name ?? token?.label ?? '').trim();
  return label.startsWith(TABLEAU_PREFIX) ? label.slice(TABLEAU_PREFIX.length) : null;
}

/**
 * Das Tableau, das an Platz `n` liegt (1-based), oder `null`.
 *
 * Der Platz ist über das Asset benannt, das die Zonen als Anker tragen
 * (`seat.anchor`, ein Assetname). Ein getauschtes Tableau hat eine andere
 * Asset-Id und trägt darum `anchorId` – die Id des Platzes, nicht seine eigene
 * (`shared/anchoring.js`).
 */
export function seatToken(state, assets, villagers, n) {
  const seat = villagers?.seats?.[n - 1];
  if (!seat) return null;
  const anchor = (Array.isArray(assets) ? assets : []).find(a => norm(a.name) === norm(seat.anchor));
  if (!anchor) return null;
  const tokens = Array.isArray(state?.tokens) ? state.tokens : [];
  return tokens.find(t => (t.anchorId || t.assetId) === anchor.id) || null;
}

/**
 * Wer an welchem Platz sitzt: `[{ n, seat, token, name, data }]`, nur für Plätze
 * mit Tableau. `data` ist der Eintrag aus `roster` – oder `null`, wenn der Tisch
 * ein Tableau trägt, das die Daten nicht kennen (die Hookbox-Dörfler).
 */
export function seatedVillagers(state, assets, villagers) {
  if (!hasVillagers(villagers)) return [];
  const out = [];
  villagers.seats.forEach((seat, i) => {
    const token = seatToken(state, assets, villagers, i + 1);
    if (!token) return;
    const name = tableauOwner(token, assets);
    out.push({ n: i + 1, seat, token, name, data: name ? findVillager(villagers, name) : null });
  });
  return out;
}

/**
 * Die Platzhalter, die jeder Lauf bindet (CL): `$V<n>` der Kurzname, `$F<n>` der
 * volle Name, `$V<n>LEB`/`BEW`/`MUM`/`PRZ` die Startwerte – alles als Text, wie
 * jeder Platzhalter. Ein Platz ohne bekannten Dörfler bindet **nichts**: der
 * Schritt dahinter wird übersprungen und sagt „is not bound", statt Henlo zu
 * raten.
 */
export function seatVars(state, assets, villagers) {
  const vars = {};
  for (const s of seatedVillagers(state, assets, villagers)) {
    if (!s.data) continue;
    vars[`V${s.n}`] = s.data.short;
    vars[`F${s.n}`] = s.data.name;
    for (const st of STATS) {
      const v = s.data.start?.[st.key];
      if (v !== undefined && v !== null) vars[`V${s.n}${st.tag}`] = String(v);
    }
  }
  return vars;
}

/** Die Kartenzeilen der Startausrüstung eines Dörflers (die gefundenen). */
export function gearCards(cards, villager) {
  const out = [];
  for (const g of villager?.gear || []) {
    const { card } = findCardByName(cards, g.card);
    if (card) out.push(card);
  }
  return out;
}

/**
 * Was an diesen Dörferdaten nicht stimmt – eine Meldung je Fehler, leer heißt in
 * Ordnung (dieselbe Form wie `validateScenarioData`).
 *
 * Eine **leere** Asset- oder Kartenliste heißt „kann ich nicht wissen", nicht
 * „kenne ich nicht" – sonst meldet ein Aufruf ohne Bibliothek jeden Eintrag als
 * kaputt.
 *
 * @param {object} villagers  – `scenario_data.villagers`
 * @param {object} [ctx]      – { assets, cards, zones } wie in der Datenbank
 */
export function validateVillagers(villagers, { assets = [], cards = [], zones = [] } = {}) {
  const problems = [];
  if (!hasVillagers(villagers)) return ['no seats or no roster'];

  const haveAssets = Array.isArray(assets) && assets.length > 0;
  const haveCards = Array.isArray(cards) && cards.length > 0;
  const haveZones = Array.isArray(zones) && zones.length > 0;
  const asset = (name) => assets.filter(a => norm(a.name) === norm(name));
  const needAsset = (name, who) => {
    if (!haveAssets) return;
    const hits = asset(name);
    if (hits.length === 0) problems.push(`${who}: asset "${name}" not found`);
    else if (hits.length > 1) problems.push(`${who}: asset "${name}" is not unique (${hits.length})`);
  };
  const needZone = (label, who) => {
    if (haveZones && !zones.some(z => norm(z.label) === norm(label))) problems.push(`${who}: zone "${label}" not found`);
  };

  const fight = String(villagers.fightZone ?? '').trim();
  if (!fight) problems.push('no fightZone named');
  else needZone(fight, 'fightZone');

  villagers.seats.forEach((seat, i) => {
    const who = `seat ${i + 1}`;
    for (const key of ['anchor', 'zones', 'markers', 'vorrat']) {
      if (!String(seat?.[key] ?? '').trim()) problems.push(`${who}: no "${key}"`);
    }
    if (!seat?.anchor) return;
    needAsset(seat.anchor, who);
    needZone(seat.vorrat, who);
    for (const st of STATS) {
      needAsset(`${seat.markers}: ${st.key}`, who);
      needZone(`${seat.zones}: ${st.key}`, who);
    }
    for (const slot of SLOTS) needZone(`${seat.zones}: ${slot}`, who);
  });

  const owner = new Map();       // Kartenname → Dörfler
  const shorts = new Map();      // Kurzname → Dörfler
  for (const [name, v] of Object.entries(villagers.roster)) {
    const who = `"${name}"`;
    needAsset(`${TABLEAU_PREFIX}${name}`, who);
    needAsset(name, who);                                  // die 50 × 50-Figur
    if (!String(v?.short ?? '').trim()) { problems.push(`${who}: no short name`); continue; }
    needAsset(v.short, who);                               // der 46 × 46-Spielstein
    if (shorts.has(norm(v.short))) problems.push(`${who}: short name "${v.short}" is also ${shorts.get(norm(v.short))}'s`);
    shorts.set(norm(v.short), name);

    for (const st of STATS) {
      const n = v.start?.[st.key];
      if (!Number.isInteger(n)) { problems.push(`${who}: no start value for ${st.key}`); continue; }
      if (n < st.range[0] || n > st.range[1]) {
        problems.push(`${who}: ${st.key} ${n} lies outside the column ${st.range[0]}…${st.range[1]}`);
      }
    }

    const slotUse = new Map();
    for (const g of Array.isArray(v.gear) ? v.gear : []) {
      if (!String(g?.card ?? '').trim()) { problems.push(`${who}: a gear entry has no card`); continue; }
      if (haveCards) {
        const { card, reason, ambiguous } = findCardByName(cards, g.card);
        if (!card) problems.push(`${who}: ${ambiguous ? reason : `card "${g.card}" not found`}`);
        else if (/copies/.test(reason || '')) problems.push(`${who}: card "${g.card}" is not unique`);
      }
      if (owner.has(norm(g.card))) problems.push(`${who}: card "${g.card}" also belongs to ${owner.get(norm(g.card))}`);
      owner.set(norm(g.card), name);
      if (g.slot !== undefined && !SLOTS.includes(g.slot)) {
        problems.push(`${who}: "${g.slot}" is not a slot (${SLOTS.join(', ')})`);
      } else if (g.slot) {
        slotUse.set(g.slot, (slotUse.get(g.slot) || 0) + 1);
      }
    }
    for (const [slot, count] of slotUse) {
      if (count > 1) problems.push(`${who}: ${count} cards for the one slot "${slot}"`);
    }
  }
  return problems;
}
