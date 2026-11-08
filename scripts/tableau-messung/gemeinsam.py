"""Gemeinsames der Tableau-Messung (Spec M28, "Wie gemessen wurde").

**Wozu.** `setups.scenario_data.bosses` sagt, wo auf dem 19 x 14 - Raster Gelände, Bösewicht und
Dörfler liegen. Ob das stimmt, steht nur im Bild: auf der Rückseite jedes `Tableau: <Name>`. Der Prüfer
im Repo (`shared/scenarioGeometry.js`) sieht von den Fehlerarten, die M28 fand, genau eine
(Seitenverhältnis). Versatz um ein Feld, Drehung, Variante und fehlende Plättchen sieht er nicht -
dafür sind diese Werkzeuge da. Ohne sie ist die nächste Erfassung wieder Augenmaß.

**Reihenfolge** (jede Datei hat ihren Kopfkommentar mit den Parametern aus M28):

    export.js              (im Backend-Container) -> export.json: scenario_data + Assetliste
    holen.py               Bilder holen (Tableau-Rückseiten, Geländeassets)
    entzerren.py           Raster aus den gedruckten Linien, auf 19 x 14 Felder zu 64 px entzerren
    spielsteine.py         Bösewicht (R) und Dörfler (T) und die FF-Kästen, unabhängig von den Linien
    plaettchen_asset.py    6a: Asset-Foto in vier Drehungen gegen das Tableau (Korrelation)
    plaettchen_vorlage.py  6b: Illustration aus einem sauberen Tableau als Vorlage
    kachelblatt.py         6c: Kachelrahmen - Tableau-Ausschnitt neben das Asset gelegt
    abdeckprobe.py         6d: alle Einträge schwarz übermalt - was sichtbar bleibt, ist nicht erfasst
    selbstprobe.py         das Werkzeug an Ms. Falls & Co. prüfen (von Hand, kein Teil von `npm test`)

**Grenzen, die gelten (M28.1).**
  * Korrelation unter etwa 0,2 trägt nichts: das Asset ist ein *Foto* der Pappkachel, das Tableau eine
    *Illustration*. Gelesen wird der **Abstand zur zweitbesten Drehung**, nicht der Absolutwert
    (`szenariodaten-grundspiel.md` 6.7).
  * Eine **Spalte Versatz** kennt die Linienanpassung nicht (jede Linie sieht aus wie jede). Erkannt wird sie
    an den Buchstaben A-S und den Zahlen 1-14, die mittig über/neben ihren Spalten stehen müssen
    (`entzerren.py` schreibt den Streifen dazu), und am Kartenrand.
  * **Beschriftung vor Augenmaß:** die Achsen eines Ausschnitts aus demselben Raster zeichnen, das die Zahl liefert.
  * Sieben der elf Tableaus sind Fotos (Perspektive), vier sauberes Artwork.

**Arbeitsverzeichnis.** Alle Zwischenergebnisse liegen unter `--arbeit` (Vorgabe `./tableau-messung-arbeit`,
in `.gitignore`): `tab/` (Tableaus), `terr/` (Gelände), `rect/` (entzerrt, 19 x 14 x 64 px), `rm/` (mit einem
Feld Rand). **Keine Bilder einchecken** (Größe, und sie liegen in der Produktion).

**Abhängigkeiten:** Python 3, `opencv-python`, `numpy` - bewusst **nicht** in `npm test`.
"""
import argparse
import io
import json
import os
import re
import sys

import cv2
import numpy as np

# ── Das Raster (M28: 19 x 14 Felder zu 64 px) ───────────────────────────────
CW = 64
COLS = 19
ROWS = 14
OW = CW * COLS
OH = CW * ROWS
LET = 'ABCDEFGHIJKLMNOPQRS'

# Die elf Einträge, um die es in M28 geht (die neun vom 2026-11-07 sind nicht Gegenstand).
ELF = ['Deputy Waggums', 'Virginia Fitz', 'The Bundits', 'Red Atrocious', 'Tilda Fields', 'Ernie Offal',
       'Barry Bluff', 'Tartar Fishboy', 'Ms. Falls & Co.', 'Patches', 'The Door Knockers']

# Eine Spalte Versatz, die die Linien nicht sehen und die Buchstaben zeigten (M28 "Wie gemessen", 3):
# bei Ernie Offal lag das Raster um genau eine Spalte daneben (Kartenrand bei 0,84 statt -0,2 Feld).
# Wer ein neues Tableau misst, lässt `entzerren.py --ohne-bekannten-versatz` laufen, sieht sich
# `buchstaben.png` an und trägt einen Versatz mit `--versatz Name=dx,dy` ein.
BEKANNTER_VERSATZ = {'Ernie_Offal': (1, 0)}

ARBEIT = os.environ.get('TABLEAU_ARBEIT', 'tableau-messung-arbeit')
EXPORT = None


def fname(boss):
    """`Ms. Falls & Co.` -> `Ms_Falls_and_Co` (Dateiname eines Tableaus)."""
    return boss.replace(' ', '_').replace('&', 'and').replace('.', '')


def boss_von(name):
    """Umkehrung von `fname` für die elf."""
    for b in ELF:
        if fname(b) == name:
            return b
    raise KeyError(name)


def fn_gelaende(t):
    """Dateiname eines Geländeassets (ohne Endung und ohne `_f`/`_b`)."""
    return t.replace(' ', '_').replace('/', '-').replace('(', '').replace(')', '')


def parser(beschreibung):
    p = argparse.ArgumentParser(description=beschreibung, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--arbeit', default=None, help='Arbeitsverzeichnis (Vorgabe ./tableau-messung-arbeit oder $TABLEAU_ARBEIT)')
    p.add_argument('--export', default=None, help='export.json (Vorgabe <arbeit>/export.json)')
    return p


def start(args):
    """Arbeitsverzeichnis und Export festlegen; muss vor jedem anderen Aufruf stehen."""
    global ARBEIT, EXPORT
    if args.arbeit:
        ARBEIT = args.arbeit
    EXPORT = args.export or os.path.join(ARBEIT, 'export.json')
    os.makedirs(ARBEIT, exist_ok=True)


def pfad(*teile):
    return os.path.join(ARBEIT, *teile)


def lade_export():
    """`(scenario_data als dict, {Assetname: Zeile})` aus `export.json` (siehe `export.js`)."""
    with io.open(EXPORT, encoding='utf-8') as f:
        d = json.load(f)
    sc = json.loads(d['scenario_data']) if isinstance(d['scenario_data'], str) else d['scenario_data']
    return sc, {a['name']: a for a in d['assets']}


def lade_szenario(datei=None):
    """Ein anderes `scenario_data` (z. B. der Zielstand) statt dem aus dem Export."""
    if not datei:
        return lade_export()[0]
    with io.open(datei, encoding='utf-8') as f:
        d = json.load(f)
    return json.loads(d['scenario_data']) if isinstance(d.get('scenario_data'), str) else d


# ── Felder ──────────────────────────────────────────────────────────────────

def cellrc(c):
    m = re.match(r'^([A-S])(\d+)$', c.strip())
    return LET.index(m.group(1)), int(m.group(2)) - 1


def rng(s):
    """`K5:L6` -> (Spalte0, Zeile0, Spalte1, Zeile1), Spalte A = 0, Zeile 1 = 0."""
    a, *b = s.split(':')
    b = b[0] if b else a
    c0, r0 = cellrc(a)
    c1, r1 = cellrc(b)
    return min(c0, c1), min(r0, r1), max(c0, c1), max(r0, r1)


def box(s):
    c0, r0, c1, r1 = rng(s)
    return (c0 * CW, r0 * CW, (c1 + 1) * CW, (r1 + 1) * CW)


def feld(x, y):
    """Pixel (x, y) -> Feldname."""
    return LET[min(COLS - 1, max(0, int(x // CW)))] + str(min(ROWS - 1, max(0, int(y // CW))) + 1)


# ── Bilder ──────────────────────────────────────────────────────────────────

def hp(g, s=5):
    """Hochpass (Bild minus Weichzeichnung): nimmt die Beleuchtung der Fotos heraus."""
    g = g.astype(np.float32)
    return g - cv2.GaussianBlur(g, (0, 0), s)


def lies_rect(name, grau=True):
    """Das entzerrte Tableau (19 x 14 Felder zu 64 px)."""
    p = pfad('rect', '%s.png' % name)
    im = cv2.imread(p, 0 if grau else cv2.IMREAD_COLOR)
    if im is None:
        sys.exit('fehlt: %s - erst entzerren.py laufen lassen' % p)
    return im


def peaks(res, thr, dist, maxn=8):
    """Die besten Treffer einer Korrelationskarte, mit Mindestabstand."""
    out = []
    r = res.copy()
    for _ in range(maxn):
        v = r.max()
        if v < thr:
            break
        y, x = np.unravel_index(r.argmax(), r.shape)
        out.append((int(x), int(y), float(v)))
        r[max(0, y - dist):y + dist, max(0, x - dist):x + dist] = -1
    return out


def lade_asset(name, hinten=False):
    """Ein Geländeasset als BGR; Transparenz wird auf Grau 128 gelegt."""
    base = pfad('terr', '%s_%s.png' % (fn_gelaende(name), 'b' if hinten else 'f'))
    if not os.path.exists(base):
        sys.exit('fehlt: %s - erst holen.py laufen lassen' % base)
    im = cv2.imdecode(np.fromfile(base, np.uint8), cv2.IMREAD_UNCHANGED)
    if im.shape[2] == 4:
        a = im[..., 3:4].astype(np.float32) / 255
        rgb = im[..., :3].astype(np.float32) * a + 128 * (1 - a)
    else:
        rgb = im.astype(np.float32)
    return rgb.astype(np.uint8)


def drehe(im, grad):
    """Im Uhrzeigersinn, wie `rotate(..deg)` am Tisch."""
    return np.ascontiguousarray(np.rot90(im, -((grad // 90) % 4)))
