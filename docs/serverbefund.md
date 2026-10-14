# Serverbefund Proxmox-Heimserver — 14.10.2026

Bestandsaufnahme nach dem Ausfall von `gaming.benjathi.de` (HTTP 530) am 14.10.2026.
Reine Erhebung, **nichts geändert**: kein Container gestoppt, keine Datei außer dieser angelegt,
keine Konfiguration angefasst, nichts gelöscht, nichts committet.

Erhoben um 12:00–12:15 UTC, also ca. 15 Minuten nach dem Neustart von VM 101 (Boot: 11:58:23 UTC).
Alle Speicherwerte sind damit Werte eines frisch gestarteten Systems — das ist bei einigen
Punkten wichtig und unten jeweils vermerkt.

---

## Kurzfassung — die drei dringendsten Punkte

**1. `alexa-list-reader` ist der Speicherfresser und war schon zweimal der Tote.**
Der Container wurde am 17.08. und am 28.09. vom Kernel-OOM-Killer erschlagen — beide Male ein
`python3` mit 2,05 GB bzw. 1,71 GB RSS. Jetzt, 15 Minuten nach dem Boot, hält er bereits
**622,9 MiB = 10,53 %** des VM-Speichers und damit mehr als jeder andere der 19 Container.
In ihm laufen aktuell **12 Browser-Prozesse** (Selenium), und er hat **kein Speicherlimit** und
**keinen Healthcheck**. Dazu: **18.715 Fehlerzeilen in 4 Tagen Logzeitraum** (10.10.–14.10.),
aktuell `selenium.common.exceptions.TimeoutException` in `_selenium_wait_element`.
Weil der globale OOM-Killer immer den größten Prozess nimmt, bestimmt dieser Container, wann
die ganze VM umfällt — er reißt beim nächsten Mal nicht nur sich selbst mit.

**2. Beide GitHub-Actions-Runner sind stillschweigend tot.**
`actions.runner.rayberirondelsol-card-game-engine.card-game-vm` und
`...-kinderland-cloud.kinderland-vm` sind `enabled`, aber `inactive`. Grund im Journal:

```
Failed to create a session. The runner registration has been deleted from the server
Runner listener exited with error code 1
Runner listener exit with terminated error, stop the service, no retry
```

Die Registrierung ist auf GitHub-Seite gelöscht. Der Dienst gibt auf und versucht es nicht wieder.
`systemctl list-units --failed` ist dabei **leer** — der Ausfall ist unsichtbar. Das ist exakt
dasselbe Ausfallmuster wie der 25-Tage-Tunnelausfall: etwas ist weg, nichts meldet sich.
Konkrete Folge: Pushes auf `card-game-engine` deployen nicht mehr.

**3. Kein Swap in der VM, bei 7,19 GB zugesagtem Speicher auf 5,91 GB echtem.**
`swapon --show` ist leer, `/proc/meminfo` zeigt `Committed_AS: 7192296 kB` gegen
`MemTotal: 6054424 kB`. Es gibt also keinerlei Puffer: eine Speicherspitze führt nicht zu
langsam, sondern direkt zum OOM-Kill. Der Proxmox-Host hat 8 GB Swap (davon 234 MB benutzt),
die VM hat null.

---

## 1. Vollständige Containerliste

19 Container, **alle laufend**, keine gestoppten, keine abgestürzten.

| Container | Image:Tag | Status | Angelegt | Restart | Healthcheck | Mem-Limit |
|---|---|---|---|---|---|---|
| card-game-engine-frontend | card-game-engine-frontend:latest | Up (healthy) | 13.10. 19:31 | unless-stopped | ja | **nein** |
| card-game-engine-backend | card-game-engine-backend:latest | Up (healthy) | 13.10. 19:31 | unless-stopped | ja | **nein** |
| alexa-list-reader | alexa-list-reader-patched:latest | Up | 05.07. (3 Mon.) | unless-stopped | **nein** | **nein** |
| livesync-bridge-bridge-1 | livesync-bridge-bridge:latest | Up | 26.06. (3 Mon.) | unless-stopped | **nein** | **nein** |
| knowledge-digest-web | nginx:alpine | Up | 25.06. (3 Mon.) | unless-stopped | **nein** | **nein** |
| knowledge-digest-feedback | **`ce47b8821b9b`** (ohne Tag) | Up | 25.06. (3 Mon.) | unless-stopped | **nein** | **nein** |
| knowledge-digest-cloudflared | cloudflare/cloudflared:latest | Up | 25.06. (3 Mon.) | unless-stopped | **nein** | **nein** |
| obsidian-cloudflared | cloudflare/cloudflared:latest | Up | 24.06. (3 Mon.) | unless-stopped | **nein** | **nein** |
| freshrss-cloudflared | cloudflare/cloudflared:latest | Up | 24.06. (3 Mon.) | unless-stopped | **nein** | **nein** |
| obsidian-couchdb | couchdb:3 | Up | 24.06. (3 Mon.) | unless-stopped | **nein** | **nein** |
| freshrss | freshrss/freshrss:latest | Up | 24.06. (3 Mon.) | unless-stopped | **nein** | **nein** |
| wallabag-cloudflared | cloudflare/cloudflared:latest | Up | 17.06. (3 Mon.) | unless-stopped | **nein** | **nein** |
| wallabag | wallabag/wallabag:latest | Up (healthy) | 17.06. (3 Mon.) | unless-stopped | ja | **nein** |
| wallabag-db | mariadb:11 | Up (healthy) | 17.06. (3 Mon.) | unless-stopped | ja | **nein** |
| kinderland-cloud-admin-tool-1 | kinderland-cloud-admin-tool:latest | Up (healthy) | 20.05. (4 Mon.) | unless-stopped | ja | **nein** |
| kinderland-cloud-redis-1 | redis:7-alpine | Up (healthy) | 20.05. (4 Mon.) | unless-stopped | ja | **nein** |
| kinderland-cloud-cloudflared-1 | **`c1d35f78a5f6`** (ohne Tag) | Up | 05.05. (5 Mon.) | unless-stopped | **nein** | **nein** |
| kinderland-cloud-nextcloud-1 | nextcloud:30-apache | Up (healthy) | 05.05. (5 Mon.) | unless-stopped | ja | **nein** |
| kinderland-cloud-mariadb-1 | mariadb:11 | Up (healthy) | 05.05. (5 Mon.) | unless-stopped | ja | **nein** |

Belegt mit
`docker inspect --format "{{.Name}};{{.HostConfig.RestartPolicy.Name}};{{if .Config.Healthcheck}}HC{{else}}noHC{{end}};{{.HostConfig.Memory}}"`:
**19 von 19 auf `unless-stopped`** (gut), **19 von 19 mit `Memory=0`**, also ohne Limit,
**11 von 19 ohne Healthcheck**.

Zwei Container laufen aus einem **Image ohne Tag** (`knowledge-digest-feedback` →
`ce47b8821b9b`, `kinderland-cloud-cloudflared-1` → `c1d35f78a5f6`). Das sind Dangling-Images.
Siehe dazu den Warnhinweis unter Punkt 6 — das ist eine Falle.

---

## 2. Ressourcen je Container

`docker stats --no-stream`, 15 Minuten nach Boot (Limit je Container = 5,774 GiB, also kein Limit):

| Container | Speicher | % | CPU |
|---|---|---|---|
| **alexa-list-reader** | **622,9 MiB** | **10,53 %** | 1,61 % |
| wallabag-db | 167,7 MiB | 2,84 % | 0,01 % |
| kinderland-cloud-mariadb-1 | 137,0 MiB | 2,32 % | 0,01 % |
| wallabag | 127,8 MiB | 2,16 % | 0,00 % |
| kinderland-cloud-nextcloud-1 | 119,5 MiB | 2,02 % | 0,00 % |
| kinderland-cloud-admin-tool-1 | 111,6 MiB | 1,89 % | 0,11 % |
| obsidian-couchdb | 86,27 MiB | 1,46 % | 0,91 % |
| card-game-engine-backend | 85,95 MiB | 1,45 % | 0,00 % |
| livesync-bridge-bridge-1 | 71,65 MiB | 1,21 % | 0,00 % |
| freshrss | 59,66 MiB | 1,01 % | 0,00 % |
| knowledge-digest-feedback | 50,54 MiB | 0,85 % | 0,13 % |
| kinderland-cloud-cloudflared-1 | 38,54 MiB | 0,65 % | 0,22 % |
| wallabag-cloudflared | 38,45 MiB | 0,65 % | 0,88 % |
| freshrss-cloudflared | 25,34 MiB | 0,43 % | 0,24 % |
| knowledge-digest-cloudflared | 21,29 MiB | 0,36 % | 0,87 % |
| obsidian-cloudflared | 21,27 MiB | 0,36 % | 0,28 % |
| kinderland-cloud-redis-1 | 17,93 MiB | 0,30 % | 0,46 % |
| knowledge-digest-web | 10,55 MiB | 0,18 % | 0,00 % |
| card-game-engine-frontend | 3,895 MiB | 0,07 % | 0,00 % |
| **Summe** | **≈ 1.858 MiB** | ≈ 31 % | < 8 % |

Wer hält den Speicher: `alexa-list-reader` allein ein Drittel aller Container-Speicher.
Die vier Datenbanken (2× MariaDB, CouchDB, Redis) zusammen 408,9 MiB. Die fünf
cloudflared-Container zusammen 144,9 MiB.

Grenzen: **keine**. Kein einziger Container hat `--memory` gesetzt. Jeder darf alles nehmen,
bis der Kernel jemanden erschießt — und das ist zweimal passiert.

CPU: unkritisch. Bei 2 Kernen zusammen unter 8 % im Ruhezustand. Load average direkt nach Boot
1,90, nach 13 Minuten entspannt. CPU ist hier nicht das Problem.

---

## 3. Platte

VM 101, `df -h /`:

```
/dev/sda1   50G   26G   22G  55%  /
```

**22 GB frei, 55 % belegt.** Das ist derzeit nicht knapp, aber die Zusammensetzung ist
interessant:

```
/var/lib/docker/overlay2   13G
/var/lib/docker/volumes    4,1G
/var/lib/docker/containers 269M
/var/lib/docker/buildkit    39M
/var/lib/docker/image       23M
/opt                        12G
/var/log                   1,2G
```

`docker system df`:

```
TYPE            TOTAL   ACTIVE  SIZE      RECLAIMABLE
Images          128     15      5.301GB   495.4MB (9%)
Containers      19      19      229.5MB   0B (0%)
Local Volumes   3       3       4.375GB   0B (0%)
Build Cache     513     0       996.1MB   829.6MB
```

- **112 von 128 Images sind Dangling** (`docker images -f dangling=true -q | wc -l` → 112).
  87,5 % Müll. Das ist die Spur der vielen `docker compose up -d --build`-Durchläufe.
- **Build-Cache: 513 Einträge, 996,1 MB, davon 829,6 MB freigebbar, 0 davon aktiv.**
- Verwaiste Volumes: **keine**. Alle 3 Volumes sind in Benutzung
  (`docker system df -v`: `card-game-engine_uploads-data` 1 Link, `card-game-engine_db-data`
  1 Link, ein anonymes Volume mit 0 B und 1 Link).
- Aber: `card-game-engine_uploads-data` ist **4,372 GB groß** — dazu Punkt 6.

`/opt` im Detail:

```
8,0G  /opt/kinderland-cloud     (davon 8,0G in /opt/kinderland-cloud/data)
2,0G  /opt/kinderland-runner
670M  /opt/github-runner
233M  /opt/card-game-engine
209M  /opt/obsidian-livesync
172M  /opt/wallabag
60M   /opt/freshrss
51M   /opt/knowledge-digest
```

Auf Host-Ebene ist noch Luft: LVM-Thin-Pool `data` = 141,23 GB, **41,15 % belegt**,
87 GB frei. `vm-101-disk-0` (50 GB) ist zu 53,25 % allokiert. Eine Vergrößerung der VM-Platte
wäre also möglich, ist aber derzeit nicht nötig. Die VM-Platte hat `discard=on` — TRIM
funktioniert, freigegebener Platz kommt im Thin-Pool wirklich an.

---

## 4. Protokolle — hier ist alles in Ordnung

Das ist der Punkt, an dem Heimserver üblicherweise sterben, und hier ist er sauber gelöst.

`/etc/docker/daemon.json`:

```json
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

**Rotation ist konfiguriert und sie greift.** Belegt: größte einzelne Logdatei 7,8 MB,
größtes Container-Verzeichnis 27 MB (Obergrenze 10 MB × 3 = 30 MB), Summe
`/var/lib/docker/containers` = 269 MB. Die harte Obergrenze liegt bei 19 × 30 MB ≈ 570 MB.
**Hier droht kein volllaufen.** Nicht anfassen.

Eine Kleinigkeit daneben: `systemd-journald` hat **kein `SystemMaxUse` gesetzt**, läuft also
auf den Standard von 10 % der Partition = **5 GB Obergrenze** bei 50 GB Platte.
Aktuell: `journalctl --disk-usage` → **1,1 GB**, 10 Boots archiviert. Begrenzt, aber großzügig
begrenzt. Siehe Empfehlung unter „Unsauber".

---

## 5. Mehrfaches: sechs cloudflared-Instanzen

Es sind nicht vier, sondern **sechs** — fünf Container plus ein systemd-Dienst:

| Instanz | Form | Speicher | Token-Fingerprint (md5, 8 Zeichen) |
|---|---|---|---|
| knowledge-digest-cloudflared | Container | 21,29 MiB | `6230e59e` |
| obsidian-cloudflared | Container | 21,27 MiB | `9e1961f6` |
| freshrss-cloudflared | Container | 25,34 MiB | `2d79a5eb` |
| wallabag-cloudflared | Container | 38,45 MiB | `1f7f8d71` |
| kinderland-cloud-cloudflared-1 | Container | 38,54 MiB | `51a8df08` |
| `cloudflared.service` (gaming) | **systemd in VM 101** | 62,5 MB | `a9d6cdf4` |

Alle sechs Fingerprints sind verschieden → **sechs getrennte Cloudflare-Tunnel**, alle im
gleichen Cloudflare-Konto. Alle laufen mit `tunnel --no-autoupdate run --token …`, also
**fernverwaltet**: die Ingress-Regeln liegen im Cloudflare-Dashboard, nicht in lokalen
`config.yml`-Dateien (`/etc/cloudflared/` existiert nicht).

Gesamtkosten: **≈ 207 MB Arbeitsspeicher** für etwas, das ein Prozess leisten könnte.

**Ist das nötig? Technisch nein.** Ein fernverwalteter Tunnel kann beliebig viele
Public-Hostnames auf beliebig viele lokale Ziele abbilden. Die Konsolidierung auf einen
Tunnel würde ca. **170 MB RAM** freimachen.

**Was dagegen spricht — und das ist kein Formalargument:**

1. **Getrennte Ausfallrisiken.** Heute kostet ein kaputter Tunnel genau einen Dienst. Mit einem
   gemeinsamen Tunnel kostet er alle sechs: `daily.benjathi.de`, `wallabag.benjathi.de`,
   FreshRSS, Obsidian-LiveSync, Nextcloud **und** `gaming.benjathi.de` gleichzeitig. Bei einer
   Historie mit einem 25-tägigen unbemerkten Ausfall ist die Trennung der Risiken bares Geld.
2. **Netzwerktrennung.** Jedes Projekt hat sein eigenes Docker-Bridge-Netz (9 Projektnetze:
   `alexa-list-reader_default`, `card-game-engine_app-network`, `freshrss_freshrss`,
   `kinderland-cloud_kinderland_net`, `knowledge-digest_default`, `knowledge-digest_kd`,
   `livesync-bridge_default`, `obsidian-livesync_obsidian`, `wallabag_wallabag`). Ein einzelner
   cloudflared müsste in fünf Netze gleichzeitig hängen oder über die Host-IP gehen. Das ist
   machbar, aber es verwässert die Isolation, die heute kostenlos da ist.
3. **Unabhängige Neustarts.** Ein `docker compose up` in einem Projekt wirft heute nur dessen
   eigenen Tunnel neu. Danach wäre jeder Projekt-Neustart ein Eingriff in die zentrale
   Infrastruktur — oder man muss den gemeinsamen Tunnel aus allen Compose-Dateien herausnehmen
   und separat führen, was wieder genau den Sonderfall erzeugt, der beim Gaming-Tunnel schon
   einmal 25 Tage gekostet hat.

**Empfehlung: nicht konsolidieren.** 170 MB sind auf 6 GB kein Argument gegen sechs
unabhängige Ausfalldomänen. Der sinnvollere Schritt ist nicht Zusammenlegen, sondern
**Überwachen** — siehe unten.

Was dagegen **unsauber** ist: dass der Gaming-Tunnel als einziger kein Container ist. Er ist
immerhin `systemctl is-enabled` → **`enabled`** und läuft nach dem heutigen Neustart
(MainPID 663), der Boot-Fall ist also abgedeckt. Aber er steht in keiner Compose-Datei,
taucht in keinem `docker ps` auf und wird bei jeder Container-Inventur übersehen — genau so
ist der 25-Tage-Ausfall entstanden.

---

## 6. Veraltetes, Verwaistes, Liegengebliebenes

**Images mit Tag und ihr Alter** (`docker images --format "{{.Repository}}:{{.Tag}}|{{.Size}}|{{.CreatedSince}}"`):

| Image | Größe | Alter |
|---|---|---|
| card-game-engine-frontend:latest | 62,9 MB | 17 Stunden |
| card-game-engine-backend:latest | 250 MB | 17 Stunden |
| alexa-list-reader-patched:latest | 868 MB | 3 Monate |
| knowledge-digest:latest | 252 MB | 3 Monate |
| livesync-bridge-bridge:latest | 200 MB | 3 Monate |
| curlimages/curl:latest | 23,8 MB | 3 Monate |
| couchdb:3 | 291 MB | 3 Monate |
| nginx:alpine | 62,2 MB | 3 Monate |
| freshrss/freshrss:latest | 255 MB | 4 Monate |
| kinderland-cloud-admin-tool:latest | 665 MB | 4 Monate |
| cloudflare/cloudflared:latest | 63,1 MB | 5 Monate |
| redis:7-alpine | 39,1 MB | 5 Monate |
| mariadb:11 | 334 MB | 6 Monate |
| **madmachinations/ha-alexa-shopping-list-sync:latest** | **868 MB** | **9 Monate** |
| **nextcloud:30-apache** | **1,3 GB** | **10 Monate** |
| **wallabag/wallabag:latest** | **310 MB** | **12 Monate** |

Die drei fett markierten sind die Problemfälle: `nextcloud:30-apache` ist 10 Monate alt und
Nextcloud 30 ist inzwischen aus dem Support, `wallabag/wallabag:latest` wurde seit 12 Monaten
nicht neu geholt, und `madmachinations/ha-alexa-shopping-list-sync:latest` (868 MB) ist
vermutlich nur noch die unveränderte Basis, aus der `alexa-list-reader-patched` gebaut wurde —
es läuft nichts daraus.

**Gestoppte Container: keine.** `docker ps -a` = `docker ps` = 19.
**Verwaiste Volumes: keine.** Alle 3 haben einen Link.
**Verwaistes Netz: 1** (`docker network ls -q --filter dangling=true | wc -l` → 1). Außerdem
existieren für knowledge-digest zwei Netze (`knowledge-digest_default` **und**
`knowledge-digest_kd`), was auf ein Überbleibsel aus einem Umbau hindeutet.

**Verwaistes LVM-Volume auf dem Host:** `vm-102-disk-0`, 30,00 GB angelegt, **26,34 %
allokiert ≈ 7,9 GB echt belegt** im Thin-Pool. Es gibt **keine VM 102**:
`qm list` zeigt nur 100 und 101, `/etc/pve/qemu-server/` enthält nur `100.conf` und `101.conf`,
`cat /etc/pve/qemu-server/102.conf` → *No such file or directory*. Das ist die Platte einer
gelöschten VM, deren Datenträger beim Löschen stehengeblieben ist.

**Die 4,1 GB alten Uploads.** `card-game-engine_uploads-data` enthält **5.386 Dateien, 4,1 GB**,
und zwar ausschließlich aus zwei Monaten:

```
3886 Dateien  2026-02
1500 Dateien  2026-09
```

In den letzten 7 Tagen wurde dort **keine einzige Datei** verändert
(`find … -newermt "-7 days" | wc -l` → 0). Das passt zu dem bekannten TTS-Import- und
Upload-Leak. 4,1 GB sind 8 % der 50-GB-Platte.

**Die beiden GitHub-Runner** (670 MB + 2,0 GB = 2,7 GB auf Platte) sind registrierungslos und
laufen nicht — siehe Kurzfassung Punkt 2.

> **Achtung, Falle beim Aufräumen.** `docker image prune` würde **die Images löschen, aus denen
> `knowledge-digest-feedback` und `kinderland-cloud-cloudflared-1` laufen** — beide laufen aus
> untagged Images (`ce47b8821b9b`, `c1d35f78a5f6`), zählen also als Dangling. Solange die
> Container laufen, verweigert Docker das Entfernen des Images; sobald sie aber einmal gestoppt
> oder neu gebaut werden, sind diese Images weg und die Container nicht mehr reproduzierbar.
> Vor jedem `prune` diese beiden Images taggen oder aus dem Quellstand neu bauen.

---

## 7. Systemdienste in der VM

`systemctl list-units --failed` → **leer**. Keine fehlgeschlagene Unit.

Laufende Dienste (vollständig):
`cloudflared`, `containerd`, `dbus`, `docker`, `getty@tty1`, `qemu-guest-agent`,
`serial-getty@ttyS0`, `ssh`, `systemd-journald`, `systemd-logind`, `systemd-networkd`,
`systemd-resolved`, `systemd-timesyncd`, `systemd-udevd`, `unattended-upgrades`.

Außerhalb von Docker zieht nur **`cloudflared.service` nennenswert Speicher: 62,5 MB**
(`MemoryCurrent=62509056`). Alles andere ist Systemgrundlast. Von den 2.005 MB belegtem
Speicher gehen ≈ 1.858 MB an Container, ≈ 62 MB an cloudflared, der Rest ist Kernel und
Systemdienste. Es läuft nichts Unerwartetes.

Nebenbefund: **`ssh.service` läuft in der VM.** Die Annahme, SSH sei dort nicht erreichbar,
trifft nicht auf den Dienst zu — die Ursache liegt woanders (Port, Firewall, Schlüssel). Für
diese Erhebung irrelevant, aber einen Blick wert, denn der Gastagent ist der unzuverlässigere
Weg von beiden.

Timer (alle, Zustände geprüft):

| Timer | Nächster Lauf | Letzter Lauf | Ergebnis |
|---|---|---|---|
| `kd-diskcheck.timer` | 14.10. 18:00 | 14.10. 12:00 | lief vor 3 Min. |
| `knowledge-digest.timer` | 15.10. 04:30 | 14.10. 04:30 | **erfolgreich, 5,78 s CPU, 73,7 MB Spitze** |
| `obsidian-backup.timer` | 15.10. 03:30 | 14.10. 03:30 | **erfolgreich, 1,25 s CPU, 36,8 MB Spitze** |
| `knowledge-digest-weekly.timer` | 18.10. 09:00 | 11.10. 09:00 | ok |
| `e2scrub_all`, `fstrim`, `apt-daily`, `man-db`, `dpkg-db-backup`, `systemd-tmpfiles-clean` | Standard | — | ok |

Das ist eine gut gebaute Timer-Landschaft. `knowledge-digest.service` und
`knowledge-digest-weekly.service` haben sogar **`OnFailure=status-alert@…`** gesetzt — es gibt
also schon eine Alarmierung. Sie deckt nur eben die Runner und die Tunnel nicht ab.

`/opt/knowledge-digest/diskcheck.sh` läuft zweimal täglich als Plattenwächter. Gut.

Versionsstand: **Debian 13.7**, **Docker 29.5.3** — beides aktuell, kein Handlungsbedarf.
`unattended-upgrades` läuft, 7 Pakete sind aktuell als upgradable gelistet.

---

## 8. Fehlkonfiguration

| Befund | Belegte Zahl |
|---|---|
| Container ohne Speicherlimit | **19 von 19**, alle `HostConfig.Memory=0` |
| Datenbanken ohne Speicherlimit | 4 von 4 (wallabag-db, kinderland-mariadb, obsidian-couchdb, kinderland-redis) |
| Container ohne Healthcheck | **11 von 19** |
| Images auf `latest` | 10 von 16 getaggten |
| Container aus untagged Image | 2 (`knowledge-digest-feedback`, `kinderland-cloud-cloudflared-1`) |
| Container ohne `restart: unless-stopped` | **0** — hier ist alles richtig |
| Kein Swap in der VM | `swapon --show` leer |
| `journald` ohne `SystemMaxUse` | Standardgrenze 5 GB, aktuell 1,1 GB |

Ohne Healthcheck: `alexa-list-reader`, `livesync-bridge-bridge-1`, `knowledge-digest-web`,
`knowledge-digest-feedback`, alle fünf cloudflared, `obsidian-couchdb`, `freshrss`.
Bei `alexa-list-reader` ist das der schwerwiegendste Fall: der Container wirft seit Tagen
Selenium-Timeouts und gilt für Docker trotzdem als gesund.

Auf 0.0.0.0 veröffentlichte Ports (im LAN erreichbar, ohne Tunnel):

```
card-game-engine-frontend  0.0.0.0:80   -> 80
card-game-engine-backend   0.0.0.0:3001 -> 3001
alexa-list-reader          0.0.0.0:4000 -> 4000
obsidian-couchdb           0.0.0.0:5984 -> 5984
freshrss                   0.0.0.0:8089 -> 80
wallabag                   0.0.0.0:8088 -> 80
```

Richtig gemacht: `wallabag-db`, `kinderland-cloud-mariadb-1`, `kinderland-cloud-redis-1`,
`kinderland-cloud-nextcloud-1`, `kinderland-cloud-admin-tool-1` und `knowledge-digest-web`
veröffentlichen **nichts** nach außen, nur containerintern. Die Datenbanken sind also nicht
im LAN offen. Der Ausreißer ist **CouchDB auf 5984**: eine Datenbank direkt im LAN, ohne
Healthcheck und ohne Speicherlimit.

VM-Konfiguration (`qm config 101`): 2 Kerne, `cpu: host`, 6144 MB, `onboot: 1`,
`agent: enabled=1`, Platte `discard=on,ssd=1`. **Kein `balloon`-Eintrag**, es wird also die
volle Zuweisung belegt und nicht dynamisch zurückgegeben — bei dieser Hostauslastung eher
gewollt als falsch, aber es heißt auch: der Host gibt die 6 GB fest her.

---

## 9. Der Speicherverlauf

**Zwei echte OOM-Kills in der Historie** (`journalctl | grep "Out of memory: Killed process"`,
10 Boots im Journal):

```
Aug 17 09:10:11  Killed process 2581 (python3)      anon-rss: 2.057.784 kB
Sep 28 08:45:09  Killed process 2725943 (python3)   anon-rss: 1.708.892 kB
```

Beide mit `constraint=CONSTRAINT_NONE … global_oom` und
`task_memcg=/system.slice/docker-306c73e66e53617c5625cc70bd8454c2ebf2f6a4783743d2ca1cabceeab1c705.scope`.
Diese Container-ID ist über `docker ps -a --no-trunc` eindeutig aufgelöst:

```
306c73e66e53617c5625cc70bd8454c2ebf2f6a4783743d2ca1cabceeab1c705  alexa-list-reader
```

Es war also beide Male `alexa-list-reader`, und es war ein **globaler** OOM — die VM war
insgesamt am Ende, der Kernel hat den größten Prozess genommen. Das ist nicht „einmal Pech",
das ist ein Muster mit 6 Wochen Abstand, und der heutige Ausfall ist die dritte Folge
derselben Ursache.

**Swap: keiner.** `swapon --show` gibt nichts aus, `free -m` zeigt `Swap: 0 0 0`.
Deshalb gibt es zwischen „voll" und „OOM-Kill" keine Zwischenstufe. (Auf dem Host ist Swap
vorhanden: 8.388.604 kB total, 234.532 kB benutzt — der Host hat den Puffer, die VM nicht.)

**Eine methodische Korrektur zum heutigen Befund.** „119 MB frei von 4 GB" ist als Diagnose
unbrauchbar, denn genau das zeigt die VM auch jetzt im Bestzustand:

```
               total   used   free   shared  buff/cache   available
Mem:            5912   2005    129       69        4140        3906
```

**129 MB „free" bei 3.906 MB „available".** Die `free`-Spalte ist unter Linux immer nahe null,
sobald der Seitencache den Rest belegt — das ist gesund, nicht knapp. Belastbar sind:

- `available` (jetzt **3.906 MB** von 5.912) und
- `/proc/pressure/memory`: `some avg10=0.00 avg60=0.00 avg300=0.00`, `total=216185` µs —
  **derzeit null Speicherdruck**, und die gesamten 216 ms seit Boot fielen in den Bootvorgang.
- `pgmajfault` = **23.449** nach 778 s Uptime, also ≈ 30/s und auch das überwiegend
  Boot-Ladearbeit.

Die 563 Millionen Major Page Faults im Störungsfall sind dagegen echtes Thrashing: ohne Swap
wirft der Kernel unter Druck Programmcode aus dem Seitencache und liest ihn sofort wieder von
der Platte. Genau das hat den Gastagenten nur noch sporadisch antworten lassen.

---

## Bewertung

### Gefährlich — droht einen Ausfall zu verursachen

**G1. `alexa-list-reader` ohne Speichergrenze.**
Beleg: 2× OOM-Kill mit 2,05 GB / 1,71 GB RSS, jetzt 622,9 MiB nach 15 Minuten, 12
Browser-Prozesse, `Memory=0`, kein Healthcheck.
*Maßnahme:* `--memory=1g --memory-swap=1g` (oder `mem_limit: 1g` in der Compose-Datei).
*Nutzen:* Der Container stirbt dann allein und startet per `unless-stopped` neu, statt die
ganze VM mitzunehmen. Das ist die eine Änderung, die den heutigen Ausfall unmöglich macht.
*Kosten:* ein Compose-Eintrag, ein Neustart des Containers. Risiko: wenn der Dienst wirklich
1,5 GB braucht, läuft er in eine Restart-Schleife — dann ist das Limit zu niedrig gesetzt und
die eigentliche Frage ist, ob der Dienst überhaupt noch funktioniert (siehe Fragen unten).

**G2. Beide GitHub-Runner tot, ohne Meldung.**
Beleg: `ActiveState=inactive`, `UnitFileState=enabled`, Journal: *„The runner registration has
been deleted from the server … no retry"*. `list-units --failed` leer.
*Maßnahme:* entweder neu registrieren oder beide Dienste **und** beide Verzeichnisse entfernen.
*Nutzen:* im ersten Fall funktioniert das Deployment wieder; im zweiten verschwinden 2,7 GB und
zwei dauerhafte Lügen im Systemzustand. Die halbtote Mitte ist das Schlechteste.
*Kosten:* Neuregistrierung ca. 10 Minuten pro Runner.

**G3. Kein Swap, Committed_AS über MemTotal.**
Beleg: `swapon --show` leer, `Committed_AS 7.192.296 kB` gegen `MemTotal 6.054.424 kB`.
*Maßnahme:* 2 GB Swapfile in der VM (`/swapfile`, `vm.swappiness=10`).
*Nutzen:* aus einem harten OOM-Kill wird eine kurze Verlangsamung mit Reaktionszeit. Genau das
hätte heute den HTTP 530 verhindert.
*Kosten:* 2 GB Platte (von 22 GB frei), ein `fstab`-Eintrag. Bei `swappiness=10` ist die
Leistungseinbuße im Normalbetrieb nicht messbar.

**G4. Keine Überwachung der sechs Tunnel.**
Beleg: `OnFailure=status-alert@` existiert für die knowledge-digest-Units, aber für keinen
cloudflared und für keinen Runner. Der 25-Tage-Ausfall und der heutige HTTP 530 sind beide
nicht durch Monitoring, sondern durch Zufall aufgefallen.
*Maßnahme:* der Plattenwächter `diskcheck.sh` ist das Muster — ein zweites kleines Skript im
Timer, das die sechs Public-Hostnames und die beiden Runner-Units prüft und über denselben
`status-alert@` meldet.
*Nutzen:* das ist der eigentliche Grund, warum die sechs getrennten Tunnel eine gute Idee sein
*können*: getrennte Ausfalldomänen helfen nur, wenn man merkt, dass eine ausgefallen ist.
*Kosten:* 20 Zeilen `curl -sf -o /dev/null -w "%{http_code}"` plus ein Timer.

**G5. `docker image prune` würde zwei laufende Dienste unreproduzierbar machen.**
Beleg: `knowledge-digest-feedback` läuft aus `ce47b8821b9b`, `kinderland-cloud-cloudflared-1`
aus `c1d35f78a5f6` — beide untagged, beide zählen als Dangling unter den 112.
*Maßnahme:* vor dem Aufräumen `docker tag ce47b8821b9b knowledge-digest-feedback:inuse`
(analog für das zweite), oder aus dem Quellstand neu bauen.
*Nutzen:* verhindert, dass die naheliegende Aufräumaktion aus Punkt V1 zwei Dienste zerstört.
*Kosten:* zwei Befehle.

### Verschwendung — läuft, kostet, bringt nichts mehr

**V1. 112 Dangling-Images und 996 MB Build-Cache.**
Beleg: `docker images -f dangling=true -q | wc -l` → 112 von 128; Build-Cache 513 Einträge,
996,1 MB, **0 davon aktiv**, 829,6 MB als freigebbar gemeldet; Images 495,4 MB freigebbar.
*Maßnahme:* `docker builder prune -f` und `docker image prune` — **nach** G5.
*Nutzen:* ≈ 1,3 GB nach Dockers eigener Rechnung. Da `du` für `/var/lib/docker/overlay2` 13 GB
zeigt, während die Images laut Docker nur 5,3 GB wiegen, ist der tatsächliche Gewinn
vermutlich deutlich größer — das kann ich erst nach dem Prune beziffern, vorher nicht.
*Kosten:* der nächste Build läuft einmal ohne Cache, also ein paar Minuten länger.
**Das ist die einfachste Einsparung im ganzen System.**

**V2. 4,1 GB alte Uploads.**
Beleg: 5.386 Dateien, 4,1 GB, Zeitstempel ausschließlich 2026-02 (3.886) und 2026-09 (1.500),
null Änderungen in 7 Tagen.
*Maßnahme:* erst klären, was es ist (Frage F5), dann gezielt aufräumen.
*Nutzen:* bis zu 4,1 GB = 8 % der Platte.
*Kosten:* Risiko echten Datenverlusts, wenn es doch benutzte Spielmaterialien sind. Deshalb
nicht blind löschen.

**V3. Verwaistes LVM-Volume `vm-102-disk-0`.**
Beleg: 30 GB angelegt, 26,34 % allokiert ≈ 7,9 GB im Thin-Pool; keine 102.conf, kein Eintrag
in `qm list`.
*Nutzen:* ≈ 7,9 GB im Thin-Pool zurück.
*Kosten:* keiner — wenn es wirklich Müll ist. Das ist Frage F6; ein Volume einer gelöschten VM
kann auch der letzte Rest eines Backups sein.

**V4. 2,7 GB Runner-Verzeichnisse** (670 MB + 2,0 GB) für zwei Dienste, die nicht laufen.
Siehe G2 — eine Entscheidung, zwei Wirkungen.

**V5. Das unbenutzte Basisimage** `madmachinations/ha-alexa-shopping-list-sync:latest`,
868 MB, 9 Monate alt. Es läuft nichts daraus; `alexa-list-reader` nutzt das abgeleitete
`alexa-list-reader-patched`. Vermutlich 868 MB geschenkt — zu prüfen, ob die Patch-Pipeline
das Basisimage noch braucht.

**V6. Ein verwaistes Docker-Netz** und das doppelte knowledge-digest-Netz. Kostet kein RAM,
keine Platte, nur Übersicht. Kosmetik.

### Unsauber — funktioniert, ist aber schlecht eingerichtet

**U1. Kein einziges Speicherlimit, nirgends.** 19 von 19 auf `Memory=0`. Besonders bei den
vier Datenbanken: MariaDB nimmt sich standardmäßig, was es kriegen kann. Zwei MariaDB-Instanzen
mit je `innodb_buffer_pool_size` nach Gusto auf einer 6-GB-VM ist unnötig lose.
*Maßnahme:* Limits nach heutigem Verbrauch mit Zuschlag — MariaDB je 512 MB, CouchDB 256 MB,
Redis `--maxmemory 128mb`, Nextcloud 512 MB, `alexa-list-reader` 1 GB.
*Nutzen:* jeder Ausfall bleibt lokal; der globale OOM-Killer kommt gar nicht mehr zum Zug.
*Kosten:* einmal die Compose-Dateien durchgehen; bei zu knappen Limits Restart-Schleifen, also
mit Zuschlag ansetzen und nachmessen.

**U2. 11 von 19 Containern ohne Healthcheck.** Der wichtigste Fall ist `alexa-list-reader`:
18.715 Fehlerzeilen in 4 Tagen und für Docker trotzdem gesund. Auch die cloudflared-Container
haben keinen — ein Tunnel kann die Verbindung verlieren, während der Container „Up" bleibt.
Das ist derselbe blinde Fleck wie G4, nur eine Ebene tiefer.

**U3. 10 von 16 Images auf `latest`, zwei über ein Jahr alt.**
`wallabag/wallabag:latest` 12 Monate, `nextcloud:30-apache` 10 Monate. `latest` ohne
regelmäßiges `pull` ist das Schlechteste aus beiden Welten: nicht reproduzierbar *und* nicht
aktuell. Bei Nextcloud 30 kommt dazu, dass die Version aus dem Support gelaufen ist und ein
Sprung auf 31/32 nur stufenweise geht — das wird mit jedem Monat mehr Arbeit, nicht weniger.
*Maßnahme:* feste Versionen pinnen (`wallabag:2.6.x`, `nextcloud:31-apache`) und die Updates
bewusst machen, statt auf ein `latest` zu hoffen, das nie geholt wird.

**U4. Der Gaming-Tunnel als systemd-Sonderfall.** `enabled`, läuft, überlebt den Reboot —
funktional in Ordnung. Aber er steht in keiner Compose-Datei und erscheint in keiner
Container-Inventur. Mindestens: in die Doku und in die Prüfliste von G4 aufnehmen.

**U5. `journald` ohne `SystemMaxUse`.** 1,1 GB jetzt, Standardgrenze 5 GB.
`SystemMaxUse=500M` kostet nichts und holt rund 600 MB.

**U6. CouchDB auf `0.0.0.0:5984`.** Eine Datenbank offen im LAN, ohne Limit, ohne Healthcheck.
Wenn nur die Bridge und der Tunnel darauf zugreifen, gehört die Veröffentlichung auf
`127.0.0.1:5984` eingeschränkt. Was der Obsidian-Client auf den Endgeräten direkt braucht,
weiß ich nicht — deshalb nur als Hinweis.

### In Ordnung — hier bitte nichts anfassen

- **Log-Rotation.** `max-size: 10m`, `max-file: 3` in `/etc/docker/daemon.json`, und sie greift:
  größte Logdatei 7,8 MB, größtes Containerverzeichnis 27 MB, Summe 269 MB, harte Obergrenze
  ≈ 570 MB. Der klassische Heimserver-Killer ist hier bereits gelöst.
- **Neustart-Richtlinie.** 19 von 19 auf `unless-stopped`. Lückenlos.
- **Keine fehlgeschlagene systemd-Unit.** Keine gestoppten Container. Keine verwaisten Volumes.
- **Platte.** 26 GB von 50 GB (55 %), 22 GB frei; Thin-Pool 41,15 % mit 87 GB Reserve;
  `discard=on` auf der VM-Platte, `fstrim.timer` aktiv. Kein akuter Platzdruck.
- **Timer und Alarmierung im Ansatz.** `knowledge-digest` lief heute 04:41 erfolgreich durch
  (5,78 s CPU, 73,7 MB Spitze), `obsidian-backup` 03:30 erfolgreich (36,8 MB Spitze),
  `kd-diskcheck` läuft zweimal täglich, `OnFailure=status-alert@` ist für die
  knowledge-digest-Units verdrahtet. Darauf lässt sich G4 aufbauen.
- **Versionsstand.** Debian 13.7, Docker 29.5.3, `unattended-upgrades` läuft.
- **Der Host.** 78 Tage Uptime, **nie ein OOM** (`dmesg | grep -c -i -E 'oom|killed process'`
  → 0), Swap 234 MB von 8 GB, Load 0,64.
- **Netzwerktrennung.** 9 Projektnetze; die Datenbanken und internen Dienste veröffentlichen
  nichts nach außen.
- **Sechs getrennte Tunnel.** Kostet 207 MB, kauft sechs unabhängige Ausfalldomänen. Richtig
  so — mit G4 obendrauf.
- **CPU.** Unter 8 % auf 2 Kernen im Ruhezustand. Kein Engpass.

---

## Reichen die 6 GB?

**Für den Normalbetrieb ja, mit Reserve. Für den Normalbetrieb *plus Build* nur knapp.**

Rechnung aus den erhobenen Zahlen:

| Posten | Wert |
|---|---|
| MemTotal | 5.912 MB |
| aktuell belegt (Container + System) | 2.005 MB |
| aktuell verfügbar | **3.906 MB** |
| Speicherdruck jetzt (`/proc/pressure/memory`, avg60) | **0,00** |
| Container-Summe laut `docker stats` | 1.858 MiB |
| historische Spitze `alexa-list-reader` | 2.057 MB (OOM, 17.08.) |

Szenario „normal": 2,0 GB belegt, 3,9 GB frei → bequem.

Szenario „alexa-list-reader wächst wieder auf 2 GB": 2,0 + 1,4 = 3,4 GB belegt, ≈ 2,5 GB
verfügbar → wird überlebt. Mit 4 GB wäre es heute gescheitert, mit 6 GB nicht.

Szenario „Leak plus `docker compose up -d --build`": der Node-Build des Backends kostet
erfahrungsgemäß 1–2 GB, dazu die Container selbst mit gewachsenem alexa-Container →
2 + 1,4 + 2 ≈ 5,4 GB von 5,9 GB, und ohne Swap. **Das ist genau der Zustand von heute.**
Mehr RAM allein verschiebt diese Grenze nur; die Ursache ist das fehlende Limit (G1) und der
fehlende Swap (G3).

**Mehr als 6 GB ist derzeit ohnehin kaum zu holen.** Der Host hat 15.882 MB, davon sind
6.144 + 6.144 = 12.288 MB fest an VM 100 und VM 101 vergeben; `free -m` auf dem Host zeigt
12.470 MB belegt und **3.411 MB verfügbar**. 8 GB für VM 101 würden dem Host rund 1,4 GB
lassen — das verschiebt das Problem nur eine Etage nach oben, dorthin, wo auch Home Assistant
hängt. Entweder Hostspeicher nachkaufen oder, besser, G1 und G3 erledigen.

**Fazit:** 6 GB behalten, kein weiteres Aufstocken. Stattdessen `alexa-list-reader` begrenzen
und 2 GB Swap anlegen. Danach ist die VM nicht nur ausreichend ausgestattet, sondern auch
gegen den Wiederholungsfall gesichert — und zur Kontrolle gehört nicht mehr die
`free`-Spalte, sondern `available` und `/proc/pressure/memory`.

---

## Was ich nicht beurteilen kann — Fragen an den Auftraggeber

Ob ein Dienst noch gebraucht wird, weiß ich nicht. Alle Datenverzeichnisse zeigen Schreibzugriffe
in den letzten 7 Tagen (`/opt/freshrss` 179 Dateien, `/opt/card-game-engine` 198,
`/opt/kinderland-cloud/data` 27, `/opt/wallabag` 18, `/opt/obsidian-livesync` 12), aber
Schreibzugriffe können auch von automatischen Abläufen kommen. Deshalb als Fragen:

**F1. Wird `alexa-list-reader` noch benutzt?** Er wirft seit mindestens 4 Tagen
Selenium-Timeouts (18.715 Fehlerzeilen), ist der größte Speicherverbraucher, war zweimal die
OOM-Leiche und trägt das größte Image im System (868 MB). Falls er funktional schon tot ist,
löst sein Abschalten G1 vollständig und spart ≈ 620 MB RAM — die mit Abstand beste Einsparung
im ganzen System. Falls er gebraucht wird, braucht er ein Limit und einen Healthcheck.

**F2. Soll `kinderland-cloud` noch lokal laufen?** 5 Container, ≈ 425 MiB RAM, 8 GB Daten in
`/opt/kinderland-cloud/data`, dazu ein Nextcloud-Image von 1,3 GB, das 10 Monate alt und aus
dem Support ist. In `/opt/kinderland-cloud/` liegt eine Datei `MIGRATION-HETZNER.md`. Falls die
Migration schon gelaufen ist, ist das der größte einzelne Posten der ganzen Inventur: 5
Container, ≈ 425 MB RAM, 8 GB Platte und das Nextcloud-Update-Problem auf einen Schlag weg.
Falls nicht, braucht Nextcloud 30 einen Update-Plan.

**F3. Sollen die beiden GitHub-Runner neu registriert oder entfernt werden?** Derzeit sind sie
beides nicht. Für `card-game-engine` würde ich eine Antwort empfehlen, weil ohne Runner kein
Deployment stattfindet und niemand es merkt.

**F4. Werden `livesync-bridge` und `obsidian-couchdb` noch benutzt?** 12 geänderte Dateien in
7 Tagen ist wenig, aber nicht null, und der Backup-Timer läuft täglich erfolgreich. Gemeinsam
≈ 158 MiB RAM und 209 MB Platte.

**F5. Was sind die 4,1 GB in `card-game-engine_uploads-data`?** 3.886 Dateien aus 02/2026 und
1.500 aus 09/2026, seither keine Änderung. Echte Spielmaterialien, oder Reste des
TTS-Import- und Upload-Lecks? Nur Du kannst das entscheiden; ich würde nichts davon anfassen,
bis die Antwort da ist.

**F6. Ist `vm-102-disk-0` bekannt?** 30 GB angelegt, ≈ 7,9 GB belegt, keine zugehörige VM und
keine Konfigurationsdatei. Rest einer gelöschten VM — oder absichtlich aufbewahrt?

**F7. Braucht die Obsidian-Synchronisation CouchDB wirklich auf `0.0.0.0:5984` im LAN,** oder
greifen nur `livesync-bridge` und der Tunnel darauf zu?
