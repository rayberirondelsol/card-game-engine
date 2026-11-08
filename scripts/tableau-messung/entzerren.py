"""Schritt 2: das Raster aus den gedruckten Linien finden und auf 19 x 14 Felder zu 64 px entzerren
(Spec M28, "Wie gemessen wurde", 2-4).

Verfahren (die Parameter sind die aus M28, nicht neu erfunden):

  1. **Anfangsviereck** aus dem Umriss der Karte (`finde_viereck`): die kartengrüne, gesättigte Fläche im
     oberen Bilddrittel, konvexe Hülle, auf vier Ecken vereinfacht.
  2. **Linien.** Je Bild die **18 senkrechten und 13 waagerechten Innenlinien** als dunkle dünne Linie über alle
     Pixel gesucht: Hochpass sigma 1,2 minus sigma 7, +-30 px Suchbreite im ersten, +-10 px in den beiden
     weiteren Durchgängen, Neigung +-0,04 in 17 Stufen.
  3. **Perspektive.** Die 18 x 13 = 234 Schnittpunkte mit RANSAC (Schwelle 6 px) an eine Perspektive
     angepasst, drei Durchgänge; das Bild wird auf **19 x 14 Felder zu 64 px** entzerrt.
     Restfehler der Schnittpunkte in M28: RMS 0,9-3,7 px = 0,015-0,057 Feld; die Ausreißer sind Linien unter Plättchen.
  4. **Eine Spalte Versatz kennt die Linienanpassung nicht** (jede Linie sieht aus wie jede). Darum schreibt
     dieses Skript `buchstaben.png`: je Tableau ein Streifen mit einem Feld Rand oben, in dem **A-S mittig über
     ihren Spalten** stehen müssen. Steht ein Buchstabe versetzt, `--versatz Name=dx,dy` (Felder) und neu laufen
     lassen. Zweite Probe: der **Kartenrand** muss bei etwa 0 und 19/14 Feldern liegen (bei Ernie Offal lag er
     bei 0,84 statt -0,2 Feld - so fiel es auf). `BEKANNTER_VERSATZ` in `gemeinsam.py` trägt den einen Fall aus M28.

Ergebnis je Tableau unter `--arbeit`:
    rect/<Name>.png      19 x 14 Felder zu 64 px, ohne Rand (das, womit alle weiteren Schritte rechnen)
    rect/<Name>_H.npy    Perspektive (vor dem Versatz)
    rm/<Name>.png        dasselbe mit einem Feld Rand rundum (für Buchstaben und Zahlen)
    buchstaben.png       alle Streifen untereinander, mit den 20 senkrechten Rasterlinien
    rect/summary.json    Restfehler je Tableau

Aufruf:
    py entzerren.py                                  # alle elf
    py entzerren.py --nur Ms_Falls_and_Co            # eines
    py entzerren.py --versatz Neues_Tableau=1,0
"""
import glob
import json
import os
import sys

import cv2
import numpy as np

import gemeinsam as g
from gemeinsam import CW, COLS, ROWS, OW, OH

DST = np.array([[0, 0], [OW, 0], [OW, OH], [0, OH]], np.float32)


def finde_viereck(pfad):
    """Das Kartenviereck (tl, tr, br, bl) im Foto."""
    im = cv2.imread(pfad)
    H, W = im.shape[:2]
    top = im[:int(H * 0.45)]
    hsv = cv2.cvtColor(top, cv2.COLOR_BGR2HSV)
    # Die Karte ist oliv/grünlich-dunkel: mittlere Sättigung, niedriger Wert; der Rand weißlich.
    mask = ((hsv[..., 1] > 45) & (hsv[..., 2] < 200)).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((25, 25), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(mask)
    i = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    comp = (lab == i).astype(np.uint8) * 255
    cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cnts, key=cv2.contourArea)
    hull = cv2.convexHull(c)
    ap = None
    for eps in np.linspace(0.005, 0.08, 60):
        ap = cv2.approxPolyDP(hull, eps * cv2.arcLength(hull, True), True)
        if len(ap) == 4:
            break
    q = ap.reshape(-1, 2).astype(np.float32)
    s = q.sum(1)
    d = np.diff(q, axis=1).ravel()
    o = np.array([q[np.argmin(s)], q[np.argmin(d)], q[np.argmax(s)], q[np.argmax(d)]], np.float32)
    return im, o


def resp(gray):
    """Hochpass sigma 1,2 minus sigma 7: dunkle dünne Linien werden negativ."""
    f = gray.astype(np.float32)
    return cv2.GaussianBlur(f, (0, 0), 1.2) - cv2.GaussianBlur(f, (0, 0), 7)


def linie_senkrecht(R, i, dxs, slopes):
    H, W = R.shape
    ys = np.arange(0, H)
    best = (-1e9, 0, 0)
    for s in slopes:
        for dx in dxs:
            xs = np.clip(np.round(CW * i + dx + s * (ys - H / 2)).astype(int), 0, W - 1)
            sc = -R[ys, xs].mean()
            if sc > best[0]:
                best = (sc, dx, s)
    return best


def linie_waagerecht(R, j, dys, slopes):
    H, W = R.shape
    xs = np.arange(0, W)
    best = (-1e9, 0, 0)
    for s in slopes:
        for dy in dys:
            ys = np.clip(np.round(CW * j + dy + s * (xs - W / 2)).astype(int), 0, H - 1)
            sc = -R[ys, xs].mean()
            if sc > best[0]:
                best = (sc, dy, s)
    return best


def verfeinere(im, Hm, iters=3):
    """Linien suchen, Schnittpunkte an die Perspektive anpassen (RANSAC 6 px), wiederholen."""
    res = inl = None
    for it in range(iters):
        rng_ = 30 if it == 0 else 10
        W0 = cv2.warpPerspective(im, Hm, (OW, OH), flags=cv2.INTER_CUBIC)
        R = resp(cv2.cvtColor(W0, cv2.COLOR_BGR2GRAY))
        dxs = np.arange(-rng_, rng_ + 1)
        slopes = np.linspace(-0.04, 0.04, 17)
        V = {i: linie_senkrecht(R, i, dxs, slopes) for i in range(1, COLS)}
        Hh = {j: linie_waagerecht(R, j, dxs, slopes) for j in range(1, ROWS)}
        pts_r, pts_g = [], []
        for i, (sv, dx, s) in V.items():
            for j, (sh, dy, t) in Hh.items():
                # Schnittpunkt von x = CW*i+dx+s*(y-OH/2) und y = CW*j+dy+t*(x-OW/2)
                x = CW * i + dx
                y = CW * j + dy
                for _ in range(6):
                    x = CW * i + dx + s * (y - OH / 2)
                    y = CW * j + dy + t * (x - OW / 2)
                pts_r.append([x, y])
                pts_g.append([CW * i, CW * j])
        pts_r = np.array(pts_r, np.float32)
        pts_g = np.array(pts_g, np.float32)
        Hinv = np.linalg.inv(Hm)
        src = cv2.perspectiveTransform(pts_r.reshape(-1, 1, 2), Hinv).reshape(-1, 2)
        Hn, inl = cv2.findHomography(src, pts_g, cv2.RANSAC, 6.0)
        Hm = Hn
        res = np.linalg.norm(cv2.perspectiveTransform(src.reshape(-1, 1, 2), Hn).reshape(-1, 2) - pts_g, axis=1)
    return Hm, res, inl


def kartenrand(Hm, im):
    """Wo liegt der Kartenrand, in Feldern relativ zum Raster? (links, oben, rechts-19, unten-14)."""
    T = np.array([[1, 0, 3 * CW], [0, 1, 3 * CW], [0, 0, 1]], np.float64)
    W = cv2.warpPerspective(im, T @ Hm, (OW + 6 * CW, OH + 6 * CW))
    hsv = cv2.cvtColor(W, cv2.COLOR_BGR2HSV)
    m = ((hsv[..., 1] > 40) & (hsv[..., 2] < 215)).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8)) > 0
    ys = slice(int(3 * CW + OH * 0.1), int(3 * CW + OH * 0.9))
    xs = slice(int(3 * CW + OW * 0.1), int(3 * CW + OW * 0.9))
    cd = m[ys, :].mean(0)
    rd = m[:, xs].mean(1)
    l = np.argmax(cd > 0.6) - 3 * CW
    r = len(cd) - np.argmax(cd[::-1] > 0.6) - 3 * CW
    t = np.argmax(rd > 0.6) - 3 * CW
    b = len(rd) - np.argmax(rd[::-1] > 0.6) - 3 * CW
    return l / CW, t / CW, (r - OW) / CW, (b - OH) / CW


def entzerre(name, versatz):
    im, o = finde_viereck(g.pfad('tab', '%s_back.png' % name))
    H0 = cv2.getPerspectiveTransform(o, DST)
    Hm, res, inl = verfeinere(im, H0)
    np.save(g.pfad('rect', '%s_H.npy' % name), Hm)
    rand_vorher = kartenrand(Hm, im)
    # Der Versatz in ganzen Feldern; ein Feld Rand rundum, damit Buchstaben und Zahlen im Bild liegen.
    sx, sy = versatz.get(name, (0, 0))
    T = np.array([[1, 0, CW - sx * CW], [0, 1, CW - sy * CW], [0, 0, 1]], np.float64)
    Hf = T @ Hm
    np.save(g.pfad('rm', '%s_H.npy' % name), Hf)
    W = cv2.warpPerspective(im, Hf, (OW + 2 * CW, OH + 2 * CW), flags=cv2.INTER_CUBIC)
    cv2.imwrite(g.pfad('rm', '%s.png' % name), W)
    S = W[CW:CW + OH, CW:CW + OW]
    cv2.imwrite(g.pfad('rect', '%s.png' % name), S)
    # Der Streifen für die Buchstaben-Probe: die 20 senkrechten Rasterlinien über dem oberen Rand.
    streifen = W[0:CW + 10].copy()
    for i in range(20):
        cv2.line(streifen, (CW + i * CW, 0), (CW + i * CW, streifen.shape[0]), (0, 0, 255), 1)
    cv2.putText(streifen, name, (2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1)
    rand_nachher = kartenrand(np.array([[1, 0, -sx * CW], [0, 1, -sy * CW], [0, 0, 1]], np.float64) @ Hm, im)
    return dict(name=name, inliers=int(inl.sum()), n=len(inl), rms_px=float(np.sqrt((res ** 2).mean())),
                versatz=[sx, sy], rand_vorher=[round(float(x), 2) for x in rand_vorher], rand_nachher=[round(float(x), 2) for x in rand_nachher]), streifen


def main():
    p = g.parser(__doc__)
    p.add_argument('--nur', action='append', help='nur dieses Tableau (Dateiname wie Ms_Falls_and_Co, mehrfach möglich)')
    p.add_argument('--versatz', action='append', default=[], help='Name=dx,dy in Feldern, mehrfach möglich')
    p.add_argument('--ohne-bekannten-versatz', action='store_true', help='den Versatz aus M28 (Ernie Offal) nicht anwenden')
    a = p.parse_args()
    g.start(a)
    versatz = {} if a.ohne_bekannten_versatz else dict(g.BEKANNTER_VERSATZ)
    for v in a.versatz:
        n, xy = v.split('=')
        versatz[n] = tuple(int(x) for x in xy.split(','))
    os.makedirs(g.pfad('rect'), exist_ok=True)
    os.makedirs(g.pfad('rm'), exist_ok=True)
    namen = a.nur or [os.path.basename(f)[:-9] for f in sorted(glob.glob(g.pfad('tab', '*_back.png')))]
    if not namen:
        sys.exit('keine Tableaus unter %s - erst holen.py' % g.pfad('tab'))
    summary, streifen = [], []
    for n in namen:
        r, s = entzerre(n, versatz)
        summary.append(r)
        streifen.append(s)
        print('%-20s Schnittpunkte %d/%d  RMS %.2f px (= %.3f Feld)  Versatz %s  Kartenrand (links, oben, rechts, unten; Felder) vorher %s nachher %s'
              % (n, r['inliers'], r['n'], r['rms_px'], r['rms_px'] / CW, tuple(r['versatz']), r['rand_vorher'], r['rand_nachher']))
    cv2.imwrite(g.pfad('buchstaben.png'), np.vstack(streifen))
    with open(g.pfad('rect', 'summary.json'), 'w') as f:
        json.dump(summary, f)
    print('buchstaben.png: A-S müssen mittig über ihren Spalten stehen (Probe auf Versatz um eine Spalte)')


if __name__ == '__main__':
    main()
