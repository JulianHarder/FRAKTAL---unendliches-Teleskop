/* Was kann diese Grafikkarte wirklich?
 *
 * Die emulierte Doppelgenauigkeit lebt von Ausdrücken, die mathematisch null
 * sind - dort steckt der Rundungsfehler, den sie auffängt. Ein Compiler, der
 * Gleitkomma wie Schulmathematik behandelt, kürzt sie weg. Das Bild bleibt
 * dann stufig, obwohl die Oberfläche "doppelt" anzeigt und noch fünf Stellen
 * Luft verspricht. Diese Luege ist schlimmer als die Stufen selbst: man sucht
 * den Fehler bei sich.
 *
 * Also wird beim Start nachgemessen, auf genau der Karte, die gerade
 * zeichnet. Gefragt wird das, worauf es ankommt: wie fein darf der Abstand
 * zweier Nachbarpixel sein, damit sie noch verschiedene Zahlen ergeben?
 *
 * Gerechnet wird dafuer dieselbe Kette wie im Fraktal-Shader - Pixelabstand
 * mal Schrittweite, dazu die Bildmitte - und das Ergebnis wieder abgezogen.
 * Was uebrig bleibt, muss der Abstand sein. Bleibt nichts uebrig, ist die
 * Stelle jenseits dessen, was die Karte traegt.
 *
 * Jede Stufe bekommt ein eigenes Pixel; zurueckgelesen wird mit readPixels,
 * weil ein Fragment-Shader keine Zahlen herausgeben kann. Kostet einmalig
 * zehn Pixel.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Nachmessen = (function () {
  'use strict';

  // Abstaende in Zweierpotenzen: 2^-k. Die Reihe deckt alles ab zwischen
  // "kann nicht mehr als 32 Bit" und "besser als df64 ueberhaupt sein kann".
  var STUFEN = [23, 26, 29, 32, 35, 38, 41, 43, 45, 47];

  // Der Abstand wird als 500 Pixel mal Schrittweite gerechnet, wie im Bild.
  var PIXEL = 500.0;

  var QUELLE_KOPF = '#version 300 es\nprecision highp float;\n';

  var RUMPF = `
uniform vec2 u_mitte;              // eine Stelle mit Betrag ~0,74, wie im Bild
uniform vec2 u_schritte[STUFEN];   // Schrittweite je Pixel, als Doppelzahl
out vec4 ausgabe;

/* Eine Zahl aus 0..1 in drei Farbkanaele packen - der einzige Weg, ein
 * Ergebnis aus einem Fragment-Shader herauszubekommen, ohne
 * Gleitkomma-Texturen zu verlangen. */
vec3 kodieren(float v) {
  v = clamp(v, 0.0, 0.99999988);
  float a = floor(v * 256.0);
  float r1 = v * 256.0 - a;
  float b = floor(r1 * 256.0);
  float r2 = r1 * 256.0 - b;
  return vec3(a, b, floor(r2 * 256.0)) / 255.0;
}

void main() {
  int welche = int(gl_FragCoord.x);
  vec2 schritt = u_schritte[welche];

  // Dieselbe Kette wie im Fraktal: Pixelabstand mal Schrittweite, plus Mitte.
  vec2 abstand = dfMul(dfVon(PIXEL), schritt);
  vec2 stelle = dfAdd(u_mitte, abstand);

  // Und wieder zurueck. Was uebrig bleibt, sollte der Abstand selbst sein.
  float uebrig = dfSub(stelle, u_mitte).x;
  float soll = abstand.x + abstand.y;

  // Verhaeltnis 0..2 auf 0..1 gestaucht; 1,0 hiesse "genau getroffen".
  ausgabe = vec4(kodieren(clamp((uebrig / soll) * 0.5, 0.0, 0.999999)), 1.0);
}
`;

  /* Misst und gibt zurueck:
   *   { bits, stufen: [{ bits, verhaeltnis }] }
   * oder null, wenn sich nicht messen laesst. `bits` ist die Zahl der
   * Mantissenbits, die die Karte im Doppelmodus wirklich traegt. */
  function doppelt(gl) {
    var programm = null;
    try {
      var quelle = QUELLE_KOPF + FRAKTAL.Shader.bausteine
        + RUMPF.replace('STUFEN', String(STUFEN.length))
               .replace('PIXEL', PIXEL.toFixed(1));
      programm = FRAKTAL.Programm.bauen(gl, FRAKTAL.Shader.vertex, quelle);
    } catch (fehler) {
      console.warn('Genauigkeit laesst sich nicht nachmessen:\n' + fehler.message);
      return null;
    }

    var ziel = FRAKTAL.Ziel.erzeugen(gl, STUFEN.length, 1);
    if (!ziel.taugt) { programm.loeschen(); return null; }

    var mitte = FRAKTAL.Zahl.teilen(0.743643887037151);
    var schritte = new Float32Array(STUFEN.length * 2);
    STUFEN.forEach(function (k, i) {
      var teile = FRAKTAL.Zahl.teilen(Math.pow(2, -k) / PIXEL);
      schritte[i * 2] = teile[0];
      schritte[i * 2 + 1] = teile[1];
    });

    programm.benutzen();
    gl.uniform1f(programm.ort('u_split'), 4097.0);
    gl.uniform1f(programm.ort('u_eins'), 1.0);
    gl.uniform2f(programm.ort('u_mitte'), mitte[0], mitte[1]);
    gl.uniform2fv(programm.ort('u_schritte[0]'), schritte);

    ziel.binden();
    FRAKTAL.Leinwand.zeichnen(STUFEN.length, 1);
    ziel.loesen();

    var pixel = new Uint8Array(STUFEN.length * 4);
    ziel.lesen(pixel);
    ziel.loeschen();
    programm.loeschen();

    return auswerten(pixel);
  }

  function auswerten(pixel) {
    var stufen = [];
    var feinste = null;

    for (var i = 0; i < STUFEN.length; i++) {
      var roh = (pixel[i * 4] * 65536 + pixel[i * 4 + 1] * 256 + pixel[i * 4 + 2])
              / 16777215;
      var verhaeltnis = roh * 2;

      /* Getroffen heisst: der Abstand kommt zu mindestens 85 % wieder heraus.
       * Weniger als das sieht man im Bild als Stufen - und mehr als 115 %
       * waere auch kein gutes Zeichen. */
      var getroffen = verhaeltnis > 0.85 && verhaeltnis < 1.15;
      stufen.push({ bits: STUFEN[i] + 1, verhaeltnis: verhaeltnis, getroffen: getroffen });
      if (getroffen) feinste = STUFEN[i];
    }

    if (feinste === null) return null;
    // aufloesung = 2^(1-bits), siehe js/kern/Zahl.js
    return { bits: feinste + 1, stufen: stufen };
  }

  return { doppelt: doppelt, STUFEN: STUFEN };
})();
