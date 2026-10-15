/* Fragment-Shader: hier entsteht das Fraktal.
 *
 * Jedes Pixel ist ein Punkt c der komplexen Ebene. Gefragt wird, ob die Folge
 *     z(0) = 0,  z(n+1) = z(n)^2 + c
 * beschraenkt bleibt. Bleibt sie es, gehoert c zur Mandelbrot-Menge (innen).
 * Verlaesst sie den Fluchtradius, ist c draussen - und wie schnell sie das
 * tut, bestimmt die Farbe.
 *
 * Es gibt zwei Fassungen desselben Shaders, gesteuert ueber `#define DOPPELT`:
 *
 *   einfach  - alles in gewoehnlichen floats. Schnell, reicht bis Zoom ~1e4.
 *   doppelt  - jede Zahl ist ein Paar floats (js/shader/bausteine.js).
 *              Rund fuenfmal so teuer, reicht bis Zoom ~1e10.
 *
 * Beide werden beim Start uebersetzt; welche zeichnet, entscheidet
 * js/ansicht/Genauigkeit.js nach dem Zoomfaktor.
 *
 * Dieselbe Schleife rechnet auch die Julia-Mengen - der Unterschied sind nur
 * die Startwerte, deshalb steht dafuer ein Schalter als Uniform und kein
 * drittes Kompilat (siehe punktFarbe).
 */
window.FRAKTAL = window.FRAKTAL || {};
FRAKTAL.Shader = FRAKTAL.Shader || {};

(function () {
  'use strict';

  var RUMPF = `
uniform vec2  u_groesse;        // Zeichenpuffer in Pixeln
uniform int   u_iterationen;    // Obergrenze der Schleife

uniform sampler2D u_palette;    // 1024 Farben, gespiegelt wiederholend
uniform float u_dichte;         // wie eng die Farbbaender liegen
uniform float u_verschiebung;   // dreht die Palette durch
uniform vec3  u_innen;          // Farbe der Menge selbst
uniform int   u_proben;         // 1 = ein Punkt je Pixel, 2 = 2x2

uniform int   u_julia;          // 1 = Julia-Menge statt Mandelbrot-Menge

#ifdef DOPPELT
  uniform vec2 u_mitteReD;      // Bildmitte, real, als (hoch, tief)
  uniform vec2 u_mitteImD;      // Bildmitte, imaginaer
  uniform vec2 u_skalaD;        // Weltbreite je Pixel
  uniform vec2 u_juliaReD;      // festes c der Julia-Menge, (hoch, tief)
  uniform vec2 u_juliaImD;
#else
  uniform vec2  u_mitte;
  uniform float u_skala;
  uniform vec2  u_juliaC;       // festes c der Julia-Menge
#endif

out vec4 ausgabe;

/* Fluchtradius 256, nicht 2.
 *
 * Fuer die blosse Frage "drin oder draussen" genuegt 2. Die weiche Faerbung
 * braucht aber Abstand: sie schaetzt aus dem Betrag beim Abbruch, wie weit
 * zwischen zwei Iterationsstufen der Punkt liegt. Direkt an der Grenze ist
 * diese Schaetzung grob, weit draussen wird sie genau - und nur dann
 * verschwinden die harten Ringe. */
const float GRENZE = 65536.0;   // 256 * 256, im Quadrat verglichen

/* Ein Bildpunkt, von der Pixelkoordinate bis zur fertigen Farbe.
 *
 * Beide Mengen entstehen aus derselben Folge z -> z^2 + c, sie fragen nur
 * verschieden herum:
 *
 *   Mandelbrot - c ist das Pixel, die Folge faengt bei z = 0 an. Das Bild
 *                zeigt, fuer welche c sie beschraenkt bleibt.
 *   Julia      - c steht fest, eine einzige Zahl fuer das ganze Bild, und
 *                das Pixel ist der Startwert z. Das Bild zeigt, welche
 *                Startwerte bei diesem c beschraenkt bleiben.
 *
 * Ein Schalter vor der Schleife genuegt also. Er ist ein Uniform und hat fuer
 * alle Pixel denselben Wert - die Grafikkarte entscheidet einmal und nicht
 * pro Pixel, in der Schleife selbst kostet er nichts. */
vec3 punktFarbe(vec2 pixel) {
  // gl_FragCoord zaehlt von unten links, die imaginaere Achse zeigt nach
  // oben: das passt ohne Spiegelung zusammen.
  vec2 d = pixel - 0.5 * u_groesse;

  int schritte = 0;
  bool entkommen = false;
  float betrag2 = 0.0;

#ifdef DOPPELT
  /* Der Pixelabstand d ist klein und ganzzahlig, also in 32 Bit exakt. Erst
   * das Produkt mit der winzigen Schrittweite und die Summe mit der Mitte
   * brauchen die zweite Haelfte der Stellen. */
  vec2 pRe = dfAdd(u_mitteReD, dfMul(dfVon(d.x), u_skalaD));
  vec2 pIm = dfAdd(u_mitteImD, dfMul(dfVon(d.y), u_skalaD));

  bool julia = u_julia == 1;
  vec2 cRe = julia ? u_juliaReD : pRe;
  vec2 cIm = julia ? u_juliaImD : pIm;
  vec2 zRe = julia ? pRe : vec2(0.0);
  vec2 zIm = julia ? pIm : vec2(0.0);

  for (int i = 0; i < u_iterationen; i++) {
    vec2 re2 = dfMul(zRe, zRe);
    vec2 im2 = dfMul(zIm, zIm);
    vec2 kreuz = dfMul(zRe, zIm);

    zRe = dfAdd(dfSub(re2, im2), cRe);
    zIm = dfAdd(dfAdd(kreuz, kreuz), cIm);   // mal zwei ist eine Addition

    schritte = i + 1;
    // Fuer den Abbruch genuegen die hohen Teile - auf 256 genau zu sein
    // waere hier verschenkte Rechenzeit.
    betrag2 = zRe.x * zRe.x + zIm.x * zIm.x;
    if (betrag2 > GRENZE) { entkommen = true; break; }
  }
#else
  vec2 p = u_mitte + d * u_skala;
  vec2 c = u_julia == 1 ? u_juliaC : p;
  vec2 z = u_julia == 1 ? p : vec2(0.0);

  for (int i = 0; i < u_iterationen; i++) {
    // (x + yi)^2 = (x^2 - y^2) + (2xy)i
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

    schritte = i + 1;
    betrag2 = dot(z, z);        // im Quadrat, das erspart die Wurzel
    if (betrag2 > GRENZE) { entkommen = true; break; }
  }
#endif

  if (!entkommen) return u_innen;

  /* Weiche Iterationszahl: die ganzzahlige Stufe plus der Bruchteil, der
   * sich aus dem Betrag beim Abbruch ergibt. Ohne diesen Zusatz liegen
   * sichtbare Ringe im Bild - jede Iterationsstufe waere eine Kante. */
  float glatt = float(schritte) + 1.0 - log2(0.5 * log2(betrag2));

  /* Wurzel statt linear: dicht am Rand draengen sich tausende Stufen, weit
   * draussen sind es eine Handvoll. Linear aufgetragen waere aussen alles
   * eine Farbe und innen ein Flimmern. Die Wurzel verteilt es gleichmaessiger.
   *
   * Die abgezogene 1.0 ist kein Beiwerk: wegen des Fluchtradius 256 braucht
   * selbst der schnellste Ausreisser rund eine volle Iteration, die weiche
   * Zahl beginnt also nicht bei 0 sondern bei etwa 1. Ohne den Abzug startet
   * das ganze Aussenfeld mitten in der Palette - und die weite Flaeche weit
   * draussen leuchtet heller als der Rand, den sie umgibt. */
  float t = max(sqrt(max(glatt, 0.0)) - 1.0, 0.0) * u_dichte + u_verschiebung;

  // Die Textur wiederholt sich gespiegelt, t darf also beliebig wachsen.
  return texture(u_palette, vec2(t, 0.5)).rgb;
}

void main() {
  vec3 farbe;

  if (u_proben <= 1) {
    farbe = punktFarbe(gl_FragCoord.xy);
  } else {
    /* 2x2-Unterabtastung: vier Punkte je Pixel, gemittelt. Am Rand der Menge
     * liegen zwischen zwei Nachbarpixeln oft hunderte Iterationsstufen - ohne
     * Mittelung flimmert dort jede feine Struktur. Kostet das Vierfache und
     * wird deshalb nur im Standbild gerechnet. */
    farbe = vec3(0.0);
    for (int sy = 0; sy < 2; sy++) {
      for (int sx = 0; sx < 2; sx++) {
        vec2 versatz = (vec2(float(sx), float(sy)) + 0.5) * 0.5 - 0.5;
        farbe += punktFarbe(gl_FragCoord.xy + versatz) * 0.25;
      }
    }
  }

  ausgabe = vec4(farbe, 1.0);
}
`;

  /* Baut die Quelle. `#version` muss die allererste Zeile sein, danach erst
   * das #define und die Bausteine. */
  FRAKTAL.Shader.fraktal = function (doppelt) {
    return '#version 300 es\n'
      + 'precision highp float;\n'
      + (doppelt ? '#define DOPPELT 1\n' + FRAKTAL.Shader.bausteine : '')
      + RUMPF;
  };
})();
