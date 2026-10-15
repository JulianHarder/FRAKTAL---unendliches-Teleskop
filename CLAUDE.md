# FRAKTAL – Projektregeln

## Projekt
Ein **Teleskop in die Mandelbrot-Menge**. Man zoomt mit dem Mausrad immer
weiter hinein und kommt nie an ein Ende. Der vollständige Plan mit allen
Etappen steht in `FRAKTAL-Plan.md`.

Der Kern des Projekts ist die **Zoomtiefe**: ab einer Schwelle rechnet der
Shader mit emulierter Doppelgenauigkeit (zwei floats je Zahl) weiter, damit das
Bild auch bei Zoom 1e10 noch scharf ist. Wo die echte Grenze liegt, zeigt die
Oberfläche ehrlich an – sie wird nicht versteckt.

## Stack
- Vanilla JavaScript, **WebGL2**, kein Framework, kein TypeScript, kein Build-Tool
- **Kein ES-Module-Syntax (`import`/`export`) in `js/`.** `index.html` lädt
  klassische `<script>`-Tags in fester Reihenfolge (siehe dort), jede Datei
  hängt sich an `window.FRAKTAL`.
  Grund: Die Seite muss per Doppelklick über `file://` laufen; Browser
  blockieren ES-Module-Importe über `file://` (CORS), klassische Skripte nicht.
- **Shader-Quellen sind JS-Strings** in `js/shader/`, keine `.glsl`-Dateien.
  Grund: `fetch` ist über `file://` ebenfalls blockiert.
- **Nichts wird aus dem Netz geladen.** Keine Bibliothek, kein CDN, keine
  Webfonts. Der Shader ist von Hand geschrieben – er ist der Lernkern.
- Inhalte und Kommentare auf Deutsch, Code-Bezeichner auf Englisch.

## Regeln
- Die Rechnung gehört in den **Fragment-Shader**, nicht in JavaScript. Eine
  Mandelbrot-Schleife in JS ruckelt im Vollbild, egal wie gut sie ist.
- Pro Bild wird nur gezeichnet, wenn sich etwas geändert hat. Die Schleife
  läuft sonst leer – kein Dauervollgas auf der GPU.
- Farben, Paletten, Orte und Texte liegen in `js/daten/`, nicht im Code.
  Eine neue Palette ist ein Dateneintrag, keine Codeänderung.
- Keine Datei über 500 Zeilen. Ab ca. 350 Zeilen aufteilen. Prüfen mit:
  `find js css -name "*.js" -o -name "*.css" | xargs wc -l | sort -n`
- Nur an der aktuellen Etappe arbeiten, nicht an mehreren gleichzeitig.
- Vor größeren Änderungen erst einen kurzen Plan zeigen.

## Fallstricke
- **Zoom zum Mauszeiger** stimmt nur, wenn die Mitte *nach* der Zoomänderung
  korrigiert wird. In der falschen Reihenfolge driftet das Bild weg.
- **`readPixels` liefert die Zeilen von unten.** Beim PNG-Export jede Kachel
  spiegeln, sonst steht das Bild kopf.
- `#version 300 es` muss die **erste** Zeile des Shaders sein – kein Leerzeichen
  und kein Zeilenumbruch davor, sonst schlägt das Kompilieren fehl.

## Befehle
- Kein Build, kein Dev-Server: `index.html` per Doppelklick im Browser öffnen.
- Nur zum Testen über HTTP: `python3 -m http.server 8781`

## Arbeitsweise
- Git: eigenes Repo. Commits auf Zuruf, Push nur wenn Julian „push" sagt.
- Nach jeder Etappe: kurz durchklicken, Screenshot in `screenshots/`.
