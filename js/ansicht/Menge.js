/* Zwischen Mandelbrot- und Julia-Menge wechseln.
 *
 * Beide Mengen haben ihre eigene Stelle und ihren eigenen Zoom. Wer aus einer
 * tiefen Mandelbrot-Stelle in eine Julia-Menge springt und zurueckkommt, will
 * dort wieder landen, wo er war - sonst ist die Vorschau eine Falle statt
 * eines Fernglases. Deshalb wird beim Wechsel die verlassene Kamera gemerkt
 * und beim Zurueckkommen wieder aufgesetzt.
 *
 * Gewechselt wird hart, nicht gleitend: `ansicht` und `ziel` werden beide
 * gesetzt. Eine Fahrt von einer Menge in die andere waere keine Bewegung
 * durch die Ebene, sondern ein Bildwechsel - da hilft kein Gleiten.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Menge = (function () {
  'use strict';

  var z = FRAKTAL.Zustand;
  var horcher = [];

  /* Wer auf den Wechsel reagieren muss - Oberflaeche, Vorschau, Zeichner. */
  function horchen(rueckruf) {
    if (typeof rueckruf === 'function') horcher.push(rueckruf);
  }

  function melden() {
    for (var i = 0; i < horcher.length; i++) horcher[i](z.menge);
  }

  /* Die gezeigte Stelle als einfaches Objekt - zum Wegstecken. */
  function stand() {
    return {
      mitteRe: z.ziel.mitteRe,
      mitteIm: z.ziel.mitteIm,
      log2Zoom: z.ziel.log2Zoom
    };
  }

  function aufsetzen(s) {
    z.ansicht.mitteRe = s.mitteRe;
    z.ansicht.mitteIm = s.mitteIm;
    z.ansicht.log2Zoom = s.log2Zoom;
    z.ziel.mitteRe = s.mitteRe;
    z.ziel.mitteIm = s.mitteIm;
    z.ziel.log2Zoom = s.log2Zoom;
  }

  /* In die Julia-Menge zu diesem c, mit frischer Kamera: die ganze Menge im
   * Bild. Das ist der Weg ueber die Vorschau - man hat dort eine Form gesehen
   * und will genau die gross sehen, nicht einen Ausschnitt von irgendwo. */
  function nachJulia(cRe, cIm) {
    if (z.menge !== 'julia') z.gemerkt.mandelbrot = stand();

    z.julia.re = cRe;
    z.julia.im = cIm;
    z.menge = 'julia';
    aufsetzen(z.anfangJulia);
    melden();
    return true;
  }

  /* Zurueck zur Mandelbrot-Menge. Die Julia-Ansicht wird samt ihrem c
   * gemerkt, damit J sie wiederfindet. */
  function nachMandelbrot() {
    if (z.menge !== 'julia') return false;

    var gemerkt = stand();
    gemerkt.re = z.julia.re;
    gemerkt.im = z.julia.im;
    z.gemerkt.julia = gemerkt;

    z.menge = 'mandelbrot';
    aufsetzen(z.gemerkt.mandelbrot || z.anfang);
    melden();
    return true;
  }

  /* Taste J: hin und zurueck.
   *
   * Aus der Mandelbrot-Menge heraus wird die letzte Julia-Ansicht wieder
   * geholt - wer zweimal J drueckt, soll zweimal dasselbe sehen. Gibt es noch
   * keine, dient das uebergebene c (das unter dem Zeiger) als Startwert. */
  function wechseln(cRe, cIm) {
    if (z.menge === 'julia') return nachMandelbrot();

    var alt = z.gemerkt.julia;
    if (alt) {
      z.gemerkt.mandelbrot = stand();
      z.julia.re = alt.re;
      z.julia.im = alt.im;
      z.menge = 'julia';
      aufsetzen(alt);
      melden();
      return true;
    }

    return nachJulia(
      typeof cRe === 'number' ? cRe : z.julia.re,
      typeof cIm === 'number' ? cIm : z.julia.im
    );
  }

  function istJulia() {
    return z.menge === 'julia';
  }

  return {
    horchen: horchen,
    nachJulia: nachJulia,
    nachMandelbrot: nachMandelbrot,
    wechseln: wechseln,
    istJulia: istJulia
  };
})();
