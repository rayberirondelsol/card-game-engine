/**
 * executeSequence – pure transformation function for setup sequences.
 * Applies an ordered list of setup actions to a game state snapshot.
 * Never throws: a step that cannot run is skipped and recorded in the protocol.
 *
 * Card steps address stacks by `stackLabel`; asset steps (tokens, figures,
 * boards) address a single asset by `assetName` (the table_assets name) and a
 * draw pool by `pool` (the asset's category name) – the same human-readable
 * label idea the stacks and zones already use.
 *
 * Two entry points, same work:
 *   executeSequence(...)        → the new state (what every existing caller expects)
 *   executeSequenceWithLog(...) → { state, log }
 * The protocol lives beside the state, never inside it: the state is persisted
 * as JSON, and a log smuggled into it would end up in the database.
 *
 * @param {object|string} stateData  – serialized game state (object or JSON string)
 * @param {Array}         sequenceData – array of sequence step objects
 * @param {Array}         zones       – zone objects from the setup (for deal_to_zone)
 * @param {object}        [options]   – { assets: table_assets rows, cards: card library rows
 *                                        (each with its category *name*, like assets), grids: grid objects,
 *                                        rng: () => [0,1) }
 * @returns {object} – new (deep-cloned) game state with all steps applied
 */
import { zoneSlots, zoneSlotFor, zoneSlotNumbered, zoneCenter, zoneRejects, zoneCapacity, zoneContains, countInZone, objectsInZone, freeSlots, stackPoint } from './zoneGeometry.js';
import { resolveZones, anchorBoxes } from './anchoring.js';
import { resolveGrids, cellAt, cellRange, rangeLabel, rangeBox, rangeCenter } from './gridGeometry.js';
import { assetToken, assetFace, assetSize, rotationOf } from './assetToken.js';
import { validateScenarioData } from './scenarioData.js';
import { normalizeCounter, counterValue, counterMax } from './counters.js';
import { findCardByName } from './cardSearch.js';
import { seatVars, seatedVillagers, findVillager, hasVillagers, gearCards, counterName, seatGeometryProblems, coordOf, STATS, TABLEAU_PREFIX } from './villagers.js';

export function executeSequence(stateData, sequenceData, zones = [], options = {}) {
  return executeSequenceWithLog(stateData, sequenceData, zones, options).state;
}

/**
 * Same as executeSequence, but also returns one protocol entry per step:
 * `{ index, type, target, status, reason }` with status `ok` | `skipped`
 * (nothing happened, precondition missing) | `failed` (the step ran but could
 * not do what it says). A setup with three silently skipped steps must not
 * look like a correct one, so the caller is expected to show this.
 *
 * @returns {{ state: object, log: Array<{index:number,type:string,target:?string,status:string,reason:?string}> }}
 */
export function executeSequenceWithLog(stateData, sequenceData, zones = [], options = {}) {
  let state;
  try {
    state = typeof stateData === 'string' ? JSON.parse(stateData) : stateData;
  } catch (err) {
    return {
      state: stateData,
      log: [{ index: -1, type: '(sequence)', target: null, status: 'failed', reason: `state could not be parsed: ${err.message}` }],
    };
  }

  // Deep clone to avoid mutating the original
  state = JSON.parse(JSON.stringify(state));

  const log = [];
  if (!Array.isArray(sequenceData) || sequenceData.length === 0) {
    return { state, log };
  }

  // `cards` ist die Kartenbibliothek des Spiels, jede Zeile mit dem *Namen*
  // ihrer Kategorie – genau wie `assets` ihn schon führt. `place_stack`
  // adressiert die Kategorie über diesen Namen; die Kartenzeile selbst kennt
  // nur eine `category_id`, und eine Id ist im Setup keine Adresse.
  const { assets = [], cards = [], grids = [], scenarioData = {}, rng = Math.random } = options || {};
  // What `reveal_next` bound, for the placeholders in the steps behind it.
  // Beside the state for the same reason as the log: the state is persisted as
  // JSON, and a binding smuggled into it would end up in the database.
  //
  // `vars` ist die Ersetzungstabelle (Platzhaltername → Text), `revealedLast`
  // die eine Tatsache, die kein Text ist: kam das Aufgedeckte vom letzten Platz
  // der Leiste? Das ist, was der Endkampf liest (M7).
  //
  // `halted` ist das dritte: hat eine Vorbedingung die ganze Folge angehalten
  // (M9.3)? Es steht neben dem Zustand, weil es nur diesen einen Lauf betrifft.
  //
  // `finalFight` ist das vierte und steht neben `revealedLast`, nicht an
  // seiner Stelle: es ist die *Entscheidung*, die `build_scenario` getroffen
  // hat (`final: auto` folgt `revealedLast`, `true`/`false` überstimmen es).
  // `null` heißt „noch keine getroffen" - dann gilt der Platz der Leiste
  // (M20.1).
  //
  // `seatVars` ist das fünfte und steht **neben** `vars`, nicht darin (M26.2/CL):
  // die Dörfler am Tisch (`$V1`, `$F1`, `$V1LEB` …). `reveal_next` setzt `vars`
  // bei jedem Aufdecken auf `{}` zurück - die Dörfler dürfen dabei nicht
  // verschwinden. Gebunden wird aus dem Zustand, den der Lauf **vorfindet**; nach
  // einem `swap_villager` neu.
  const ctx = {
    vars: {}, seatVars: seatVars(state, assets, scenarioData?.villagers),
    revealedLast: false, halted: false, finalFight: null,
  };

  for (let index = 0; index < sequenceData.length; index++) {
    const step = sequenceData[index];
    // M20.1: ein Schritt, der nur zum Endgegner-Kampf gehört (oder nur zu den
    // Kämpfen davor), läuft sonst **gar nicht** - und bekommt dann auch keine
    // Protokollzeile. Er ist nicht gescheitert, er gehört nicht zu diesem
    // Aufbau; dieselbe Entscheidung wie bei den Schritten hinter einer Wache
    // (M9.3). Eine Zeile wäre genau der Lärm, gegen den M20.1 steht: der
    // Sheriff-Schritt meldete in jedem Vorkampf „$SHERIFF is not bound" und
    // schwieg ausgerechnet im Endkampf.
    //
    // Gefragt wird **eine** Stelle: was `build_scenario` entschieden hat
    // (`ctx.finalFight`), sonst der Platz, von dem `reveal_next` genommen hat.
    // Eine zweite Rechnung daneben wäre die Regel, die M6 verbietet - und sie
    // ginge auseinander, sobald jemand `final: true` erzwingt, um einen
    // Endkampf zu prüfen.
    const gate = onlyFinalOf(step?.onlyFinal);
    if (gate !== null && gate !== Boolean(ctx.finalFight ?? ctx.revealedLast)) continue;
    const entry = { index, type: step?.type, target: stepTarget(step), status: 'ok', reason: null };
    log.push(entry);
    try {
      state = applyStep(state, step, zones, grids, assets, cards, scenarioData, rng, entry, ctx);
    } catch (err) {
      entry.status = 'failed';
      entry.reason = err.message;
    }
    // M9.3: eine nicht erfüllte Vorbedingung hält *alle* folgenden Schritte an
    // - nicht den ersten, der zufällig daran scheitert. Ein `break`, kein
    // `throw`: `executeSequence` wirft weiterhin nie.
    //
    // Die übersprungenen Schritte bekommen **keine eigene Zeile**. Die
    // Oberfläche zeigt `log.filter(e => e.status !== 'ok')`, und sechzehnmal
    // „skipped" wäre lauter als das Problem, gegen das die Bedingung steht.
    // Wie viele ausgefallen sind, steht an der einen Zeile, die bleibt.
    if (ctx.halted) {
      const rest = sequenceData.length - index - 1;
      if (rest) entry.reason = `${entry.reason} (${rest} further step${rest === 1 ? '' : 's'} skipped)`;
      break;
    }
  }

  return { state, log, bindings: ctx.vars, revealedLast: ctx.revealedLast };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** What a step points at – enough to recognise it in the protocol. */
function stepTarget(step) {
  // `name` steht am Ende: nur place_counter benutzt es, und der Zähler heißt
  // im Protokoll so, wie er am Tisch heißt.
  // `category` vor `label`: wie bei jedem anderen Schritt steht im Protokoll,
  // *woraus* er baut (place_stack liest eine Kartenkategorie), nicht was dabei
  // herauskommt. `label` bleibt als Rückfall, damit die Zeile nie namenlos ist.
  // `category` kann eine Liste sein (M8.11/E1) - dann steht sie lesbar
  // getrennt da statt als aneinandergeklebte Zeichenkette.
  const category = Array.isArray(step?.category) ? step.category.join(' + ') : step?.category;
  // M19.5/BM: `name` kann seither ebenfalls eine Liste sein (require_counter).
  const name = Array.isArray(step?.name) ? step.name.join(' + ') : step?.name;
  return step?.assetName ?? step?.cardName ?? step?.pool ?? step?.stackLabel ?? step?.zoneLabel ?? step?.targetZoneLabel ?? step?.gridLabel ?? category ?? step?.label ?? name ?? step?.villager ?? null;
}

/** Build a label→stack map from stateData.stacks (rebuilt before every step) */
function buildStackIndex(state) {
  const index = new Map(); // label → stack object
  if (!state.stacks) return index;
  for (const stack of state.stacks) {
    if (stack.label) {
      index.set(stack.label, stack);
    }
  }
  return index;
}

/** Fisher-Yates shuffle in-place. rng is injectable so draws are testable. */
function shuffleArray(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Re-assign zIndex values 1..N after a shuffle or split */
function reassignZIndices(cards) {
  cards.forEach((c, i) => { c.zIndex = i + 1; });
}

/**
 * M15.4/AP1: **die** Mischung eines Kartenstapels - Liste permutieren *und*
 * `zIndex` nachziehen, in dieser Reihenfolge.
 *
 * Beides gehoert zusammen, und genau daran ist der Raum gescheitert:
 * `handleStackShuffle` permutierte nur die Liste. Die Reihenfolge eines Stapels
 * ist aber ueberall `zIndex` - `loadGameState` liest ihn, die Darstellung
 * sortiert danach, `getGameState` schreibt danach. Der Raum mischte also eine
 * Reihenfolge, die niemand liest (Partie 7, N4).
 *
 * Darum ist das hier exportiert: Tisch (`GameTable.jsx`), Raum
 * (`messageHandler.js`) und der `shuffle`-Schritt mischen mit derselben
 * Funktion. Eine vierte Mischung waere eine vierte Antwort darauf, was
 * „gemischt" heisst.
 */
export function shuffleStack(cards, rng = Math.random) {
  if (!Array.isArray(cards)) return cards;
  shuffleArray(cards, rng);
  reassignZIndices(cards);
  return cards;
}

/**
 * Der hoechste zIndex, der am Tisch schon vergeben ist (M8.9/D2).
 *
 * Eine Karte, die einen Stapel verlaesst, bringt ihren zIndex *aus dem Stapel*
 * mit — und der faellt beim Abtragen von oben mit jedem Griff. Zwei nacheinander
 * aufgedeckte Karten landeten so uebereinander, aber in der falschen
 * Reihenfolge: die zuletzt aufgedeckte lag unter der vorigen und war unsichtbar.
 * Wer sie auf den Tisch legt, gibt ihr darum einen Platz *ueber* allem, was
 * schon liegt.
 */
function topZIndex(state) {
  const cards = Array.isArray(state?.cards) ? state.cards : [];
  return cards.reduce((max, c) => (Number.isFinite(c?.zIndex) && c.zIndex > max ? c.zIndex : max), 0);
}

// ── Asset helpers ─────────────────────────────────────────────────────────────

const norm = (s) => String(s ?? '').trim().toLowerCase();

/**
 * M8.11/E1: die Kategorien eines `place_stack`, immer als Liste.
 *
 * Ein Deck aus mehreren Sätzen ist in diesem Spiel der Normalfall - das
 * Ereignisdeck sind `Dorf-Ereignisse` (100) plus `Dorf-Ereignisse (Üble
 * Nachbarn)` (5). Ein **String bleibt die Kurzform für die einelementige
 * Liste**: jeder vorhandene Schritt ist einer, einschließlich
 * `"Aktionen: $revealedBase"`, und keiner davon wird angefasst.
 *
 * Kein Komma als Trennzeichen im Text: ein Kategoriename ist frei getippte
 * Prosa aus der Tabelle `categories` und darf ein Komma enthalten. Ein
 * Trennzeichen, das im Wert vorkommen darf, macht genau die Namen
 * unadressierbar, die es enthalten - und still, weil ein unbekannter Name nach
 * Regel 2 nur im Protokoll landet.
 *
 * Doppelte fallen raus: dieselbe Kategorie zweimal genannt legte ihre Karten
 * sonst zweimal in den Stapel, und im verdeckten Ereignisdeck sieht das
 * niemand.
 */
export function categoryList(category) {
  const raw = Array.isArray(category) ? category : [category];
  const out = [], seen = new Set();
  for (const c of raw) {
    const name = String(c ?? '').trim();
    if (!name || seen.has(norm(name))) continue;
    seen.add(norm(name));
    out.push(name);
  }
  return out;
}

/** Look up a table_asset row by its name. */
function findAsset(assets, name) {
  if (!name) return null;
  return assets.find(a => norm(a.name) === norm(name)) || null;
}

/** Look up an already placed object (token or board) by asset id or name. */
function findPlaced(state, asset, name) {
  const n = norm(name ?? asset?.name);
  if (!asset && !n) return null;
  const match = (o) =>
    (asset && o.assetId && o.assetId === asset.id) ||
    (n && (norm(o.label) === n || norm(o.name) === n));
  return state.tokens.find(match) || state.boards.find(match) || null;
}

/**
 * Centre of the i-th of n slots inside a zone. A zone with a layout and a
 * capacity has fixed places and hands out place i; one without keeps the old
 * spread along the longer axis, so zones saved before M2 land where they
 * always did. n = 1 → centre.
 */
const zoneSlot = zoneSlotFor;

/** How many objects already sit in the zone – the number capacity is measured against. */
function occupancy(state, zone) {
  return countInZone(zone, state.cards, state.tokens);
}

/**
 * Was in dieser Zone liegt, in einem Halbsatz (M12.3).
 *
 * Gefragt ist `objectsInZone`, nicht `countInZone`: die Meldung soll sagen,
 * *was dort liegt*, und die beiseitegelegte Karte, die nur im Rechteck liegt,
 * ist gerade die, nach der der Spieler sucht. Sie zählt nur nicht mehr als
 * Belegung — das ist die andere Frage, und die steht drei Zeilen weiter oben.
 *
 * Drei Namen reichen: die Zeile ist eine Auskunft, kein Inventar.
 */
function zoneContents(zone, state) {
  const here = objectsInZone(zone, state.cards, state.tokens);
  if (!here.length) return 'zone is empty';
  const names = here.slice(0, 3).map(objName);
  if (here.length > names.length) names.push(`… +${here.length - names.length}`);
  return `in zone: ${names.join(', ')}`;
}

/** The zone a step names, or null. */
function findZone(zones, label) {
  return zones.find(z => norm(z.label) === norm(label)) || null;
}

/** The grid a step names, or null. No name is no address, not "the nameless one". */
function findGrid(grids, label) {
  if (!label) return null;
  return grids.find(g => norm(g.label) === norm(label)) || null;
}

// ── Revealing and the names it binds ─────────────────────────────────────────

/**
 * The objects of a zone in the order its places are handed out, so that "the
 * first face-down one" means the same thing as "the first place" – the boss bar
 * is read left to right because that is the order `zoneSlots` lays out.
 *
 * With fixed places every object is sorted by the place nearest to it (an
 * object dragged between two places still belongs to one of them). A zone
 * without places has no order of its own, so reading order decides: down the
 * bar for a column, along it for a row – which is exactly where `zoneSlotFor`
 * puts them without a capacity.
 */
function inSlotOrder(zone, objects) {
  return slotOrder(zone, objects).entries.map(e => e.o);
}

/**
 * Dieselbe Reihenfolge, zusätzlich mit dem Platz, auf dem jedes Objekt liegt,
 * und mit der Anzahl der Plätze, die die Zone *hat* (M7).
 *
 * Die Zahl kommt von der Zone, nicht vom Zählen der Objekte: eine Leiste mit
 * vier Plätzen, auf der nur drei Dinge liegen, hat trotzdem vier Plätze - und
 * „letzter Platz" heißt dann der vierte, nicht der dritte. Genau das ist der
 * Kurzpartie-Fall, und ein Abzählen wäre dort still um eins daneben.
 *
 * Eine Zone ohne feste Plätze hat nur ihre Lesereihenfolge; dort *ist* die
 * Position darin der Platz - mehr weiß die Zone über sich nicht.
 */
function slotOrder(zone, objects) {
  const slots = zoneSlots(zone);
  const dist2 = (p, o) => (p.x - o.x) ** 2 + (p.y - o.y) ** 2;
  const place = (o) => (slots ? slots.reduce((best, s, i) => (dist2(s, o) < dist2(slots[best], o) ? i : best), 0) : 0);
  const sorted = objects
    .map(o => ({ o, k: [place(o), o.y, o.x] }))
    .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2]);
  return {
    slotCount: slots ? slots.length : sorted.length,
    entries: sorted.map((e, i) => ({ o: e.o, slot: slots ? e.k[0] : i })),
  };
}

/**
 * Ein Platzhalter: `$` und ein Name. Der gierige Name macht „längster zuerst"
 * automatisch - `$revealedBase` ist *ein* Treffer und nicht `$revealed` plus
 * „Base". Ein einzelnes `$` ohne Namen ist keiner.
 */
const PLACEHOLDER = /\$[A-Za-z][A-Za-z0-9]*/g;
const PLACEHOLDER_ONE = /\$[A-Za-z][A-Za-z0-9]*/;

/** Steht in diesem Wert ein Platzhalter? Auch die Validierung im Editor fragt das. */
export function hasPlaceholder(value) {
  return typeof value === 'string' && PLACEHOLDER_ONE.test(value);
}

/**
 * M20.1: `onlyFinal` an einem Schritt - gehört er zum Endgegner-Kampf, zu den
 * Kämpfen davor, oder zu jedem?
 *
 * `true` = nur im Endkampf, `false` = nur außerhalb, **`null` = in jedem** -
 * und `null` ist auch die Antwort auf alles Unverstandene. Ein Wert, den
 * niemand gemeint hat, darf einen Schritt nicht lautlos verschlucken; das wäre
 * derselbe Fehler wie die Meldung, gegen die M20.1 steht, nur umgekehrt.
 * `validateStep` meldet den Wert im Editor.
 *
 * Der Editor fragt dieselbe Funktion, damit Zeile und Ausführung nicht
 * auseinanderlaufen.
 */
export function onlyFinalOf(value) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

/**
 * Die Namensfelder eines Schritts - jedes davon kann einen Platzhalter tragen
 * (M7). Eine Liste an einer Stelle, nicht eine Sonderbehandlung je Feld: der
 * `assetName`-Sonderfall hat genau deshalb jedes neue Feld verpasst.
 */
// `value` steht mit dabei, seit `set_counter` die Werte des Bösewichts aus den
// Szenariodaten liest (R1/R4). Fuer `place_counter` aendert das nichts:
// `hasPlaceholder` prueft nur Zeichenketten, und dort steht eine Zahl.
// `slot` steht hier, weil die Werte des Boesewichts als `$BEW`/`$LEB` an die
// Leisten kommen (M8.10, Nachtrag zu M7.5) - derselbe Weg wie `$B` bei `cell`.
const NAME_FIELDS = ['assetName', 'cardName', 'cell', 'slot', 'category', 'label', 'name', 'value'];

/** "Bösewicht: Patches" → "Patches"; a name without ": " is its own base. */
function baseName(name) {
  const i = name.indexOf(': ');
  return i < 0 ? name : name.slice(i + 2);
}

/**
 * Split candidate zones into the ones that take one more object of `kind` and
 * the reasons the others do not. `free` is how many more each usable zone
 * holds, `occupied` how many sit there already, `spots` the free places (M11.8).
 */
function zoneRoom(state, targetZones, kind) {
  const usable = [], problems = [];
  const free = new Map(), occupied = new Map(), spots = new Map();
  for (const zone of targetZones) {
    const taken = occupancy(state, zone);
    const refusal = zoneRejects(zone, kind, taken);
    if (refusal) { problems.push(refusal); continue; }
    const cap = zoneCapacity(zone);
    usable.push(zone);
    occupied.set(zone, taken);
    free.set(zone, cap === null ? Infinity : cap - taken);
    // M11.8: die **freien Plaetze**, nicht die Zahl der belegten. Bisher war
    // `occupied` zugleich der Index des naechsten Platzes - das stimmt nur,
    // solange die Belegung von vorn nach hinten laeuft und nichts danebenliegt.
    // Eine fremde Karte im Rechteck machte daraus einen Versatz, und der
    // Klammergriff `Math.min(start + i, slots.length - 1)` legte die
    // ueberzaehligen Karten deckungsgleich auf den letzten Platz.
    spots.set(zone, freeSlots(zone, state.cards, state.tokens));
  }
  return { usable, free, occupied, spots, problems };
}

/**
 * Wohin das i-te Ding dieser Ausgabe kommt: auf den i-ten freien Platz, sonst
 * auf den Rueckfall (M11.8).
 *
 * `Math.min` bleibt als Notnagel stehen: `zoneRoom` gibt nie mehr Dinge frei,
 * als es Plaetze gibt, aber eine Zone kann zwischen zwei Schritten voller
 * werden, und lieber uebereinander als `undefined`.
 */
function spotFor(spots, zone, i, fallback, already = 0) {
  const free = spots.get(zone);
  if (free && free.length) return free[Math.min(i, free.length - 1)];
  // M12.5: ein Ablagestapel staffelt, statt deckungsgleich zu liegen. Nur er -
  // `freeSlots` gibt fuer `layout: 'stack'` absichtlich `null` (ein Platz nimmt
  // beliebig viele Karten, das ist M8.9 Regel 2), und genau daraus wurden
  // sechs Karten auf einer Koordinate. Jede andere Zone behaelt ihren
  // Rueckfall, unveraendert - das ist M12.5 Abnahme 3.
  //
  // `already` ist, was schon in der Zone liegt; `zoneRoom` hat die Zahl als
  // `occupied` ohnehin gerechnet, sie wird durchgereicht statt neu gezaehlt.
  if (zone?.layout === 'stack') return stackPoint(zone, already + i);
  return fallback;
}

/**
 * Objekte in eine Zielzone schieben - die Haelfte, die `clear_zone` und
 * `clear_grid` teilen (M15.3/AR1). Vorher stand sie nur im `clear_zone`-Zweig;
 * sie zweimal hinzuschreiben waeren zwei Antworten darauf, wie ein Objekt in
 * eine Zone kommt.
 *
 * Eine Zone kann Karten und Assets halten; `accepts` gilt je Sorte, die
 * Kapazitaet teilen sie sich (`occupancy` zaehlt beide). Darum einmal
 * `zoneRoom` pro Sorte, gerechnet wird mit dem ersten Ergebnis.
 *
 * @returns {{refusal: ?string, leftovers: Array, free: ?Map}} - `refusal`
 *   gesetzt heisst: die Zone nimmt diese Sorte gar nicht, der Schritt gehoert
 *   uebersprungen. `leftovers` sind die, fuer die kein Platz war.
 */
function moveIntoZone(state, objs, target) {
  const rooms = [...new Set(objs.map(kindOf))].map(k => zoneRoom(state, [target], k));
  const blocked = rooms.filter(r => !r.usable.length);
  if (blocked.length) {
    return { refusal: blocked.flatMap(r => r.problems).join('; '), leftovers: objs, free: null };
  }
  const { free, occupied, spots } = rooms[0];
  const { groups, leftovers } = shareOut(objs, [target], free);
  groups.get(target).forEach((obj, i) => {
    const pos = spotFor(spots, target, i, zoneCenter(target), occupied.get(target));
    obj.x = pos.x;
    obj.y = pos.y;
  });
  return { refusal: null, leftovers, free };
}

/**
 * Karten **unter** einen Stapel zurücklegen - die Hälfte, die `clear_zone` und
 * `clear_table` teilen (M5.1, BI/M19.3).
 *
 * Stand bis M19.3 nur im `clear_zone`-Zweig. `clear_table` konnte deshalb nur
 * löschen, und eine Dorf-Ereigniskarte, die ihre Handzone verlassen hatte, war
 * entweder weg oder blieb liegen - beides falsch, sie gehört zurück unter ihren
 * Stapel. Zweimal hinzuschreiben wären zwei Antworten auf dieselbe Frage (M6).
 *
 * In einen Kartenstapel kann nur eine Karte zurück; ein Token darin wäre ein
 * Fremdkörper, den kein Zug wieder herausholt. Es bleibt liegen, und der
 * Aufrufer schreibt es ins Protokoll - wie eine volle Zielzone.
 *
 * @returns {Array} was nicht mitkonnte (die Nicht-Karten), für das Protokoll.
 */
function returnToStack(state, objs, stack, faceDown) {
  if (!Array.isArray(stack.cards)) stack.cards = [];
  const cards = objs.filter(o => kindOf(o) === 'card');
  const others = objs.filter(o => kindOf(o) !== 'card');
  if (!cards.length) return others;

  // Unten heißt unten: die vorhandenen Karten rücken um so viele Plätze hoch,
  // wie zurückgelegt werden, und die Reihenfolge der Zurückgelegten bleibt
  // (`inSlotOrder` liefert sie bereits so).
  stack.cards.forEach(c => { c.zIndex += cards.length; });
  const back = cards.map((card, i) => {
    // Das Gegenstück zum Austeilen: die Karte behält jedes Feld und tauscht nur
    // Platz und Stapelzugehörigkeit. Ohne Position bliebe sie beim nächsten
    // Speichern in der Auslage liegen - `getGameState` liest die
    // Stapelposition aus der untersten Karte.
    const returned = { ...card, x: stack.x, y: stack.y, zIndex: i + 1, inStack: stack.stackId };
    delete returned.gridId;
    delete returned.cell;
    // Ohne `faceDown` am Schritt behält jede Karte ihre Seite: eine geratene
    // Seite wäre schlimmer als gar keine Ansage.
    if (typeof faceDown === 'boolean') {
      returned.faceDown = faceDown;
      returned.face_up = !faceDown;
    }
    return returned;
  });
  const gone = new Set(cards);
  state.cards = state.cards.filter(o => !gone.has(o));
  stack.cards = [...back, ...stack.cards];
  return others;
}

/** Deal items round robin over the usable zones, stopping at each zone's free count. */
function shareOut(items, usable, free) {
  const groups = new Map(usable.map(z => [z, []]));
  const leftovers = [];
  let cursor = 0;
  for (const item of items) {
    let placed = false;
    for (let t = 0; t < usable.length; t++) {
      const zone = usable[(cursor + t) % usable.length];
      if (free.get(zone) > 0) {
        groups.get(zone).push(item);
        free.set(zone, free.get(zone) - 1);
        cursor = (cursor + t + 1) % usable.length;
        placed = true;
        break;
      }
    }
    if (!placed) leftovers.push(item);
  }
  return { groups, leftovers };
}

/** Was für ein Ding das ist, in der Sprache von `accepts`: Karte oder Asset. */
const kindOf = (o) => (o?.cardId ? 'card' : 'asset');

/** Wie ein Objekt im Protokoll heißt. */
const objName = (o) => o?.label || o?.name || o?.cardId || '?';

/** "zone X is full (4)" for every zone that ran out of room during this step. */
function fullZones(usable, free, kind) {
  return usable.filter(z => free.get(z) <= 0).map(z => zoneRejects(z, kind, Infinity)).filter(Boolean);
}

// ── Action handlers ───────────────────────────────────────────────────────────

/**
 * M27.1/CP: das **Hin** des Tauschs, herausgelöst - Tableau, Spielstein, vier
 * Zähler, vier Marker, Startausrüstung eines Dörflers an einem Platz.
 * `swapVillager` ruft es nach dem Wegräumen des Alten auf, `seat_villager`
 * (CQ) ohne ein Weg: **eine** Antwort darauf, was zu einem Dörfler am Platz
 * gehört (M6).
 *
 * Arbeitet an `work` (einer Kopie, die der Aufrufer hergibt) und ändert sie.
 * Gibt `{ fail }` zurück, wenn schon das Tableau nicht zu legen war - dann ist
 * nichts weiter geschehen -, sonst `{ problems, notes }`; bei Problemen
 * verwirft der Aufrufer die Kopie (alles oder nichts).
 *
 * `spots` sagt **wohin**: `tableau { x, y, rotation, anchorId?, locked }`, `stone`
 * (`{ x, y, rotation }` oder `{ zone }`, oder `null`: keiner), `counters` je Wert
 * (`{ x, y, locked? }` oder `null`). Fehlt ein Spielstein oder ein Zähler, sagen
 * `noStone`/`noCounter(stat)` den Hinweis - er hängt am Alten, das der Tausch
 * kennt und der Aufbau nicht. Der Platzhalter-Kontext der Teilschritte ist leer:
 * sie tragen ihre Namen ausgeschrieben.
 */
function placeVillager(work, n, wanted, spots, env) {
  const { allZones, allGrids, assets, cards, scenarioData, rng } = env;
  const seat = scenarioData.villagers.seats[n - 1];
  const problems = [];
  const notes = [];
  const sub = (s) => {
    const e = { status: 'ok', reason: null };
    try {
      applyStep(work, s, allZones, allGrids, assets, cards, scenarioData, rng, e, { vars: {}, seatVars: {} });
    } catch (err) {
      e.status = 'failed';
      e.reason = err.message;
    }
    return e;
  };

  // Das Tableau zuerst, und mit `anchorId`: die Zonen des Platzes finden es erst
  // damit wieder, und Marker und Karten zielen auf diese Zonen.
  const tableauName = `${TABLEAU_PREFIX}${wanted.name}`;
  const placed = sub({
    type: 'place_asset', assetName: tableauName, x: spots.tableau.x, y: spots.tableau.y,
    rotation: spots.tableau.rotation || 0, faceDown: false,
  });
  if (placed.status !== 'ok') return { fail: `${tableauName}: ${placed.reason}` };
  const tableau = findPlaced(work, findAsset(assets, tableauName), tableauName);
  if (spots.tableau.anchorId !== undefined) tableau.anchorId = spots.tableau.anchorId;
  tableau.locked = spots.tableau.locked === true;

  if (spots.stone) {
    const e = sub({
      type: 'place_asset', assetName: wanted.short,
      ...(spots.stone.zone ? { targetZoneLabel: spots.stone.zone } : { x: spots.stone.x, y: spots.stone.y, rotation: spots.stone.rotation || 0 }),
      faceDown: false,
    });
    if (e.status !== 'ok') problems.push(`${wanted.short}: ${e.reason}`);
  } else {
    notes.push(spots.noStone);
  }

  for (const st of STATS) {
    const spot = spots.counters[st.key];
    const value = wanted.start?.[st.key];
    if (!Number.isFinite(value)) { problems.push(`${wanted.name}: no start value for ${st.key}`); continue; }
    if (!spot) { notes.push(spots.noCounter(st)); continue; }
    // Leben traegt sein Maximum (= Startwert), die anderen drei ihren Ausgangswert.
    const e = sub({
      type: 'place_counter', name: counterName(wanted, st.key), value,
      ...(st.life ? { max: value } : { base: value }), x: spot.x, y: spot.y,
    });
    if (e.status !== 'ok') { problems.push(`${counterName(wanted, st.key)}: ${e.reason}`); continue; }
    if (spot.locked !== undefined) work.counters.find(k => k.name === counterName(wanted, st.key)).locked = spot.locked;
  }

  for (const st of STATS) {
    const e = sub({
      type: 'place_asset', assetName: `${seat.markers}: ${st.key}`,
      targetZoneLabel: `${seat.zones}: ${st.key}`, slot: wanted.start?.[st.key],
    });
    if (e.status !== 'ok') problems.push(`${seat.markers}: ${st.key}: ${e.reason}`);
  }

  for (const g of wanted.gear || []) {
    const target = g.slot ? `${seat.zones}: ${g.slot}` : seat.vorrat;
    let e = sub({ type: 'place_card', cardName: g.card, targetZoneLabel: target });
    // Liegt dort schon etwas (ein Kauf, den der Spieler angelegt hat), geht die
    // Karte in den Vorrat - und der Tausch **sagt es**. Eine andere Ursache (die
    // Zone gibt es nicht) ist ein Fehler in den Daten und wird nicht zugedeckt.
    if (e.status !== 'ok' && g.slot && /is full/.test(e.reason || '')) {
      const again = sub({ type: 'place_card', cardName: g.card, targetZoneLabel: seat.vorrat });
      if (again.status === 'ok') {
        notes.push(`${g.card}: "${target}" is taken, put into "${seat.vorrat}"`);
        e = again;
      }
    }
    if (e.status !== 'ok') problems.push(`${g.card}: ${e.reason}`);
  }

  return { problems, notes };
}

/**
 * M27.1/CQ: was `swap_villager` und `seat_villager` zuerst fragen - gibt es
 * Dörferdaten, gibt es den Platz, kennt der Roster den Dörfler? Gibt
 * `{ skip }` oder `{ n, wanted, seated }` zurück, `seated` ist, wer jetzt wo sitzt.
 */
function pickSeat(state, step, assets, villagers) {
  if (!hasVillagers(villagers)) return { skip: 'no villager data in the scenario data' };

  const n = Number(step.seat);
  if (step.seat === '' || step.seat === null || !Number.isInteger(n) || n < 1 || n > villagers.seats.length) {
    return { skip: `no seat "${step.seat ?? ''}"` };
  }
  const wanted = findVillager(villagers, step.villager);
  if (!wanted) return { skip: `"${step.villager ?? ''}" is not in the roster` };
  return { n, wanted, seated: seatedVillagers(state, assets, villagers) };
}

/**
 * M27.1/CQ: einen Dörfler an einen **leeren** Platz stellen - das Hin des
 * Tauschs ohne das Weg. Gibt `{ skip }`, `{ fail }` oder `{ state, notes }`
 * zurück, alles oder nichts wie `swapVillager`.
 *
 * Was dem Platz gehört, kommt aus dem Platz (`seat.tableau`, `seat.counters`,
 * `villagers.barZone`), was dem Dörfler gehört, aus dem Roster. Fehlt eine
 * Stelle, wird **nichts** gestellt: ein Tableau ohne seine Zähler ist ein halber
 * Dörfler.
 *
 * Das Tableau trägt `anchorId` nur, wenn es **nicht** das Asset des Platzes ist
 * (Judy an Platz 1): die Zonen des Platzes hängen an dessen Id. Henlo an Platz 1
 * ist sein eigener Anker - dort stünde es doppelt da, und der Tisch sähe anders
 * aus als der, den die hartverdrahteten Schritte bis M26 gebaut haben.
 */
function seatVillager(state, step, allZones, allGrids, assets, cards, scenarioData, rng) {
  const villagers = scenarioData?.villagers;
  const picked = pickSeat(state, step, assets, villagers);
  if (picked.skip) return { skip: picked.skip };
  const { n, wanted, seated } = picked;

  const here = seated.find(s => s.n === n);
  if (here) return { skip: `seat ${n} holds "${here.name ?? '?'}" - use swap_villager to change who sits there` };
  const elsewhere = seated.find(s => s.data?.name === wanted.name);
  if (elsewhere) return { skip: `"${wanted.name}" already sits at seat ${elsewhere.n}` };

  const seat = villagers.seats[n - 1];
  const geometry = seatGeometryProblems(seat, n);
  if (!String(villagers.barZone ?? '').trim()) geometry.push('no barZone');
  if (geometry.length) return { skip: geometry.join('; ') };
  const anchor = findAsset(assets, seat.anchor);
  if (!anchor) return { skip: `seat ${n}: asset "${seat.anchor}" not found` };
  const own = findAsset(assets, `${TABLEAU_PREFIX}${wanted.name}`);

  const work = JSON.parse(JSON.stringify(state));
  const spot = (p) => ({ x: coordOf(p.x), y: coordOf(p.y) });
  const spots = {
    tableau: { ...spot(seat.tableau), rotation: 0, anchorId: own && own.id !== anchor.id ? anchor.id : undefined, locked: true },
    stone: { zone: villagers.barZone },
    counters: Object.fromEntries(STATS.map(st => [st.key, spot(seat.counters[st.key])])),
  };
  const placed = placeVillager(work, n, wanted, spots, { allZones, allGrids, assets, cards, scenarioData, rng });
  if (placed.fail) return { fail: placed.fail };
  if (placed.problems.length) return { fail: placed.problems.join('; ') };
  if (wanted.unverified) placed.notes.push(`"${wanted.name}": ${wanted.unverified}`);
  return { state: work, notes: placed.notes };
}

/**
 * M26.2: der Tausch. Gibt `{ skip }` (nichts getan, Voraussetzung fehlt),
 * `{ fail }` (gelaufen, aber nicht gelungen) oder `{ state, notes }` zurueck.
 *
 * **Alles oder nichts.** Der Schritt arbeitet an einer Kopie und gibt sie nur
 * zurueck, wenn jedes Teilstueck gelungen ist - wie `build_scenario`: ein halb
 * getauschter Doerfler ist schlimmer als keiner, weil man den leeren Platz sieht
 * und den halben nicht.
 *
 * **Hin und weg laufen durch dieselben Handler wie ein Aufbau** (`place_asset`,
 * `place_counter`, `place_card`). Eine zweite Lesart des Legens daneben waere
 * eine zweite Antwort darauf, wo ein Marker auf dem Startwert 4 liegt oder wie
 * eine Karte in einen Platz kommt (M6). Neu ist nur, was der Aufbau nicht
 * kennt: **was** vom alten Doerfler weggeht und **wohin** das Neue kommt - an die
 * Stelle des Alten, nicht an eine eigene Koordinate.
 *
 * Weg geht, was an ihm haengt und in den Daten benannt ist: sein Tableau, sein
 * Spielstein, seine Figur, seine vier Zaehler und die Karten seiner
 * Startausruestung. **Nicht**, was er dazugekauft hat - es steht in keinen Daten,
 * und der Tisch wuerde raten, wem es danach gehoert.
 */
function swapVillager(state, step, allZones, allGrids, assets, cards, scenarioData, rng) {
  const villagers = scenarioData?.villagers;
  const picked = pickSeat(state, step, assets, villagers);
  if (picked.skip) return { skip: picked.skip };
  const { n, wanted, seated } = picked;

  const here = seated.find(s => s.n === n);
  if (!here) return { skip: `nobody sits at seat ${n}` };
  if (!here.data) return { skip: `seat ${n} holds "${here.name ?? '?'}", who is not in the roster` };
  if (here.data.name === wanted.name) return { skip: `"${wanted.name}" already sits at seat ${n}` };
  // Zwei Henlos gibt es nicht: wer schon an einem anderen Platz sitzt, wird nicht
  // ein zweites Mal hingesetzt.
  const elsewhere = seated.find(s => s.data?.name === wanted.name);
  if (elsewhere) return { skip: `"${wanted.name}" already sits at seat ${elsewhere.n}` };

  const old = here.data;
  const work = JSON.parse(JSON.stringify(state));
  const oldTableau = seatedVillagers(work, assets, villagers).find(s => s.n === n).token;

  const env = { allZones, allGrids, assets, cards, scenarioData, rng };
  const isAsset = (t, name) => {
    const a = findAsset(assets, name);
    return Boolean(a) && String(t.assetId) === String(a.id);
  };

  // ── weg ──
  const stones = work.tokens.filter(t => isAsset(t, old.short));
  const figures = work.tokens.filter(t => isAsset(t, old.name));
  const oldCounters = STATS.map(st => ({
    st, c: work.counters.find(c => norm(c.name) === norm(counterName(old, st.key))),
  }));
  const gone = new Set(gearCards(cards, old).map(c => String(c.id)));
  work.tokens = work.tokens.filter(t => t !== oldTableau && !stones.includes(t) && !figures.includes(t));
  work.counters = work.counters.filter(c => !oldCounters.some(o => o.c === c));
  work.cards = work.cards.filter(c => !gone.has(String(c.cardId)));

  // ── hin ── an die Stellen der alten Objekte (M27.1/CP: `placeVillager`).
  const spots = {
    tableau: { x: oldTableau.x, y: oldTableau.y, rotation: oldTableau.rotation || 0,
      anchorId: oldTableau.anchorId || oldTableau.assetId, locked: oldTableau.locked === true },
    stone: stones.length ? { x: stones[0].x, y: stones[0].y, rotation: stones[0].rotation || 0 } : null,
    noStone: `no "${old.short}" on the table, so none was put down for "${wanted.short}"`,
    counters: Object.fromEntries(oldCounters.map(({ st, c }) => [st.key, c ? { x: c.x, y: c.y, locked: c.locked === true } : null])),
    noCounter: (st) => `no counter "${counterName(old, st.key)}" to take the place of "${counterName(wanted, st.key)}"`,
  };
  const placed = placeVillager(work, n, wanted, spots, env);
  if (placed.fail) return { fail: placed.fail };
  const { problems, notes } = placed;

  if (problems.length) return { fail: problems.join('; ') };
  if (wanted.unverified) notes.push(`"${wanted.name}": ${wanted.unverified}`);
  return { state: work, notes };
}

function applyStep(state, step, allZones, allGrids, assets, cards, scenarioData, rng, entry, ctx = {}) {
  if (!state.stacks) state.stacks = [];
  if (!state.cards) state.cards = [];
  if (!state.tokens) state.tokens = [];
  if (!state.boards) state.boards = [];
  if (!state.counters) state.counters = [];

  // Anchored zones are resolved against the table as this step finds it, not
  // as the sequence started: step 1 lays the board out, step 2 fills a zone
  // printed on it. Resolving once up front would use the board's old position
  // - and a zone that is off by the width of a board is not subtle, but it is
  // also not visible in the protocol. A zone whose anchor is not on the table
  // keeps its saved absolute box (see anchoring.js).
  // Grids are resolved the same way and for the same reason: a grid printed on
  // a board that this very sequence has just laid out only sits on its fields
  // once the board is where it ends up.
  const boxes = anchorBoxes(state.boards, state.tokens);
  const zones = resolveZones(allZones, boxes);
  const grids = resolveGrids(allGrids, boxes);

  /** Nothing happened – a precondition was missing. */
  const skip = (reason) => { entry.status = 'skipped'; entry.reason = reason; return state; };
  /** The step ran but did not achieve what it says. */
  const fail = (reason) => { entry.status = 'failed'; entry.reason = reason; return state; };
  /**
   * M25.2/CE: der Schritt hat getan, was er sagt – hier ist trotzdem etwas,
   * das der Spieler wissen sollte.
   *
   * Der Befund der vierzehnten Partie: `build_scenario` meldete fünf fehlende
   * Geländekarten als `failed`, während alle fünf Plättchen korrekt lagen. Der
   * Spieler hat daraufhin angefangen, das Szenario von Hand nachzubauen – also
   * Arbeit getan, die der Tisch schon erledigt hatte. 34 von 62 Geländeassets
   * haben keine Karte in der Bibliothek (M20.2); das ist ein bekannter
   * Normalfall und kein Fehlschlag.
   *
   * **Nicht unterdrückt:** die Oberfläche zeigt `status !== 'ok'`, ein Vermerk
   * steht also weiterhin da. Unterdrückte Meldungen sind der Fehler aus M20.1.
   */
  const note = (reason) => { entry.status = 'note'; entry.reason = reason; return state; };

  const idx = buildStackIndex(state);

  // Placeholders are resolved once, here, for *every* name field of the step,
  // so that none of the handlers repeats the substitution. Nothing bound means
  // unresolved: falling back to the literal "$revealed" would address whatever
  // asset happens to carry that name, and guessing a boss is worse than not
  // laying one out.
  // Ein Listenfeld (`category` seit M8.11/E1) wird je Eintrag ersetzt.
  // `hasPlaceholder` prüft auf Zeichenkette, ein Array fiele sonst durch den
  // Rost - und aus ["Aktionen: $revealedBase"] würde wortwörtlich nach dem
  // Dollarzeichen gesucht, ohne dass irgendwo "is not bound" stünde.
  for (const field of NAME_FIELDS) {
    const raw = step[field];
    const parts = Array.isArray(raw) ? raw : [raw];
    if (!parts.some(hasPlaceholder)) continue;
    let missing = null, missingIn = null;
    const filled = parts.map(part => {
      if (!hasPlaceholder(part)) return part;
      return part.replace(PLACEHOLDER, (m) => {
        const value = ctx.vars[m.slice(1)] ?? ctx.seatVars?.[m.slice(1)];
        if (value === undefined) { missing = missing || m; missingIn = missingIn ?? part; return m; }
        return value;
      });
    });
    if (missing) return skip(`"${missingIn}": ${missing} is not bound`);
    step = { ...step, [field]: Array.isArray(raw) ? filled : filled[0] };
  }

  switch (step.type) {
    // M9.3: die Vorbedingung einer Sequenz. Steht sie vorn, gilt sie für die
    // ganze Folge - trifft sie nicht zu, läuft kein einziger Schritt dahinter.
    // Das ist die Antwort auf „ein halb aufgebauter Kampf ist schlimmer als
    // keiner", die M7 innerhalb von `build_scenario` schon gibt.
    //
    // Die Meldung steht **am Schritt**, nicht im Code: der Executor weiß
    // nichts über Townsfolk Tussle, und „Erst die Dorfphase beginnen" ist eine
    // Auskunft, die nur das Setup geben kann. Ohne sie bleibt die Diagnose.
    case 'require_zone': {
      // Angehalten wird über `ctx`, nicht über einen Wurf - `executeSequence`
      // wirft nie (Spec M9.3 Regel 3). Die Schleife oben liest das Kennzeichen.
      const halt = (reason) => { ctx.halted = true; return skip(reason); };

      const zone = findZone(zones, step.zoneLabel);
      // Eine Bedingung, die sich nicht prüfen lässt, ist keine erfüllte:
      // durchzulassen hieße genau den Schaden zuzulassen, gegen den sie steht.
      // Hier gilt die Diagnose auch dann, wenn eine Meldung dasteht - sie
      // spräche von der Dorfphase, während in Wahrheit der Zonenname klemmt.
      if (!zone) return halt(`zone "${step.zoneLabel ?? ''}" not found`);
      if (step.expect !== 'empty' && step.expect !== 'occupied') {
        return halt(`"${step.expect ?? ''}" is not a condition: "empty" or "occupied"`);
      }

      // M12.3: **belegt** heißt, was auf einem Platz liegt - nicht, was im
      // Rechteck liegt. Das ist dieselbe `occupancy`, die jeder Austeilschritt
      // seit M11.8 befragt; `require_zone` ist als einziger Ort im Executor nie
      // mitgezogen worden, weil es älter ist als der Fix. Eine beiseitegelegte
      // Bösewicht-Aktionskarte, die im Rechteck des `Bösewicht-Tableau` lag,
      // meldete dadurch einen vorigen Kampf, den es nicht gab.
      //
      // Der Fall „Zone ohne feste Plätze" ändert sich nicht: `countInZone`
      // fällt dort auf `objectsInZone` zurück, also auf das Rechteck.
      // Das Ankerobjekt bleibt außen vor - ein Brett mit einer aufgedruckten
      // Zone liegt nicht *in* ihr, sonst wäre sie dauerhaft belegt.
      const inside = countInZone(zone, state.cards, state.tokens);
      if (step.expect === 'empty' ? inside === 0 : inside > 0) return state;

      // M12.3 Abnahme 3: die Auskunft aus den Daten führt, die Diagnose steht
      // dahinter. Der Satz ist für den erwarteten Fall geschrieben - trifft ein
      // anderer zu, schickt er den Spieler in die falsche Richtung, und genau
      // das ist in der Partie passiert.
      //
      // Das macht aus der einen Zeile keine sechzehn: M9.3 hat die *Zeilen*
      // abgeschafft (die Schritte hinter der Wache bekommen keine eigene),
      // hier kommt ein Halbsatz an die eine, die bleibt.
      if (!step.message) return halt(`zone "${zone.label}" is ${inside ? `not empty (${inside})` : 'empty'}`);
      // K2: der Satz, der für den Spieler geschrieben ist, steht zusätzlich für
      // sich. `reason` bleibt Wort für Wort, was es war — es ist die Diagnose
      // und gehört ins Protokoll; der Spieler bekommt nur `message` zu sehen
      // (`issueLine` in `client/src/utils/setupActions.js`). In der sechsten
      // Partie stand vor ihm „#1 require_zone … [in zone: …] (16 further steps
      // skipped)" um einen richtigen deutschen Satz herum.
      entry.message = step.message;
      return halt(`${step.message} [${zoneContents(zone, state)}]`);
    }

    // M19.5/BM: dieselbe Wache, nur ueber einen **Zaehler** statt einer Zone.
    //
    // Der Befund der zehnten Partie: nach einer Niederlage - alle drei Doerfler
    // besiegt - laesst sich „Dorfphase beginnen" anstandslos ausloesen. Den
    // Zustand „besiegt" gibt es am Tisch nicht; die einzige Spur sind die drei
    // Lebenszaehler auf 0, und die fuehrt der Spieler von Hand.
    //
    // **Die Definition steht im Aufbau, nicht hier.** Der Executor weiss nichts
    // ueber Townsfolk Tussle - genau wie bei `require_zone`, wo der Satz fuer
    // den Spieler als `message` am Schritt steht. Hier steht nur die Frage:
    // steht mindestens einer der genannten Zaehler ueber `above` (Vorgabe 0)?
    //
    // `confirm` macht aus dem Halt eine **Rueckfrage**: der Tisch zeigt die
    // Meldung und laesst den Spieler entscheiden (`runSetupAction`). Der Tisch
    // behauptet nichts ueber den Ausgang der Partie - er nennt den Zaehlerstand
    // und fragt.
    case 'require_counter': {
      const halt = (reason) => { ctx.halted = true; return skip(reason); };

      const names = categoryList(step.name);
      if (!names.length) return halt('no counter name given');

      const above = step.above === undefined || step.above === null || step.above === ''
        ? 0 : Number(step.above);
      if (!Number.isFinite(above)) return halt(`"${String(step.above)}" is not a number`);

      const counters = Array.isArray(state.counters) ? state.counters : [];
      const found = names.map(n => counters.find(c => norm(c.name) === norm(n)));
      // Eine Bedingung, die sich nicht pruefen laesst, ist keine erfuellte:
      // durchzulassen hiesse genau den Schaden zuzulassen, gegen den sie steht
      // (dieselbe Entscheidung wie bei `require_zone`).
      const missing = names.filter((n, i) => !found[i]);
      if (missing.length) return halt(`no counter named ${missing.map(n => `"${n}"`).join(', ')}`);

      // M26.2/CM: die zweite Lesart derselben Wache - **jeder** genannte Zaehler
      // steht auf seinem Ausgangswert. Gefragt ist "hat dieser Doerfler schon
      // gespielt?", und die Antwort steht an den Zaehlern: ein Tausch in Runde 3
      // loeschte erspielte Werte. Der Ausgangswert ist `base`, sonst `max`
      // (Leben traegt nur das Maximum, Regel "Maximales LEBEN"); ein Zaehler ohne
      // beides hat keinen, und was sich nicht pruefen laesst, gilt nicht als
      // erfuellt. `above` bleibt bei `atStart` unbeachtet - es ist die andere
      // Lesart.
      const atStart = step.atStart === true || step.atStart === 'true';
      let stand;
      let fallback;
      if (atStart) {
        const starts = found.map(c => counterMax(c.base) ?? counterMax(c.max));
        const unknown = found.filter((c, i) => starts[i] === undefined);
        if (unknown.length) return halt(`no starting value: ${unknown.map(c => `"${c.name}"`).join(', ')}`);
        const off = found.map((c, i) => ({ c, start: starts[i] })).filter(({ c, start }) => Number(c.value) !== start);
        if (!off.length) return state;
        stand = off.map(({ c, start }) => `${c.name}: ${c.value}, started at ${start}`).join('; ');
        fallback = 'a counter has left its starting value';
      } else {
        if (found.some(c => Number(c.value) > above)) return state;
        stand = found.map(c => `${c.name}: ${c.value}`).join(', ');
        fallback = `no counter above ${above}`;
      }

      if (!step.message) return halt(`${fallback} [${stand}]`);
      // K2: der Satz, der fuer den Spieler geschrieben ist, steht fuer sich;
      // `reason` bleibt die Diagnose und geht ins Protokoll.
      entry.message = step.message;
      if (step.confirm) entry.confirm = true;
      return halt(`${step.message} [${stand}]`);
    }

    case 'shuffle': {
      const stack = idx.get(step.stackLabel);
      if (!stack) return skip(`stack "${step.stackLabel}" not found`);
      shuffleStack(stack.cards, rng);
      return state;
    }

    case 'set_face_down': {
      const stack = idx.get(step.stackLabel);
      if (!stack) return skip(`stack "${step.stackLabel}" not found`);
      stack.cards.forEach(c => { c.faceDown = true; });
      return state;
    }

    case 'set_face_up': {
      const stack = idx.get(step.stackLabel);
      if (!stack) return skip(`stack "${step.stackLabel}" not found`);
      stack.cards.forEach(c => { c.faceDown = false; });
      return state;
    }

    case 'flip_top_card': {
      const stack = idx.get(step.stackLabel);
      if (!stack || !stack.cards.length) return skip(`stack "${step.stackLabel}" not found or empty`);
      // Top card = highest zIndex
      const top = stack.cards.reduce((best, c) => c.zIndex > best.zIndex ? c : best, stack.cards[0]);
      top.faceDown = false;
      return state;
    }

    case 'split': {
      const { stackLabel, count, outputLabels = [], spacing = 130 } = step;
      const sourceStack = idx.get(stackLabel);
      if (!sourceStack) return skip(`stack "${stackLabel}" not found`);
      if (!count || count < 2) return skip('count must be at least 2');

      const allCards = [...sourceStack.cards].sort((a, b) => a.zIndex - b.zIndex);
      const totalCards = allCards.length;
      const baseSize = Math.floor(totalCards / count);
      const remainder = totalCards % count;

      const originX = sourceStack.x;
      const originY = sourceStack.y;

      // Remove source stack
      state.stacks = state.stacks.filter(s => s !== sourceStack);

      // Calculate total width to center the row of stacks
      const totalWidth = (count - 1) * spacing;
      const startX = originX - totalWidth / 2;

      for (let i = 0; i < count; i++) {
        const start = i * baseSize + Math.min(i, remainder);
        const end = start + baseSize + (i < remainder ? 1 : 0);
        const chunk = allCards.slice(start, end);

        if (chunk.length === 0) continue; // don't create empty stacks

        const label = outputLabels[i] || `${stackLabel} ${i + 1}`;
        const newStackId = crypto.randomUUID();

        reassignZIndices(chunk);

        state.stacks.push({
          stackId: newStackId,
          label,
          x: startX + i * spacing,
          y: originY,
          cards: chunk,
          card_ids: chunk.map(c => c.cardId),
          table_ids: chunk.map(c => c.tableId),
        });
      }

      return state;
    }

    // M7/T3: aus einer Kartenkategorie einen Nachziehstapel bauen. Im Client
    // gibt es das seit jeher als „+ Stack"; als Sequenzschritt fehlte es - und
    // damit war das Verhaltensdeck des Bösewichts, dessen Kategorie erst nach
    // dem Aufdecken feststeht, nicht aufbaubar.
    case 'place_stack': {
      const label = String(step.label ?? '').trim();
      // Der feste Name neben der variablen Kategorie ist der ganze Zweck: die
      // Kategorie heißt je Bösewicht anders, der Stapel immer „Verhaltensdeck",
      // und nur so findet `remove_stack` ihn beim nächsten Kampf wieder.
      if (!label) return skip('no stack name given');
      if (idx.get(label)) return skip(`stack "${label}" is already on the table`);

      // M8.11/E1: mehrere Kategorien, in der Reihenfolge der Angabe. Eine
      // leere darunter ist **kein Abbruch**, solange eine andere liefert -
      // sonst müsste man jeden Schritt umschreiben, um eine Erweiterung
      // wegzulassen. Sie landet im Protokoll (Regel 2). Erst wenn *alle* leer
      // sind, bleibt es beim bisherigen Übersprungen-mit-Grund (Regel 3).
      const wanted = categoryList(step.category);
      if (!wanted.length) return skip('no card category given');

      const inCategory = [], nothing = [];
      for (const name of wanted) {
        const hits = cards.filter(c => norm(c.category) === norm(name));
        if (hits.length) inCategory.push(...hits);
        else nothing.push(name);
      }
      const missed = nothing.map(n => `"${n}"`).join(', ');
      if (!inCategory.length) return skip(`category ${missed} is empty or unknown`);

      // R3/M7.5: eine Zone ist die zweite Art zu sagen, wo der Stapel hingehört
      // - dieselbe Ausschließlichkeit wie bei `place_asset`. Das Aktionsdeck
      // liegt auf einer am Zusatz-Brett verankerten Buchseite, und eine feste
      // x/y wäre genau das, was M3a abgeschafft hat.
      //
      // Die Zone gibt ihm die **Stelle**, nicht die Kapazität: `countInZone`
      // liest `state.cards`, und die Karten eines Stapels liegen in
      // `stack.cards` und sind dort unsichtbar. `accepts` gilt trotzdem - eine
      // Zone, die keine Karten nimmt, nimmt auch keinen Kartenstapel.
      let x, y;
      if (step.targetZoneLabel) {
        const zone = findZone(zones, step.targetZoneLabel);
        if (!zone) return skip(`zone "${step.targetZoneLabel}" not found`);
        const refusal = zoneRejects(zone, 'card', occupancy(state, zone));
        if (refusal) return skip(refusal);
        const slots = zoneSlots(zone);
        ({ x, y } = slots ? slots[0] : zoneCenter(zone));
      } else {
        // Leer ist keine 0 – dieselbe Rechnung wie bei `place_counter`: ein
        // Stapel klammheimlich in der Tischmitte ist schlimmer als ein
        // gemeldeter fehlender Wert.
        const coord = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
        [x, y] = [coord(step.x), coord(step.y)];
        if (!Number.isFinite(x) || !Number.isFinite(y)) return skip(`no position given for stack "${label}"`);
      }

      const stackId = crypto.randomUUID();
      const faceDown = Boolean(step.faceDown);
      // Die Bibliothekskarte per Spread, nicht über eine aufgezählte Feldliste:
      // die hat hier schon einmal `width`/`height` verschluckt, und quadratische
      // Karten lagen danach im Hochformat (Spec: Nachtrag zu M2.12). Position
      // trägt der Stapel, nicht die Karte – `move` verschiebt ihn, ohne die
      // Karten anzufassen, eine mitgeschriebene x/y wäre sofort veraltet.
      const stackCards = inCategory.map((card, i) => ({
        ...card,
        tableId: crypto.randomUUID(),
        cardId: card.id,
        zIndex: i + 1,
        faceDown,
        rotation: 0,
      }));

      state.stacks.push({
        stackId,
        label,
        x,
        y,
        cards: stackCards,
        card_ids: stackCards.map(c => c.cardId),
        table_ids: stackCards.map(c => c.tableId),
      });
      // Regel 2: der Stapel steht, aber es gehört gesagt, was gefehlt hat -
      // wie beim `place_card`, der in einen Dublettenstapel greift.
      if (nothing.length) entry.reason = `category ${missed} is empty or unknown`;
      return state;
    }

    // M8.8: **eine** Karte bei Namen aus der Bibliothek in eine Zone. Die
    // Startausrüstung steht auf dem Dörfler-Tableau, und das Vokabular konnte
    // sie nicht auslegen: `deal_to_zone` setzt einen Stapel am Tisch voraus,
    // `place_stack` erzeugt einen — eine angelegte Ausrüstungskarte ist beides
    // nicht, sie liegt frei und wird einzeln bewegt.
    //
    // Nur eine Zone, keine x/y: „vor dem Dörfler" ist eine am Brett verankerte
    // Zone, und eine feste Stelle ist das, was M3a abgeschafft hat — sie
    // wandert nicht mit dem Brett und wird vom nächsten `clear_zone` nicht
    // gefunden.
    case 'place_card': {
      const zone = findZone(zones, step.targetZoneLabel);
      if (!zone) return skip(`zone "${step.targetZoneLabel || '(none)'}" not found`);

      // Kein Treffer ist eine fehlende Voraussetzung, mehrere sind ein Fehler:
      // die Spec unterscheidet das, und das Protokoll soll es auch.
      const { card, reason, ambiguous } = findCardByName(cards, step.cardName);
      if (!card) return ambiguous ? fail(reason) : skip(reason);

      const { usable, occupied, spots, problems } = zoneRoom(state, [zone], 'card');
      if (!usable.length) return skip(problems.join('; '));
      const start = occupied.get(zone);

      // Per Spread aus der Bibliothekszeile, nicht über eine aufgezählte
      // Feldliste — die hat hier schon zweimal `width`/`height` verschluckt
      // (Nachtrag zu M2.12, M4a).
      state.cards.push({
        ...card,
        tableId: crypto.randomUUID(),
        cardId: card.id,
        // M11.8: der erste freie Platz, nicht "der Platz hinter den belegten".
        ...spotFor(spots, zone, 0, zoneSlot(zone, start, start + 1), start),
        zIndex: start + 1,
        faceDown: false,
        face_up: true,
        rotation: 0,
      });
      // Ein Griff in einen Dublettenstapel ist kein Fehler, aber er gehört ins
      // Protokoll — wie beim `remove_stack`, der nichts vorfindet.
      if (reason) entry.reason = reason;
      return state;
    }

    // Das Gegenstück dazu. `clear_zone` kann das nicht: es liest
    // `state.cards`/`state.tokens`, und die Karten eines Stapels liegen in
    // `stack.cards` und sind dort unsichtbar.
    case 'remove_stack': {
      const stack = idx.get(step.stackLabel);
      // Kein Stapel dieses Namens heißt: der gewünschte Zustand liegt schon vor
      // (dieselbe Entscheidung wie beim leeren `clear_zone`). Anders als Zonen
      // stehen Stapel nirgends im Setup, es gibt also keine Liste, gegen die
      // sich ein Tippfehler von einem „schon weg" unterscheiden ließe - und der
      // erste Kampf einer Partie räumt immer ein Deck weg, das es noch nicht
      // gibt. Der Grund steht trotzdem im Protokoll.
      if (!stack) {
        entry.reason = `no stack "${step.stackLabel}" on the table`;
        return state;
      }
      state.stacks = state.stacks.filter(s => s !== stack);
      return state;
    }

    case 'deal_to_zone': {
      const { stackLabel, count, targetZoneLabel, faceDown = false, fill = false } = step;
      const stack = idx.get(stackLabel);
      if (!stack || !stack.cards.length) return skip(`stack "${stackLabel}" not found or empty`);

      // Determine target zones
      let targetZones = zones;
      if (targetZoneLabel) {
        targetZones = zones.filter(z => z.label === targetZoneLabel);
      }
      if (!targetZones.length) return skip(`zone "${targetZoneLabel ?? '(any)'}" not found`);

      // M11.2: auffuellen statt austeilen. `fill` zieht ab, was schon liegt -
      // dieselbe `occupancy`, die `zoneRoom` gleich darunter befragt, keine
      // zweite Rechnung. Liegt die Zahl schon aus, ist der gewuenschte Zustand
      // erreicht: kein Schritt, keine Meldung. Vor `zoneRoom`, weil eine volle
      // Zone dort als Ablehnung zurueckkaeme und als `skipped` im Protokoll
      // landete - genau der Laerm, den der Befund nennt.
      // Kein drittes Vorzeichen an `count`: `count <= 0` heisst heute "der
      // ganze Stapel", eine negative Zahl waere die stille Umdeutung
      // vorhandener Aufbauten.
      let want = count;
      if (fill && count > 0) {
        const already = targetZones.reduce((n, z) => n + occupancy(state, z), 0);
        want = count - already;
        if (want <= 0) return state;
      }

      // A zone that does not take cards, or that is already full, is not dealt
      // into at all - the cards stay in the stack where they can still be used.
      const { usable, free, occupied, spots, problems } = zoneRoom(state, targetZones, 'card');
      if (!usable.length) return skip(problems.join('; '));

      const sorted = [...stack.cards].sort((a, b) => b.zIndex - a.zIndex); // top first
      const wanted = want > 0 ? sorted.slice(0, want) : sorted;
      const { groups, leftovers } = shareOut(wanted, usable, free);

      // Die ausgeteilten Karten liegen ueber allem, was schon am Tisch liegt,
      // und untereinander in der Reihenfolge des Austeilens (M8.9/D2).
      let z = topZIndex(state);
      const dealt = [];
      for (const [zone, group] of groups) {
        group.forEach((card, i) => {
          // Fixed places seat the card on the next free one; a zone without
          // them keeps the old behaviour and drops every card on its centre.
          const pos = spotFor(spots, zone, i, zoneCenter(zone), occupied.get(zone));
          // Die ausgeteilte Karte ist die Quellkarte – sie unterscheidet sich
          // nur in Position, Seite und Stapelzugehoerigkeit. Eine feste
          // Feldliste verlor hier `width`/`height` (Spec: Nachtrag zu M2.12).
          const dealtCard = {
            ...card,
            tableId: card.tableId || crypto.randomUUID(),
            card_back_id: card.card_back_id || null,
            x: pos.x,
            y: pos.y,
            faceDown,
            rotation: card.rotation || 0,
            face_up: !faceDown,
            zIndex: ++z,
          };
          delete dealtCard.inStack; // die Karte hat den Stapel gerade verlassen
          state.cards.push(dealtCard);
          dealt.push(card);
        });
      }

      // Remove dealt cards from stack
      const dealtIds = new Set(dealt.map(c => c.tableId));
      stack.cards = stack.cards.filter(c => !dealtIds.has(c.tableId));
      if (stack.cards.length === 0) {
        state.stacks = state.stacks.filter(s => s !== stack);
      }

      const notes = [...problems];
      if (leftovers.length) {
        notes.push(`${leftovers.length} of ${wanted.length} cards stayed in the stack: ${fullZones(usable, free, 'card').join('; ')}`);
      }
      if (want > 0 && dealt.length + leftovers.length < want) {
        notes.push(`stack "${stackLabel}" held only ${wanted.length} of ${want} requested cards`);
      }
      return notes.length ? fail(notes.join('; ')) : state;
    }

    case 'place_asset': {
      const asset = findAsset(assets, step.assetName);
      if (!asset) return skip(`asset "${step.assetName}" not found`);

      const existing = findPlaced(state, asset, step.assetName);
      let target = null;
      // What the object remembers about where it stands. Always written, also
      // as nulls: an object moved into a zone or onto free coordinates that
      // kept a stale `gridId`/`cell` would be dragged back onto the old field
      // by `placeOnGrids` on the next load (M3b).
      let onGrid = { gridId: null, cell: null };
      let noPos = `no position given for "${step.assetName}"`;
      // Die Drehung gehoert zur Platzierung, nicht zum Objekt: es gibt keinen
      // Schritt, der nur dreht, und eine stehengebliebene Drehung waere still
      // falsch - dieselbe Ueberlegung wie bei `gridId`/`cell` oben. Sie gilt in
      // allen drei Zweigen: ein gedrehtes Token in einer Zone ist genauso
      // legitim (M7.1). Ein Winkel, den es nicht gibt, ist keiner: 0.
      const rotation = rotationOf(step.rotation) ?? 0;

      if (step.targetZoneLabel) {
        const zone = findZone(zones, step.targetZoneLabel);
        if (!zone) {
          noPos = `zone "${step.targetZoneLabel}" not found`;
        } else {
          // Moving the object within its own zone must not count it twice.
          const here = existing && zoneContains(zone, existing.x, existing.y) ? 1 : 0;
          const taken = occupancy(state, zone) - here;
          const refusal = zoneRejects(zone, 'asset', taken);
          if (refusal) return skip(refusal);
          // M8.10: `slot` nennt den Platz bei seiner **Nummer** statt ihn aus
          // der Belegung zu zaehlen. Eine Leiste traegt einen Marker, und wo er
          // liegt, sagt der Wert - nicht, wie voll die Zone ist. Ohne `slot`
          // bleibt es beim Auffuellen der Reihe nach (Bosseleiste).
          // Die Zonenregeln oben gelten weiter: ein genannter Platz umgeht
          // weder `accepts` noch die Kapazitaet.
          if (step.slot !== undefined && step.slot !== null && step.slot !== '') {
            const hit = zoneSlotNumbered(zone, step.slot);
            // Nicht auf den naechsten Platz ausweichen: "Feld 13" auf einer
            // Zwoelferleiste ist ein Autorenfehler, und ein Marker auf Feld 12
            // sieht aus wie ein richtiger Aufbau.
            if (!hit) noPos = `zone "${step.targetZoneLabel}" has no place "${step.slot}"`;
            else target = hit;
          } else {
            const slots = zoneSlots(zone);
            target = slots ? slots[Math.min(taken, slots.length - 1)] : zoneCenter(zone);
          }
        }
      } else if (step.gridLabel || step.cell) {
        // Zone, grid field and x/y are three exclusive ways of saying where
        // something goes; the field is the middle one and never mixes with the
        // others. The field name travels with the object, the coordinates only
        // follow from it.
        const grid = findGrid(grids, step.gridLabel);
        // Die Grundflaeche folgt der Groesse des Stuecks, wenn ein Einzelfeld
        // dasteht (M7.3) - und massgeblich ist, was auf dem Tisch liegt, nicht
        // was die Assetzeile sagt: dieselbe Quelle, die das Ziehen von Hand
        // liest. Sonst gaeben Aufbau und Ziehen zwei Antworten.
        const r = grid && cellRange(grid, step.cell, assetSize(existing || asset));
        if (!grid) {
          noPos = `grid "${step.gridLabel ?? ''}" not found`;
        } else if (!cellRange(grid, step.cell)) {
          noPos = `grid "${grid.label}" has no cell "${step.cell ?? ''}"`;
        } else if (!r) {
          // Das Feld gibt es, das Stueck passt nur nicht mehr darauf. Das ist
          // eine andere Auskunft, und wer sie liest, sucht sonst einen
          // Tippfehler, den es nicht gibt (M7.3, Abnahme 5).
          noPos = `"${step.assetName}" does not fit on grid "${grid.label}" at "${step.cell}"`;
        } else {
          // `E3:G4` centres on the middle of the six fields and takes their
          // size; `C7` is the 1×1 case of the same calculation and keeps the
          // size of its asset (M7.1) - es sei denn, die Groesse sagt mehr.
          target = rangeCenter(grid, r);
          onGrid = { gridId: grid.id, cell: rangeLabel(grid, r) };
          if (r.ranged) {
            const box = rangeBox(grid, r);
            onGrid.width = box.width;
            onGrid.height = box.height;
          }
        }
      } else if (typeof step.x === 'number' && typeof step.y === 'number') {
        target = { x: step.x, y: step.y };
      }

      if (existing) {
        if (existing.locked) return skip(`"${step.assetName}" is locked, not moving it`);
        if (!target) return skip(noPos);
        existing.x = target.x;
        existing.y = target.y;
        // M17.5/BF: und die Verloren-Marke gilt nicht mehr. `offGrid` sagt seit
        // M10.10 „hat seinen Platz verloren" und zeichnet einen gestrichelten
        // Rand; wer hier neu platziert wird, hat wieder einen. `handleObjDragEnd`
        // macht es beim Ziehen seit jeher so („eingerastet ist gesetzt") - dies
        // ist dieselbe Zeile an der zweiten Stelle, die Stuecke hinstellt.
        Object.assign(existing, onGrid, { rotation, offGrid: false });
        return state;
      }

      if (!target) return skip(noPos);
      const token = assetToken(asset, target.x, target.y, step.faceDown);
      if (!token) return fail(`"${step.assetName}" has no back side and was not placed face down`);
      state.tokens.push(Object.assign(token, onGrid, { rotation }));
      return state;
    }

    case 'draw_assets': {
      const { pool, count = 1, targetZoneLabel, faceDown = false } = step;
      const candidates = pool ? assets.filter(a => norm(a.category) === norm(pool)) : [];
      if (!candidates.length) return skip(`pool "${pool}" is empty or unknown`);

      const targetZones = targetZoneLabel
        ? zones.filter(z => norm(z.label) === norm(targetZoneLabel))
        : zones;
      if (!targetZones.length) return skip(`zone "${targetZoneLabel ?? '(any)'}" not found`);

      // Same rule as for cards: a zone that refuses tokens, or is full, is not
      // drawn into. Nothing leaves the pool, so a corrected setup draws again.
      const { usable, free, occupied, spots, problems } = zoneRoom(state, targetZones, 'asset');
      if (!usable.length) return skip(problems.join('; '));

      const wanted = Math.max(1, Number(count) || 1);
      const n = Math.min(wanted, candidates.length);

      const bag = [...candidates];
      shuffleArray(bag, rng);
      const drawn = bag.slice(0, n);

      // A drawn asset without a back side is dropped, the rest of the draw still
      // happens: three of four bosses in the bar is a visible gap and keeps the
      // work, while an empty bar would throw away three correct placements.
      // Dropping happens before the slots are handed out, so what is placed is
      // still spread evenly.
      const refused = faceDown ? drawn.filter(a => !a.back_image_path) : [];
      const placeable = faceDown ? drawn.filter(a => a.back_image_path) : drawn;

      // Group per target zone first, then spread each group inside its zone.
      const { groups: perZone, leftovers } = shareOut(placeable, usable, free);

      for (const [zone, group] of perZone) {
        group.forEach((asset, i) => {
          const { x, y } = spotFor(spots, zone, i, zoneSlot(zone, i, group.length), occupied.get(zone));
          state.tokens.push(assetToken(asset, x, y, faceDown));
        });
      }

      if (n < wanted) problems.push(`pool "${pool}" holds only ${n} of ${wanted} requested assets`);
      if (leftovers.length) {
        problems.push(`${leftovers.length} of ${placeable.length} assets not placed: ${fullZones(usable, free, 'asset').join('; ')}`);
      }
      if (refused.length) {
        problems.push(`no back side, not placed face down: ${refused.map(a => a.name).join(', ')}`);
      }
      return problems.length ? fail(problems.join('; ')) : state;
    }

    case 'set_asset_face': {
      const obj = findPlaced(state, findAsset(assets, step.assetName), step.assetName);
      if (!obj) return skip(`"${step.assetName}" is not on the table`);

      const face = assetFace(obj, step.faceDown);
      if (!face) {
        // Same rule as placing: rather off the table than face up by accident.
        state.tokens = state.tokens.filter(o => o !== obj);
        state.boards = state.boards.filter(o => o !== obj);
        return fail(`"${step.assetName}" has no back side; taken off the table instead of leaving it face up`);
      }
      Object.assign(obj, face);
      return state;
    }

    // Der Schritt für wiederkehrende Umbauten (Spec 11): welches Objekt an der
    // Reihe ist, weiß erst der Moment, in dem man es aufdeckt - feste Namen
    // reichen dafür nicht.
    case 'reveal_next': {
      // M25.3/CC: **jeder** Schritt dahinter liest `$revealed…`. Deckt dieser
      // nicht auf, kann keiner von ihnen etwas Sinnvolles tun - in Partie 14
      // standen vierzehn Zeilen „$revealedBase is not bound" im Protokoll und
      // der eine Satz, der zählt, nirgends. Darum hält ein gescheitertes
      // `reveal_next` die Folge an, derselbe `ctx.halted`-Weg wie bei
      // `require_zone` (M9.3) - ohne einen zweiten Schritttyp daneben: der
      // Schritt *ist* die Vorbedingung für alles dahinter.
      const halt = (reason) => { ctx.halted = true; return skip(reason); };

      const zone = findZone(zones, step.zoneLabel);
      if (!zone) return halt(`zone "${step.zoneLabel}" not found`);

      const { entries, slotCount } = slotOrder(zone, objectsInZone(zone, state.tokens, state.boards));
      // M25.3/CC: die Regel wählt über den **Platz**, nicht über die Seite
      // (`docs/tft-regeln.md` §5.1 Schritt 2: „auf dem nächsten Kampf-Platz
      // von oben nach unten … so dass ihr den Namen seht"). Offen zu liegen
      // ist das *Ergebnis* des Schritts, keine Vorbedingung - nach einem
      // Tausch durch ein Dorf-Ereignis liegt der nächste Gegner offen da und
      // ist trotzdem der nächste Gegner. Dieselbe Entscheidung wie bei
      // `clear_zone`: was schon so ist, wie es sein soll, ist gelungen.
      //
      // Nachsichtig ist der Schritt aber **nur, wenn er das Plättchen
      // wegräumt**. Ohne Zielzone bleibt es liegen, und dann ist „verdeckt"
      // das einzige Kennzeichen, an dem der nächste Aufruf merkt, welches
      // schon dran war - ohne es deckte er ewig dasselbe auf.
      //
      // **Und aufgedeckt wird nur, was zwei Seiten hat.** Auf dem ersten Platz
      // der Bösewicht-Leiste der Kurzpartie liegt offen ein Marker („erste
      // Runde überspringen") - er sagt, dass dieser Platz kein Kampf ist. Er
      // hat kein Rückseitenbild, lag also nie verdeckt und kann es nicht; „den
      // ersten Platz nehmen, egal welche Seite" hätte in der Sichtprüfung
      // prompt *ihn* aufgedeckt. Eine Seite ist eine Eigenschaft des Stücks,
      // kein Name und keine Sorte - `place_asset` und `set_asset_face` fragen
      // sie an derselben Stelle (M7.6).
      const hit = step.targetZoneLabel
        ? entries.find(e => e.o.backImageUrl)
        : entries.find(e => e.o.faceDown);
      if (!hit) {
        // Der eine Satz, der zählt. „nothing face down" war in der
        // Sichtprüfung die halbe Wahrheit: in der Leiste lag noch der
        // Kurzpartie-Marker, verdeckt war trotzdem nichts, und zu tun gab es
        // nichts mehr. Mit Zielzone sagt der Satz deshalb, was wirklich
        // fehlt - etwas zum Aufdecken.
        return halt(!entries.length
          ? `zone "${step.zoneLabel}" is empty`
          : step.targetZoneLabel
            ? `nothing left to reveal in zone "${step.zoneLabel}"`
            : `nothing face down in zone "${step.zoneLabel}"`);
      }
      const obj = hit.o;

      if (step.targetZoneLabel) {
        const target = findZone(zones, step.targetZoneLabel);
        if (!target) return halt(`zone "${step.targetZoneLabel}" not found`);
        // Same counting as place_asset: moving inside its own zone must not
        // count the object twice. A full zone skips the whole step - turning it
        // over and leaving it where it was would be half a move.
        const here = zoneContains(target, obj.x, obj.y) ? 1 : 0;
        const taken = occupancy(state, target) - here;
        const refusal = zoneRejects(target, 'asset', taken);
        if (refusal) return halt(refusal);
        const slots = zoneSlots(target);
        const pos = slots ? slots[Math.min(taken, slots.length - 1)] : zoneCenter(target);
        obj.x = pos.x;
        obj.y = pos.y;
      }

      Object.assign(obj, assetFace(obj, false));

      // Der Platz bindet die Stufe, nicht die Runde (M7). Der Index fiel in
      // `slotOrder` ohnehin an; bisher wurde er weggeworfen.
      //
      // Jedes Aufdecken bindet neu, statt die alte Tabelle zu ergänzen: was
      // zum vorigen Bösewicht gehörte, gilt für diesen nicht mehr - ein
      // stehengebliebenes $revealedTier wäre still falsch.
      const name = obj.label || obj.name || null;
      const labels = Array.isArray(zone.slotLabels) ? zone.slotLabels : null;
      const tier = String(labels?.[hit.slot] ?? '').trim();
      ctx.vars = {};
      if (name) {
        ctx.vars.revealed = name;
        ctx.vars.revealedBase = baseName(name);
      }
      ctx.vars.revealedSlot = String(hit.slot + 1);
      // Kein Name heißt kein Name: $revealedTier bleibt ungebunden und der
      // Schritt dahinter wird übersprungen, statt dass hier ein Index als
      // Stufe ausgegeben wird, den niemand so aufgeschrieben hat.
      if (tier) ctx.vars.revealedTier = tier;
      ctx.revealedLast = hit.slot === slotCount - 1;
      return state;
    }

    // Das Gegenstück zu `deal_to_zone` (Spec 11, Nachtrag): eine Zone wieder
    // leer machen. Ohne Ziel wird gelöscht, und das ist die gefährlichere
    // Hälfte - deshalb gilt der Schritt nur für das, was *in* der Zone liegt,
    // nie für den Anker, auf dem sie hängt. Diese Ausnahme kennt
    // `objectsInZone` bereits; hier wird sie nur nicht umgangen.
    case 'clear_zone': {
      const zone = findZone(zones, step.zoneLabel);
      if (!zone) return skip(`zone "${step.zoneLabel}" not found`);

      // M21.1: ein Stapel in der Zone ist ein Ding in der Zone. `objectsInZone`
      // liest `state.cards`, und die Karten eines Stapels liegen in
      // `stack.cards` - bis M21.1 konnte dort keiner entstehen, seither bildet
      // eine Zone mit `layout: 'stack'` am Tisch einen. Ohne diese Zeilen
      // ueberlebte die `Ablage` die Rundenwende still, und der naechste Kampf
      // fing mit dreizehn alten Aktionskarten an.
      //
      // **Aufgeloest, nicht uebersehen:** danach gilt jeder der drei Zweige
      // unten unveraendert. Und nur ein **namenloser** Haufen - ein benannter
      // Stapel (`Verhaltensdeck`, `Nachschub (Tante Emma)`) ist ein Ding fuer
      // sich und wird mit `remove_stack` entfernt. Das ist die Entscheidung,
      // die am `remove_stack`-Zweig schon steht.
      for (const pile of [...state.stacks]) {
        if (String(pile?.label ?? '').trim() || !zoneContains(zone, pile.x, pile.y)) continue;
        for (const c of pile.cards || []) state.cards.push({ ...c, x: pile.x, y: pile.y, inStack: null });
        state.stacks = state.stacks.filter(s => s !== pile);
      }

      // Eine leere Zone zu leeren ist gelungen, nicht gescheitert: der
      // gewünschte Zustand liegt schon vor. Anders als bei `reveal_next`, wo
      // "nichts da" heißt, dass die Absicht nicht erfüllt wurde. Sonst meldet
      // der erste Kampf einer frischen Partie zwei Fehlalarme.
      const inside = inSlotOrder(zone, objectsInZone(zone, state.cards, state.tokens));
      if (!inside.length) return state;

      // Gesperrt heißt gesperrt: `place_asset` und `move` verschieben ein
      // gesperrtes Objekt nicht, also räumt clear_zone es auch nicht weg -
      // das Schloss ausgerechnet gegen das Löschen wirkungslos zu machen wäre
      // die falsche Richtung.
      const locked = inside.filter(o => o.locked);
      let movable = inside.filter(o => !o.locked);
      const notes = locked.length ? [`left in place, locked: ${locked.map(objName).join(', ')}`] : [];

      // M15.1/AQ1: der Kategorienfilter. Gesetzt, raeumt der Schritt nur Karten
      // dieser Kategorien ab; alles andere bleibt liegen und steht mit Namen im
      // Protokoll. In Partie 7 hat dieser Schritt eine einzigartige
      // Ausruestungskarte unter den Dorf-Ereignis-Stapel geschoben (N1) - der
      // Aufbau weiss nicht, wohin eine fremde Karte gehoert, und still in einen
      // Nachziehstapel schieben ist von drei Moeglichkeiten die schlechteste.
      //
      // Die Kategorie steht **nicht** an der Tischkarte: `getGameState` und
      // `loadGameState` fuehren eine aufgezaehlte Feldliste ohne `category`.
      // Sie wird ueber `cardId` in der Bibliothek nachgeschlagen, derselben,
      // die `place_stack` liest - Tisch und Raum geben sie gleich mit.
      //
      // Ein Token ist keine Karte dieser Kategorien und bleibt darum auch
      // liegen. Das ist derselbe Satz, nur fuer die andere Sorte.
      const wantedCats = categoryList(step.category).map(norm);
      if (wantedCats.length) {
        const fits = (o) => kindOf(o) === 'card'
          && wantedCats.includes(norm(cards.find(c => String(c.id) === String(o.cardId))?.category));
        const foreign = movable.filter(o => !fits(o));
        movable = movable.filter(fits);
        if (foreign.length) {
          const named = categoryList(step.category).map(c => `"${c}"`).join(', ');
          notes.push(`left in place, not of category ${named}: ${foreign.map(objName).join(', ')}`);
        }
      }

      if (!movable.length) return fail(notes.join('; '));

      // Vermerke, die den Schritt nicht scheitern lassen: er tut, was er soll,
      // nur nicht ganz das, was dastand.
      const remarks = [];
      if (step.targetZoneLabel && step.targetStackLabel) {
        remarks.push(`stack "${step.targetStackLabel}" ignored: a zone and a stack were given, the zone wins`);
      }

      if (step.targetZoneLabel) {
        const target = findZone(zones, step.targetZoneLabel);
        if (!target) return skip(`zone "${step.targetZoneLabel}" not found`);

        const { refusal, leftovers, free } = moveIntoZone(state, movable, target);
        if (refusal) return skip(refusal);

        // Was nicht mitkommt, bleibt liegen und steht mit Namen im Protokoll -
        // stillschweigend verschwinden darf hier nichts.
        if (leftovers.length) {
          notes.push(`${leftovers.length} of ${movable.length} objects stayed in zone "${step.zoneLabel}": ${fullZones([target], free, kindOf(leftovers[0])).join('; ')} (${leftovers.map(objName).join(', ')})`);
        }
      } else if (step.targetStackLabel) {
        // M5.1: der Rückweg von `deal_to_zone` - die Auslage kommt *unter* den
        // Nachschubstapel, statt aus dem Spiel zu fliegen.
        const stack = idx.get(step.targetStackLabel);
        if (!stack) return skip(`stack "${step.targetStackLabel}" not found`);
        const left = returnToStack(state, movable, stack, step.faceDown);
        if (left.length) {
          notes.push(`${left.length} of ${movable.length} objects stayed in zone "${step.zoneLabel}": only cards go back into a stack (${left.map(objName).join(', ')})`);
        }
      } else {
        const gone = new Set(movable);
        state.cards = state.cards.filter(o => !gone.has(o));
        state.tokens = state.tokens.filter(o => !gone.has(o));
      }

      if (notes.length) return fail([...remarks, ...notes].join('; '));
      if (remarks.length) entry.reason = remarks.join('; ');
      return state;
    }

    // M17.4/M17.5 — was vom Tisch soll, egal wo es liegt.
    //
    // `clear_zone` raeumt eine Zone, `clear_grid` ein Raster. Was in keinem von
    // beidem liegt, erreichte bisher kein Schritt: die neunte Partie liess zwei
    // Boesewicht-Aktionskarten vor den Doerfler-Tableaus liegen (y 1440 und
    // 1760; die Ausruestungszonen beginnen bei 1808, die Handzonen enden bei
    // 1310) und drei beiseitegestellte Doerflerfiguren, die `clear_grid` nicht
    // sieht, weil sie nicht auf dem Raster stehen.
    //
    // **Zwei Felder, eine Frage.** `category` adressiert Karten ueber die
    // Bibliothek (wie bei `clear_zone`, die Kategorie steht nicht an der
    // Tischkarte), `assetName` ein benanntes Asset (wie bei `place_asset`).
    // Zusammen gilt die Vereinigung. Ein Pool schiede fuer die Figuren aus: die
    // Kategorie `Doerfler` enthaelt auch die Leistenplaettchen.
    //
    // **Ohne Angabe wird nichts geraeumt** - uebersprungen, mit Grund. Ein
    // Schritt, der bei leerem Feld den ganzen Tisch loescht, waere der
    // gefaehrlichste Tippfehler im Vokabular.
    case 'clear_table': {
      const wantedCats = categoryList(step.category).map(norm);
      const wantedAsset = norm(step.assetName);
      if (!wantedCats.length && !wantedAsset) return skip('no card category and no asset name given');

      // Karten in einem Stapel liegen in `stack.cards` und sind nicht gemeint:
      // der Stapel wird mit `remove_stack` entfernt, nicht Karte fuer Karte.
      const hits = [
        ...(wantedCats.length
          ? state.cards.filter(o => wantedCats.includes(norm(cards.find(c => String(c.id) === String(o.cardId))?.category)))
          : []),
        ...(wantedAsset
          ? [...state.tokens, ...state.boards].filter(o => norm(objName(o)) === wantedAsset
              || norm(assets.find(a => String(a.id) === String(o?.assetId))?.name) === wantedAsset)
          : []),
      ];

      // Nichts zu raeumen ist gelungen, nicht gescheitert: der gewuenschte
      // Zustand liegt schon vor (dieselbe Entscheidung wie bei `clear_zone`).
      if (!hits.length) return state;

      // Gesperrt heisst gesperrt - siehe den `clear_zone`-Zweig oben.
      const locked = hits.filter(o => o.locked);
      const movable = hits.filter(o => !o.locked);
      const notes = locked.length ? [`left in place, locked: ${locked.map(objName).join(', ')}`] : [];

      // BI/M19.3: mit Zielstapel wird nicht geloescht, sondern zurueckgelegt -
      // dieselben zwei Felder und dieselbe Funktion wie bei `clear_zone`. Ohne
      // `targetStackLabel` bleibt der Schritt Wort fuer Wort, was er war.
      //
      // Der Befund: eine Dorf-Ereigniskarte, die waehrend des Kampfes ihre
      // Handzone verlassen hatte, erreichte kein Schritt mehr. Loeschen waere
      // hier falsch gewesen - der Stapel bliebe auf 79 von 80.
      if (step.targetStackLabel) {
        const stack = idx.get(step.targetStackLabel);
        if (!stack) return skip(`stack "${step.targetStackLabel}" not found`);
        const left = returnToStack(state, movable, stack, step.faceDown);
        if (left.length) {
          notes.push(`${left.length} of ${movable.length} objects stayed on the table: only cards go back into a stack (${left.map(objName).join(', ')})`);
        }
      } else {
        const gone = new Set(movable);
        state.cards = state.cards.filter(o => !gone.has(o));
        state.tokens = state.tokens.filter(o => !gone.has(o));
        state.boards = state.boards.filter(o => !gone.has(o));
      }
      if (notes.length) return fail(notes.join('; '));
      return state;
    }

    // R2/M8.4: die „Wer ist dran?"-Leiste rueckt auf - oberstes Objekt nach
    // unten, der Rest einen Platz hoch (Regelwerk §7 Schritt 7).
    //
    // Gedreht werden die **Stellen der vorhandenen** Objekte, nicht die
    // Plaetze der Zone: die Leiste hat fuenf Plaetze, solo stehen drei Doerfler
    // darauf, und „nach unten" heisst ans Ende der drei. Die Reihenfolge kommt
    // aus `inSlotOrder` - dieselbe, die `reveal_next` liest; eine zweite
    // daneben waere eine zweite Antwort auf dieselbe Frage.
    case 'rotate_zone': {
      const zone = findZone(zones, step.zoneLabel);
      if (!zone) return skip(`zone "${step.zoneLabel ?? ''}" not found`);

      const inside = inSlotOrder(zone, objectsInZone(zone, state.cards, state.tokens));
      // Gesperrt heisst gesperrt (siehe `clear_zone`): wer festliegt, dreht
      // nicht mit, und die uebrigen drehen unter sich.
      const locked = inside.filter(o => o.locked);
      const movable = inside.filter(o => !o.locked);
      // Nichts oder eines zu drehen ist gelungen, nicht gescheitert - der
      // gewuenschte Zustand liegt schon vor (wie beim leeren `clear_zone`).
      if (movable.length > 1) {
        const spots = movable.map(o => ({ x: o.x, y: o.y }));
        movable.forEach((o, i) => {
          const spot = spots[(i + spots.length - 1) % spots.length];
          o.x = spot.x;
          o.y = spot.y;
        });
      }
      if (locked.length) return fail(`left in place, locked: ${locked.map(objName).join(', ')}`);
      return state;
    }

    // M7/T2: das Gegenstueck zu `clear_zone` fuer die Flaeche, auf der gekaempft
    // wird. Es loescht - was ueberleben soll (der besiegte Boesewicht in die
    // Trophaeenreihe), wird vorher mit `clear_zone` weggeraeumt.
    case 'clear_grid': {
      const grid = findGrid(grids, step.gridLabel);
      if (!grid) return skip(`grid "${step.gridLabel ?? ''}" not found`);

      // Ueber die Position, nicht ueber `gridId`: auch ein von Hand dorthin
      // gezogenes Objekt steht auf dem Raster und gehoert weg. `cellAt` ist die
      // Rechnung dafuer - eine zweite danebenzustellen waere eine zweite,
      // widersprechende Antwort auf dieselbe Frage.
      // Das Ankerobjekt bleibt: ein Brett, auf dem ein Raster haengt, steht
      // nicht *auf* ihm - dieselbe Ausnahme, die `objectsInZone` schon kennt.
      const anchorId = grid?.anchor?.assetId || null;
      const isAnchor = (o) => anchorId && (o?.assetId ?? o?.id) === anchorId;
      const on = [...state.cards, ...state.tokens].filter(o => !isAnchor(o) && cellAt(grid, o?.x, o?.y));

      // Ein leeres Raster zu leeren ist gelungen, nicht gescheitert: der
      // gewuenschte Zustand liegt schon vor (dieselbe Entscheidung wie bei
      // `clear_zone`).
      if (!on.length) return state;

      // Gesperrt heisst gesperrt - siehe den `clear_zone`-Zweig oben.
      const locked = on.filter(o => o.locked);
      let movable = on.filter(o => !o.locked);
      const notes = locked.length ? [`left in place, locked: ${locked.map(objName).join(', ')}`] : [];

      // M15.3/AR1: was verschont wird, wandert in eine Zielzone statt geloescht
      // zu werden. In Partie 7 war das Boesewicht-Plaettchen nach der Dorfphase
      // vom Tisch (N3): es stand auf dem Raster, nicht auf `Boesewicht-Platz`,
      // und `clear_grid` loescht. `pool` sagt, *was* verschont wird - ohne ihn
      // wanderten die Doerfler mit in die Trophaeenreihe.
      //
      // Die Kategorie steht nicht am Token, `assetId` schon - dieselbe Lage wie
      // bei den Karten in `clear_zone`.
      if (step.targetZoneLabel && step.pool) {
        const target = findZone(zones, step.targetZoneLabel);
        // Ein geratenes Ziel darf nicht loeschen: der Schritt wird ganz
        // uebersprungen, wie im `clear_zone`-Zweig.
        if (!target) return skip(`zone "${step.targetZoneLabel}" not found`);

        const spared = movable.filter(o => {
          const asset = assets.find(a => String(a.id) === String(o?.assetId));
          return norm(asset?.category) === norm(step.pool);
        });
        if (spared.length) {
          const { refusal, leftovers, free } = moveIntoZone(state, spared, target);
          if (refusal) return skip(refusal);
          // Was mitkommt *und* was liegenbleibt, wird nicht geloescht: ein
          // Boesewicht, der auf dem Weg in die Trophaeenreihe verschwindet,
          // waere schlimmer als einer, der im Weg steht.
          const stays = new Set(spared);
          movable = movable.filter(o => !stays.has(o));
          // Der Rasterplatz gehoert zum Raster: wer es verlaesst, verliert ihn,
          // sonst zieht `placeOnGrids` ihn beim naechsten Laden zurueck (M3b).
          for (const obj of spared) {
            if (leftovers.includes(obj)) continue;
            obj.gridId = null;
            obj.cell = null;
          }
          if (leftovers.length) {
            notes.push(`${leftovers.length} of ${spared.length} objects stayed on grid "${grid.label}": ${fullZones([target], free, kindOf(leftovers[0])).join('; ')} (${leftovers.map(objName).join(', ')})`);
          }
        }
      }

      const gone = new Set(movable);
      state.cards = state.cards.filter(o => !gone.has(o));
      state.tokens = state.tokens.filter(o => !gone.has(o));
      if (notes.length) return fail(notes.join('; '));
      return state;
    }

    // M7/T6: das Szenario des zuletzt aufgedeckten Boesewichts aufbauen.
    //
    // Der Schritt hat genau eine Einstellung. Das Raster steht in den Daten,
    // nicht am Schritt: es gehoert zu den abgetippten Feldnamen, und zwei
    // Quellen fuer dieselbe Adresse waeren eine Frage danach, welche gewinnt.
    case 'build_scenario': {
      const boss = ctx.vars?.revealedBase;
      // Dieselbe Regel wie bei jedem Platzhalter: nichts gebunden heisst
      // uebersprungen. Ein Rueckfall auf "irgendeinen" Eintrag waere geraten.
      if (!boss) return skip('$revealedBase is not bound - nothing has been revealed');

      const bosses = scenarioData?.bosses;
      // Der Schluessel ist der Basisname, und er wird wie jeder andere Name
      // hier verglichen: ohne Ruecksicht auf Gross- und Kleinschreibung.
      const key = bosses && typeof bosses === 'object'
        ? Object.keys(bosses).find(k => norm(k) === norm(boss))
        : undefined;
      if (key === undefined) return skip(`no scenario data for "${boss}"`);
      const entry = bosses[key];

      // „auto" heisst: Endkampf genau dann, wenn `reveal_next` vom **letzten**
      // Platz der Leiste genommen hat - nicht vom vierten und nicht aus einer
      // Rundenzahl. `true`/`false` ueberstimmen das.
      const useFinal = step.final === true || step.final === 'true' ? true
        : step.final === false || step.final === 'false' ? false
        : Boolean(ctx.revealedLast);
      // M20.1: die Entscheidung gilt ab hier fuer die ganze Folge. Ein Schritt
      // mit `onlyFinal` liest sie, statt die Rechnung oben zu wiederholen -
      // eine Frage, eine Antwort (M6).
      ctx.finalFight = useFinal;
      // `final` ist additiv: derselbe Eintrag, ein zusaetzlicher Abschnitt.
      const parts = [entry, useFinal ? entry?.final : null].filter(Boolean);

      // Erst pruefen, dann legen. Geprueft wird der **ganze** Eintrag, auch der
      // Endkampf-Abschnitt, den dieser Aufbau vielleicht gar nicht braucht: ein
      // Tippfehler dort faellt sonst erst im letzten Kampf der Partie auf, und
      // dann steht schon alles andere.
      const problems = validateScenarioData(
        { gridLabel: scenarioData?.gridLabel, bosses: { [key]: entry } },
        { assets, grids }
      );
      if (problems.length) return fail(problems.join('; '));

      const grid = findGrid(grids, scenarioData?.gridLabel);
      if (!grid) return fail(`grid "${scenarioData?.gridLabel ?? ''}" not found`);

      // Gebaut wird in eine eigene Liste, gelegt wird erst danach: ein halb
      // gestelltes Kampffeld ist schlimmer als ein leeres, weil man das leere
      // sieht. Die Pruefung oben schweigt ohne Asset-Bibliothek ("kann ich
      // nicht wissen"), darum faengt diese Schleife denselben Fall noch einmal.
      const tokens = [];
      const missing = [];
      // Vermerke: was gemeldet, aber nicht abgebrochen wird. `missing` bricht
      // vor dem ersten Objekt ab (ein Tippfehler in einer Feldadresse), die
      // Vermerke lassen liegen, was liegt - ein Teil ohne Rueckseite (M7.6) und
      // eine fehlende Gelaendekarte (M8.3) sind bekannte Normalfaelle.
      const notes = [];
      // M25.2/CE: die fehlenden Gelaendekarten stehen fuer sich - sie sind der
      // eine Vermerk, der **kein** Fehlschlag ist (M20.2: 34 von 62
      // Gelaendeassets haben keine Karte, durchweg Plaettchen, die erst im
      // Endkampf oder ueber eine Faehigkeit aufs Brett kommen).
      const absent = [];
      // Eintraege, die `assetToken` verweigert hat: ihre Karte gehoert nicht
      // daneben, denn das Teil liegt nicht (M7.6/M8.3 - eine falsche Karte ist
      // schlimmer als keine).
      const refused = new Set();
      for (const part of parts) {
        for (const t of (Array.isArray(part?.terrain) ? part.terrain : [])) {
          const asset = findAsset(assets, t?.assetName);
          if (!asset) { missing.push(`asset "${t?.assetName ?? ''}" not found`); continue; }
          for (const label of (Array.isArray(t?.cells) ? t.cells : [])) {
            // Dieselbe Rechnung wie im Raster-Zweig von `place_asset` (M7.1):
            // `E3:G4` zentriert auf die Mitte der sechs Felder und bekommt
            // deren Masse, `C7` ist der 1x1-Fall davon und behaelt die Groesse
            // seines Assets.
            // ... und seit M7.3 heisst ein Einzelfeld die **Mitte** des
            // Stuecks, wenn seine Groesse mehr als ein Feld sagt. Nicht wegen
            // der Doerfler - die kommen ueber `place_asset` auf den Tisch, aus
            // einem gebundenen `$D1` - sondern damit ein Gelaendeteil, das von
            // Hand angefasst wird, nicht auf eine andere Flaeche springt, als
            // der Aufbau ihm gegeben hat (Abnahme 4).
            const r = cellRange(grid, label, assetSize(asset));
            if (!cellRange(grid, label)) { missing.push(`grid "${grid.label}" has no field "${label}"`); continue; }
            if (!r) { missing.push(`"${t.assetName}" does not fit on grid "${grid.label}" at "${label}"`); continue; }
            // Je Feld ein eigenes Objekt. `place_asset` wuerde das vorhandene
            // verschieben - drei gleiche Plaettchen waeren dann eines, das
            // zweimal umzieht. Genau dafuer gibt es diesen Schritt.
            const { x, y } = rangeCenter(grid, r);
            // Die Seite steht am Eintrag, nicht am Asset - genau wie die
            // Drehung (M7.6). `assetToken` weigert sich, ein Teil ohne
            // Rueckseite verdeckt zu legen, und gibt `null` zurueck (Spec §6);
            // daraus wird hier ein Vermerk. Keine zweite Pruefung daneben: sie
            // waere eine zweite Antwort auf dieselbe Frage.
            const placed = assetToken(asset, x, y, t?.faceDown);
            if (!placed) {
              // `break`, nicht `continue`: die Weigerung haengt am Eintrag und
              // nicht am Feld - sonst stuende derselbe Satz je Feld einmal da.
              notes.push(`"${t.assetName}" has no back side and was not placed face down`);
              refused.add(`${norm(t?.assetName)}|${Boolean(t?.faceDown)}`);
              break;
            }
            const token = Object.assign(placed, {
              gridId: grid.id,
              cell: rangeLabel(grid, r),
              // Zwei Ausrichtungen sind zwei Gelaendeeintraege - die Drehung
              // steht am Eintrag, nicht am Asset, und gilt fuer alle seine
              // Felder (M7.1). Der Winkel ist hier schon geprueft.
              rotation: rotationOf(t?.rotation) ?? 0,
            });
            if (r.ranged) {
              const box = rangeBox(grid, r);
              token.width = box.width;
              token.height = box.height;
            }
            tokens.push(token);
          }
        }
      }
      if (missing.length) return fail(missing.join('; '));
      state.tokens.push(...tokens);

      // M8.3: je Gelaendeteil **eine** Karte, in die Reihe unter dem Hauptplan.
      //
      // Der Zonenname steht in den Daten, nicht im Code - genau wie das Raster
      // (M7): "Gelaendekarten" ist ein Townsfolk-Tussle-Begriff, und der Code
      // weiss nichts ueber Townsfolk Tussle. Ohne `cardZoneLabel` liegt keine
      // Karte, und die vorhandenen Szenarien laufen unveraendert weiter.
      //
      // Anders als beim Gelaende gilt hier **nicht** "erst pruefen, dann
      // legen": das Gelaende liegt schon. Eine fehlende Karte ist auch kein
      // Halbaufbau, sondern ein bekannter Normalfall (die Bundo-Koenigin hat
      // keine) - ein Abbruch dafuer liesse das ganze Kampffeld leer.
      const cardZone = String(scenarioData?.cardZoneLabel ?? '').trim();
      if (cardZone) {
        // Entdoppelt nach Assetname: zwei Holzzaeune auf dem Brett sind zwei
        // Plaettchen und *eine* Karte. Das gilt fuer zwei Felder eines
        // Eintrags genauso wie fuer zwei Eintraege desselben Zauns (zwei
        // Ausrichtungen, M7.1). Reihenfolge bleibt die der Szenariodaten.
        // Der Schluessel ist Name **und** Seite: dasselbe Plaettchen offen und
        // verdeckt sind zwei verschiedene Gelaende und damit zwei Karten
        // (M7.6). Zweimal dieselbe Seite bleibt eine.
        const wanted = [...new Map(parts
          .flatMap(p => (Array.isArray(p?.terrain) ? p.terrain : []))
          .map(t => [`${norm(t?.assetName)}|${Boolean(t?.faceDown)}`,
            { name: String(t?.assetName ?? '').trim(), down: Boolean(t?.faceDown) }]))]
          .filter(([key]) => !refused.has(key))
          .map(([, v]) => v);

        // Der Namensvergleich ist die ganze Zuordnung - dafuer tragen die
        // Karten seit M8.3 den Namen ihres Gelaendeteils. Kein
        // Aehnlichkeitsrechner: einer, der "SCHROTKARRE" auf "Schrottkarre"
        // zieht, zieht beim naechsten Deck etwas Falsches.
        // Ein Teil mit zwei Seiten heisst `Vorderseite / Rueckseite`, die Karte
        // traegt nur den vorderen Namen. Erst exakt vergleichen, dann gegen den
        // Teil vor dem Schraegstrich - zwei Versuche, kein dritter und kein
        // Aehnlichkeitsrechner.
        //
        // Welcher Teil gilt, sagt die Seite, auf der das Plaettchen liegt
        // (M7.6): offen der vor dem Schraegstrich, verdeckt der dahinter. Eine
        // Regel, zwei Richtungen - die Karte heisst wie der Teil des
        // Teilnamens, zu dem sie gehoert. Die Gegenprobe ist der Grund dafuer:
        // die Kochtopf-Karte neben eine offen liegende Doofster-Glocke zu
        // legen waere die Regel zu einem Gelaende, das gar nicht auf dem Tisch
        // liegt - schlimmer als keine Karte, weil eine falsche gelesen wird.
        const side = (name, down) => {
          const i = name.indexOf('/');
          return i < 0 ? null : (down ? name.slice(i + 1) : name.slice(0, i)).trim();
        };

        // Entdoppelt ein zweites Mal, nun nach *Karte*: erst der Schraegstrich
        // macht moeglich, dass zwei verschieden benannte Teile auf dieselbe
        // Karte zeigen. Dieselbe Regel wie bei zwei Holzzaeunen.
        const found = [];
        for (const { name, down } of wanted) {
          const part = side(name, down);
          const card = cards.find(c => norm(c.name) === norm(name))
            || (part ? cards.find(c => norm(c.name) === norm(part)) : null);
          // M25.2/CE: **das Plaettchen liegt** - nur seine Karte gibt es in
          // dieser Bibliothek nicht. Getrennt gesammelt, weil daraus kein
          // Fehlschlag wird, solange sonst nichts klemmt; der Wortlaut sagt
          // beides in einem Satz statt fuenfmal "no terrain card named X".
          if (!card) absent.push(name);
          else if (!found.includes(card)) found.push(card);
        }

        const zone = findZone(zones, cardZone);
        if (!zone) notes.push(`zone "${cardZone}" not found`);
        else if (found.length) {
          // Dieselbe Rechnung wie bei `draw_assets`: die Zone sagt, ob sie
          // Karten nimmt und wie viele, und verteilt sie der Reihe nach.
          const { usable, free, occupied, spots, problems } = zoneRoom(state, [zone], 'card');
          if (!usable.length) notes.push(...problems);
          else {
            const { groups, leftovers } = shareOut(found, usable, free);
            const group = groups.get(zone);
            const start = occupied.get(zone);
            group.forEach((card, i) => {
              const pos = spotFor(spots, zone, i, zoneSlot(zone, i, group.length), start);
              // Per Spread aus der Bibliothekszeile, nicht ueber eine
              // aufgezaehlte Feldliste - die hat hier schon zweimal
              // `width`/`height` verschluckt (Nachtrag zu M2.12, M4a).
              state.cards.push({
                ...card,
                tableId: crypto.randomUUID(),
                cardId: card.id,
                x: pos.x,
                y: pos.y,
                zIndex: start + i + 1,
                faceDown: false,
                face_up: true,
                rotation: 0,
              });
            });
            if (leftovers.length) {
              notes.push(`${leftovers.length} of ${found.length} terrain cards not placed: ${fullZones(usable, free, 'card').join('; ')}`);
            }
          }
        }
      }

      // Die benannten Felder binden - zusaetzlich zu dem, was `reveal_next`
      // gebunden hat, nicht anstelle davon: der folgende Schritt legt
      // `$revealed` auf `$B`. Ein String bindet den Schluessel allein, eine
      // Liste den Schluessel plus Position ab 1.
      for (const part of parts) {
        for (const [name, value] of Object.entries(part?.fields || {})) {
          if (Array.isArray(value)) value.forEach((cell, i) => { ctx.vars[`${name}${i + 1}`] = String(cell).trim(); });
          else ctx.vars[name] = String(value).trim();
        }
        // R4/Nachtrag zu M7.5: die Werte des Boesewichts (BEW, LEB) binden wie
        // ein einwertiges `fields`. Dieselbe Regel, ein zweiter Block - der
        // Code kennt `BEW` so wenig, wie er `B` kennt, und `set_counter` traegt
        // sie ein. Barry Bluffs Formel ist hier ein Text wie jeder andere; sie
        // bindet, und der Zaehlerschritt dahinter sagt, dass er sie nicht lesen
        // kann.
        for (const [name, value] of Object.entries(part?.stats || {})) {
          ctx.vars[name] = String(value).trim();
        }
      }
      // Die Platzhalter binden auch dann, wenn eine Gelaendekarte fehlte: der
      // Boesewicht kommt trotzdem auf sein Feld.
      //
      // M25.2/CE: steht ein echtes Problem dabei, bleibt es beim Fehlschlag -
      // und die fehlenden Karten stehen dahinter, damit nichts verschwindet.
      // Steht nur das da, ist der Schritt gelungen und sagt es trotzdem.
      const missingCards = absent.length
        ? `${absent.length} terrain tile${absent.length === 1 ? '' : 's'} on the table ${absent.length === 1 ? 'has' : 'have'} no terrain card in this library (nothing to do): ${absent.map(n => `"${n}"`).join(', ')}`
        : '';
      if (notes.length) return fail([...notes, missingCards].filter(Boolean).join('; '));
      return missingCards ? note(missingCards) : state;
    }

    // M4a: ein Zähler ist kein Asset – er hat kein Bild und keinen Vorrat, nur
    // Name, Wert und Stelle. Er wird immer neu angelegt (der Aufbau läuft gegen
    // einen leeren Tisch); ein zweiter Lauf legt darum einen zweiten an.
    case 'place_counter': {
      const name = String(step.name ?? '').trim();
      if (!name) return skip('no counter name given');
      // Leer ist keine 0: `Number('')` wäre 0 und legte den Zähler klammheimlich
      // in die Tischmitte, statt den fehlenden Wert zu melden.
      const coord = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
      const [x, y] = [coord(step.x), coord(step.y)];
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return skip(`no position given for counter "${name}"`);
      }
      // M11.4: `base` ist der Ausgangswert, auf den `set_counter value: "base"`
      // zurücksetzt. Er wird **nicht** aus `value` erfunden: ein Zähler ohne
      // Ausgangswert soll sich unverändert verhalten (Abnahme 3), und ein
      // stillschweigend gesetzter machte aus jedem Münztopf einen, den die
      // Dorfphase auf seinen Anfangsstand zurückdrehen könnte.
      state.counters.push(normalizeCounter({ name, value: step.value, max: step.max, base: step.base, x, y }));
      return state;
    }

    // R1: einen **vorhandenen** Zähler auf einen Wert setzen. `place_counter`
    // ist das Gegenstück und legt an; es kann das hier nicht halb, weil es
    // bedingungslos einen zweiten anlegt - nach vier Kämpfen lägen acht
    // Bösewichtwerte übereinander, und es gibt keinen Schritt, der sie
    // wieder wegnimmt.
    //
    // Die vier Lesarten von `value` stehen in `shared/counters.js`, damit der
    // Editor dieselbe Frage mit derselben Antwort stellen kann.
    case 'set_counter': {
      const name = String(step.name ?? '').trim();
      if (!name) return skip('no counter name given');
      const counter = state.counters.find(c => norm(c.name) === norm(name));
      if (!counter) return skip(`no counter named "${name}"`);
      // Gesperrt heißt gesperrt - dieselbe Regel wie bei `move`, `place_asset`
      // und `clear_zone`. Ein Schloss, das gegen das Zurücksetzen wirkungslos
      // wäre, wäre kein Schloss.
      if (counter.locked) return skip(`counter "${name}" is locked, not changing it`);
      const next = counterValue(counter, step.value);
      // Unlesbar heißt unangetastet: Barry Bluffs Werte stehen als Formel auf
      // dem Tableau, und eine geratene Zahl wäre schlimmer als keine.
      if (next === null) return skip(`counter "${name}": "${String(step.value ?? '').trim()}" is not a value it can take`);
      counter.value = next;
      return state;
    }

    case 'lock_asset':
    case 'unlock_asset': {
      const obj = findPlaced(state, findAsset(assets, step.assetName), step.assetName);
      if (!obj) return skip(`"${step.assetName}" is not on the table`);
      obj.locked = step.type === 'lock_asset';
      return state;
    }

    // M26.2: einen Doerfler gegen einen anderen tauschen. Alles Rechnen steht in
    // `swapVillager` oben; hier nur, was ein Schritt dem Protokoll schuldet.
    //
    // Gibt der Schritt einen Zustand zurueck, ist es die **Kopie**, an der er
    // gearbeitet hat - `skip`/`fail` geben den unberuehrten zurueck (alles oder
    // nichts). Ein Hinweis (`note`) heisst: getauscht, aber der Spieler sollte
    // etwas wissen - Georgies ungepruefte Werte, eine Karte, die in den Vorrat
    // gehen musste.
    case 'swap_villager':
    case 'seat_villager': {
      const r = (step.type === 'seat_villager' ? seatVillager : swapVillager)(state, step, allZones, allGrids, assets, cards, scenarioData, rng);
      if (r.skip) return skip(r.skip);
      if (r.fail) return fail(r.fail);
      // Wer jetzt wo sitzt, hat sich geaendert; die Schritte dahinter sehen es.
      ctx.seatVars = seatVars(r.state, assets, scenarioData?.villagers);
      if (r.notes.length) { entry.status = 'note'; entry.reason = r.notes.join('; '); }
      return r.state;
    }

    case 'move': {
      if (step.assetName) {
        const obj = findPlaced(state, findAsset(assets, step.assetName), step.assetName);
        if (!obj) return skip(`"${step.assetName}" is not on the table`);
        if (obj.locked) return skip(`"${step.assetName}" is locked, not moving it`);
        obj.x = step.x ?? obj.x;
        obj.y = step.y ?? obj.y;
        return state;
      }
      const stack = idx.get(step.stackLabel);
      if (!stack) return skip(`stack "${step.stackLabel}" not found`);
      stack.x = step.x ?? stack.x;
      stack.y = step.y ?? stack.y;
      return state;
    }

    default:
      return skip(`unknown step type "${step.type}"`);
  }
}
