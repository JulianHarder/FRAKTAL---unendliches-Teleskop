# FRAKTAL – Projektregeln

## Projekt
Ein **Teleskop in die Mandelbrot-Menge**. Man zoomt mit dem Mausrad immer
weiter hinein und kommt nie an ein Ende. Der vollständige Plan mit allen
Etappen steht in `FRAKTAL-Plan.md`.

Der Kern des Projekts ist die **Zoomtiefe**: ab einer Schwelle rechnet der
Shader mit emulierter Doppelgenauigkeit (zwei floats je Zahl) weiter, damit das
Bild auch bei Zoom 1e10 noch scharf ist. Wo die echte Grenze liegt, zeigt die
Oberfläche ehrlich an – sie wird nicht versteckt.

## Stand (Oktober 2026)

**Fertig und geprüft: Etappen 1 bis 4.** Als Nächstes steht Etappe 5 an.

1. **Gerüst** – WebGL2-Kontext, Vollbild-Dreieck ohne Puffer, Menge in Graustufen.
2. **Navigation** – Zoom zum Mauszeiger (im Zweierlogarithmus), Ziehen, Kneifen,
   Tastatur. Iterationstiefe wächst mit dem Zoom. Grobbild in Bewegung,
   Feinbild im Stillstand, Notbremse gegen zu lange Bilder.
3. **Farbe** – Smooth Coloring, fünf Paletten als Daten in einer 1024-Pixel-
   Textur, Regler für Dichte/Farbdrehung/Tiefe, 2×2-Kantenglättung im Standbild.
4. **Tiefe** – emulierte Doppelgenauigkeit im Shader, automatische Umschaltung,
   Genauigkeitsanzeige. Reicht bis Zoom ~1e11 statt ~1e4.

Offen: **5** Julia-Vorschau · **6** Orte, Lesezeichen, Link, Dauerzoom ·
**7** PNG-Export, Hilfe, README, Feinschliff · **8** Kopie ins Portfolio.
Die vollständige Beschreibung aller acht Etappen steht in `FRAKTAL-Plan.md`.

### Wo von diesem Plan abgewichen wurde

- **Die Umschaltschwelle ist kein fester Zoomwert.** Der Plan nannte Zoom 8192.
  Dort trägt die einfache Rechnung aber nur noch 0,58 Dezimalstellen – viel zu
  spät. Entschieden wird jetzt nach den *verbleibenden Stellen* (umschalten
  unter 1,4, zurück über 2,0), was sich auch der Fenstergröße anpasst: große
  Fenster haben kleinere Pixel und stoßen früher an. Die Schwelle liegt damit
  bei Zoom ~1260.
- **Beim Einfärben wird 1,0 abgezogen** (`js/shader/fraktal.js`). Wegen des
  Fluchtradius 256 beginnt die weiche Iterationszahl nicht bei 0, sondern bei
  etwa 1 – ohne den Abzug startet das weite Außenfeld mitten in der Palette
  und leuchtet heller als der Rand, den es umgibt.

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

Diese drei haben im Projekt schon zugeschlagen:

- **Das `hidden`-Attribut verliert gegen eine eigene `display`-Regel.** Der
  WebGL-Warnhinweis lag dadurch unsichtbar über dem fertigen Fraktal. Deshalb
  steht in `css/grundlage.css` ein `[hidden] { display: none !important; }`.
  Gilt für jedes weitere Fenster, das noch dazukommt.
- **Im Zeichner darf nur eine Uhr benutzt werden.** `eingabe()` nimmt bewusst
  keine Zeit; gestempelt wird im nächsten Bildtakt mit dessen Zeitstempel.
  Mischt man `performance.now()` und die Bildtakt-Zeit, kann die letzte
  Eingabe für immer als „gerade eben" gelten – das Bild bleibt dann dauerhaft
  grob, ohne dass irgendwo ein Fehler erscheint.
- **df64 normalisiert.** Der „tiefe" Teil einer Doppelzahl ist nach jeder
  Rechnung ein kleiner, oft negativer Rest – nicht die Stellen, die man
  hineingesteckt hat. Prüfen lässt sich nur die Summe beider Teile. Zwei
  Messungen sind daran zuerst gescheitert.

## Befehle
- Kein Build, kein Dev-Server: `index.html` per Doppelklick im Browser öffnen.
- Nur zum Testen über HTTP: `python3 -m http.server 8781`

## Prüfen

In `pruefungen/` liegen fünf Node-Skripte, die ohne Browser laufen und
zusammen rund 80 Einzelprüfungen machen – Kameramathematik, Maus- und
Tastatur-Verdrahtung gegen ein Stub-DOM, Grob/Fein-Logik mit gestellter Uhr,
Palettentextur und die Wahl des Rechenwegs:

```
for f in pruefungen/*.js; do node "$f"; done
```

Nach jeder Änderung laufen lassen. Sie brauchen nichts außer Node.

`pruefungen/df64-nachmessen.html` misst im Browser nach, ob die
Doppelgenauigkeit auf *dieser* Grafikkarte wirklich greift – einfach
doppelklicken. Wichtig, weil der Shader-Compiler je nach Treiber anders
optimiert.

**Zum Bilderprüfen:** Der Browser-Pane in Claude Desktop kann kein WebGL, dort
bleibt die Leinwand leer. Stattdessen kopfloses Chrome mit Software-Rendering:

```
google-chrome --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --window-size=1200,800 --screenshot=bild.png "file://$PWD/index.html"
```

Dabei laufen nur rund acht Bildtakte, bevor der Screenshot fällt – für
Interaktion taugt das nicht, dafür sind die Node-Skripte da. Ein Protokoll,
das erst nach vielen Takten schreibt, kommt nie zum Zug; bei jedem Takt
mitschreiben.

## Arbeitsweise
- Git: eigenes Repo. Commits auf Zuruf, Push nur wenn Julian „push" sagt.
- Nach jeder Etappe: kurz durchklicken, Screenshot in `screenshots/`.
