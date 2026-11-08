"""Schritt 4a: Geländeplättchen - das Asset-Foto in vier Drehungen gegen das Tableau
(Spec M28, "Wie gemessen wurde", 6 a).

Das Asset wird **im Uhrzeigersinn** gedreht (wie `rotate(..deg)` am Tisch) und in den Kasten des Eintrags
eingepasst wie `object-fit: contain` (bei 90/270 tauschen Breite und Höhe, das Bild liegt quer im Kasten).
Dann die normierte Kreuzkorrelation (`TM_CCOEFF_NORMED`) nach Hochpass **sigma 5**, mit **+-3 px Spiel** am Feld
(`score(..., ROI-Mitte +-3 px)`) und **+-3 Feldern Suche** für die globale beste Lage.

**Grenze (M28): Werte unter etwa 0,2 tragen nichts.** Das Asset ist ein *Foto* der Pappkachel, das Tableau eine
*Illustration*; bei Einfeldplättchen und Plättchen, die das Tableau neu zeichnet, reicht die Korrelation nicht
(Zeilen 5, 14, 17 und das Maisfeld in 7 sind darum nur "Sicht", 6 b-d). Gelesen wird der **Abstand zur
zweitbesten Drehung**: sicher heißt >= 0,20 **und** >= 0,10 Abstand (`quadratisch`).

Unterbefehle:
    py plaettchen_asset.py eintrag "Virginia Fitz"          # jedes Plättchen eines Eintrags: vier Drehungen am Eintrag,
                                                            # beste Drehung, beste Lage in +-3 Feldern
    py plaettchen_asset.py hypothese Virginia_Fitz M9:S12 "Dichter Wald" "Dichter Wald 2"
                                                            # Tabelle Asset x Drehung an einem Feld
    py plaettchen_asset.py behauptungen                     # die Tabelle hinter M28.1 (Zeilen 3-21), siehe BEHAUPTUNGEN
    py plaettchen_asset.py quadratisch                      # Z4: quadratische Plättchen, deren Drehung abweicht

Die Zahlen sind **die eines Werkzeugs, nicht die aus `szenariodaten-grundspiel.md` §11** - ein anderes Verfahren
(andere Vorlage, andere Entzerrung) misst andere Absolutwerte; das Urteil war in 21 von 22 Fällen dasselbe.
"""
import sys

import cv2
import numpy as np

import gemeinsam as g
from gemeinsam import CW

PAD = 4 * CW
FA = 'Marodes Farmhaus / Marodes Farmhaus (gedeckter Tisch)'
ROTATIONEN = (0, 90, 180, 270)


def schablone(asset, grad, w, h):
    """(Graubild, ox, oy): das Asset gedreht und in `w x h` eingepasst (`contain`), mittig."""
    im = g.drehe(g.lade_asset(*asset), grad)
    ih, iw = im.shape[:2]
    s = min(w / iw, h / ih)
    nw, nh = max(2, int(round(iw * s))), max(2, int(round(ih * s)))
    t = cv2.resize(im, (nw, nh), interpolation=cv2.INTER_AREA)
    return cv2.cvtColor(t, cv2.COLOR_BGR2GRAY), (w - nw) // 2, (h - nh) // 2


def aufgefuellt(name):
    """Das entzerrte Tableau mit einem Rand von 4 Feldern, hochpassgefiltert (sigma 5)."""
    grau = g.lies_rect(name)
    grau = cv2.copyMakeBorder(grau, PAD, PAD, PAD, PAD, cv2.BORDER_CONSTANT, value=int(grau.mean()))
    return g.hp(grau, 5)


def score(bild, asset, grad, c0, r0, c1, r1, search=3):
    """`(am Eintrag, global, dx, dy)`: Korrelation am Feld (+-3 px) und beste Lage in +-`search` Feldern."""
    w = (c1 - c0 + 1) * CW
    h = (r1 - r0 + 1) * CW
    t, ox, oy = schablone(asset, grad, w, h)
    th = g.hp(t, 5)
    X0 = c0 * CW + PAD - search * CW + ox
    Y0 = r0 * CW + PAD - search * CW + oy
    roi = bild[Y0:Y0 + h + 2 * search * CW - 2 * oy, X0:X0 + w + 2 * search * CW - 2 * ox]
    if roi.shape[0] <= th.shape[0] or roi.shape[1] <= th.shape[1]:
        return None
    res = cv2.matchTemplate(roi, th, cv2.TM_CCOEFF_NORMED)
    cy = search * CW
    cx = search * CW
    am = res[max(0, cy - 3):cy + 4, max(0, cx - 3):cx + 4].max()
    by, bx = np.unravel_index(res.argmax(), res.shape)
    return float(am), float(res.max()), (bx - cx) / CW, (by - cy) / CW


def eintrag(boss, sc):
    name = g.fname(boss)
    bild = aufgefuellt(name)
    e = sc['bosses'][boss]
    teile = [('main', e)] + ([('final', e['final'])] if 'final' in e else [])
    for pn, teil in teile:
        for t in teil.get('terrain', []):
            for zelle in t['cells']:
                c0, r0, c1, r1 = g.rng(zelle)
                allr = {r: score(bild, (t['assetName'], bool(t.get('faceDown'))), r, c0, r0, c1, r1) for r in ROTATIONEN}
                if any(v is None for v in allr.values()):
                    print('%-5s %-34s %-9s außerhalb des Bildes' % (pn, t['assetName'][:34], zelle))
                    continue
                aktuell = t.get('rotation', 0)
                beste = max(allr, key=lambda r: allr[r][0])
                glob_ = max(allr, key=lambda r: allr[r][1])
                print('%-5s %-34s %-9s Eintrag %3d | am Eintrag: %s | beste am Eintrag %d (%.2f) | global beste %d %.2f Lage (%+.2f,%+.2f)'
                      % (pn, t['assetName'][:34], zelle, aktuell, ' '.join('%d:%.2f' % (r, allr[r][0]) for r in allr), beste, allr[beste][0], glob_, allr[glob_][1], allr[glob_][2], allr[glob_][3]))


def hypothese(tableau, zelle, assets, hinten=False):
    bild = aufgefuellt(tableau)
    c0, r0, c1, r1 = g.rng(zelle)
    zeile = []
    for a in assets:
        for r in ROTATIONEN:
            zeile.append('%s r%d: %.2f' % (a, r, score(bild, (a, hinten), r, c0, r0, c1, r1, search=1)[0]))
    print('%-18s %-8s %s' % (tableau, zelle, ' | '.join(zeile)))


# Die Tabelle hinter M28.1: (Kürzel, Tableau, Asset, hinten, Bezeichnung, [(Feld, Drehung)...]).
# Der erste Eintrag je Zeile ist der Stand **vor** M28, die folgenden die behaupteten Berichtigungen.
BEHAUPTUNGEN = [
    ('Ernie', 'Ernie_Offal', 'Foodtruck', False, 'Foodtruck', [('I1:L3', 0), ('I1:M3', 0), ('J1:M3', 0), ('H1:L3', 0)]),
    ('Ernie', 'Ernie_Offal', 'Altes Fass / Altes Fass (leer)', False, 'Fass', [('M3', 0), ('N3', 0), ('M3', 180), ('N3', 180), ('N3', 90), ('N3', 270)]),
    ('Ernie', 'Ernie_Offal', 'Doofster-Glocke / Kochtopf', True, 'Kochtopf', [('J7:K8', 0), ('K7:L8', 0), ('K7:L8', 90), ('K7:L8', 180), ('K7:L8', 270), ('J7:K8', 270)]),
    ('Ernie', 'Ernie_Offal', 'Holzzaun', False, 'Zaun links', [('G7:G10', 90), ('G7:G10', 270), ('H7:H10', 90), ('H7:H10', 270)]),
    ('Ernie', 'Ernie_Offal', 'Holzzaun', False, 'Zaun rechts', [('N7:N10', 90), ('N7:N10', 270), ('O7:O10', 90), ('O7:O10', 270), ('P7:P10', 90)]),
    ('Ernie', 'Ernie_Offal', 'Überwuchertes Maisfeld', False, 'Mais', [('J11:N13', 0), ('K11:O13', 0), ('K11:O13', 180)]),
    ('Virginia', 'Virginia_Fitz', 'Werkzeugschuppen / Werkzeugschuppen (offen)', False, 'Schuppen', [('C1:E2', 90), ('C1:E2', 270), ('C1:E2', 0), ('C1:E2', 180)]),
    ('Bundits', 'The_Bundits', FA, False, 'Farmhaus', [('P4:S8', 90), ('P4:S8', 270), ('P4:S8', 0), ('P4:S8', 180)]),
    ('Bundits', 'The_Bundits', 'Holzzaun', False, 'Zaun L', [('L10:L13', 90), ('L10:L13', 270), ('L9:L12', 90), ('L9:L12', 270)]),
    ('Bundits', 'The_Bundits', 'Holzzaun', False, 'Zaun P', [('P10:P13', 90), ('P10:P13', 270), ('P9:P12', 90), ('P9:P12', 270)]),
    ('Barry', 'Barry_Bluff', 'Trüber Fluss', False, 'Fluss', [('L1:M12', 90), ('L1:M12', 270)]),
    ('Falls', 'Ms_Falls_and_Co', FA, False, 'Farmhaus', [('G3:K6', 0), ('G3:K6', 180)]),
    ('Falls', 'Ms_Falls_and_Co', 'Wäscheleine', False, 'Wäscheleine (Z1)', [('D4:D7', 0), ('D4:D7', 90), ('D4:D7', 180), ('D4:D7', 270)]),
    ('DK', 'The_Door_Knockers', FA, False, 'Farmhaus', [('G5:K8', 0), ('G5:K8', 180)]),
    ('DK', 'The_Door_Knockers', 'Dichter Wald 2', False, 'Wald2 rechts', [('M1:S4', 0), ('M1:S4', 180)]),
    ('DK', 'The_Door_Knockers', 'Dichter Wald', False, 'Wald rechts', [('M1:S4', 0), ('M1:S4', 180)]),
    ('Patches', 'Patches', FA, False, 'Farmhaus', [('C11:G14', 0), ('C11:G14', 180)]),
]


def behauptungen():
    cache = {}
    for boss, tab, asset, hinten, lab, hs in BEHAUPTUNGEN:
        if tab not in cache:
            cache[tab] = aufgefuellt(tab)
        werte = []
        for zelle, r in hs:
            c0, r0, c1, r1 = g.rng(zelle)
            werte.append('%s r%d: %.2f' % (zelle, r, score(cache[tab], (asset, hinten), r, c0, r0, c1, r1, search=1)[0]))
        print('%-9s %-18s' % (boss, lab), ' | '.join(werte))


def quadratisch(sc, korrektur=None):
    """Z4: Plättchen mit etwa quadratischem Bereich und mindestens zwei Feldern, deren beste Drehung vom Eintrag abweicht.
    `korrektur` ersetzt Felder von Einträgen, die M28 verschiebt (z. B. Ernies Fass N3 statt M3)."""
    korrektur = korrektur or {}
    zeilen = []
    for boss in g.ELF:
        bild = aufgefuellt(g.fname(boss))
        e = sc['bosses'][boss]
        for pn, teil in [('main', e)] + ([('final', e['final'])] if 'final' in e else []):
            for t in teil.get('terrain', []):
                for zelle in t['cells']:
                    zelle2 = korrektur.get((boss, t['assetName'], zelle), zelle)
                    c0, r0, c1, r1 = g.rng(zelle2)
                    w, h = c1 - c0 + 1, r1 - r0 + 1
                    if not (0.75 <= w / h <= 1.34) or w * h < 2:
                        continue
                    s = [score(bild, (t['assetName'], bool(t.get('faceDown'))), r, c0, r0, c1, r1, search=1)[0] for r in ROTATIONEN]
                    order = np.argsort(s)[::-1]
                    zeilen.append((boss, t['assetName'].split('/')[0].strip()[:24], zelle2, t.get('rotation', 0), int(order[0]) * 90, round(s[order[0]], 2), round(s[order[1]], 2), [round(x, 2) for x in s]))
    sicher = [r for r in zeilen if r[5] >= 0.2 and r[5] - r[6] >= 0.1]
    print('quadratische Plättchen (>= 2 Felder):', len(zeilen), ' sicher gemessen (>= 0,20 und Abstand >= 0,10):', len(sicher))
    for r in zeilen:
        print('%-16s %-24s %-9s Eintrag r%-3d beste r%-3d %.2f (2.: %.2f) %s %s' % (r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], '  <-- gedreht' if r[4] != r[3] and r in sicher else ('' if r[4] == r[3] else '  (unsicher)')))


def main():
    p = g.parser(__doc__)
    p.add_argument('befehl', choices=['eintrag', 'hypothese', 'behauptungen', 'quadratisch'])
    p.add_argument('args', nargs='*')
    a = p.parse_args()
    g.start(a)
    sc, _ = g.lade_export()
    if a.befehl == 'eintrag':
        eintrag(a.args[0], sc)
    elif a.befehl == 'hypothese':
        hypothese(a.args[0], a.args[1], a.args[2:] or ['Dichter Wald', 'Dichter Wald 2'])
    elif a.befehl == 'behauptungen':
        behauptungen()
    else:
        quadratisch(sc, {('Ernie Offal', 'Altes Fass / Altes Fass (leer)', 'M3:M3'): 'N3', ('Ernie Offal', 'Altes Fass / Altes Fass (leer)', 'M3'): 'N3',
                         ('Ernie Offal', 'Doofster-Glocke / Kochtopf', 'J7:K8'): 'K7:L8'})


if __name__ == '__main__':
    main()
