# Befund: der Spieltisch bleibt weiß, wenn er bei Breite 0 geladen wird

Gefunden am 2026-11-07 auf dem **Produktionstisch**, beim Nachprüfen von M26.

## Was passiert

`https://gaming.benjathi.de/games/<id>/play` in einem Browser-Bereich geöffnet,
der (noch) keine Breite hat: die Seite bleibt **vollständig weiß**, kein Tisch,
keine Leiste, kein Fehlertext. In der Konsole steht:

    Uncaught IndexSizeError: Failed to execute 'getImageData' on
    'CanvasRenderingContext2D': The source width is 0.

Ein zweiter Aufruf derselben Adresse zeichnet den Tisch normal — der Fehler
tritt nur auf, solange die Fläche 0 breit (oder 0 hoch) ist.

## Ursache

`getOrCreateTexture(type, width, height, baseColor)` in
`client/src/pages/GameTable.jsx` (Zeile ~109) legt eine Leinwand in der Größe
der Tischfläche an und ruft für `felt` und `wood`
`ctx.getImageData(0, 0, width, height)` auf. **Bei `width === 0` wirft das.**
Die Ausnahme fliegt aus dem Render heraus; React räumt den Baum ab, und übrig
bleibt eine weiße Seite.

Die beiden anderen Zweige (`solid`) werfen nicht — `fillRect` und
`createRadialGradient` vertragen die 0. Nur die zwei Rauschzweige nicht.

## Warum das zählt

Es ist kein Schönheitsfehler: Der Tisch ist **ganz weg**, ohne jede Meldung,
und wer es nicht in der Konsole nachsieht, hält die Partie für verloren. Es
trifft jeden schmalen oder noch nicht gelayouteten Bereich — eingebettete
Ansichten, ein frisch geöffnetes Fenster, ein ausgeblendetes Panel.

## Was zu tun ist

Eine Größe unter 1 Pixel ist keine Textur. Die Entscheidung „lohnt sich eine
Textur überhaupt?" gehört in eine eigene, prüfbare Funktion, weil **für den
Client keine Testinfrastruktur existiert** (`CLAUDE.md`) — reine Logik wandert
nach `client/src/utils/` oder `shared/` und wird aus `server/test/` geprüft.

Mindestens:
1. Eine Funktion, die aus `width`/`height` sagt, ob gezeichnet werden kann.
   Nicht nur `0` abfangen: auch `NaN`, negative Werte und Bruchteile unter 1
   kommen aus Layout-Rechnungen.
2. `getOrCreateTexture` fragt sie und gibt bei „nein" eine Leinwand zurück,
   die `drawImage` verträgt, statt zu werfen.
3. Ein Test je Fall, der **vor** der Änderung rot ist.

**Nicht** den Aufruf einfach in `try/catch` wickeln: dann ist der Fehler weg,
die Ursache bleibt, und der nächste Rauschzweig fällt wieder hinein.
