"""Schritt 4c: der **Kachelrahmen** (Spec M28, "Wie gemessen wurde", 6 c).

Jede Platte hebt sich als Rechteck vom Boden ab. Fällt der Rahmen Kante für Kante auf den Kasten des Eintrags, ist
der Bereich richtig; ragt er hinaus oder ist der Kasten zur Hälfte leer, nicht. Das ist die Probe, die **trägt, wo die
Korrelation nichts hergibt** (Einfeldplättchen, Plättchen, die das Tableau neu zeichnet: M28.1 Zeilen 5, 14, 17 sind
"Sicht").

`blatt` legt zu jedem Plättchen eines Eintrags **den Ausschnitt des Tableaus** (mit einem halben Feld Rand, der Kasten des
Eintrags rot umrandet) **neben das Asset** (gedreht, wie der Eintrag es sagt, im selben Kasten eingepasst). Ein Mensch
sieht dann, ob beide dasselbe zeigen. `zoom` vergrößert einen Ausschnitt um den Faktor 3 und **zeichnet die Achsen aus
demselben Raster**, das die Zahlen liefert - "Beschriftung vor Augenmaß": bei einem Ausschnitt, den ich von Hand
beschriftet hatte, habe ich einmal einen Fehler gesehen, der keiner war (Ernies linker Zaun steht in G, nicht in H).

Aufruf:
    py kachelblatt.py blatt "Ernie Offal"                 # sheet_Ernie_Offal.png, alle Plättchen
    py kachelblatt.py blatt "Virginia Fitz" Auslöser      # nur Plättchen, deren Beschriftung "Auslöser" enthält
    py kachelblatt.py zoom Ernie_Offal K7:L8 zoom.png G7:G10   # Ausschnitt K7:L8 (+1 Feld), grün umrandet G7:G10
    py kachelblatt.py blatt "Virginia Fitz" --scenario ziel.json   # mit den Daten nach M28 statt denen im Export
"""
import cv2
import numpy as np

import gemeinsam as g
from gemeinsam import CW, LET


def asset_kasten(asset, grad, w, h):
    im = g.drehe(g.lade_asset(*asset), grad)
    ih, iw = im.shape[:2]
    s = min(w / iw, h / ih)
    nw, nh = max(2, int(iw * s)), max(2, int(ih * s))
    t = cv2.resize(im, (nw, nh), interpolation=cv2.INTER_AREA)
    leinwand = np.full((h, w, 3), 128, np.uint8)
    ox, oy = (w - nw) // 2, (h - nh) // 2
    leinwand[oy:oy + nh, ox:ox + nw] = t
    return leinwand


def paar(img, asset, grad, zelle, m=0.5, maxd=300, label=''):
    c0, r0, c1, r1 = g.rng(zelle)
    x0, y0 = int((c0 - m) * CW), int((r0 - m) * CW)
    x1, y1 = int((c1 + 1 + m) * CW), int((r1 + 1 + m) * CW)
    pad = cv2.copyMakeBorder(img, CW, CW, CW, CW, cv2.BORDER_CONSTANT, value=(60, 60, 60))
    ausschnitt = pad[y0 + CW:y1 + CW, x0 + CW:x1 + CW].copy()
    bw, bh = (c1 - c0 + 1) * CW, (r1 - r0 + 1) * CW
    mx, my = int(m * CW), int(m * CW)
    ren = np.full_like(ausschnitt, 60)
    ren[my:my + bh, mx:mx + bw] = asset_kasten(asset, grad, bw, bh)
    for im_ in (ausschnitt, ren):
        cv2.rectangle(im_, (mx, my), (mx + bw, my + bh), (0, 0, 255), 1)
    p = np.hstack([ausschnitt, np.full((ausschnitt.shape[0], 6, 3), 255, np.uint8), ren])
    s = min(1.0, 2 * maxd / p.shape[1], maxd / p.shape[0] * 1.2)
    p = cv2.resize(p, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    leiste = np.zeros((16, p.shape[1], 3), np.uint8)
    cv2.putText(leiste, label[:60], (2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
    return np.vstack([leiste, p])


def blatt(boss, sc, aus, nur=None, spalten=2):
    img = g.lies_rect(g.fname(boss), grau=False)
    e = sc['bosses'][boss]
    items = []
    for pn, teil in [('', e)] + ([('F ', e['final'])] if 'final' in e else []):
        for t in teil.get('terrain', []):
            for zelle in t['cells']:
                lab = '%s%s %s r%s%s' % (pn, t['assetName'].split('/')[0].strip()[:22], zelle, t.get('rotation', 0), ' DOWN' if t.get('faceDown') else '')
                if nur and not any(o in lab for o in nur):
                    continue
                items.append(paar(img, (t['assetName'], bool(t.get('faceDown'))), t.get('rotation', 0), zelle, label=lab))
    if not items:
        raise SystemExit('kein Plättchen gefunden')
    zeilen = []
    for i in range(0, len(items), spalten):
        row = items[i:i + spalten]
        hh = max(r.shape[0] for r in row)
        row = [cv2.copyMakeBorder(r, 0, hh - r.shape[0], 0, 12, cv2.BORDER_CONSTANT, value=(0, 0, 0)) for r in row]
        zeilen.append(np.hstack(row))
    ww = max(r.shape[1] for r in zeilen)
    zeilen = [cv2.copyMakeBorder(r, 0, 6, 0, ww - r.shape[1], cv2.BORDER_CONSTANT, value=(0, 0, 0)) for r in zeilen]
    cv2.imwrite(aus, np.vstack(zeilen))
    print('%d Plättchen -> %s' % (len(items), aus))


def zoom(name, zelle, aus, m=1, sc_=3, kaesten=()):
    im = g.lies_rect(name, grau=False)
    c0, r0, c1, r1 = g.rng(zelle)
    c0m, r0m, c1m, r1m = max(0, c0 - m), max(0, r0 - m), min(18, c1 + m), min(13, r1 + m)
    x0, y0, x1, y1 = c0m * CW, r0m * CW, (c1m + 1) * CW, (r1m + 1) * CW
    c = cv2.resize(im[y0:y1, x0:x1], None, fx=sc_, fy=sc_, interpolation=cv2.INTER_CUBIC)
    for i in range(c0m, c1m + 2):
        x = (i * CW - x0) * sc_
        cv2.line(c, (x, 0), (x, c.shape[0]), (0, 0, 255), 1)
        if i <= c1m:
            cv2.putText(c, LET[i], (x + 4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    for j in range(r0m, r1m + 2):
        y = (j * CW - y0) * sc_
        cv2.line(c, (0, y), (c.shape[1], y), (0, 0, 255), 1)
        if j <= r1m:
            cv2.putText(c, str(j + 1), (4, y + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    for bc in kaesten:
        a0, b0, a1, b1 = g.rng(bc)
        cv2.rectangle(c, ((a0 * CW - x0) * sc_ + 3, (b0 * CW - y0) * sc_ + 3), (((a1 + 1) * CW - x0) * sc_ - 3, ((b1 + 1) * CW - y0) * sc_ - 3), (0, 255, 0), 2)
    cv2.imwrite(aus, c)
    print('%s %s -> %s' % (name, zelle, aus))


def main():
    p = g.parser(__doc__)
    p.add_argument('befehl', choices=['blatt', 'zoom'])
    p.add_argument('args', nargs='*')
    p.add_argument('--scenario', help='anderes scenario_data (JSON) statt dem aus dem Export')
    a = p.parse_args()
    g.start(a)
    if a.befehl == 'blatt':
        boss = a.args[0]
        blatt(boss, g.lade_szenario(a.scenario), g.pfad('sheet_%s.png' % g.fname(boss)), nur=a.args[1:] or None)
    else:
        zoom(a.args[0], a.args[1], a.args[2], kaesten=a.args[3:])


if __name__ == '__main__':
    main()
