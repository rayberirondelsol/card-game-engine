# Mehrere Spieler — Prüfliste für den Auftraggeber (M31, Welle 2)

Stand 2026-11-10. Alles aus `FA`–`FI` ist gebaut, deployt und **in die Produktion geschrieben**; der Rauchtest gegen die Produktion meldet **0 Beanstandungen** (jetzt mit dem Abschnitt „5. Die Lagen"), die Testsuite **2 460** grün. Was hier steht, hat eine Maschine geprüft — **bis auf einen Punkt, den noch niemand gesehen hat: ein ganzer Raum mit mehreren Spielern, vom Anlegen bis zum ersten Zug.** Der Rauchtest läuft im Speicher und baut keinen Raum; die Kette Aufbau → Ereignis → Kampf → Dorfphase ist für alle 14 zulässigen Kombinationen gemessen, am Tisch gespielt hat sie niemand.

**Bevor Du anfängst:** einen offenen Tisch **neu laden** (ein offener Tisch hält die alten Daten), und einen offenen Setup-Editor mit altem Stand **nicht speichern** — er nähme die Daten still zurück. Beachte: **das Öffnen eines Tisches (`/games/<Spiel-ID>/play?setupId=…`) überschreibt den Spielstand `Auto Save`** (er trägt zurzeit meinen Testtisch: Granny, drei Tableaus). Die benannten Spielstände sind unberührt.

---

## Was ich selbst gesehen habe (2026-11-10, im Browser)

**Der Dialog** (Multiplayer → Create Room → „TFT Aufbau"; **kein Raum angelegt, kein Tisch geöffnet**): das Feld **„Spieler"** steht zwischen „Toller Trödel" und „Dörfler 1", mit den fünf Wahlen „1 Spieler (Solo)" … „5 Spieler" und der Vorgabe **1**. **Die Wache greift am echten Dialog:** „3 Spieler" bei nur zwei Dörflern zeigt rot einen Problemtext (am 2026-11-10 noch englisch, seit 2026-11-11 deutsch: „3 Spieler, aber nur 2 Dörfler – …"), und „Create Room" ist **gesperrt**. (Das Bild liegt in der Sitzung.)

**Der NaN-Fix:** das Laden eines Tisches meldet keine Konsolenfehler mehr (vorher gut 500 je Aufruf).

---

## Was Du ansehen kannst — jeder Punkt eine Minute am Tisch

Zum Starten reicht der Dialog (Spieler wählen, Dörfler mit „+" dazu) oder die Adresse. **Die Wahlen heißen `s1` … `s5`:** `https://gaming.benjathi.de/games/072123c0-cd97-4ffb-a330-369630fab93f/play?setupId=b1e10f4e-b8f2-4c2a-bb3e-54643944121b&opt=spieler:s2&opt=doerfler3:Granny&opt=doerfler4:Blopsy` (die Spiel-ID gehört dazu; `/play?…` ohne sie findet keine Seite).

1. **Spieler 1 (die Vorgabe) ist der Tisch von Welle 1.** Auslage mit **6** Heldentaten, **ein** gemeinsamer Topf `Münzen (gemeinsam)`. **Eine Kleinigkeit ist anders:** das Dorf-Ereignis liegt in der Hand-Zone etwas weiter links (**15 Punkte**; vier Plätze statt drei).
2. **Spieler 2, vier Dörfler (Doppel-Modus):** **keine** Karte in der Heldentaten-Auslage; in jeder der vier Hand-Zonen **drei verdeckte** Heldentaten; **vier Töpfe** `Münzen Dörfler 1 … 4` unter den Tableaus zu **15** (kurze Partie) bzw. **10** (lange), **kein** gemeinsamer Topf; die Dorf-Ereignisse teilen **vier verdeckte** Karten aus.
3. **Spieler 3, drei Dörfler (Normalmodus):** wie 2.; der Ereignis-Stapel hat **105** statt 80 Karten (mit den 25 geheimen); **geheime Ereignisse sind verdeckt** und liest nur, wer sie zieht.
4. **Die Dorfphase** in 2. und 3.: **jeder Topf +6** (15 → 21); jede Hand wird auf **drei** aufgefüllt (nicht auf vier, auch wenn ein Ereignis darin lag); die Auslage bleibt leer; die geheimen Ereignisse gehen zurück in den Stapel. In Spieler 1: unverändert, +6 je Dörfler in den gemeinsamen Topf.
5. **Die vier Karten in einer Hand:** bei vier Plätzen im Abstand 90 **überlappen** die Karten (100 breit) um 10 Punkte, und die **äußeren ragen je 5 Punkte über den Zonenrand** hinaus (bei drei Plätzen lagen alle innerhalb). **Ist das lesbar genug?** Kosmetisch, gemessen, nicht gesehen.
6. **Ein alter Spielstand** (z. B. „Partie 14") lädt, die Dorfphase läuft wie vor Welle 2 (+18, Auslage), weil der gemeinsame Topf da ist. Alle 17 Spielstände sind in der Datenbank unverändert (Fingerabdruck).
7. **Im Raum:** zwei Spieler à zwei Dörfler, **zwei Browser**. **Das ist der Punkt, den noch niemand gespielt hat.** Anlegen, beitreten, starten, einen Zug.

---

## Durchlauf am 2026-11-11 (Claude, im Browser, gegen die Produktion)

Punkt 1–6 **bestätigt**, die Zahlen wie oben (Spieler 1: ein Topf zu 30, Auslage 6; Spieler 2/4 Dörfler: vier Töpfe zu 15, zwölf verdeckte Handkarten, Ereignis teilt vier aus; Spieler 3/3 Dörfler: Stapel 105; Dorfphase 15 → 21 bzw. gemeinsam 30 → 42; „Partie 14": +18). Punkt 5 ist lesbar, die Ereigniskarte ragt etwas über den Zonenrand. Nicht einzeln angesehen: der 15-Punkte-Versatz in Spieler 1 und die Auslage im alten Spielstand.

Punkt 7 **gespielt** (Raum `8NE7EP`, zwei Tabs): Anlegen, Beitreten, Starten, Aufbau gleich, ein Kartenzug kommt live an. Drei Befunde:

1. **Zähler wurden im Raum nicht abgeglichen** — der Client schickte nie `counter_update` (`docs/audit-dead-controls.md` Fund 1). Betrifft genau die Töpfe je Dörfler. *Behoben in `7a2bf71`.*
2. **Im Raum gibt es keine Aktionsknöpfe** (Kampf, Ereignis, Dorfphase) — so gewollt (M6 Nachtrag 2), im Raum spielt man Welle 2 von Hand. Eigener Meilenstein, falls gewünscht.
3. **Der „Create Room"-Dialog** war bei vier Dörflern höher als ein kleines Fenster, der Knopf unerreichbar. *Behoben in `63b3599`.*

---

## Fragen an Dich — die Antwort ändert etwas

1. **Reicht „keine Eigentumsrechte und keine Geheimhaltung"?** Wer welchen Dörfler führt, **vereinbart ihr** — der Tisch weiß es nicht und braucht es nicht (M31.18). **Jeder kann jede Hand bewegen und jede verdeckte Heldentat umdrehen**, für alle sichtbar. Geheim sind Heldentaten am Tisch nicht abgebildet (nur private Hand oder Ehrenwort) — das ist die Grenze der Engine, keine Entscheidung dieser Spec. *Reicht das für Euren Gebrauch?* Sonst ist es ein **eigener Meilenstein**: Zuordnung in den Daten, eine Farbe je Spieler (erst beim Beitritt zum Raum gewählt), `exclusive` an den Hand-Zonen.
2. **Die Doppelwahl auf Platz 2.** Platz 1 und 2 tragen **kein** `onlySeated` (M31.3: sie zählen immer). Wählst Du zweimal denselben Dörfler (z. B. Judy / Judy / Granny / Blopsy) **und** mehr als einen Spieler, hat **Platz 2 einen Topf und eine Hand ohne Dörfler** — vier Töpfe und vier befüllte Hände bei drei Sitzenden; die Dorfphase zahlt auch in den leeren Topf 6. Der erste Kampf deckt es sichtbar auf. **Dokumentiert, nicht behoben:** die Behebung hieße, Topf und Hand von Platz 2 zu gaten, auch in dem schon geschriebenen `aktionen-spieler`, und Platz 1 und 2 nicht mehr gleich zu behandeln. **Meine Empfehlung: so lassen** — Doppelwahl in einer Mehrspielerpartie ist ein Randfall. *Soll ich es beheben?*
3. **Der englische Problemtext im deutschen Dialog.** *Entschieden am 2026-11-11 (Auftraggeber): deutsch — erledigt.* `lageOf` liefert den Satz jetzt selbst: „3 Spieler, aber nur 2 Dörfler – es braucht mindestens so viele Dörfler wie Spieler." (Dialog, Raum-Modal, Fehlerantwort von `POST /api/rooms` und Start, Zeile im Aufbau-Protokoll). Es brauchte weder eine Übersetzung im Client noch zwei Sprachen in `shared/`: die Fehlerantworten waren schon deutsch, der Client zeigt den Text unverändert. Englisch bleiben nur die Meldungen über kaputte Daten, die kein Spieler sieht.
4. **Die zwei `ci:`-Commits auf dem Zweig `zone-nan-render`** (`docker-build.yml`: der Docker-Bau vom Wurzelverzeichnis, ein Platzhalter für den Tunnel-Token in der Compose-Prüfung). Sie gehören nicht zum NaN-Fix und sind **nicht** übernommen. Laut Commit-Text scheiterten beide Bauten des Pull-Request-Workflows an einem falschen Docker-Kontext (eine Altlast aus M6), und der Schritt „Validate Docker Compose" lief danach zum ersten Mal überhaupt mit. **Ich habe diesen Diff nicht im Einzelnen geprüft**, nur den Commit-Text gelesen. *Soll ich ihn ansehen und als eigenen Zweig führen?*

---

## Offen, zur Kenntnis

- **„Jeder" im Doppel-Modus ist „je Dörfler" gelesen** (Hausregel, nicht Text; `docs/tft-regeln.md` §13 Punkt 13): bei `S < D` hat ein Spieler mehr Geld, Heldentaten und Ereignisse als im Normalmodus. Für `S = 2, D = 3` oder `S = 3, D = 5` gibt es **gar keinen Regeltext**.
- **Die Lage hängt am gemeinsamen Topf:** löscht jemand `Münzen (gemeinsam)` von Hand, kippt die Lage der nächsten Dorfphase.
- **`fill` zählt Karten genau auf einem Platzpunkt** (Toleranz 0,5 Punkt): eine Heldentat, die jemand **neben** den Platz legt, zählt nicht — die Dorfphase teilt dann drei weitere aus. Was einrastet, zählt. Nimmt jemand seine Heldentaten in die **private Hand**, füllt die Dorfphase wieder auf drei auf.
- **Die Ladenerneuerung** („pro Dörfler 2 Münzen") bleibt nicht modelliert (M31.10), Münzen übergeben ist Handarbeit.
- **Dörfler 1 und 2 sind immer da**, auch wenn eine Doppelwahl einen Platz leer lässt — das ist der Grund zu Frage 2.
- **Jeder Push auf `master` ist ein Deploy** (`deploy.yml` hat `on: push`); „vor dem Deploy fragen" heißt „vor dem Push fragen". Steht in `CLAUDE.md`.

## Rückweg

`--zurueck` je Schritt, **zuerst `aufbau-spieler`**, dann `aktionen-spieler`, dann `haende` (`docs/datenzugriff.md`). Die Sicherungen liegen im Scratchpad der Sitzung und sind gegen die Lesung des Skripts geprüft; der Rückwärtsbeweis ist für alle drei Schritte auf einer Kopie der Produktion **gefahren**, nicht nur gerechnet.

## Fertig, wenn

Du Punkt 1–6 abgehakt oder einen Befund genannt hast, **Punkt 7 gespielt** (oder ausdrücklich verschoben) und die **Fragen 1–4** beantwortet sind. Kein Befund hält die Produktion auf: mit der Vorgabe 1 verhält sie sich **wie vor Welle 2** (am echten Datenbestand gemessen).
