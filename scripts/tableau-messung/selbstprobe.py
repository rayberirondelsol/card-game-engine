"""Die Selbstprobe der Tableau-Messung (Spec M28 / Aufgabe DJ) - **von Hand**, kein Teil von `npm test`.

Auf dem **sauberen Tableau *Ms. Falls & Co.*** (Artwork, 1500 x 3000, keine Perspektive) müssen **die fünf T und das R
auf den Feldern liegen, die die Daten nennen**; sonst ist das Werkzeug kaputt (oder die Daten sind es - dann steht es in
der Ausgabe). Geprüft wird:

  1. das Tableau wird geholt (nur dieses eines, ohne Gelände) und entzerrt,
  2. der Restfehler der Linienanpassung ist **höchstens 0,06 Feld** (M28 maß 0,015-0,057 über alle elf),
  3. **genau fünf T**, jedes auf einer **Feldmitte** (Abweichung höchstens 0,10; M28: 0,078) und mit Korrelation
     **mindestens 0,80** (M28: 0,86-1,00), und **sie sind die fünf Felder von `fields.D`**,
  4. **genau ein R** auf einem **Rasterkreuz** (Abweichung höchstens 0,10; M28: 0,062), und `fields.B` ist der 2 x 2 -
     Bereich um dieses Kreuz.

*Ehrlich gesagt:* die beiden Schablonen werden aus **diesem** Bild geschnitten (T bei G7, R beim Kreuz K|L, 8|9); diese zwei
Treffer sind darum trivial 1,00. Was die Probe wirklich prüft, sind die **anderen vier T** (sie liegen woanders im Bild und
beweisen, dass das Raster stimmt und die Entzerrung nichts verzieht) und dass **Daten und Bild übereinstimmen**.

Aufruf (aus `scripts/tableau-messung/`, mit einem `export.json` im Arbeitsverzeichnis, siehe `export.js`):
    py selbstprobe.py
    py selbstprobe.py --arbeit /pfad/zum/arbeitsverzeichnis
Rückgabe 0 = bestanden, 1 = nicht.
"""
import os
import sys

import gemeinsam as g
import entzerren
import holen
import spielsteine

BOSS = 'Ms. Falls & Co.'
NAME = g.fname(BOSS)
RMS_MAX = 0.06
ABWEICHUNG_MAX = 0.10
KORRELATION_MIN = 0.80


def main():
    p = g.parser(__doc__)
    a = p.parse_args()
    g.start(a)
    fehler = []

    sc, assets = g.lade_export()
    e = sc['bosses'][BOSS]

    # 1. holen und entzerren (nur, was fehlt)
    t = assets.get('Tableau: ' + BOSS)
    if not t:
        sys.exit('im Export fehlt "Tableau: %s"' % BOSS)
    holen.hole(t['back_image_path'], g.pfad('tab', '%s_back.png' % NAME))
    os.makedirs(g.pfad('rect'), exist_ok=True)
    os.makedirs(g.pfad('rm'), exist_ok=True)
    r, _ = entzerren.entzerre(NAME, dict(g.BEKANNTER_VERSATZ))
    rms = r['rms_px'] / g.CW
    print('Entzerrung: Schnittpunkte %d/%d, RMS %.3f Feld (höchstens %.2f)' % (r['inliers'], r['n'], rms, RMS_MAX))
    if rms > RMS_MAX:
        fehler.append('Restfehler %.3f Feld' % rms)

    # 2. die Spielsteine
    treffer = spielsteine.finde(NAME)
    ts = sorted(treffer['T'], key=lambda q: (q[1], q[0]))
    rs = treffer['R']
    print('gefunden: %d T, %d R' % (len(ts), len(rs)))
    if len(ts) != 5:
        fehler.append('%d T statt 5' % len(ts))
    if len(rs) < 1:
        fehler.append('kein R')
    gemessen = []
    for x, y, s in ts:
        abw = max(abs(x - (int(x) + 0.5)), abs(y - (int(y) + 0.5)))
        gemessen.append(spielsteine.feldname(x, y))
        print('  T %-4s (%.2f|%.2f) Abweichung von der Feldmitte %.3f, Korrelation %.2f' % (gemessen[-1], x, y, abw, s))
        if abw > ABWEICHUNG_MAX:
            fehler.append('T %s: %.3f Feld neben der Feldmitte' % (gemessen[-1], abw))
        if s < KORRELATION_MIN:
            fehler.append('T %s: Korrelation %.2f' % (gemessen[-1], s))
    if sorted(gemessen) != sorted(e['fields']['D']):
        fehler.append('T auf %s, die Daten nennen %s' % (sorted(gemessen), sorted(e['fields']['D'])))
    if rs:
        x, y, s = rs[0]
        kx, ky = round(x), round(y)
        abw = max(abs(x - kx), abs(y - ky))
        b = g.LET[kx - 1] + str(ky) + ':' + g.LET[kx] + str(ky + 1)
        print('  R Kreuz %.2f|%.2f -> B %s (Daten: %s), Abweichung %.3f, Korrelation %.2f' % (x, y, b, e['fields']['B'], abw, s))
        if b != e['fields']['B']:
            fehler.append('R liegt bei B %s, die Daten nennen %s' % (b, e['fields']['B']))
        if abw > ABWEICHUNG_MAX:
            fehler.append('R: %.3f Feld neben dem Kreuz' % abw)
        if s < KORRELATION_MIN:
            fehler.append('R: Korrelation %.2f' % s)

    if fehler:
        print('SELBSTPROBE NICHT BESTANDEN:')
        for f in fehler:
            print('  - ' + f)
        return 1
    print('Selbstprobe bestanden: fünf T und ein R liegen auf den Feldern der Daten.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
