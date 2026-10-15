# FRAKTAL – unendliches Teleskop

## Kontext

FRAKTAL ist ein Teleskop in die Mandelbrot-Menge: man fährt mit dem Mausrad
immer weiter hinein und kommt nie an ein Ende, weil auf jeder Ebene wieder neue
Struktur auftaucht. Die Idee stand seit dem 13.10.2026 auf der Warteliste und
wird jetzt gebaut. Sie gehört in die Portfolio-Kategorie „Entdecken“.

Der Reiz ist die Tiefe, und genau da liegt das technische Problem: Grafikkarten
rechnen von Haus aus mit 32-Bit-Kommazahlen (ca. 7 Stellen). Damit ist schon bei
Zoom ~1e4 Schluss, das Bild wird stufig. Deshalb bekommt FRAKTAL zwei Shader-
Varianten: die schnelle für oben, und ab einer Zoomschwelle eine mit **emulierter
Doppelgenauigkeit** (zwei floats bilden eine Zahl mit ca. 14 Stellen), die bis
grob 1e10–1e12 scharf bleibt. Das sind rund 35 Mausrad-Rastungen tiefer. Wo die
Grenze dann wirklich liegt, zeigt die Oberfläche ehrlich an, statt es zu
verstecken.

**Vorgaben:** alle Dateien liegen lokal auf dem Rechner, nichts aus dem Netz –
diesmal aber *nicht* alles in einer Datei, sondern aufgeteilt in `index.html` +
`css/` + `js/` mit Unterordnern. Es wird **keine Bibliothek** gebraucht: WebGL2
kann der Browser selbst, der Shader wird von Hand geschrieben. Damit liegt
automatisch alles lokal, es gibt gar nichts zu laden. Umfang: Mandelbrot als
Hauptbühne, Julia als Vorschau und zweiter Modus.

---

## Projektordner und Stil

Neuer Ordner `/home/julian/Programmeiren/FRAKTAL - unendliches Teleskop`:

- Vanilla JavaScript, **kein** `import`/`export` – klassische `<script src>`-Tags
  in fester Reihenfolge, jede Datei hängt sich an `window.FRAKTAL`.
  Grund: die Seite muss per Doppelklick über `file://` laufen, und Browser
  blockieren ES-Module-Importe über `file://` (CORS), klassische Skripte nicht.
- Shader-Quellen liegen als JS-Strings in `js/shader/` – **nicht** als `.glsl`
  zum Nachladen, denn `fetch` über `file://` ist ebenfalls blockiert.
- Kommentare und Inhalte auf Deutsch, Code-Bezeichner englisch, Dateinamen
  deutsch (`Kamera.js`, `Paletten.js`).
- Keine Datei über 500 Zeilen, ab ~350 aufteilen.
- Farben, Paletten, Orte und Texte als Daten in `js/daten/`, nicht im Code.
- Eigenes Git-Repo, dazu `CLAUDE.md`, `README.md`, `FRAKTAL-Plan.md`,
  `.gitignore`, `screenshots/`.

### Dateien

```
FRAKTAL - unendliches Teleskop/
  index.html                  Gerüst + Script-Reihenfolge (~180 Z.)
  CLAUDE.md  README.md  FRAKTAL-Plan.md  .gitignore  screenshots/

  css/variablen.css           Design-Stellrad: Farben, Abstände, Zeiten
  css/grundlage.css           Grundlayout, Kopf, Fuß, Knöpfe
  css/leinwand.css            Canvas, Julia-Vorschau, Ladehinweis
  css/oberflaeche.css         Seitenleiste, Regler, Fenster, Lesezeichen

  js/daten/texte.js           Hilfetexte, Beschriftungen
  js/daten/paletten.js        Farbpaletten als Stützpunkt-Listen
  js/daten/orte.js            berühmte Stellen mit Koordinate + Beschreibung

  js/kern/Zustand.js          zentraler Zustand (Mitte, log2-Zoom, Modus, Regler)
  js/kern/Zahl.js             float64 → zwei float32 aufspalten (hi/lo)
  js/kern/Speicher.js         localStorage: Stand + Lesezeichen
  js/kern/Adresse.js          #re=…&im=…&zoom=… lesen und schreiben

  js/gl/Kontext.js            WebGL2 holen, Fallback-Hinweis, Kontextverlust
  js/gl/Programm.js           kompilieren, linken, Uniform-Cache, Fehlertexte
  js/gl/Leinwand.js           Vollbild-Dreieck, Viewport, devicePixelRatio
  js/gl/PalettenTextur.js     Stützpunkte → 1024×1-Textur
  js/gl/Kachel.js             gekachelt rendern + readPixels (für PNG-Export)

  js/shader/vertex.js         Vollbild-Dreieck
  js/shader/bausteine.js      df64-Arithmetik, Smooth Coloring, Palettenzugriff
  js/shader/fraktal.js        Fragment-Shader-Vorlage mit #define-Schaltern

  js/ansicht/Kamera.js        Mitte + log2-Zoom, Zoom zum Zeiger, Glättung
  js/ansicht/Iterationen.js   Iterationstiefe aus Zoom + Qualitätsregler
  js/ansicht/Genauigkeit.js   Rechenmodus wählen, Reststellen berechnen
  js/ansicht/Zeichner.js      Grob-/Feinbild, Wächter gegen zu lange Bilder
  js/ansicht/Dauerzoom.js     Leertaste: fährt von allein weiter rein

  js/ui/Kopfzeile.js   Seitenleiste.js   Paletten.js   Orte.js
  js/ui/JuliaVorschau.js   Maus.js   Tastatur.js   Export.js   Hilfe.js

  js/main.js                  Einstieg, Bildschleife
```

---

## Technischer Kern

### 1. Kamera in Logarithmus-Zoom
Zustand ist `{ mitteRe, mitteIm, log2Zoom }` – die Mitte als normale
JS-Zahl (float64, ~16 Stellen, reicht für das Ziel), der Zoom als Logarithmus,
damit sich gleichmäßig zoomen und weich interpolieren lässt.
Mausrad verschiebt `log2Zoom` um ±0,25 pro Rastung und korrigiert die Mitte so,
dass der Punkt **unter dem Mauszeiger stehen bleibt** – das ist der Unterschied
zwischen „ein Fraktal angucken“ und „in das Fraktal hineinfahren“:

```
welt_vor  = bildschirmZuWelt(maus)
log2Zoom += delta
mitte    += welt_vor − bildschirmZuWelt(maus)
```

Ziel- und Istwert werden getrennt gehalten und pro Bild angenähert (exponentiell,
~12 % je Bild), damit Zoomen und Ziehen gleiten statt zu springen.

### 2. Zwei Rechenmodi im Shader
Ein Shader-Quelltext, zwei Kompilate, unterschieden per `#define`:

| Modus | Darstellung | reicht bis etwa |
| --- | --- | --- |
| `EINFACH` | `vec2 c`, normale floats | Zoom 1e4 – 1e5 |
| `DOPPELT` | `vec4 c` = (re.hi, re.lo, im.hi, im.lo) | Zoom 1e10 – 1e12 |

`DOPPELT` rechnet mit **df64** (double-single): jede Zahl ist eine Summe
zweier floats, die Grundrechenarten kommen aus Dekkers/Knuths Verfahren
(`zwei_summe`, `zwei_produkt` mit Aufspaltung). Das kostet pro Multiplikation
etwa 8–10 statt 1 Operation – im Tiefenmodus ist also deutlich weniger
Bildrate da, deshalb greift dort das Grobbild (siehe 5.) stärker.

Umschaltung automatisch mit **Hysterese** (hoch bei Zoom 8e3, zurück bei 5e3),
damit es an der Schwelle nicht flackert; in der Seitenleiste zusätzlich
umstellbar auf *automatisch / einfach / doppelt*, damit der Unterschied
sichtbar ist (das ist der halbe Lernwert des Projekts).

Die Mitte wird in `Zahl.js` in hi/lo aufgespalten und als `vec4`-Uniform
übergeben; die Pixelschrittweite ebenso.

### 3. Adaptive Iterationstiefe
`iter = runden((80 + 90 · log2Zoom) · qualitaet)`, begrenzt auf 20 000.
Bei Zoom 1e10 (log2 ≈ 33) sind das knapp 3 000 Iterationen – ohne das Mitwachsen
wird jede tiefe Stelle einfach schwarz. `qualitaet` ist ein Regler von 0,5 bis 3.

### 4. Smooth Coloring und Paletten
Statt der rohen Iterationszahl (die harte Ringe ergibt) der stetige
Fluchtwert `nu = n + 1 − log2(log2(|z|)) / log2(2)`, daraus
`t = fract(nu · dichte + verschiebung)` und damit in die Palettentextur.

Paletten stehen als Stützpunkte in `js/daten/paletten.js`
(**Feuer, Eis, Nordlicht, Graustufen**, dazu eine zyklische „Sonnenaufgang“),
`PalettenTextur.js` backt daraus eine 1024×1-RGBA-Textur mit linearer
Interpolation. Neue Palette = vier Zeilen Daten, kein Code.
Dichte, Verschiebung und Innenfarbe sind Regler.

### 5. Flüssig trotz Rechenlast
- **Während Bewegung**: halbe Auflösung (Faktor 0,5) und 60 % der Iterationen.
- **Im Stillstand** (120 ms keine Eingabe): volle Auflösung und zusätzlich
  2×2-Unterabtastung im Fragment-Shader gegen die Treppchen an den Rändern.
- **Wächter**: braucht ein Bild länger als 1 s, werden Iterationen und
  Auflösung heruntergesetzt – sonst kann der Browser bei sehr hohen
  Iterationszahlen den WebGL-Kontext abschießen (`Kontext.js` fängt
  `webglcontextlost` ab und baut neu auf).
- Gezeichnet wird nur, wenn sich etwas geändert hat; die Schleife läuft sonst
  leer. Kein Dauervollgas auf der GPU.

### 6. Julia-Vorschau
Ein kleiner Canvas (220×220) unten rechts. Technisch im **gleichen**
WebGL-Kontext: nach dem Hauptbild wird mit kleinem Viewport das Julia-Fraktal
zum `c` unter dem Mauszeiger gezeichnet, per `readPixels`/`drawImage` in den
Vorschau-Canvas kopiert. Zwei Kontexte wären unnötig teuer.
Klick auf die Vorschau → Hauptbühne schaltet auf Julia mit diesem `c` und
eigener Kamera; die Mandelbrot-Kamera wird gemerkt, `J` schaltet zurück.

### 7. Orte, Lesezeichen, Link
- `js/daten/orte.js`: Seepferdchen-Tal, Elefanten-Prozession, Tripelspirale,
  Zepter-Tal, Mini-Mandelbrot – Name, Koordinate, Zoom, ein Satz dazu.
  Anklicken fährt **hin statt zu springen**: die Kamera interpoliert über
  ~1,5 s, man sieht die Ebenen vorbeifliegen.
- Eigene Lesezeichen (`B`) mit Zoomfaktor als Vorschlagsnamen, in
  `localStorage` (Schlüssel `fraktal.stand.v1`), löschbar. Mit Mini-Vorschaubild
  (96×64 JPEG, maximal 24 Stück – mehr sprengt die localStorage-Quote).
- `L` kopiert einen Link mit `#re=…&im=…&zoom=…&palette=…`. Funktioniert auch
  über `file://`, weil Hash statt Query.
- **Dauerzoom** (Leertaste): fährt von allein mit konstanter Rate weiter hinein,
  bis die Genauigkeitsgrenze kommt – das ist das Gefühl „es hört nicht auf“ in
  Reinform.

### 8. Genauigkeit ehrlich anzeigen
`Genauigkeit.js` rechnet die Pixelbreite `4 / (zoom · hoeheInPixeln)` gegen die
Auflösung des aktuellen Modus und gibt die **verbleibenden Stellen** zurück.
Die Seitenleiste zeigt einen Balken plus Klartext:

> `Genauigkeit: doppelt · 3,1 Stellen übrig` → bei < 1 Stelle:
> „Grenze erreicht – tiefer wird das Bild stufig, nicht detaillierter.“

### 9. PNG-Export
Zielgrößen 1920×1080 / 2560×1440 / 3840×2160 / Fenstergröße, mit doppelter
Iterationszahl und 2×2-Unterabtastung. Gerendert wird **gekachelt** in
1024×1024-Stücken (`Kachel.js`), jede Kachel per `readPixels` geholt und in
einen 2D-Canvas der Zielgröße gesetzt, dann `toBlob`. Zwei Gründe: 4K mit
Unterabtastung (7680×4320) sprengt `MAX_VIEWPORT_DIMS`, und kleine Kacheln
vermeiden GPU-Zeitüberschreitungen. Fortschrittsbalken dazu, weil es bei tiefen
Stellen einige Sekunden dauert.

---

## Etappen

Jede Etappe endet mit einer laufenden Seite und einem Screenshot in
`screenshots/`. Immer nur an der aktuellen arbeiten.

1. **Gerüst und erstes Bild** – Ordner, `index.html`, vier CSS-Dateien,
   WebGL2-Kontext mit Fallback-Hinweis, Vollbild-Dreieck, Mandelbrot in
   Graustufen mit festen 200 Iterationen, Fenstergröße und `devicePixelRatio`.
   *Fertig, wenn die Menge beim Doppelklick auf `index.html` da ist.*
2. **Navigation** – Kamera mit log2-Zoom, Zoom zum Mauszeiger, Ziehen, Touch
   (ein Finger schieben, zwei Finger kneifen), Tasten, Zoomfaktor- und
   Koordinatenanzeige, adaptive Iterationen, Grob-/Feinbild, Wächter.
   *Fertig, wenn Zoomen bei 1080p flüssig ist und bei ~1e4 sichtbar stufig wird.*
3. **Farbe** – Smooth Coloring, Palettentextur aus Daten, fünf Paletten,
   Regler für Dichte/Verschiebung/Innenfarbe/Qualität, Kantenglättung im Feinbild.
4. **Tiefe** – df64-Bausteine, zweites Kompilat, automatische Umschaltung mit
   Hysterese, Genauigkeitsanzeige, manuelle Moduswahl.
   *Fertig, wenn Zoom 1e8 scharf ist und der Modus-Umschalter den Unterschied
   zeigt.*
5. **Julia** – Vorschau unter dem Mauszeiger, Klick → Julia-Vollbild, `J` zurück.
6. **Orte, Lesezeichen, Link, Dauerzoom** – Sprungliste mit Hinflug, eigene
   Lesezeichen mit Vorschaubild, Hash-Link, Leertaste-Dauerzoom.
7. **Export und Feinschliff** – gekachelter PNG-Export mit Fortschritt,
   Hilfe-Fenster, Fußzeile mit Tastenübersicht, Layout für schmale Fenster,
   `README.md`, `CLAUDE.md`, `FRAKTAL-Plan.md`.
8. **Portfolio** – Kopie nach
   `PortfolioWebseiteCloudflare/projekte/fraktal/`, Eintrag in
   [projekte-entdecken.js](PortfolioWebseiteCloudflare/assets/daten/projekte-entdecken.js)
   nach dem Muster der dortigen Einträge, Vorschaubild als
   `assets/bilder/vorschau/fraktal.webp`. Eigenes Git-Repo anlegen.
   **Push erst auf Zuruf** – und daran denken, dass ein Push auf `main` im
   Portfolio sofort live geht.

---

## Fallstricke, die eingeplant sind

- **Der Shader-Compiler kann die df64-Trickserei wegoptimieren.** Die
  Fehlerterme entstehen aus Ausdrücken, die mathematisch null sind
  (`(a+b)−a−b`); ein aggressiver Optimierer kürzt sie weg und das Bild bleibt
  trotz Doppelmodus stufig. Gegenmittel: die Aufspaltungskonstante `4097.0`
  als **Uniform** übergeben, nicht als Literal – dann kann sie nicht konstant
  gefaltet werden. Prüfbild: Zoom 1e8, muss scharf sein.
- **`highp` ist in Fragment-Shadern nicht garantiert.** `precision highp float`
  explizit setzen und `gl.getShaderPrecisionFormat` prüfen; fehlt es, bleibt der
  einfache Modus mit Hinweis.
- **Zoom zum Mauszeiger** nur dann korrekt, wenn Mitte *nach* der Zoomänderung
  korrigiert wird (siehe Formel oben). In der falschen Reihenfolge driftet das
  Bild weg.
- **`readPixels` liefert Zeilen von unten.** Beim Export jede Kachel spiegeln,
  sonst steht das Bild kopf.
- **localStorage-Quote** (~5 MB): Lesezeichen-Vorschaubilder klein und begrenzt
  halten, beim Schreiben `try/catch` und dann das älteste Bild verwerfen.
- **Kontextverlust** nach langen Bildern: `webglcontextlost` abfangen,
  `preventDefault`, bei `webglcontextrestored` Programme und Textur neu bauen.

## Prüfen

Kein Build, kein Server: `index.html` doppelklicken. Zusätzlich im Browser-Pane
über `python3 -m http.server 8781` durchgehen und dabei die Konsole mitlesen
(`read_console_messages`) – WebGL-Fehler landen dort und nirgends sonst.

Prüfliste am Ende jeder Etappe:

1. **Über `file://` geöffnet**, ohne Server – keine CORS-Fehler, kein `fetch`.
2. **Netzwerk leer**: `read_network_requests` zeigt nur die eigenen Dateien,
   keine fremde Domain.
3. **Flüssigkeit**: Vollbild 1080p, Dauerzoom an – Bildrate in der Seitenleiste
   bleibt im einfachen Modus über 50, im Doppelmodus über 20.
4. **Tiefe**: Lesezeichen „Mini-Mandelbrot“ anfahren (Zoom ~1e7), Bild scharf;
   manuell auf „einfach“ schalten → sichtbar stufig. Das ist der Beweis, dass
   df64 wirklich greift.
5. **Grenze**: weiter zoomen, bis die Genauigkeitsanzeige 0 Stellen meldet –
   die Warnung muss vor dem Matsch kommen, nicht danach.
6. **Julia**: Vorschau folgt dem Zeiger, Klick wechselt, `J` kommt zurück.
7. **Export**: 4K-PNG speichern, Datei öffnen, Größe und Ausrichtung stimmen.
8. **Neu laden**: Position, Palette, Regler und Lesezeichen sind wieder da;
   kopierter Link öffnet exakt dieselbe Stelle.
9. **Schmal**: `resize_window` auf 375×812 – Bedienung erreichbar,
   Touch-Zoom funktioniert.
10. **Zeilen zählen**:
    `find js css -name "*.js" -o -name "*.css" | xargs wc -l | sort -n` –
    keine Datei über 500.
