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

**Fertig und geprüft: alle acht Etappen**, davon zwei Stücke auf Julians Wunsch
wieder entfernt (siehe unten).

1. **Gerüst** – WebGL2-Kontext, Vollbild-Dreieck ohne Puffer, Menge in Graustufen.
2. **Navigation** – Zoom zum Mauszeiger (im Zweierlogarithmus), Ziehen, Kneifen,
   Tastatur. Iterationstiefe wächst mit dem Zoom. Grobbild in Bewegung,
   Feinbild im Stillstand, Notbremse gegen zu lange Bilder.
3. **Farbe** – Smooth Coloring, fünf Paletten als Daten in einer 1024-Pixel-
   Textur, Regler für Dichte/Farbdrehung/Tiefe, 2×2-Kantenglättung im Standbild.
4. **Tiefe** – emulierte Doppelgenauigkeit im Shader, automatische Umschaltung,
   Genauigkeitsanzeige. Reicht bis Zoom ~1e11 statt ~1e4. Ob sie auf einer
   Karte wirklich greift, misst die Seite beim Start selbst nach – auf
   Julians Karte tat sie es erst nach den Sperren in `bausteine.js`.
5. **Julia** – gebaut, geprüft und auf Wunsch wieder entfernt (siehe unten).
6. **Reisen** – sechs berühmte Stellen mit Hinflug im Bogen, eigene
   Lesezeichen mit Vorschaubild in `localStorage`, Link hinter dem
   Doppelkreuz (`L`). Stand und Regler überleben das Neuladen – der
   Rechenweg mit Absicht nicht.
7. **Export und Feinschliff** – PNG bis 4K, gekachelt gerechnet mit
   Fortschrittsbalken; Hilfefenster (`H`) mit allen Tasten; Layout für
   schmale Fenster; Notbremse in zwei Stufen; `README.md`.
8. **Portfolio** – Kopie unter `PortfolioWebseiteCloudflare/projekte/fraktal/`
   (nur `index.html`, `css/`, `js/` – ohne `pruefungen/`, `screenshots/` und die
   Plandateien), Eintrag in `assets/daten/projekte-entdecken.js`, Vorschaubild
   `assets/bilder/vorschau/fraktal.webp`.

Die vollständige Beschreibung aller acht Etappen steht in `FRAKTAL-Plan.md`.

### Wo von diesem Plan abgewichen wurde

- **Die Umschaltschwelle ist kein fester Zoomwert.** Der Plan nannte Zoom 8192.
  Dort trägt die einfache Rechnung aber nur noch 0,58 Dezimalstellen – viel zu
  spät. Entschieden wird jetzt nach den *verbleibenden Stellen* (umschalten
  unter 1,4, zurück über 2,0), was sich auch der Fenstergröße anpasst: große
  Fenster haben kleinere Pixel und stoßen früher an. Die Schwelle liegt damit
  bei Zoom ~1260.
- **Julia-Vorschau und Dauerzoom sind wieder draußen.** Beide waren fertig und
  geprüft, Julian braucht sie nicht – und die Vorschau kostete beim Zoomen
  jedes Bild einen `readPixels`-Halt, weil sie dem Zeiger auch in Bewegung
  folgte. Entfernt wurden: `js/ui/JuliaVorschau.js`, `js/ansicht/Menge.js`,
  `js/ansicht/Dauerzoom.js`, der Schalter `u_julia` im Shader, die Tasten `J`
  und Leertaste und alles, was daran hing. Wer sie zurückholen will, findet
  sie vollständig in den Commits `7aeecc3` (Julia) und `ba37e81` (Dauerzoom).
- **`js/gl/Ziel.js` ist eine Datei mehr als im Plan** – ein Zeichenziel neben
  dem Bildschirm. Gebraucht wird es für die Vorschaubilder der Lesezeichen und
  für die Kacheln des Exports: beide rechnen ein Bild in anderer Größe, ohne
  das Bild auf dem Schirm anzurühren.
- **Der Hinflug schwenkt nach dem Ausschnitt, nicht nach der Uhr.** Siehe
  Fallstricke – der Plan sagte nur „interpoliert über ~1,5 s“, und genau so
  gebaut sieht man vom Flug nichts.
- **Die Adresse wird nur auf Zuruf geschrieben** (Taste `L`), nicht bei jeder
  Bewegung. Ein Hash, der sich ständig ändert, füllt die Zurück-Liste des
  Browsers mit hunderten Zwischenstellen.
- **Die df64-Arithmetik ist gegen den Optimierer gesperrt.** Die 4097 als
  Uniform allein reichte nicht: auf Julians Grafikkarte maß FRAKTAL
  **24 von 46 Bit** – der Treiber hatte die Fehlerterme vollständig
  wegoptimiert, die Doppelgenauigkeit rechnete heimlich einfach, und ab Zoom
  ~1e4 war das Bild stufig. Jetzt steht an jeder Stelle, an der ein
  Zwischenwert mathematisch gleich einem Eingabewert ist, ein `fest(x)` –
  eine Multiplikation mit einer Eins, die als Uniform hereinkommt. Am Wert
  ändert das nichts, aber `s - (s - a)` darf nicht mehr zu `a` werden.
  **Damit misst dieselbe Karte 46 Bit**, und der Zoom reicht statt bis ~1e4
  wieder bis ~1e10. Kostet rund 12 % Rechenzeit (13 Sperren, gemessen mit
  Software-Rendering).
- **FRAKTAL misst beim Start nach, was die Grafikkarte wirklich trägt**
  (`js/gl/Nachmessen.js`). Der Plan sah die 46 Bit der Doppelgenauigkeit als
  gegeben an. Sie sind aber eine Annahme über einen Compiler, der die
  Fehlerterme stehen lässt – tut er das nicht, bleibt das Bild stufig und
  daneben steht trotzdem „doppelt · 5 Stellen übrig“. Gemessen wird mit einer
  Leiter von Abständen (2⁻²³ bis 2⁻⁴⁷), zehn Pixel, einmal beim Start; das
  Ergebnis tritt an die Stelle der Annahme und steht in der Seitenleiste.
  Bringt der doppelte Weg nichts, wird er abgeschaltet statt teuer zu lügen.
- **Die Genauigkeitsgrenze steht jetzt auch über der Leinwand.** In der
  Seitenleiste stand sie weit unten – wer gerade zoomt, sieht dorthin nicht,
  sondern auf die Klötzchen, und hält sie für einen Fehler des Programms.
- **Der Export rechnet immer doppelt genau**, auch wenn das Bild auf dem
  Schirm mit dem einfachen Weg auskäme. Zwei Gründe: ein Exportbild hat
  kleinere Pixel als die Leinwand und damit weniger Stellen Luft, und jede
  Kachel hat ihre eigene Mitte – in 32 Bit gerundet treffen zwei Kacheln am
  Stoß dann nicht mehr dieselbe Farbe.
- **Gekachelt wird nicht wegen `MAX_VIEWPORT_DIMS`.** Der Plan nahm an, die
  2×2-Abtastung bräuchte einen vierfach großen Puffer. Sie läuft aber im
  Shader, der Puffer bleibt in Zielgröße. Gekachelt wird trotzdem, und zwar
  gegen die Zeitüberschreitung des Treibers und damit der Browser zwischen
  zwei Kacheln wieder an die Reihe kommt.
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
- **Eine Anzeige, die eine Annahme für eine Messung ausgibt, ist schlimmer
  als gar keine.** „Doppelt · 5,9 Stellen übrig“ neben einem sichtbar
  stufigen Bild schickt denjenigen, der es sieht, auf die Suche nach einem
  Fehler bei sich. Alles, was die Oberfläche über die Genauigkeit sagt, hängt
  deshalb jetzt an einer Messung auf genau dieser Karte, nicht an einer Zahl
  im Quelltext.
- **Gemerkte Einstellungen werden zur Falle.** Seit Etappe 6 überlebt der
  Stand das Neuladen – und damit überlebte auch der von Hand gewählte
  Rechenweg. Einmal zum Vergleichen auf „einfach“ gestellt und vergessen, und
  jedes tiefe Bild ist beim nächsten Öffnen stufig, ohne dass noch jemand
  weiß, warum. Der Rechenweg wird deshalb **nicht** gespeichert; jede Sitzung
  fängt bei „automatisch“ an. Für alles andere gilt: was gemerkt wird, muss
  auch sichtbar und zurücksetzbar sein.
- **Die Notbremse spart an der Glättung, bevor sie an der Tiefe spart.**
  Beides macht Bilder schneller, aber die 2×2-Glättung kostet das Vierfache
  und bringt nur weichere Ränder – die Iterationstiefe ist der Inhalt. Wer
  dort zuerst kürzt, dem fällt tief drinnen die Struktur weg, und es sieht
  aus, als wäre das Fraktal zu Ende. Beide Stufen stehen in der Seitenleiste.
- **Ein Bild aus zwei Rechenwegen passt nicht zusammen.** `Kachel.js` reichte
  das Kennzeichen `doppelt` nicht an die einzelnen Kacheln weiter; jede suchte
  sich ihren Rechenweg selbst, und gegen ein Bild aus einem Stück wichen
  9,4 % der Pixel ab. Am Bild sah man nichts – die Unterschiede lagen am Rand
  der Menge, nicht auf den Stößen, und sahen deshalb nach Rundung aus. Gefunden
  hat es erst die Node-Prüfung, die die Werte jeder Kachel nachzählt.
- **Ein Hinflug, der nach der Uhr schwenkt, zeigt nichts.** Wird die Mitte
  gleichmäßig über die Flugzeit interpoliert, steht das Ziel bei halber Zeit
  rechnerisch fast da – und trotzdem sechzehn Bildhöhen daneben, weil der
  Maßstab inzwischen tausendfach feiner ist. Man sieht einen leeren Anflug
  und am Schluss ein Bild, das von der Seite hereinspringt. Deshalb hängt der
  Schwenk in `Kamera.js` am Ausschnitt: das Ziel bleibt immer innerhalb von
  0,35 Bildhöhen. Dazu der Bogen – erst hinaus, bis der Weg ins Bild passt,
  dann hinüber, dann hinein.
- **Eine Kopfzeile, die nicht umbricht, zwingt die ganze Seite breiter als
  den Bildschirm.** Bei 375 Pixeln stand alles halb draußen – nicht weil die
  Seitenleiste zu breit war, sondern weil die Knopfreihe oben eine
  Mindestbreite hat und das Grid sich danach richtet. `flex-wrap` in der
  Kopfzeile, und der Rest passt von selbst.
- **Innen und außen sind an der Farbe nicht immer zu unterscheiden.** Wer ein
  Bild nachrechnen will, braucht ablesbare Pixel – bei „Feuer" ist die
  Innenfarbe `[10, 6, 14]` und der Palettenanfang `[8, 4, 18]`, und genau dort
  liegt das weite Außenfeld. Für solche Prüfungen Graustufen, kleine Dichte,
  halbe Farbdrehung: dann ist die Menge schwarz und alles andere mindestens
  mittelgrau. Hat eine Messung schon einmal gekostet.
- **Eine Multiplikation mit eins ist keine Rechnung, sondern eine Mauer.**
  Wer in `js/shader/bausteine.js` ein `fest(...)` für überflüssig hält und
  entfernt, bekommt keinen Fehler und keine Warnung – nur ein Bild, das auf
  manchen Grafikkarten tief drinnen stufig wird. Nach jeder Änderung dort
  `pruefungen/df64-nachmessen.html` aufmachen und die Leiter ansehen; die
  Zahl in der Seitenleiste sagt dasselbe in kurz.
- **Ein vergessenes Uniform ist null.** `u_eins` muss überall gesetzt werden,
  wo ein Programm mit den df64-Bausteinen läuft – sonst multipliziert die
  halbe Arithmetik mit null und das Bild ist einfarbig. Betroffen sind
  `Zeichner.bildSetzen`, `Nachmessen` und `df64-nachmessen.html`.
- **df64 normalisiert.** Der „tiefe" Teil einer Doppelzahl ist nach jeder
  Rechnung ein kleiner, oft negativer Rest – nicht die Stellen, die man
  hineingesteckt hat. Prüfen lässt sich nur die Summe beider Teile. Zwei
  Messungen sind daran zuerst gescheitert.

## Befehle
- Kein Build, kein Dev-Server: `index.html` per Doppelklick im Browser öffnen.
- Nur zum Testen über HTTP: `python3 -m http.server 8781`

## Prüfen

In `pruefungen/` liegen acht Node-Skripte, die ohne Browser laufen und
zusammen rund 155 Einzelprüfungen machen – Kameramathematik, Maus- und
Tastatur-Verdrahtung gegen ein Stub-DOM, Grob/Fein-Logik und die zweistufige
Notbremse mit gestellter Uhr, Palettentextur, die Wahl des Rechenwegs, den
Flug zu einer Stelle, Adresse, Speicher (samt vollem localStorage), die
Geometrie der Exportkacheln und die Auswertung der Genauigkeitsmessung:

```
for f in pruefungen/*.js; do node "$f"; done
```

Nach jeder Änderung laufen lassen. Sie brauchen nichts außer Node.

Zwei Seiten prüfen im Browser nach, was ohne Grafikkarte niemand messen kann –
einfach doppelklicken:

- `pruefungen/df64-nachmessen.html` misst, ob die Doppelgenauigkeit auf *dieser*
  Grafikkarte wirklich greift, und zeigt die Leiter Stufe für Stufe. Dieselbe
  Messung läuft beim Start der Seite; hier steht sie ausführlich. Wichtig,
  weil der Shader-Compiler je nach Treiber anders optimiert.
- `pruefungen/export-nachrechnen.html` rechnet dasselbe Bild einmal gekachelt
  und einmal aus einem Stück und vergleicht beide. Gemessen wird in den
  ruhigen Flächen (dort schlägt jeder Versatz durch) und auf den Kachelstößen.
  Braucht Geduld: auf einer Software-Grafikkarte einige Minuten.
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
- **Gepusht wird über SSH.** `origin` zeigt auf die HTTPS-Adresse, und dafür
  ist keine Anmeldung hinterlegt – `git push origin main` scheitert mit
  „could not read Username". Der SSH-Schlüssel liegt dagegen bereit:
  `git push git@github.com:JulianHarder/FRAKTAL---unendliches-Teleskop.git main`
- Nach jeder Etappe: kurz durchklicken, Screenshot in `screenshots/`.
