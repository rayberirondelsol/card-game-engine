"""Schritt 4b: Geländeplättchen - die **Illustration aus einem sauberen Tableau als Vorlage**
(Spec M28, "Wie gemessen wurde", 6 b).

Wo 6 a an Foto-gegen-Illustration scheitert, trägt 6 b: **alle elf Tableaus zeichnen dieselbe Illustration** eines
Plättchens. Man schneidet das Plättchen aus einem Tableau, dessen Eintrag stimmt (am besten sauberes Artwork:
Ms. Falls & Co., Patches, Tartar Fishboy, The Door Knockers), dreht es in vier Stufen und sucht es in einem
anderen Tableau.

Parameter: Hochpass **sigma 6** (`g.hp(.., 6)`), `TM_CCOEFF_NORMED`, Treffer ab 0,3 mit Mindestabstand 30 px.
Am Feld (`feld`): die Vorlage an die linke obere Ecke des Eintrags gelegt, **+-6 px** Spiel (8 bei Schuppen).
M28 maß so: Maisfeld 0,67-0,91, Gemüsebeet 0,63-0,74, Farmhaus 0,62-0,86, Zaun 0,53-0,71 - und
Barry Bluff (hat kein Maisfeld) 0,11 als Gegenprobe. **Die Gegenprobe gehört dazu**: ein Tableau, in dem das Teil
nicht liegt, muss niedrig bleiben, sonst misst die Vorlage nichts.

Die Vorlagen sind **Eintrag-Zellen sauberer Tableaus** (`m28` unten nennt sie); **dreht** man eine Vorlage, ist die Richtung
die des Tisches (im Uhrzeigersinn).

Unterbefehle:
    py plaettchen_vorlage.py suche Patches C11:G14 Ms_Falls_and_Co       # Vorlage aus Patches, gesucht in Falls, vier Drehungen
    py plaettchen_vorlage.py feld Patches C11:G14 Ms_Falls_and_Co G3:K6   # Korrelation genau am Feld G3:K6, 0 und 180
    py plaettchen_vorlage.py m28                                          # die Vorlagen-Messungen hinter M28.1 (Zeilen 6, 7, 13, 15, 16, 20, 21)
"""
import cv2
import numpy as np

import gemeinsam as g
from gemeinsam import CW, LET

SIGMA = 6


def bild(name):
    return g.hp(g.lies_rect(name), SIGMA)


def vorlage(name, zelle):
    c0, r0, c1, r1 = g.rng(zelle)
    return bild(name)[r0 * CW:(r1 + 1) * CW, c0 * CW:(c1 + 1) * CW]


def drehen(t, grad):
    return g.drehe(t, grad)


def finde(name, t, thr=0.3, dist=30):
    res = cv2.matchTemplate(bild(name), t, cv2.TM_CCOEFF_NORMED)
    return g.peaks(res, thr, dist, maxn=6)


def feldname(x, y):
    return LET[int(round(x / CW)) % 19] + str(int(round(y / CW)) + 1)


def bericht(titel, name, t, thr=0.3):
    print(titel, name)
    for grad in (0, 90, 180, 270):
        pk = finde(name, drehen(t, grad), thr)
        print('   Drehung %3d:' % grad, ', '.join('%s %.2f (x=%.2f,y=%.2f)' % (feldname(x, y), v, x / CW, y / CW) for x, y, v in pk) or '-')


def am_feld(name, zelle, t, grad, tol=6):
    """Beste Korrelation der gedrehten Vorlage an der linken oberen Ecke des Eintrags, +-`tol` px Spiel."""
    c0, r0, c1, r1 = g.rng(zelle)
    grau = bild(name)
    tt = drehen(t, grad)
    h, w = tt.shape
    best = -1.0
    for dy in range(-tol, tol + 1, 2):
        for dx in range(-tol, tol + 1, 2):
            x0, y0 = c0 * CW + dx, r0 * CW + dy
            if x0 < 0 or y0 < 0 or y0 + h > grau.shape[0] or x0 + w > grau.shape[1]:
                continue
            best = max(best, float(cv2.matchTemplate(grau[y0:y0 + h, x0:x0 + w], tt, cv2.TM_CCOEFF_NORMED)[0, 0]))
    return best


def m28():
    """Die Messungen hinter den Vorlage-Zeilen von M28.1. Die Vorlagen kommen aus Tableaus, deren Eintrag stimmt."""
    zaun = vorlage('The_Door_Knockers', 'C11:F11')                 # 4 x 1, Drehung 0
    for n in ('The_Bundits', 'Ernie_Offal'):
        bericht('Zaun-Vorlage (Door Knockers C11:F11, 4x1, Drehung 0) in', n, zaun)
    farmhaus = vorlage('Patches', 'C11:G14')                       # Drehung 0 (weißes Dach unten); DK/Falls zeigen 180
    for n in ('Ms_Falls_and_Co', 'The_Door_Knockers', 'The_Bundits'):
        bericht('Farmhaus-Vorlage (Patches C11:G14, Drehung 0) in', n, farmhaus)
    beet = vorlage('Tartar_Fishboy', 'G1:I3')
    print('Gemüsebeet-Vorlage (Tartar G1:I3)')
    for n, exp in [('Deputy_Waggums', 'G8'), ('The_Bundits', 'E1'), ('Red_Atrocious', 'I1'), ('Ernie_Offal', 'F1'), ('Tartar_Fishboy', 'G1')]:
        pk = finde(n, beet)
        print('  %-16s Treffer: %s (Eintrag: %s)' % (n, ', '.join('%s %.2f' % (feldname(x, y), v) for x, y, v in pk[:2]), exp))
    mais = vorlage('Tartar_Fishboy', 'K11:O13')
    print('Maisfeld-Vorlage (Tartar K11:O13): Spitze je Tableau - Deputy L8, Patches L9 als Kontrollen, Barry hat keins')
    for n, exp in [('Tartar_Fishboy', 'K11'), ('Deputy_Waggums', 'L8'), ('Patches', 'L9'), ('Ernie_Offal', 'K11 (nach M28)'), ('Barry_Bluff', '-')]:
        res = cv2.matchTemplate(bild(n), mais, cv2.TM_CCOEFF_NORMED)
        y, x = np.unravel_index(res.argmax(), res.shape)
        print('  %-16s Spitze %.2f bei %s (erwartet %s)' % (n, res.max(), feldname(x, y), exp))
    schuppen = vorlage('Tilda_Fields', 'Q8:S9')
    print('Schuppen-Vorlage (Tilda Q8:S9, Tür links = Eintrag 90); Drehung der Vorlage 0 / 180')
    for n, zelle in [('Virginia_Fitz', 'C1:E2'), ('Red_Atrocious', 'Q11:S12'), ('Tilda_Fields', 'Q8:S9')]:
        print('  %-14s %-8s' % (n, zelle), ' '.join('%3d: %.2f' % (d, am_feld(n, zelle, schuppen, d, tol=8)) for d in (0, 180)))
    print('Zaun-Vorlage am Feld (Drehung der Vorlage 90 / 270)')
    for n, zelle in [('The_Bundits', 'P9:P12'), ('The_Bundits', 'P10:P13'), ('The_Bundits', 'L9:L12'), ('The_Bundits', 'L10:L13'),
                     ('Ernie_Offal', 'G7:G10'), ('Ernie_Offal', 'O7:O10'), ('Ernie_Offal', 'N7:N10')]:
        print('  %-14s %-8s' % (n, zelle), ' '.join('%d %.2f' % (d, am_feld(n, zelle, zaun, d)) for d in (90, 270)))


def main():
    p = g.parser(__doc__)
    p.add_argument('befehl', choices=['suche', 'feld', 'm28'])
    p.add_argument('args', nargs='*')
    a = p.parse_args()
    g.start(a)
    if a.befehl == 'm28':
        m28()
    elif a.befehl == 'suche':
        quelle, zelle, ziel = a.args[:3]
        bericht('Vorlage %s %s in' % (quelle, zelle), ziel, vorlage(quelle, zelle))
    else:
        quelle, zelle, ziel, feld_ = a.args[:4]
        t = vorlage(quelle, zelle)
        print('%s %s -> %s %s:' % (quelle, zelle, ziel, feld_), ' '.join('%d: %.2f' % (d, am_feld(ziel, feld_, t, d)) for d in (0, 90, 180, 270)))


if __name__ == '__main__':
    main()
