"""Schritt 1: die Bilder holen (Spec M28, "Wie gemessen wurde", 1).

Holt **von der Produktion** (`https://gaming.benjathi.de/uploads/...`, öffentlich, ohne Anmeldung):

  * die Rückseite jedes `Tableau: <Name>` der elf (`tab/<Name>_back.png`, dazu die Vorderseite),
  * jedes Geländeasset, das ein Eintrag der elf legt, dazu `Sprengstoff`, `Auslöser`, die Bärenfalle,
    das Plumpsklo und beide Dichter-Wald-Varianten (`terr/<Name>_f.png`, bei Zweiseitern `_b.png`).

Die Maße (M28): sauberes Artwork (1500 x 3000) sind Ms. Falls & Co., Patches, Tartar Fishboy,
The Door Knockers; Fotos sind Deputy Waggums (1474 x 2918), Virginia Fitz (1396 x 2766), The Bundits
(1518 x 2997), Red Atrocious (1539 x 3035), Tilda Fields (1420 x 2845), Ernie Offal (1687 x 3362) und
Barry Bluff (1540 x 3077).

Aufruf:
    py holen.py --blob export.raw.txt        # export.json aus der Ausgabe von export.js auspacken
    py holen.py                              # alles holen (etwa 270 MB; schon Vorhandenes wird übersprungen)
    py holen.py --nur "Ms. Falls & Co." --ohne-gelaende    # nur ein Tableau (z. B. für die Selbstprobe)
"""
import base64
import io
import json
import os
import re
import sys
import urllib.request

import gemeinsam as g

BASIS = 'https://gaming.benjathi.de'
ZUSATZ = ['Sprengstoff', 'Auslöser', 'Bärenfalle / Bärenfalle (zugeschnappt)', 'Miefiges Plumpsklo', 'Dichter Wald', 'Dichter Wald 2']


def hole(pfad_url, ziel):
    if os.path.exists(ziel):
        return False
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    r = urllib.request.Request(BASIS + pfad_url, headers={'User-Agent': 'Mozilla/5.0'})
    with open(ziel, 'wb') as f:
        f.write(urllib.request.urlopen(r, timeout=60).read())
    return True


def blob_auspacken(datei):
    t = io.open(datei, encoding='utf-8', errors='replace').read().replace('\n', '')
    m = re.search(r'BLOB([A-Za-z0-9+/=]+)BLOB', t)
    if not m:
        sys.exit('keine BLOB-Marken in %s: %s' % (datei, t[:300]))
    d = json.loads(base64.b64decode(m.group(1)))
    io.open(g.EXPORT, 'w', encoding='utf-8', newline='').write(json.dumps(d, ensure_ascii=False))
    print('export.json: %d Zeichen scenario_data, %d Assets -> %s' % (len(d['scenario_data']), len(d['assets']), g.EXPORT))


def main():
    p = g.parser(__doc__)
    p.add_argument('--blob', help='Ausgabe von export.js auspacken, sonst nichts tun')
    p.add_argument('--nur', action='append', help='nur dieses Tableau (mehrfach möglich)')
    p.add_argument('--ohne-gelaende', action='store_true', help='keine Geländeassets holen')
    a = p.parse_args()
    g.start(a)
    if a.blob:
        blob_auspacken(a.blob)
        return
    sc, assets = g.lade_export()
    namen = a.nur or g.ELF
    for n in namen:
        t = assets.get('Tableau: ' + n)
        if not t:
            print('KEIN ASSET Tableau:', n)
            continue
        for seite, schluessel in (('back', 'back_image_path'), ('front', 'image_path')):
            if t.get(schluessel):
                neu = hole(t[schluessel], g.pfad('tab', '%s_%s.png' % (g.fname(n), seite)))
                print(('geholt  ' if neu else 'schon da ') + 'tab/%s_%s.png' % (g.fname(n), seite))
    if a.ohne_gelaende:
        return
    gelaende = set(ZUSATZ)
    for n in namen:
        e = sc['bosses'][n]
        for teil in [e] + ([e['final']] if 'final' in e else []):
            for t in teil.get('terrain', []):
                gelaende.add(t['assetName'])
    for t in sorted(gelaende):
        if t not in assets:
            print('KEIN ASSET', t)
            continue
        z = assets[t]
        fn = g.fn_gelaende(t)
        neu = hole(z['image_path'], g.pfad('terr', '%s_f.png' % fn))
        if z.get('back_image_path'):
            hole(z['back_image_path'], g.pfad('terr', '%s_b.png' % fn))
        print(('geholt  ' if neu else 'schon da ') + 'terr/%s (%s x %s)' % (fn, z['width'], z['height']))


if __name__ == '__main__':
    main()
