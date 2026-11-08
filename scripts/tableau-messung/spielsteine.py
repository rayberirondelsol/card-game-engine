"""Schritt 3: Bösewicht und Dörfler an den Spielsteinen messen - **unabhängig von den Linien**
(Spec M28, "Wie gemessen wurde", 5), und die FF-Kästen des Endkampfs.

Auf jedem Tableau sind **fünf Dörfler-Felder (ein `T`, 72 px)** und **ein Bösewicht-Kreis (ein `R`, 136 px)**
gedruckt. Eine Schablone beider aus dem **sauberen Falls-Tableau** (Artwork, keine Perspektive) wird in allen elf
gesucht: je genau fünf T und ein R, Korrelation **0,86-1,00** (M28). Die T liegen auf **Feldmitten (größte
Abweichung 0,078 Feld)**, der R-Kreis auf einem **Rasterkreuz (0,062)**. Damit sind `fields.B` und `fields.D` aller
elf **gemessen, nicht gelesen**. Die Probe ist von der Linienanpassung unabhängig: stimmen Raster und Spielsteine
überein, ist ein Versatz um eine Spalte ausgeschlossen.

Schablonen: `T` = 72 x 72 px um die Feldmitte G7 (6,5 | 6,5), `R` = 136 x 136 px um das Kreuz K|L, 8|9 (11,0 | 8,0),
beide aus `rect/Ms_Falls_and_Co.png`. Treffer ab Korrelation 0,45 (`cv2.TM_CCOEFF_NORMED`).

`fields.B` ist der 2 x 2 - Bereich, dessen **Mitte** das Rasterkreuz ist: Kreuz (x, y) -> `B = (x-1, y-1):(x, y)`.

**FF-Kästen** (`--ff`): `Vorlage` ist ein bekannter Kasten (B1 bei Virginia, O13 bei Deputy, E10 bei Bundits,
L8 bei Door Knockers), gesucht wird derselbe Kasten im selben Tableau (Hochpass sigma 6, ab 0,45) - die Treffer
sind die FF1-FF5, mit dem Eintrag `final.fields.EG` verglichen. (So wurde Virginias `EG5` bei R14 statt Q14 gefunden.)

Aufruf:
    py spielsteine.py                  # alle elf: gemessen gegen den Eintrag, Differenzen zuerst
    py spielsteine.py --ff             # die FF-Kästen von vier Tableaus
    py spielsteine.py --nur Ernie_Offal
"""
import cv2
import numpy as np

import gemeinsam as g
from gemeinsam import CW, LET

SCHABLONE_T = (6.5, 6.5, 72)     # Mitte (Spalte, Zeile in Feldern), Kantenlänge px
SCHABLONE_R = (11.0, 8.0, 136)
SCHWELLE = 0.45
FELDMITTE_TOLERANZ = 0.10        # M28 maß höchstens 0,078 (T) und 0,062 (R)
FF_VORLAGEN = [('Virginia Fitz', 'B1'), ('Deputy Waggums', 'O13'), ('The Bundits', 'E10'), ('The Door Knockers', 'L8')]


def ausschnitt(img, cx, cy, w, h):
    x0 = int(round(cx * CW - w / 2))
    y0 = int(round(cy * CW - h / 2))
    return img[y0:y0 + h, x0:x0 + w]


def schablonen():
    falls = g.lies_rect('Ms_Falls_and_Co')
    return ausschnitt(falls, SCHABLONE_T[0], SCHABLONE_T[1], SCHABLONE_T[2], SCHABLONE_T[2]), \
        ausschnitt(falls, SCHABLONE_R[0], SCHABLONE_R[1], SCHABLONE_R[2], SCHABLONE_R[2])


def finde(name, T=None, R=None, thr=SCHWELLE):
    """`{'T': [(x, y, Korrelation)], 'R': [...]}` in Feldern (Mitte der Schablone)."""
    if T is None:
        T, R = schablonen()
    grau = g.lies_rect(name)
    out = {}
    for k, t in (('T', T), ('R', R)):
        res = cv2.matchTemplate(grau, t, cv2.TM_CCOEFF_NORMED)
        pts = g.peaks(res, thr, t.shape[0] // 2, maxn=12)
        out[k] = [((x + t.shape[1] / 2) / CW, (y + t.shape[0] / 2) / CW, s) for x, y, s in pts]
    return out


def feldname(cx, cy):
    return LET[int(cx)] + str(int(cy) + 1)


def vergleiche(name, boss, sc, treffer):
    """Gemessen gegen den Eintrag. Gibt (Zeilen, ok) zurück."""
    e = sc['bosses'][boss]
    zeilen, ok = [], True
    ts = sorted(treffer['T'], key=lambda p: (p[1], p[0]))
    rs = treffer['R']
    if len(ts) != 5 or len(rs) < 1:
        ok = False
        zeilen.append('  !! %d T und %d R gefunden, erwartet 5 und 1' % (len(ts), len(rs)))
    gemessen_d = sorted(feldname(x, y) for x, y, _ in ts)
    if rs:
        x, y, s = rs[0]
        kx, ky = round(x), round(y)
        b = LET[kx - 1] + str(ky) + ':' + LET[kx] + str(ky + 1)
        abw = max(abs(x - kx), abs(y - ky))
        gleich = b == e['fields']['B']
        zeilen.append('  B gemessen %-8s Eintrag %-8s %s  (Kreuz %.2f|%.2f, Abweichung %.2f Feld, Korrelation %.2f)'
                      % (b, e['fields']['B'], 'ok' if gleich else 'DIFFERENZ', x, y, abw, s))
        ok = ok and gleich and abw <= FELDMITTE_TOLERANZ
    for x, y, s in ts:
        abw = max(abs(x - (int(x) + 0.5)), abs(y - (int(y) + 0.5)))
        zeilen.append('     T %s (%.2f|%.2f) Abweichung von der Feldmitte %.3f, Korrelation %.2f' % (feldname(x, y), x, y, abw, s))
        ok = ok and abw <= FELDMITTE_TOLERANZ
    gleich_d = sorted(e['fields']['D']) == gemessen_d
    zeilen.append('  D gemessen %s | Eintrag %s  %s' % (gemessen_d, sorted(e['fields']['D']), 'ok' if gleich_d else 'DIFFERENZ'))
    if not gleich_d:
        zeilen.append('      nur gemessen %s, nur im Eintrag %s' % (sorted(set(gemessen_d) - set(e['fields']['D'])), sorted(set(e['fields']['D']) - set(gemessen_d))))
    return zeilen, ok and gleich_d


def ff(sc):
    for boss, zelle in FF_VORLAGEN:
        grau = g.lies_rect(g.fname(boss))
        c0, r0, c1, r1 = g.rng(zelle)
        t = g.hp(grau[r0 * CW:(r1 + 1) * CW, c0 * CW:(c1 + 1) * CW], 6)
        res = cv2.matchTemplate(g.hp(grau, 6), t, cv2.TM_CCOEFF_NORMED)
        pk = sorted(g.peaks(res, 0.45, 40), key=lambda p: (p[1], p[0]))
        print('%-18s Vorlage %s: Treffer: %s' % (boss, zelle, ', '.join('%s (%.2f; x=%.2f y=%.2f)' % (g.feld(x + CW / 2, y + CW / 2), v, x / CW, y / CW) for x, y, v in pk)))
        print('     Eintrag EG:', sc['bosses'][boss]['final']['fields']['EG'])


def main():
    p = g.parser(__doc__)
    p.add_argument('--nur', action='append', help='nur dieses Tableau (Dateiname, mehrfach möglich)')
    p.add_argument('--ff', action='store_true', help='die FF-Kästen statt der Spielsteine')
    a = p.parse_args()
    g.start(a)
    sc, _ = g.lade_export()
    if a.ff:
        ff(sc)
        return
    T, R = schablonen()
    alle_ok = True
    for boss in g.ELF:
        n = g.fname(boss)
        if a.nur and n not in a.nur:
            continue
        z, ok = vergleiche(n, boss, sc, finde(n, T, R))
        alle_ok = alle_ok and ok
        print('%s%s' % (boss, '' if ok else '   <-- nachsehen'))
        print('\n'.join(z))
    print('alle ok' if alle_ok else 'Differenzen: nachsehen (Raster? Eintrag?)')


if __name__ == '__main__':
    main()
