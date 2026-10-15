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

**Fertig und geprüft: Etappen 1 bis 6.** Als Nächstes steht Etappe 7 an.

1. **Gerüst** – WebGL2-Kontext, Vollbild-Dreieck ohne Puffer, Menge in Graustufen.
2. **Navigation** – Zoom zum Mauszeiger (im Zweierlogarithmus), Ziehen, Kneifen,
   Tastatur. Iterationstiefe wächst mit dem Zoom. Grobbild in Bewegung,
   Feinbild im Stillstand, Notbremse gegen zu lange Bilder.
3. **Farbe** – Smooth Coloring, fünf Paletten als Daten in einer 1024-Pixel-
   Textur, Regler für Dichte/Farbdrehung/Tiefe, 2×2-Kantenglättung im Standbild.
4. **Tiefe** – emulierte Doppelgenauigkeit im Shader, automatische Umschaltung,
   Genauigkeitsanzeige. Reicht bis Zoom ~1e11 statt ~1e4.
5. **Julia** – Vorschau unter dem Mauszeiger, Klick holt die Menge auf die
   Hauptbühne, `J` wechselt hin und zurück. Beide Mengen haben eine eigene
   Kamera, die beim Wechseln gemerkt wird.
6. **Reisen** – sechs berühmte Stellen mit Hinflug im Bogen, eigene
   Lesezeichen mit Vorschaubild in `localStorage`, Link hinter dem
   Doppelkreuz (`L`), Dauerzoom auf der Leertaste. Stand und Regler
   überleben das Neuladen.

Offen: **7** PNG-Export, Hilfe, README, Feinschliff ·
**8** Kopie ins Portfolio.
Die vollständige Beschreibung aller acht Etappen steht in `FRAKTAL-Plan.md`.

### Wo von diesem Plan abgewichen wurde

- **Die Umschaltschwelle ist kein fester Zoomwert.** Der Plan nannte Zoom 8192.
  Dort trägt die einfache Rechnung aber nur noch 0,58 Dezimalstellen – viel zu
  spät. Entschieden wird jetzt nach den *verbleibenden Stellen* (umschalten
  unter 1,4, zurück über 2,0), was sich auch der Fenstergröße anpasst: große
  Fenster haben kleinere Pixel und stoßen früher an. Die Schwelle liegt damit
  bei Zoom ~1260.
- **Die Julia-Vorschau zeichnet in einen eigenen Framebuffer** (`js/gl/Ziel.js`),
  nicht in eine Ecke der Leinwand, wie der Plan es vorsah. Grund: sie folgt dem
  Zeiger auch im Stillstand. Läge sie in der Leinwand, müsste für jede
  Mausbewegung das ganze Fraktal mitgerechnet werden – tief drinnen eine halbe
  Sekunde je Bild, und das Hauptbild bliebe dauerhaft grob. Derselbe
  WebGL-Kontext, nur ein anderes Ziel; `readPixels` holt die Pixel in den
  2D-Canvas der Vorschau.
- **Julia ist ein Uniform, kein drittes Kompilat.** Mandelbrot und Julia
  unterscheiden sich nur in den Startwerten vor der Schleife (`u_julia` in
  `js/shader/fraktal.js`). Ein eigenes `#define` hätte die Zahl der Programme
  verdoppelt, ohne in der Schleife ein einziges Mal zu sparen – der Schalter ist
  für alle Pixel gleich.
- **Zwei Dateien mehr als im Plan:** `js/gl/Ziel.js` (Zeichenziel) und
  `js/ansicht/Menge.js` (Wechsel samt Kamera-Gedächtnis).
- **Der Hinflug schwenkt nach dem Ausschnitt, nicht nach der Uhr.** Siehe
  Fallstricke – der Plan sagte nur „interpoliert über ~1,5 s“, und genau so
  gebaut sieht man vom Flug nichts.
- **Die Adresse wird nur auf Zuruf geschrieben** (Taste `L`), nicht bei jeder
  Bewegung. Ein Hash, der sich ständig ändert, füllt die Zurück-Liste des
  Browsers mit hunderten Zwischenstellen.
- **Die Koordinaten der Orte sind nachgesehen, nicht abgeschrieben.** Die aus
  der Literatur geläufigen Werte trafen ihre Namen zum Teil nicht: bei der
  Tripelspirale lag die Figur außerhalb des Bildes, und am klassischen
  tiefen Punkt (−0,743643887…) steht bei Zoom 1e7 keine kleine Menge,
  sondern Gischt – das Mini-Mandelbrot sitzt dort bei 5e5. Nachgesehen wird
  mit `pruefungen/orte-ansehen.html`.
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
- **Ein Hinflug, der nach der Uhr schwenkt, zeigt nichts.** Wird die Mitte
  gleichmäßig über die Flugzeit interpoliert, steht das Ziel bei halber Zeit
  rechnerisch fast da – und trotzdem sechzehn Bildhöhen daneben, weil der
  Maßstab inzwischen tausendfach feiner ist. Man sieht einen leeren Anflug
  und am Schluss ein Bild, das von der Seite hereinspringt. Deshalb hängt der
  Schwenk in `Kamera.js` am Ausschnitt: das Ziel bleibt immer innerhalb von
  0,35 Bildhöhen. Dazu der Bogen – erst hinaus, bis der Weg ins Bild passt,
  dann hinüber, dann hinein.
- **Innen und außen sind an der Farbe nicht immer zu unterscheiden.** Wer ein
  Bild nachrechnen will, braucht ablesbare Pixel – bei „Feuer" ist die
  Innenfarbe `[10, 6, 14]` und der Palettenanfang `[8, 4, 18]`, und genau dort
  liegt das weite Außenfeld. Für solche Prüfungen Graustufen, kleine Dichte,
  halbe Farbdrehung: dann ist die Menge schwarz und alles andere mindestens
  mittelgrau. Hat eine Messung schon einmal gekostet.
- **df64 normalisiert.** Der „tiefe" Teil einer Doppelzahl ist nach jeder
  Rechnung ein kleiner, oft negativer Rest – nicht die Stellen, die man
  hineingesteckt hat. Prüfen lässt sich nur die Summe beider Teile. Zwei
  Messungen sind daran zuerst gescheitert.

## Befehle
- Kein Build, kein Dev-Server: `index.html` per Doppelklick im Browser öffnen.
- Nur zum Testen über HTTP: `python3 -m http.server 8781`

## Prüfen

In `pruefungen/` liegen sieben Node-Skripte, die ohne Browser laufen und
zusammen rund 170 Einzelprüfungen machen – Kameramathematik, Maus- und
Tastatur-Verdrahtung gegen ein Stub-DOM, Grob/Fein-Logik mit gestellter Uhr,
Palettentextur, die Wahl des Rechenwegs, den Wechsel der Menge, den Flug zu
einer Stelle, Adresse, Speicher (samt vollem localStorage) und Dauerzoom:

```
for f in pruefungen/*.js; do node "$f"; done
```

Nach jeder Änderung laufen lassen. Sie brauchen nichts außer Node.

Zwei Seiten prüfen im Browser nach, was ohne Grafikkarte niemand messen kann –
einfach doppelklicken:

- `pruefungen/df64-nachmessen.html` misst, ob die Doppelgenauigkeit auf *dieser*
  Grafikkarte wirklich greift. Wichtig, weil der Shader-Compiler je nach Treiber
  anders optimiert.
- `pruefungen/julia-nachrechnen.html` rechnet die Julia-Mengen in JavaScript
  nach und vergleicht sie Punkt für Punkt mit dem, was die Vorschau zeigt –
  samt Zeilenordnung des `readPixels`.
- `pruefungen/orte-ansehen.html` malt jede Stelle aus `js/daten/orte.js` als
  Karte nebeneinander. Ob im Seepferdchen-Tal wirklich Seepferdchen stehen,
  lässt sich nicht ausrechnen – nur ansehen. Nach jeder Änderung an den
  Koordinaten aufmachen.

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
