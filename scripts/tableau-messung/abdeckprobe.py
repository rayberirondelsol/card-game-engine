"""Schritt 4d: die **Abdeckprobe** (Spec M28, "Wie gemessen wurde", 6 d).

**Alle Einträge eines Tableaus werden schwarz übermalt** - jedes Geländefeld, `fields.B` und jedes `fields.D`. Was auf
dem Tableau sichtbar bleibt, ist **nicht erfasst**. So sind die vier fehlenden Plättchen bestätigt worden (Virginia:
Dynamit, TNT-Kasten, Bärenfalle; Bundits: Plumpsklo), und so ist sicher, dass bei den anderen neun Tableaus **nichts**
fehlt. Gedruckte Felder (Buchstaben, Zahlen, die Spielsteine T und R) sind **keine** Plättchen - die Spielsteine liegen
in `fields.B`/`fields.D` und sind damit mit übermalt.

Die Raster (weiß) und die Achsen (gelb) stammen aus demselben Raster wie die Zahlen. Je vier Tableaus ein Blatt,
`abdeckprobe_<n>.png`, verkleinert auf 62 %.

Mit `--scenario ziel.json` deckt man die Daten **nach** M28 ab: dann darf nichts Sichtbares mehr übrig sein, was ein
Plättchen ist (zeigt es doch eines, fehlt es noch im Eintrag).

Aufruf:
    py abdeckprobe.py                              # alle elf, vier je Blatt
    py abdeckprobe.py --nur Virginia_Fitz
    py abdeckprobe.py --scenario ziel.json
"""
import cv2
import numpy as np

import gemeinsam as g
from gemeinsam import CW, LET


def abdecken(boss, sc, zellen=None):
    e = sc['bosses'][boss]
    im = g.lies_rect(g.fname(boss), grau=False)
    if zellen is None:
        zellen = []
        for t in e['terrain']:
            zellen += t['cells']
        zellen += [e['fields']['B']] + e['fields']['D']
    for c in zellen:
        c0, r0, c1, r1 = g.rng(c)
        cv2.rectangle(im, (c0 * CW, r0 * CW), ((c1 + 1) * CW, (r1 + 1) * CW), (0, 0, 0), -1)
    for i in range(20):
        cv2.line(im, (i * CW, 0), (i * CW, 14 * CW), (255, 255, 255), 1)
    for j in range(15):
        cv2.line(im, (0, j * CW), (19 * CW, j * CW), (255, 255, 255), 1)
    for i in range(19):
        cv2.putText(im, LET[i], (i * CW + 24, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
    for j in range(14):
        cv2.putText(im, str(j + 1), (2, j * CW + 36), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
    cv2.putText(im, boss, (500, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2)
    return cv2.resize(im, None, fx=0.62, fy=0.62, interpolation=cv2.INTER_AREA)


def main():
    p = g.parser(__doc__)
    p.add_argument('--nur', action='append', help='nur dieses Tableau (Dateiname, mehrfach möglich)')
    p.add_argument('--scenario', help='anderes scenario_data (JSON) statt dem aus dem Export')
    a = p.parse_args()
    g.start(a)
    sc = g.lade_szenario(a.scenario)
    bosse = [b for b in g.ELF if not a.nur or g.fname(b) in a.nur]
    ims = [abdecken(b, sc) for b in bosse]
    for k in range(0, len(ims), 4):
        grp = ims[k:k + 4]
        while len(grp) < 4:
            grp.append(np.zeros_like(ims[0]))
        aus = g.pfad('abdeckprobe_%d.png' % (k // 4))
        cv2.imwrite(aus, np.vstack([np.hstack(grp[:2]), np.hstack(grp[2:])]))
        print(aus, ': ', ', '.join(bosse[k:k + 4]))


if __name__ == '__main__':
    main()
