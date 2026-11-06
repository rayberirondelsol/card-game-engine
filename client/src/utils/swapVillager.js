/**
 * M26.2 — einen Dörfler am Tableau austauschen: was das Menü entscheidet.
 *
 * Getan wird es vom Executor (`swap_villager`, `shared/sequenceExecutor.js`);
 * das Menü am Tableau **rechnet nichts**. Es schreibt eine Aktion aus drei
 * Schritten, und `runSetupAction` führt sie aus – dieselbe Maschinerie wie die
 * Aktionen in der Kopfleiste, mit derselben Rückfrage („Trotzdem", M19.5) und
 * derselben Meldeleiste. Es gibt keinen zweiten Weg, einen Schritt am Tisch
 * auszuführen (dasselbe Muster wie `revealPlan`, M8.9).
 *
 * Reine Logik, keine React-Abhängigkeit: der Client hat keine
 * Testinfrastruktur, geprüft wird das aus `server/test/swap-villager.test.js`.
 */
import { seatedVillagers, hasVillagers, counterName, STATS } from '../../../shared/villagers.js';

/**
 * Wer an diesem Tableau sitzt und wer zur Wahl steht, oder `null`, wenn das
 * Stück kein Tableau eines Platzes ist (oder das Setup keine Dörferdaten hat).
 *
 * Zur Wahl stehen die Dörfler der Daten, die **nicht** am Tisch sitzen: zwei
 * Henlos gibt es nicht, und der Executor wiese es ohnehin ab. Ein Eintrag, der
 * nur eine Fehlermeldung auslöste, wäre ein Knopf, der nichts tut
 * (`docs/audit-dead-controls.md`).
 *
 * @param {object} villagers  `scenario_data.villagers`
 * @param {Array}  tokens     die Token am Tisch
 * @param {Array}  assets     `table_assets` (Namen und Ids)
 * @param {string} tokenId    das angeklickte Token
 */
export function swapChoices(villagers, tokens, assets, tokenId) {
  if (!hasVillagers(villagers)) return null;
  const seated = seatedVillagers({ tokens: Array.isArray(tokens) ? tokens : [] }, assets, villagers);
  const here = seated.find(s => s.token.id === tokenId);
  if (!here?.data) return null;
  const taken = new Set(seated.map(s => s.data?.name).filter(Boolean));
  return {
    seat: here.n,
    current: here.data.name,
    choices: Object.keys(villagers.roster).filter(name => !taken.has(name)),
  };
}

/**
 * Die Aktion für „Platz `seat`: `current` gegen `villager`".
 *
 * Drei Schritte, in dieser Reihenfolge (docs/tasks-doerfler.md, Entscheidung 3):
 *
 * 1. **Läuft ein Kampf, gesperrt** (`require_zone`, wie M9.3): Feld, Figur und
 *    Zugreihenfolge gehören zum Kampf, und es gibt keine Antwort, die ein
 *    „Trotzdem" sinnvoll machte.
 * 2. **Hat der Dörfler schon gespielt, gewarnt** (`require_counter … atStart`
 *    mit `confirm`, wie M19.5): ein Tausch in Runde 3 löscht erspielte Werte,
 *    aber der Tisch kann nicht wissen, ob das gewollt ist.
 * 3. Der Tausch.
 *
 * Der Aufrufer hat `swapChoices` gefragt, `current` ist also ein Dörfler der
 * Daten.
 */
export function swapAction(villagers, seat, current, villager) {
  const old = villagers?.roster?.[current];
  return {
    id: `swap-villager-${seat}`,
    label: `Swap ${current} → ${villager}`,
    steps: [
      {
        type: 'require_zone',
        zoneLabel: villagers?.fightZone,
        expect: 'empty',
        message: 'Erst den Kampf beenden — mitten im Kampf wird kein Dörfler getauscht.',
      },
      {
        type: 'require_counter',
        name: STATS.map(st => counterName(old, st.key)),
        atStart: true,
        confirm: true,
        message: `${current} hat schon gespielt: seine Zähler stehen nicht mehr auf den Startwerten. `
          + `Tauschen löscht sie und setzt ${villager} auf seine Startwerte.`,
      },
      { type: 'swap_villager', seat, villager },
    ],
  };
}
