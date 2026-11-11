# Aufgaben: Eigentum im Raum — wer welchen Dörfler führt, wer welche Hand lesen darf (Spec M32)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M32** (ganz unten). **Auftrag (Auftraggeber, 2026-11-11):** Frage 1 aus `docs/m31-welle2-abnahme.md` — „keine Eigentumsrechte und keine Geheimhaltung" reicht **nicht**, also ein eigener Meilenstein: Zuordnung Spieler↔Dörfler, eine Farbe je Spieler (erst beim Beitritt zum Raum gewählt), `exclusive` an den Hand-Zonen. M32 ändert damit M31.18 für Räume mit mehr als einem Spieler. **Umfang entschieden am 2026-11-11 (Spec M32.13): Stufe A — Rechte und Blick, kein Sichtfilter am Server; Ziehen geht in die private Hand, von dort offen auf den Tisch oder verdeckt in die eigene Hand-Zone; Speichern im Raum bleibt erlaubt.** Technische Geheimhaltung ist ein **späterer, eigener Meilenstein** (unten, „Später").
Vorgeschichte: `docs/tasks-m31-doerflerzahl.md` (Welle 2: die Lagen, die Hand-Zonen `FF`, **dieselbe Vorlage** für Daten und Schreiben), `docs/m31-welle2-abnahme.md` (Frage 1, der Raum-Durchlauf), `docs/datenzugriff.md` (**Pflicht**, bevor Produktionsdaten auch nur gelesen werden), `docs/audit-dead-controls.md` (Fund 1/9: was im Raum nie ankam).

**Aufgabenbuchstaben.** Der höchste vergebene ist `FJ` (M31 Welle 2). M32 geht von **`FK` bis `FT`**; geprüft: diese Buchstaben stehen als Aufgabenüberschrift in keiner `docs/tasks-*.md`. (`FF` heißt im Spiel *Final Fight*, siehe den Kopf von `tasks-m31-doerflerzahl.md` — **Aufgabe `FF`** ist die Hand-Zonen-Aufgabe von M31, nicht Teil von M32.)

**Reihenfolge.** Reines Rechnen, alles gegen Fixtures, ohne Produktion: `FK` (Zuordnung, Zonenbindung) · `FL` (die Wache; rechnet mit Zonen, die schon Farbe und `exclusive` tragen) · `FM` (Blick und die reinen Teile der Hand im Client; ebenso) → `FN` (Raumstart; braucht `FK`) → `FO` (Handler; braucht `FL`, `FN`) → **`FU`** (die private Hand im Raum; **neu**, braucht `FL`, `FN`) → `FP` (zwei echte Verbindungen; braucht `FN`, `FO`, `FU`) → `FQ` (Client und Lobby; braucht `FM`, `FU`; **kein Test, nur Bau und Sichtprobe**) → **`FR`** (Deploy beider Images) → `FS` (Daten, **der Schalter** der Eigentumsrechte; Teil 1 darf vor `FR`, Teil 2 erst danach) → `FT` (Dokumente, Liste für den Auftraggeber).
**Code vor Daten ist für die Eigentumsrechte folgenlos** (M32.7 Nr. 4) — **nicht aber für die private Hand:** `FU` und `FQ` wirken sofort in **jedem** Raum (M32.7 Nr. 8). Beides ist **an der Quelle zu prüfen, nicht nach der Form der Daten einzuordnen** (M31.12-Nachtrag: `ES` war es nicht). **Jeder Push auf `master` ist ein Deploy** (`CLAUDE.md`, `on: push`): „vor dem Deploy fragen" heißt „vor dem Push fragen". Der Agent committet und pusht nicht.

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die ihn grün macht. Tests: `cd server && npm test` (Node-Runner, keine Test-Dependency; **am Anfang jeder Aufgabe neu messen**, der Stand nach M31 war 2 460 + die Nachträge vom 2026-11-11). Bau: `cd client && npx vite build` — **keine neue** Warnung (zwei vorbestehend). **Der Client hat keine Testinfrastruktur** (`CLAUDE.md`): reine Rechnung gehört nach `shared/` und wird aus `server/test/` geprüft; was nur Oberfläche ist (`GameTable.jsx`, `RoomLobby.jsx`), prüft der Bau und die Sichtprobe — die Aufgabe sagt dann, **was geprüft wurde und was nicht**. Es gibt **eine** Stelle je Sache (M6): Zuordnung, Zonenbindung, Wache, Blick stehen **nur** in `shared/ownership.js` (die reinen Teile der Hand im Client in `client/src/utils/roomHand.js`); Server und Client importieren dieselbe Datei (Wurzelkontext, `shared/` neben der App). Räume sind im Speicher (`roomStore.js`); Tests mit `app.inject()` und, wo ein WebSocket gebraucht wird, mit dem `ws`-Client auf einem Ephemeral-Port (`server/test/ws-auth.test.js`, `room-lage.test.js` zeigen beide Muster); Zeitstempel flattern (`CLAUDE.md`: Sekundenauflösung), Zeilen nicht über Sekundengrenzen vergleichen.
**Kein `--force`**, nirgends. Produktionsdaten **nur** in `FS` Teil 2: Spalte `zone_data`, vorher Sicherung ins **Scratchpad, nicht ins Repo**, nach `docs/datenzugriff.md`; **`grid_data`, `state_data`, `save_states`, `scenario_data`, `sequence_data`, `action_data`, `table_assets` nie.** Zugang zur Produktion (nur dort): `ssh -o UserKnownHostsFile=<Scratchpad>/known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes root@192.168.178.96`; Python auf diesem Rechner ist `py`. **Nicht an `gaming.benjathi.de` anmelden, keine Passwörter eingeben.** Skripte gehören nach `/app/<name>.mjs` im Container; ein neu angelegter Container hat sie nicht mehr — vor jedem Lauf die **Anwesenheit** prüfen, nicht nur den Hash.

---

## Wo die Spec nicht stimmt (der Auftrag und die Skizze)

Die Skizze der Abnahmeliste ist an Code und Daten gemessen worden; an diesen Stellen trägt sie nicht (Quelle: Spec M32.1, mit Datei:Zeile). **Nr. 1–4 ändern den Zuschnitt, 5–9 ändern Aufgaben.**

1. **`exclusive` in den Daten sperrt jeden aus.** `isActionAllowed` (`server/src/websocket/messageHandler.js:98-112`) vergleicht `zone.color === player.color`; die Hand-Zonen haben `color: null` (M31.14). Mit `exclusive: true` in `zone_data` weist der Server **in jedem Raum, auch im Solo-Raum,** jeden an jeder Hand ab. Die Daten tragen darum nur eine **Bindung** (`platz: n`); `exclusive` und Farbe setzt der **Raum beim Start** auf seine Kopie (M32.3, M32.9).
2. **„Zuordnung in den Daten" geht nicht, weil ein Aufbau statisch ist.** Die Spieler stehen erst im Raum. Die Zuordnung Platz → Spieler rechnet der Start aus `S`, `D` und der Sitzreihenfolge (M32.3).
3. **Die Farbe je Spieler gibt es schon.** Beim Anlegen und Beitritt gewählt (`rooms.js:70-80`, `198-229`, `UNIQUE (room_id, color)`); die Hand-Zone übernimmt sie. **Kein neues Feld, kein neuer Dialog.**
4. **`exclusive` ist ein halber Schutz** (M32.1 Nr. 2): nur der Zielpunkt bei `card_move`, nichts bei Stapeln, **rohe Zonen** (die verankerten Hand-Zonen 3–5 trifft die Wache nie), und der Client wertet `error` nicht aus.
5. **„Verdeckt" ist am Draht keine Geheimhaltung — und bleibt es in M32** (M32.1 Nr. 4, **entschieden: Stufe A**). Der Auftraggeber verlangt, dass es am Bildschirm der Mitspieler unsichtbar ist; die Entwicklerwerkzeuge dürfen es lesen.
6. **Die private Hand ist im Raum ein halber Weg** (M32.1 Nr. 5): Client-Zustand, jedes `welcome` leert sie, kein Tisch sieht den Stapel schrumpfen (`stack_size_update` wird ignoriert), Ausspielen und Aufnehmen ändern nur den eigenen Tisch. M31.17 hatte recht, die Heldentaten auf dem Tisch zu lassen — **aber der Auftraggeber verlangt, dass Karten zuerst in die private Hand gehen** (Nr. 7), also wird der halbe Weg **Pflicht** (`FU`).
7. **Der Ziehweg des Auftraggebers geht über die private Hand** (M32.13 Nr. 8): Stapel → private Hand → offen auf den Tisch **oder** verdeckt in die eigene Hand-Zone. Heute kommt davon im Raum **nichts** bei den anderen an (M32.1 Nr. 10). Gebaut wird die Hand als **Server-Zustand** (`FU`), die Wege im Client (`FQ`); der erste Entwurf (ein Stapelmenü-Eintrag mit `stack_take_top`) **entfällt**.
8. **Räume führen keine Aktionen** (M6 Nachtrag 2): Nachziehen und Ereignisse geschehen im Raum von Hand — darum ist die private Hand der Weg, den sie nehmen.
9. **Spieler-IDs sind im Raum öffentlich** (M32.1 Nr. 8): Eigentum schützt vor Versehen, nicht vor einem Mitspieler, der sich als ein anderer verbindet. Kein Teil von M32.

---

## Entscheidungen

### Vom Auftraggeber, 2026-11-11 (Spec M32.13)

1. **Eigentum ist ein eigener Meilenstein, nicht ein Nachtrag zu M31**, mit der Skizze aus der Abnahmeliste.
2. **Geheim: Stufe A (Rechte und Blick), kein Sichtfilter am Server in M32.** Die Mitspieler sehen nur eine Rückseite in die Hand wandern, nie die Vorderseite (Animation, Vorschau, Hover, Hinweise, Zähler, Zoom); die Entwicklerwerkzeuge dürfen sie lesen. Technische Geheimhaltung ist ein späterer Meilenstein. *Umkehr:* Stufe B — siehe „Später".
3. **Zuordnung automatisch in Blöcken nach der Reihenfolge der Beitritte**, die Lobby zeigt sie vorher, nach dem Start fest. *Umkehr:* Wahl in der Lobby oder im Dialog — ein Weg, eine Spalte, ein Abgleich beim Beitritt.
4. **Eigentum nur bei „Spieler" ≥ 2 im Dialog; der Start verlangt genau `S` Spieler** (409, deutsch). *Umkehr:* aus der Zahl der Beitretenden ableiten — der Raum „ohne Wahl" bekäme Rechte, die niemand gewählt hat.
5. **Nur die Hand-Zonen gehören einem Spieler.** *Umkehr:* Töpfe, Marker, Wertleisten — jede Sperre braucht eine Bindung Zähler/Marker → Platz und einen Weg „übergeben".
6. **`leave` → Hand-Zone offen; offline → bleibt gesperrt; kein Eingriff des Hosts.**
7. **Speichern im Raum bleibt erlaubt** — der Save-Knopf wird **nicht** gesperrt (die erste Antwort „gesperrt" ist **umgekehrt**). Die Grenze steht in der Spec (M32.8): ein Spielstand trägt nur die private Hand des Speichernden.
8. **Der Ziehweg geht über die private Hand** (wörtlich in Spec M32.13 Nr. 8): Ziehen geht in die private Hand (heute schon unsichtbar für Mitspieler); aus ihr legt der Spieler **offen auf den Tisch** oder **in seine eigene Hand-Zone** (die „unsichtbare Spielerzone": Mitspieler sehen Rückseiten, der Eigentümer die Vorderseite — der Blick). *Der erste Vorschlag des Schreibers (Stapelmenü-Eintrag mit `stack_take_top`) entfällt.*

### Vom Schreiber (Vorschlag, nicht bestätigt; *Umkehr* nennt den Preis)

9. **Die Daten tragen `platz: n` an den fünf Hand-Zonen; `exclusive` und Farbe setzt der Raum beim Start auf seine Kopie** (M32.3, M32.9). *Umkehr:* `exclusive` und Farbe in `zone_data` — sperrt jeden aus (Nr. 1 oben) und bräuchte eine Farbe, die es zur Zeit des Schreibens nicht gibt.
10. **Ein Feld statt des Namensmusters `zhand<n>`** (M32.9). *Umkehr:* das Muster — spart `FS`, aber ein umbenanntes Label macht das Eigentum lautlos wirkungslos.
11. **Die Formel der Blöcke `⌊(n−1)·S/D⌋ + 1`, Rang nach Reihenfolge der Sitze** (M32.3). *Umkehr:* reihum (1,2,1,2) — trennt nebeneinander liegende Tableaus vom Führenden.
12. **Ablehnung = `error` plus der wahre Stand in den vorhandenen Nachrichten, nur an den Absender** (M32.4). *Umkehr:* ein neuer Nachrichtentyp oder `board_sync` — mehr Client-Code für dieselbe Wirkung.
13. **Der Server hält die private Hand** (`room.hands`) und ist ihre einzige Quelle; der Client sendet Wünsche und wendet die Rückmeldung an, **keine optimistische Änderung** (M32.6). *Umkehr:* die Hand bleibt Client-Zustand und der Server kennt nur Zähler — dann kann kein Tisch den Stapel schrumpfen sehen, Ausspielen kommt nicht an, und jedes `welcome` leert die Hand (M32.1 Nr. 5).
14. **Der Server setzt `faceDown` beim Ausspielen nach dem Ziel** — Ziel in der eigenen Hand-Zone: verdeckt; sonst offen; Ziel in fremder Hand-Zone: abgewiesen, die Karte bleibt in der Hand (M32.6). *Umkehr:* der Client entscheidet — ein Client, der es vergisst, zeigt die Vorderseite.
15. **`pickUpToHand` wird abgeglichen** (`card_pickup_to_hand`), nicht als Grenze genannt (M32.6). *Empfehlung des Schreibers:* sonst bleibt eine aufgenommene Karte bei allen anderen in der Zone liegen — das Geheimnis wäre ein Geist. *Umkehr:* im Raum mit Eigentümern den Eintrag „Pick up" sperren und als Grenze nennen — weniger Code, aber ein toter Griff.
16. **Die Hand wird in jedem Raum abgeglichen, nicht nur mit Eigentümern** (M32.6, M32.7 Nr. 8). *Umkehr:* nur Räume mit Eigentümern — der Client kennt dann zwei Wege für dieselbe Tat.
17. **„Draw Card" im Stapelmenü nimmt den Weg der Zahlentasten** (`card_draw_to_hand`) statt `pickUpToHand` (M32.6). *Umkehr:* es bleibt lokal — zwei Wege für dieselbe Tat, einer davon ohne Wirkung für die anderen.
18. **Der Zähler `handCardCount` wird aus der Hand abgeleitet; `hand_count_update` des Clients wird ignoriert** (M32.6). *Umkehr:* beide Quellen — das erste `welcome` nach dem Neuladen überschriebe die Zahl mit 0.
19. **Nichts wird dauerhaft gespeichert; keine neue Spalte** (M32.3, M32.8). *Umkehr:* `game_rooms.owners` — wäre eine zweite Quelle neben `setup_choices` und den Sitzen. (Die Hände im Speicher: M32.8.)
20. **Alles Rechnende in `shared/ownership.js`, die reinen Teile des Clients in `client/src/utils/roomHand.js`** (M6). *Umkehr:* die Wache im Handler — zwei Antworten darauf, wem eine Karte gehört.

---

## FK — Zuordnung und Zonenbindung: `ownersOf`, `bindZones` (M32.3)

**Befund.** Es gibt keine Rechnung für „wer führt welchen Platz", und die Zonen kennen keinen Platz. Die Rechnung ist **rein**, ohne Raum, ohne Datenbank; sie bekommt Zahlen und Listen.

**Test zuerst** (`server/test/ownership-owners.test.js`; Importe aus `../../shared/ownership.js`). Rot, solange es fehlt:
1. **`ownersOf(S, D)`** (Rang je Platz, Platz 1 … D): (2,2) → `[1,2]` · (2,3) → `[1,1,2]` · **(2,4) → `[1,1,2,2]`** · (3,4) → `[1,1,2,3]` · (3,5) → `[1,1,2,2,3]` · (2,5) → `[1,1,1,2,2]` · (5,5) → `[1,2,3,4,5]`. Eigenschaft über alle `S ≤ D ≤ 5`: jeder Rang 1 … S kommt **mindestens einmal** vor, die Ränge sind **nicht fallend**, Platz 1 gehört Rang 1.
2. **Kein Eigentum:** `S = 1`, `S > D`, keine Zahl, `kind` `solo` oder `null` → **`null`** (kein Wurf, kein leeres Objekt: `null` ist die Auskunft „hier gilt es nicht").
3. **`ownersOfPlayers(lage, players)`** (`lage` = Ergebnis von `lageOf`, `players` = `[{ id, seat, color }]`): Ränge nach **aufsteigendem Sitz**, **nicht nach Sitznummer** (Sitze `1, 3, 4` → Rang 1, 2, 3); unabhängig von der Reihenfolge des Arrays; liefert `{ [platz]: { id, color } }`. **Zahl der Spieler ≠ `S`** → `{ problems: ['… braucht genau 2 Spieler, im Raum sind 1'] }` (deutsch, mit beiden Zahlen), kein Eigentum. `lage` ohne `kind` (`null`/`solo`) → `null`.
4. **`bindZones(zones, owners)`**: jede Zone mit `platz` ≤ D bekommt `color` (Farbe des Eigentümers) und `exclusive: true`; **alle anderen Zonen sind dasselbe Objekt** (`===`, nicht nur gleich); die Eingabe wird **nicht** verändert; `platz` > D (ein leerer Platz) bleibt unberührt; `owners` `null` → **dieselbe Liste** zurück (`===`) — der Beleg für M32.7.
5. **Warnungen:** `bindZones` meldet (`warnings`) jeden Platz 1 … D, zu dem **keine** Zone mit `platz` gehört — namentlich („Platz 3: keine Hand-Zone mit `platz`"); keine Warnung bei vollständiger Bindung. (Der Raum startet trotzdem, M32.7 Nr. 4.)
6. **Die Fixture ist die echte:** die Hand-Zonen aus `server/test/fixtures/auslagen-kurzpartie.json` (mit `EU` und `FF` angewendet — der Baustein `scripts/doerflerzahl-daten.mjs` rechnet den Stand), mit `platz` 1 … 5 versehen, bekommen die erwartete Farbe; `resolveZones` und ein Editor-Rundlauf (`{ ...zone, ...patch }`) **verlieren `platz` nicht** (Beleg für M32.9).

**Dann:** `shared/ownership.js` mit `ownersOf`, `ownersOfPlayers`, `bindZones` — nur Rechnen, keine Importe außer `anchoring.js`, wo nötig. Kein Raum, kein Server.

**Fertig, wenn:** die Tests grün sind; alle bestehenden Tests unverändert grün sind; `npm test` grün ist.

**Berichtigung beim Bau (FK, 2026-11-11).** `bindZones` gibt **`{ zones, warnings }`** zurück, nicht die Liste allein: Nr. 4 („dieselbe Liste zurück“) heißt `result.zones === zones` bei `owners` `null` (oder einem Problem-Ergebnis von `ownersOfPlayers`), und Nr. 5 verlangt `warnings` – beides geht nur in einer Hülle. `FN` ruft also `const { zones, warnings } = bindZones(liveRoom.zones, owners)`. Der Satz bei falscher Spielerzahl: „Der Raum braucht genau 2 Spieler, im Raum sind 1.“ (`FN` Nr. 2 prüft ihn am 409).

---

## FL — Die Wache: `mayTouch`, mit aufgelösten Zonen (M32.4)

**Befund.** `isActionAllowed` (`messageHandler.js:98-112`) hat die Mängel (a) bis (d) aus M32.1 Nr. 2. Die Wache wird **eine reine Funktion**, die Handler rufen sie (`FO`); hier entsteht nur die Rechnung.

**Test zuerst** (`server/test/ownership-guard.test.js`). Rot, solange es fehlt:
1. **`mayTouch(zones, players, color, x, y)`** — ein Punkt in einer fremden `exclusive`-Zone → `false`; in der eigenen → `true`; außerhalb → `true`; Zone `type: "shared"` mit `exclusive` → ignoriert; **die Fälle der alten Wache bleiben**, Fall für Fall (Kopie der Erwartungen von `isActionAllowed`).
2. **Der Befund als Test (rohe Zonen).** Eine verankerte Zone ohne absolute Box (`Hand Dörfler 3` wie `handRelativ` sie schreibt) und ein Tableau-Token an seiner Stelle: gegen die **rohe** Liste meldet die alte Rechnung `true` (**nicht geschützt**), gegen `resolveServerZones(boardState, zones)` (neu: `resolveZones(zones, anchorBoxes(boards, tokens))`, wie `rooms.js:373`) `false`. **Der Test ist der Grund für die Auflösung.**
3. **Das Tableau wandert, die Hand mit:** nach einem `token_move` des Tableau-Tokens liegt der geschützte Bereich an der **neuen** Stelle.
4. **`exclusive` ohne Farbe sperrt niemanden aus** (M32.1 Nr. 2d): `color: null`, `exclusive: true` → `true` für alle.
5. **Eigentümer weg:** kein Spieler zur Zonenfarbe in `players` → die Zone ist offen (`true`); ein Spieler, der nur **offline** ist (`isConnected: false`, noch in `players`) → die Zone bleibt gesperrt.
6. **Mehrere Zonen am Punkt:** liegt der Punkt in einer fremden **und** einer neutralen Zone, gilt er als fremd (unabhängig von der Reihenfolge der Liste).
7. **`mayTouchCard(zones, players, color, card, dest)`** (die Handlung an einer Karte): verbietet, wenn **Ort jetzt** (`card.x`, `card.y`) **oder** Ziel fremd ist (Mangel a); innerhalb der eigenen Zone, aus ihr heraus und hinein — verdeckt wie aufgedeckt — erlaubt (**keine** Regel „erst aufdecken": die gehörte zum Sichtfilter, Stufe B).
8. **Ohne Eigentümer ändert sich nichts:** Zonenliste ohne Farbe/`exclusive`, leere Liste, `null` → `true`, **kein Wurf**.

**Dann:** `mayTouch`, `mayTouchCard`, `resolveServerZones` in `shared/ownership.js`. Die Handler bleiben in dieser Aufgabe unberührt (`FO`).

**Fertig, wenn:** die Tests grün sind; bestehende Raum-Tests (`stack-move-room.test.js`, `ws-auth.test.js`) unverändert grün; `npm test` grün.

---

## FM — Der Blick und die reinen Teile der Hand im Client: `seesFace`, `playedCard`, `removeDrawn`, `handFromServer` (M32.5, M32.6)

**Befund.** Der Client zeichnet jede `faceDown`-Karte als Rücken, auch die des Eigentümers; und er wendet drei Nachrichten falsch an: `card_play_from_hand` setzt jede Karte **offen** (`GameTable.jsx:3754-3765`), `stack_size_update` wird **ignoriert** (3750), `draw_response` vergibt eine **eigene** `handId` (3771 ff.). Das alles ist **reine Rechnung** und gehört — weil der Client keine Testinfrastruktur hat — nach `shared/ownership.js` bzw. `client/src/utils/roomHand.js`, aus `server/test/` geprüft (Muster: `roomBoardState.js`, `tableObjectView.js`).

**Test zuerst** (`server/test/ownership-view.test.js`, `server/test/room-hand-client.test.js`; Zustand aus dem Executor an der echten Fixture). Rot, solange es fehlt:
1. **`seesFace(zones, card, myColor)`:** wahr für `faceDown` in einer Zone mit **meiner** Farbe und `exclusive`; falsch in fremder Zone, falsch für eine aufgedeckte Karte, falsch ohne `myColor` (`null`/`undefined`: Hotseat), falsch ohne Zonen, falsch außerhalb jeder Zone. Die Funktion verändert `card` und `zones` nicht (bytegleich).
2. **`playedCard(msg, maxZ)`** — aus `card_play_from_hand`: übernimmt **`faceDown` aus der Nachricht** (`true` bleibt `true`, `false` bleibt `false`; **fehlt es: offen**, das Verhalten von heute), `inStack: null`, `rotation` aus der Karte (nicht fest 0, wo die Nachricht eine trägt); **der Befund als Test:** mit der Kartenform, die der Server verteilt (`faceDown: true`), liefert sie **verdeckt** — die alte Anwendung lieferte offen. Dieselbe `tableId` schon am Tisch → **keine Doppelung** (die Liste kommt unverändert zurück).
3. **`playedCard` und die Hand:** `isOwnEcho(msg, myPlayerId)` — wahr, wenn `msg.from_player_id` der eigene ist; dann entfernt `removeHandCard(hand, msg.hand_id)` die Karte aus der Hand (Rückmeldung des Servers, **keine** optimistische Änderung).
4. **`removeDrawn(cards, msg)`** — aus `stack_size_update { stack_id, size, removed }`: entfernt genau die Karten mit diesen Ids; bleibt **eine** Karte im Stapel, ist es keiner mehr (`inStack: null`, die Regel von `performSplit`); unbekannte Ids ändern nichts; `stack_removed` (bestehend) bleibt wie es ist. **Kein Name, kein Bild** steht in der Nachricht, die sie liest (das Gestell des Tests prüft es: nur Ids).
5. **`handFromServer(cards)`** — aus `welcome.hand` und `draw_response`: macht Handkarten mit der **`handId` des Servers** (fehlt sie: eine neue), `cardId` (aus `cardId` oder `id`), `name`, `image_path`, `card_back_id`, `width`, `height`; leere/fehlende Liste → `[]`.
6. **Die Ankunft bei den anderen ist verdeckt:** eine Karte mit `faceDown: true`, wie sie `card_play_from_hand` in eine fremde Hand-Zone verteilt, gibt durch `tableObjectView` **weder Namen noch Bildunterschrift** frei (`hidden: true`, `name: ''`, `caption: 'Face down'`) — ein Test mehr neben `hidden-object-name.test.js`.

**Dann:** `seesFace` in `shared/ownership.js`; `playedCard`, `isOwnEcho`, `removeHandCard`, `removeDrawn`, `handFromServer` in `client/src/utils/roomHand.js`. **Keine Verdrahtung** — `FQ`.

**Fertig, wenn:** die Tests grün sind; `npm test` grün.

---

## FN — Der Raumstart: genau `S` Spieler, Zuordnung, Zonenkopie (M32.3, M32.7)

**Befund.** `POST /api/rooms/:code/start` (`rooms.js:269-396`) prüft nicht, wie viele Spieler im Raum sind (nur die Lobby, `RoomLobby.jsx:210`) und lädt die Zonen roh (316, 379). `GET /api/rooms/:code` sagt nichts über die Zuordnung.

**Test zuerst** (`server/test/room-start-ownership.test.js`, Muster `room-lage.test.js`: Setup aus der Fixture in die Wegwerf-Datenbank, `app.inject()`). Rot, solange es fehlt:
1. **`spieler s2`, vier Dörfler, zwei Spieler** → 200; `getRoom(code).zones`: `zhand1`/`zhand2` mit der Farbe des Hosts, `zhand3`/`zhand4` mit der des Gastes, alle `exclusive: true`; **`setups.zone_data` in der Datenbank bytegleich** (sha vor/nach); die Zonen des Setups sind sonst Zeichen für Zeichen gleich.
2. **Falsche Zahl:** ein Spieler (bei `s2`) → **409** mit deutschem Satz, der beide Zahlen nennt, **vor** dem `active` (`status` bleibt `waiting`, der Raum läuft nicht mit leerem Tisch — derselbe Fehler, den `FC` am Start schon einmal gefangen hat); drei Spieler (bei `s2`) → 409.
3. **`solo` (Vorgabe `s1`), zwei Spieler** → 200, **`room.zones` deepEqual `zone_data`** (nichts gebunden), `room_started` an beide **gleich** dem von heute. Ebenso **ein Aufbau ohne `villagers.lage`** und **Daten ohne `platz`** (Warnung im Log, Start 200, nichts gebunden für den fehlenden Platz).
4. **`welcome` und `room_started` tragen die gebundenen Zonen** (Farbe, `exclusive`), und der **Zustand** ist unverändert (kein Filter, Stufe A): beide Spieler bekommen **denselben** `board_state`.
5. **`dealStartingHands` tut nichts** an den gebundenen Zonen (M32.1 Nr. 3): kein `draw_response`, `handCardCount` 0.
6. **`GET /api/rooms/:code`** trägt `lage: { players, villagers, kind }` und `plaetze: [{ platz, rang }]` (aus `lageOf` und `ownersOf`; `null`, wo es nicht gilt) — die Lobby zeigt es (`FQ`); der Rest der Antwort ist **unverändert** (`deepEqual` gegen die Antwort von heute für einen Raum ohne Lage).

**Dann:** im Start, **nach** dem Aufbau und **vor** dem Rundruf (zwischen `rooms.js:379` und `387`): `lageOf` → `ownersOfPlayers` → `bindZones` auf `liveRoom.zones`; Problem → 409 (vor dem `active`, also **vor** 303 — die Prüfung steht bei den anderen Wachen, 283-301). Warnungen wie die der Aufbauschritte (`fastify.log.warn`, 358-364). Der Rundruf `room_started` bleibt **ein** Rundruf.

**Fertig, wenn:** die Tests grün sind; `room-lage.test.js`, `room-setup-choices.test.js`, `room-start-sequence.test.js` **unverändert** grün sind; `npm test` grün ist.

---

## FO — Die Handler: Wache an allen Stellen, Zurückspringen (M32.4)

**Befund.** Mangel (a), (b), (e) (M32.1 Nr. 2): der Absender erfährt von der Ablehnung nichts Brauchbares, und die Stapel-Handler prüfen nichts. *(Der frühere Punkt „`stack_take_top` legt verdeckt ab" ist **gestrichen**: der Ziehweg geht über die private Hand, `FU`. `stack_take_top` bekommt nur die Wache, weil der Handler besteht, auch wenn kein Client ihn sendet.)*

**Test zuerst** (`server/test/ownership-handlers.test.js`; Aufruf `handleMessage(room, playerId, JSON.stringify({...}))` mit gefälschten Verbindungen, die die Nachrichten sammeln). Rot, solange es fehlt:
1. **`card_move` in fremde Zone:** der Absender bekommt `error` **und** `card_move` mit dem **Stand des Servers** (Ort, `gridId`, `cell`); der Server ändert die Karte nicht; **kein anderer** bekommt etwas.
2. **`card_move` aus fremder Zone heraus** (Ziel neutral): abgelehnt, zurückgeschickt (Mangel a).
3. **Eigene Zone:** innerhalb, hinein, heraus — verdeckt wie aufgedeckt — wird angewandt und an die anderen gesendet.
4. **`card_flip` / `card_rotate`** an einer Karte in fremder Zone: abgelehnt, `card_flip`/`card_rotate` mit dem wahren Stand an den Absender; in der **eigenen** Zone angewandt und wie heute an die anderen gesendet (`card_flip` trägt **nur** `face_down` — nichts Neues).
5. **Stapel:** `stack_take_top` und `stack_move` mit Ziel in fremder Zone → abgelehnt (`error`, der Stapel ist **unverändert**); `stack_create` mit einer Karte aus fremder Zone → abgelehnt; mit Ziel in neutraler/eigener Zone verhalten sich alle drei **wie heute**.
6. **Eigentümer weg** (aus `room.players` entfernt): die Zone ist offen — dieselben Handlungen werden angewandt; ein nur **getrennter** Eigentümer (`isConnected: false`) lässt sie gesperrt.
7. **Nichts anderes ändert sich:** Zähler (`counter_update`), Token, Würfel, Notizen verhalten sich wie vor `FO`; ein **Solo-Raum** (`room.zones` ohne Farbe) bleibt für **alle** diese Nachrichten Zeichen für Zeichen wie vorher (Kopie der Erwartungen); `stack-move-room.test.js` und `ws-auth.test.js` **unverändert** grün. *(Die Nachrichten der Hand — `card_draw_to_hand`, `card_play_from_hand`, `card_pickup_to_hand`, `hand_count_update` — gehören `FU`.)*

**Dann:** die alte `isActionAllowed` weicht `mayTouchCard`/`mayTouch` (gerufen mit `resolveServerZones(room.boardState, room.zones)`); `rejectTo(room, playerId, card, text)` schickt `error` und den wahren Stand (**eine** Hilfe, nicht fünf Kopien).

**Fertig, wenn:** die Tests grün sind; alle bestehenden Raum-Tests unverändert grün; `npm test` grün.

---

## FU — Die private Hand im Raum: der Server hält sie (M32.6) — *neu, steht in der Reihenfolge zwischen `FO` und `FP`*

**Befund** (M32.1 Nr. 5): im Raum ist die private Hand ein halber Weg. Ziehen nimmt die Karte aus dem Stapel des **Servers**, aber kein Tisch sieht ihn schrumpfen (`stack_size_update` wird ignoriert, 3750; der Tisch des Ziehenden räumt nichts auf, 3217-3220); die Hand ist Zustand des Clients (`handCards`) und das `welcome` leert sie (`loadGameState`, 4197); Ausspielen (`playCardFromHand`, 3269) und Aufnehmen (`pickUpToHand`, 3193) ändern nur den eigenen Tisch; der Server hat `card_play_from_hand` (`messageHandler.js:149-163`), vertraut aber der Karte aus der Nachricht, und kein Client sendet es. **Zu bauen:** M32.6, Tabelle „Wunsch → Server → Rückmeldung". Das ist der Teil, der sich **in jedem Raum** auswirkt (M32.7 Nr. 8).

**Test zuerst** (`server/test/room-hand.test.js`; `handleMessage` mit gefälschten Verbindungen, ein Raum mit Stapel und Zonen aus der Fixture; für die Ablehnungen ein Raum mit gebundenen Hand-Zonen aus `FK`). Rot, solange es fehlt:
1. **Ziehen:** `card_draw_to_hand { stack_id, count: 2 }` → der **Ziehende** bekommt `draw_response` mit zwei Karten **mit `handId`**; **jeder** Spieler (auch er) bekommt `stack_size_update { stack_id, size, removed: [zwei tableIds] }` — **die Nachricht enthält keinen Namen und kein Bild** (kein Wert der Karten steht im JSON); der Server hat die Karten in `room.hands` des Ziehenden, **nicht** in `boardState`; `stack.card_ids`/`table_ids` sind aktuell. Der **andere** Spieler bekommt **kein** `draw_response`. Zieht er die **letzte** Karte: `stack_removed` (besteht), der Stapel verschwindet. `count` größer als der Stapel: so viele wie da sind (besteht).
2. **Der Zähler ist abgeleitet:** nach jedem Ziehen, Ausspielen, Aufnehmen bekommen **alle** `player_hand_count` mit der Länge der Hand; `hand_count_update` des Clients **ändert nichts** (der Server ignoriert es, auch mit einer erfundenen Zahl).
3. **Ausspielen offen:** `card_play_from_hand { hand_id, x, y }` mit Ziel auf freier Tischfläche → die Karte liegt in `boardState.cards` mit `faceDown: false`, `zIndex` obenauf, `inStack: null`, aus der Hand verschwunden; **alle** (auch der Absender) bekommen `card_play_from_hand { card, hand_id, x, y }`.
4. **Ausspielen in die eigene Hand-Zone:** Ziel in der eigenen gebundenen Hand-Zone → `faceDown: true` (**der Server setzt es**, auch wenn die Karte offen in der Hand lag); hat die Zone `snap`, liegt sie auf dem nächsten **freien** Platz (`snapPoint`, bei einer vollen Zone auf dem nächsten Platz — wie `snapPoint` es tut); die **Nachricht an die anderen trägt `card.faceDown: true`** (`FM` Nr. 6 sagt, was der Client daraus macht).
5. **Ausspielen in fremde Hand-Zone:** abgewiesen — `error` an den Absender, **sonst nichts**: die Karte bleibt in der Hand, `boardState` und Zähler unverändert, die anderen bekommen keine Nachricht.
6. **Der Server nimmt die Karte aus der Hand, nicht aus der Nachricht:** eine unbekannte `hand_id` → `error`, nichts ändert sich; eine `hand_id` aus der Hand **eines anderen** Spielers → abgewiesen; eine in der Nachricht mitgeschickte `card` (der alte Weg) wird **nicht** gelesen.
7. **Aufnehmen:** `card_pickup_to_hand { table_id }` an einer losen Karte auf dem Tisch oder in der **eigenen** Hand-Zone → sie ist aus `boardState.cards` verschwunden, in der Hand des Aufnehmenden, **er** bekommt `draw_response`, **alle** `card_removed { table_id }`; aus einer **fremden** Hand-Zone → abgewiesen (`error`, nichts ändert sich); eine Karte **im Stapel** oder eine unbekannte Id → `error`.
8. **`welcome.hand`:** das `welcome` trägt die **eigene** Hand und **nur** sie (der Gast sieht die des Hosts nirgends in seinem `welcome`); nach **Schließen und Neuverbinden** ist sie dieselbe (Beleg für „überlebt Neuladen und Wiederverbinden"); ein Spieler ohne Karten bekommt `hand: []`.
9. **`dealStartingHands`** (`rooms.js:431-475`, Voreinstellungen mit `dealStackId`) legt seine Karten **in die Hand** (`room.hands`), `handCardCount` stimmt, ein späteres `hand_count_update` überschreibt es nicht.
10. **Jeder Raum, nichts sonst:** in einem **Solo-Raum** (kein Eigentümer) mit zwei Spielern gelten 1–8 genauso (Ausspielen: **immer offen**, keine Zone hat einen Eigentümer); **alle anderen Nachrichten** (`card_move`, `card_flip`, `stack_*`, Zähler, Token) verhalten sich Zeichen für Zeichen wie vorher. Die Änderung ist **dieselbe** mit und ohne Eigentum (M32.7 Nr. 8) — ein Test hält es fest.

**Dann:** `createRoom` bekommt `hands: new Map()`; `handleCardDrawToHand`, `handleCardPlayFromHand` (neu geschrieben), `handleCardPickupToHand` (neu) in `messageHandler.js`; `hand_count_update` wird ignoriert (`handleHandCountUpdate` leitet aus `room.hands` ab oder entfällt); `roomWs.js` hängt `hand` an das `welcome` **dieses** Spielers; `dealStartingHands` füllt `room.hands`. Die Wache ist `mayTouch`/`mayTouchCard` aus `FL`, **keine zweite**. **Nicht in M32:** `hands` in `serializeBoardState` (der Raum überlebt keinen Neustart; M32.6 nennt die eine Zeile, wenn es so weit ist).

**Fertig, wenn:** die Tests grün sind; **im Bericht steht, was die Hand kostet** (Zeilen, Nachrichten, was sie nicht trägt: Neustart, neuer Tab, Reihenfolge); `npm test` grün.

---

## FP — Der Zwei-Spieler-Raum als Test: zwei echte Verbindungen (M32.8, M32.12)

**Befund.** Der Raum mit mehreren Spielern wurde bisher **von niemandem bis zum ersten Zug gespielt** außer einmal von Hand (`docs/m31-welle2-abnahme.md`, Durchlauf 2026-11-11); die Handler-Tests laufen mit gefälschten Verbindungen. Dieser Test ist die Kette **Anlegen → Beitreten → Starten → Zug** mit zwei `ws`-Clients.

**Test zuerst** (`server/test/room-two-players.test.js`; Ephemeral-Port, `ws`-Client, wie `ws-auth.test.js`; Setup aus der Fixture mit `platz` an den Hand-Zonen, `spieler s2`, vier Dörfler). Rot, solange `FN`/`FO`/`FU` fehlen:
1. **Anlegen/Beitreten/Starten** über die echten Wege (`POST /api/rooms`, `…/join`, `…/start`), je Spieler eine Verbindung; **beide** bekommen `room_started` mit den Hand-Zonen in den Farben ihrer Eigentümer.
2. **Rechte am Draht:** der Gast verschiebt eine Karte aus der Hand-Zone des Hosts → bekommt `error` und `card_move` (wahrer Stand); der Host sieht **nichts**; der Host verschiebt seine eigene → der Gast bekommt `card_move`.
3. **Ziehen:** der Host zieht zwei Karten vom Dorfereignis-Stapel → **beide** bekommen `stack_size_update` mit `removed` (nur Ids); der Host bekommt `draw_response`, der **Gast nicht**; `player_hand_count` des Hosts steht bei beiden auf 2; **in keiner Nachricht, die der Gast empfängt, kommt ein Kartenname oder ein Bildpfad der gezogenen Karten vor** (die Nachrichten werden mitgeschrieben, der Test sucht danach).
4. **Ausspielen:** der Host legt eine Karte **in seine Hand-Zone** → der Gast bekommt `card_play_from_hand` mit `card.faceDown: true`; der Host legt die andere **offen auf den Tisch** → `faceDown: false`; der Gast versucht, in die Hand-Zone des Hosts zu legen → `error`, die Karte bleibt in seiner Hand (`player_hand_count` unverändert).
5. **Aufnehmen:** der Host nimmt die Karte aus seiner Hand-Zone wieder auf → **beide** bekommen `card_removed`, der Host `draw_response`, der Zähler stimmt.
6. **Aufdecken:** der Host dreht eine Karte seiner Hand-Zone um → der Gast bekommt `card_flip` mit `face_down: false`.
7. **Neuverbinden:** der **Host** schließt und verbindet neu (`useGameRoom` tut es bei jedem Abbruch) → das neue `welcome` trägt **dieselben** Zonen (Farbe, `exclusive`), denselben Zustand **und seine Hand** (die Karten, die er noch hält); der Gast bekommt **keine** Hand des Hosts; die Rechte gelten weiter.
8. **Gehen:** der Host verlässt den Raum (`DELETE …/leave`) → der Gast bewegt eine Karte aus der früheren Hand-Zone des Hosts (Regel 2). **Getrennt, nicht gegangen:** schließt der Host nur seine Verbindung, bleibt seine Hand-Zone gesperrt.
9. **Solo-Gegenprobe im selben Test:** ein zweiter Raum mit der Vorgabe `s1` und zwei Spielern: alle Handlungen des Gastes an Karten des Hosts werden angewandt; **Ziehen, Ausspielen und Aufnehmen** laufen wie in 3–5 (die Hand-Ausnahme, M32.7 Nr. 8), ohne `faceDown: true`.

**Dann:** nichts im Code — dieser Test ist die Abnahme von `FN`, `FO` und `FU`; was er findet, geht dorthin zurück. Grenze: er läuft im selben Prozess (kein nginx, kein Cloudflare-Tunnel), **sieht keinen Bildschirm** (das tut `FQ`) und **spielt kein Spiel** (kein Kampf, keine Dorfphase).

**Fertig, wenn:** der Test grün ist und im Bericht steht, **was er nicht abdeckt**.

---

## FQ — Client und Lobby: Blick, die Hand-Wege, Hinweis, Zuordnung — und die Sichtprobe (M32.5, M32.6, M32.8)

**Befund.** Der Client kennt weder den Blick noch die Hand-Wege noch ein `error`; er sendet kein `card_play_from_hand`, kein Aufnehmen, und er wendet `card_play_from_hand` (offen), `stack_size_update` (gar nicht) und `draw_response` (eigene `handId`) falsch an (`FM` Befund); `loadGameState` leert die Hand bei jedem `welcome` (4197); die Lobby zählt `/6` und verlangt „mindestens 2" (`RoomLobby.jsx:155-160`, `210-212`). **Der Save-Knopf bleibt unberührt** *(vom Auftraggeber entschieden; der frühere Punkt „Save sperren" ist **gestrichen**)*.

**Kein Test** (der Client hat keine Testinfrastruktur, `CLAUDE.md`); die **Rechnung** steht in `FM` und ist dort geprüft. **Geprüft wird:** `cd client && npx vite build` ohne **neue** Warnung, **und die Sichtprobe unten** — beides im Bericht **einzeln** abgehakt oder als nicht geprüft genannt. **Zu bauen:**
1. **Blick** (`GameTable.jsx`, dort, wo `tableCards` gezeichnet werden, ab 5168): `seesFace(tableZones, card, room?.myColor)` → die Karte wird **aufgedeckt gezeichnet** (`faceDown: false` nur fürs Zeichnen; Hover und Vergrößern bekommen dasselbe Objekt) und trägt einen Ring/ein Zeichen „nur du siehst es"; der **Zustand** bleibt `faceDown: true`, „Flip" deckt wirklich auf. Ohne `room` (Hotseat) **kein** Pfad.
2. **Ausspielen** (`playCardFromHand`, 3269): **im Raum** sendet es `card_play_from_hand { hand_id, x, y }` (Welt-Koordinaten wie bisher, `screenToWorld`) und **ändert nichts lokal**; der Server antwortet allen mit `card_play_from_hand`, der Client wendet es mit `playedCard` an (`faceDown` aus der Nachricht, **nicht mehr fest offen**) und nimmt die Karte bei der eigenen Antwort aus der Hand (`isOwnEcho`, `removeHandCard`). Ohne `room` unverändert.
3. **Ziehen:** „Draw Card" im Stapelmenü (`GameTable.jsx:8157-8168`) und die Zahlentasten nehmen **im Raum** denselben Weg `card_draw_to_hand`; `stack_size_update` wendet der Client mit `removeDrawn` an (**bei jedem**, auch beim Ziehenden); `draw_response` benutzt `handFromServer` (die `handId` des Servers).
4. **Aufnehmen** (`pickUpToHand`, 3193): **im Raum** für eine lose Karte `card_pickup_to_hand { table_id }`, **lokal nichts**; `card_removed { table_id }` entfernt die Karte bei allen; eine Karte im Stapel nimmt den Weg von Nr. 3.
5. **Neuladen:** `useGameRoom.js` merkt sich `welcome.hand`; `GameTable` setzt `handCards` daraus **im selben Effekt, nach `loadGameState`** (`GameTable.jsx:3921-3928`), sonst gewinnt das `setHandCards([])` von 4197. Der Effekt `sendHandCountUpdate` (3883-3887) bleibt (der Server ignoriert ihn).
6. **`error`** als Hinweis (der vorhandene Toast, `saveToast`-Muster): `applyRemoteAction` und `useGameRoom` kennen heute kein `case 'error'`.
7. **Lobby** (`RoomLobby.jsx`): „n/S Spieler" (wo `lage.kind` mehrfach/normal ist), „Start" erst bei `S` (Titel nennt, was fehlt), unter jedem Spieler **welche Plätze** er führt (aus `plaetze` von `FN`); **ohne `lage`** bleibt die Lobby wie heute (`/6`, „mindestens 2").
8. **Die Farbe der Hand-Zonen** kommt über die Zonen (`ZoneOverlay` und `cardTint` lesen sie schon, `ZoneOverlay.jsx:25`, `shared/zoneGeometry.js:283`) — **nichts zu bauen, aber anzusehen** (Spec M32.12 „Offen und riskant" Nr. 8).

**Die Sichtprobe — Beleg für „die Mitspieler sehen auf dem Weg nirgends die Vorderseite"** (Spec M32.5). Zwei Tabs im selben Browser (`sessionStorage` je Tab: zwei Spieler), Raum mit `Spieler: 2`, **Tab B ist der Zuschauer** und bleibt die ganze Probe im Blick; Tab A zieht und spielt. **Jede Fläche einzeln, jeweils mit dem Ergebnis „Rücken/nichts" oder „Vorderseite gesehen"** (eine Vorderseite ist ein Befund und geht zurück an `FU`/`FQ`):
- **Weg 1 (Stapel → private Hand):** (a) A zieht von **Dorfereignis-Stapel** (Zahlentaste und „Draw Card"): **B sieht den Stapel um eine Karte kleiner werden** und die Zahl `✋` bei A steigen — **nichts sonst**; kein Name, kein Bild, kein Hinweis; die neue oberste Karte ist ein Rücken. (b) dasselbe mit dem **Heldentaten-Stapel**.
- **Weg 2 (Hand → eigene Hand-Zone):** (c) A legt eine Karte **in seine Hand-Zone**: **B sieht eine Rückseite erscheinen** (Bildaufnahme oder Einzelbilder, nicht nur den Endstand) — **keine Drehung**, nicht für einen Augenblick die Vorderseite; **das ist die Stelle, an der der Client `faceDown` aus der Nachricht übernehmen muss** (Nr. 2). (d) A legt eine **offen auf den Tisch** → B sieht sie (so gewollt). (e) A **nimmt** sie aus der Zone wieder auf → sie verschwindet bei B.
- **Weg 3 (Starthände):** (f) die drei Karten je Dörfler beim Start des Raums und nach einem Neuladen von B — Rücken; A sieht seine aufgedeckt mit Ring.
- **Flächen bei B, für Weg 2 und 3:** (g) B hält den Zeiger über die Karte in A's Zone, öffnet die **Vergrößerung**, den **Langdruck** (Touch-Emulation), das **Kontextmenü** der Karte (Kopfzeile); (h) B's **Spielerliste** und **Hinweise**; (i) B **zoomt** auf die Karte.
- **Neuladen:** (j) A lädt neu: **seine Hand ist wieder da** (dieselben Karten), die Hand-Zone liest er weiter aufgedeckt; B lädt neu: sieht in A's Zone Rücken.
- (k) A liest die Karte (Blick, Ring) und **dreht sie um** → B sieht sie jetzt; A dreht zurück → B sieht den Rücken.
- (l) **Nicht geprüft werden** die Entwicklerwerkzeuge (akzeptiert, Spec M32.13 Nr. 1) — wer sie öffnet, liest die Karten in den Hand-Zonen; das steht im Bericht, nicht als Befund.
- Wo die Probe nicht möglich war, steht „nicht geprüft" und der Grund.

**Fertig, wenn:** der Bau ohne neue Warnung läuft; im Bericht steht je Punkt 1–8 und je Fläche (a)–(k), was gesehen wurde.

---

## FR — Deploy beider Images (M32.11)

**Befund.** `shared/` liegt in **beiden** Images (Wurzelkontext): Wache und Zuordnung laufen im Backend, Blick und Ziehweg-Ziele im Frontend-Bundle. `deploy.yml` hat `on: push` — **jeder Push auf `master` ist ein Deploy** (`CLAUDE.md`).

**Test:** keiner (Deploy). **Zu tun:** `FK`–`FQ` fertig und `npm test` grün; `cd client && npx vite build` ohne neue Warnung; **der Auftraggeber pusht** (der Agent nicht); danach `gh run list --workflow=deploy.yml --limit 3` (`completed`, nicht `queued` — fehlt der Runner, steht der Lauf still, `CLAUDE.md`), `gh api repos/rayberirondelsol/card-game-engine/actions/runners` (`status online`). **Stichprobe an der Produktion, nur lesend:** ein Raum mit der Vorgabe `s1` verhält sich **wie vor M32** (ein `welcome`, eine Zonenliste, keine Farbe an den Hand-Zonen, `room_started` an beide gleich, die private Hand dagegen **wirkt** schon — Ziehen verkleinert den Stapel bei beiden, Ausspielen kommt an: die eine Abweichung, M32.7 Nr. 8). **Ein laufender Raum stirbt mit dem Deploy** (M32.1 Nr. 7) — vorher fragen, ob einer läuft.

**Fertig, wenn:** der Lauf `completed` ist, die Container neu sind, und die Stichprobe belegt im Scratchpad liegt.

---

## FS — Die Bindung: `platz` an die fünf Hand-Zonen, der Schalter (M32.9)

**Befund.** `zone_data` kennt keinen Platz an den Hand-Zonen. **Zu schreiben:** `platz: 1 … 5` an `zhand1` … `zhand5`; sonst nichts. Ausgang = Zielstand von `haende` (`FF`, M31: `zone_data` 39 886 / `e6bf6aeaf3d6` laut `docs/m31-welle2-belege.md` — **die Zahl am Anfang neu lesen**, sie kann sich seither durch einen Editor-Lauf geändert haben).

### Teil 1 — Baustein, Tests, ohne Produktion

**Test zuerst** (`server/test/doerflerzahl-eigentum.test.js`; Zonen aus `auslagen-kurzpartie.json` mit `EU` und `FF` angewendet). Rot, solange es fehlt:
1. **Zielstand:** `platz: n` an `zhand<n>`, **alles andere** byteweise gleich (die 77 übrigen Zonen, die fünf Hände ohne `platz`); **Rückwärtsbeweis** (`--zurueck` stellt den Ausgang her, Zeichen für Zeichen).
2. **Vorbedingung je Stück:** alle fünf Hände **ohne** `platz` → schreiben; **alle im Ziel** → „schon geschrieben, nichts zu schreiben"; **teils** (ein bis vier) → Abbruch; eine Hand fehlt oder trägt ein anderes `platz` → Abbruch. **Disjunkt** zu `zonen` und `haende`.
3. **Das Feld überlebt:** `resolveZones` und ein Editor-Rundlauf lassen `platz` stehen (`FK` Nr. 6, hier an den geschriebenen Daten).
4. **Der Schalter, in beide Richtungen am Raum:** ohne `platz` startet der Raum wie in `FN` Nr. 3 (nichts gebunden); mit `platz` und `spieler s2` ist die Bindung da (`FN` Nr. 1) — **die Fixture mit dem Schritt angewendet**.
5. **Der alte Prüfer und der alte Client** kennen das Feld nicht und **stolpern nicht darüber** (an der Quelle gelesen: Setup-Validierung, `ZoneEditor`, `loadGameState` ignorieren unbekannte Zonenfelder) — Ergebnis im Bericht, **nicht nach der Form der Daten eingeordnet** (M31.12 Nachtrag).

**Dann:** `patchEigentum`, `--schritt eigentum` in `scripts/doerflerzahl-daten.mjs` (zehnter Schritt; `SCHRITTE`, Zahlen als Konstante, ein Test hält sie fest).

### Teil 2 — Produktion (eigener Lauf, **nach `FR`** und ausdrücklicher Freigabe)

Anwesenheit des Skripts im Container prüfen (nicht nur den Hash); `zone_data` lesen (Hash **gegen den Stand nach `FF`**), Sicherung (`…-M32-FS-vorher.json`) ins Scratchpad, `--check`, **Frage nach dem offenen Setup-Editor** (er speichert die Zonenliste und nähme das Feld still zurück), `--write … --sicherung-sha <innerer Hash aus --check>`, Kontrollausgabe (Länge, sha, die 77 anderen Zonen gleich, alle `save_states` mit gleichem sha), **zweiter Lauf** („schon geschrieben"), der **Rauchtest** gegen die Produktion (0 Beanstandungen, nur lesend; ein offener Tisch-Tab macht die `Auto Save`-Zeile zum wandernden Ziel — vorher schließen). **Danach melden `--check` von `zonen` und `haende` `ABWEICHEND`** — der erwartete Stand. **Wenn etwas nicht stimmt:** `--zurueck --schritt eigentum`; danach tut der Code wieder nichts.
**Ein laufender Raum ist nicht betroffen** (er liest seine Zonen beim Start, `rooms.js:316`); der **nächste** Raum mit „Spieler" ≥ 2 trägt das Eigentum.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

---

## FT — Dokumente nachziehen, Liste für den Auftraggeber (M32)

### Teil 1 — Dokumente

**Test:** keiner. **Zu ändern:**
1. **`CLAUDE.md`:** ein Absatz **„Eigentum im Raum (M32)"**: Aufgaben `FK`–`FT`; die Zuordnung rechnet der **Start** (Blöcke nach Rang der Sitze, nur bei „Spieler" ≥ 2), `zone_data` trägt nur `platz`; `shared/ownership.js` ist die eine Stelle; **Stufe A**: Rechte und Blick, **keine technische Geheimhaltung** (Netzwerk-Fenster zeigt alles; entschieden), die **private Hand als Server-Zustand** (Ziehen → private Hand → offen auf den Tisch oder verdeckt in die eigene Hand-Zone, in jedem Raum); Speichern im Raum bleibt erlaubt (ein Spielstand trägt nur die Hand des Speichernden); die Grenzen (Spieler-ID öffentlich, kein Wiedereinstieg, Deploy beendet Räume, die drei alten Griffe ändern nur den eigenen Tisch); **Stand**. Und der Satz unter „Bekannte Lücken" („Es gibt **keine Ownership**") bekommt eine Einschränkung: gemeint ist die Ownership von **Spielen**, nicht von Hand-Zonen im Raum.
2. **`docs/spec-setup-system.md`:** am Ende von M32 **„M32 — gebaut, und was die Spec dabei berichtigt"** (Zahlen aus den Läufen, Abweichungen, was `FP` gesagt hat, **was die Sichtprobe in `FQ` gesehen hat**); in M31.18 und der Liste „Offen und riskant" von Welle 2 (Nr. 1) ein Verweis auf M32.
3. **`docs/m31-welle2-abnahme.md`:** Frage 1 mit der Antwort und einem Verweis auf M32 schließen.
4. **`docs/datenzugriff.md`:** `zone_data` wird von **`zonen`, `haende` und `eigentum`** geschrieben; der Schritt in der „Falle des offenen Editors"; der Rückweg (`eigentum` zuerst).

**Fertig, wenn:** ein Leser, der nur `CLAUDE.md` kennt, Eigentum, Stufe A und ihre Grenzen findet.

### Teil 2 — Liste für den Auftraggeber (kein Agent)

Eine Prüfliste von Hand, **nach** `FS` Teil 2:
1. **Die Vorgabe (`Spieler: 1`) und der Hotseat-Tisch:** wie vor M32. Ein Raum **ohne** die Wahl: wie vor M32 (beide Spieler greifen jede Karte an).
2. **Raum, 2 Spieler, 4 Dörfler, zwei Browser:** der Start mit einem Spieler wird abgewiesen (deutsch); die Lobby zeigt, wer Platz 1–2 und 3–4 führt; die Hand-Zonen stehen in der Farbe ihres Spielers.
3. **Rechte:** fremde Karte in der Hand-Zone ziehen / drehen / umdrehen → springt zurück, Hinweis.
4. **Der Ziehweg:** aus dem Dorfereignis-Stapel (Zahlentaste und „Draw Card") in die **private Hand** — der andere Spieler sieht den **Stapel schrumpfen** und die Zahl `✋` steigen, **sonst nichts**; man selbst liest die Karte. Von der Hand **offen auf den Tisch** → der andere sieht sie; von der Hand **in die eigene Hand-Zone** → der andere sieht **eine Rückseite erscheinen**, nie die Vorderseite; man liest sie selbst (Ring). **Aufnehmen** aus der Zone → sie verschwindet bei beiden. Dasselbe für die Starthände. **Aufdecken** → der andere sieht sie.
5. **Neuladen des Tabs:** gleiche Zonen, gleiche Rechte, **dieselbe private Hand**. **Ein Spieler geht:** seine Hand-Zone ist für den anderen offen; nur getrennt: bleibt gesperrt.
6. **Speichern im Raum** ist erlaubt; ein Spielstand trägt die private Hand des Speichernden, **nicht** die der anderen (Sie wissen es; ein Server-Save ist ein eigener Meilenstein).
7. **Gespielt:** zwei Browser, zwei Spieler, bis zum ersten Zug.
8. **Offen, zur Kenntnis:** Stufe A ist keine technische Geheimhaltung (die Entwicklerwerkzeuge zeigen die Karten in den Hand-Zonen — Ihre Entscheidung); Spieler-IDs sind im Raum nicht geheim (wer sich so verbindet, bekommt auch die private Hand dieses Spielers); die private Hand wird jetzt in **jedem** Raum abgeglichen (ein Fehler weniger, aber nicht „wie heute"); ohne Wiedereinstieg kein Zurück in einen verlorenen Tab, jeder Push beendet laufende Räume **und die Hände**; „Take Top Card" und „Reveal Top Card" ändern im Raum nur den eigenen Tisch (Bestand).
9. **Rückweg bekannt:** `--zurueck --schritt eigentum`.

**Fertig, wenn:** der Auftraggeber 1–7 abgehakt oder einen Befund genannt hat.

---

## Später — nicht in M32 (Stufe B und C, ein eigener Meilenstein)

Zettel, die **nur** dem Serverfilter dienten und darum **gestrichen** sind; sie bleiben hier als Vorlage, falls der Auftraggeber technische Geheimhaltung will:
- **`hideFor(boardState, zones, color)`** (rein, `shared/ownership.js`): dasselbe Objekt ohne Eigentümer; sonst flache Kopie, in der verdeckte Karten in **fremder** Hand-Zone nur eine **Positivliste** behalten (`tableId`, `x`, `y`, `zIndex`, `rotation`, `faceDown`, `face_up`, `width`, `height`, `card_back_id`, `gridId`, `cell`, `inStack`); **`faceOf(card)`** als Gegenstück (`{ ...gefiltert, ...faceOf(karte) }` gleicht der Karte). Tests: Identität ohne Eigentümer, kein Wert der Quellkarte im JSON, keine Mutation, noch zeichenbar.
- **`welcome`, `room_started` und `board_sync` je Spieler** (`roomWs.js:97-106`, `rooms.js:387-392` — heute **ein** Rundruf —, `broadcast.js:34-39`); `card_flip` mit `face` an **alle** (auch den Absender).
- **Regel „eine verdeckte Karte verlässt die Hand nur aufgedeckt"** (der Filter rechnet nach Ort) in `mayTouchCard`; Umkehr: ein Feld `secretOf` am Kartenobjekt.
- **Der Save-Knopf** wäre dann wirklich ein Problem (die Sicht des Klickenden trägt Rücken ohne Gesicht).
- **Stufe C:** Stapel ohne Vorderseiten für niemanden, Aktionen im Raum auf dem Server, Bindung der Spieler-ID an Konto oder Beitrittsschlüssel.
- **Ein Spielstand aus dem Raum** (der Server speichert Tisch **und alle privaten Hände**) und **die Wiederherstellung aktiver Räume** (`hands` neben `boardState` in `serializeBoardState`, `roomStore.js:102` — eine Zeile — und in `loadBoardState`).
