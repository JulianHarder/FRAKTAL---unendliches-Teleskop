/* Der zentrale Zustand: alles, was sich zur Laufzeit aendert, liegt hier.
 *
 * Die Stelle in der komplexen Ebene wird als Mitte plus Zoom gehalten, und der
 * Zoom als Zweierlogarithmus. Grund: Zoomen ist Multiplizieren, und im
 * Logarithmus wird daraus Addieren. Eine Mausrad-Rastung ist dann einfach
 * "plus 0,25" - unabhaengig davon, ob man bei Zoom 2 oder bei Zoom 2 Millionen
 * steht. Lineare Zoomwerte wuerden tief drinnen in riesigen Spruengen laufen.
 *
 * `ansicht` ist der gezeigte Stand, `ziel` der angestrebte. Die Kamera zieht
 * `ansicht` pro Bild an `ziel` heran - daher gleitet jede Bewegung.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Zustand = (function () {
  'use strict';

  // Weltausschnitt in Hoehe bei Zoom 1. Die ganze Menge liegt im Kreis
  // |c| < 2, mit 3.0 bleibt oben und unten ein Rand.
  var BASIS_HOEHE = 3.0;

  var anfang = { mitteRe: -0.6, mitteIm: 0.0, log2Zoom: 0.0 };

  /* Startansicht der Julia-Mengen. Sie liegen alle im Kreis |z| <= 2 um den
   * Ursprung; log2Zoom -0,25 ergibt eine Sichthoehe von rund 3,6 und laesst
   * damit auch den weit ausgreifenden Mengen rundherum Luft. */
  var anfangJulia = { mitteRe: 0.0, mitteIm: 0.0, log2Zoom: -0.25 };

  var zustand = {
    ansicht: { mitteRe: anfang.mitteRe, mitteIm: anfang.mitteIm, log2Zoom: anfang.log2Zoom },
    ziel:    { mitteRe: anfang.mitteRe, mitteIm: anfang.mitteIm, log2Zoom: anfang.log2Zoom },

    regler: {
      qualitaet: 1.0,       // Faktor auf die Iterationstiefe (0,5 bis 3)
      rechenmodus: 'automatisch',   // oder 'einfach' / 'doppelt'
      palette: 'feuer',     // Name aus js/daten/paletten.js
      dichte: 0.45,         // wie eng die Farbbaender liegen
      verschiebung: 0.0     // dreht die Palette durch (0 bis 1)
    },

    /* Welche Menge auf der Hauptbuehne steht: 'mandelbrot' oder 'julia'. */
    menge: 'mandelbrot',

    /* Das feste c der Julia-Menge. -0,4 + 0,6i ist eine der bekannten
     * Formen und steht nur da, damit die Taste J auch dann etwas zeigt,
     * wenn die Vorschau noch nie einen Zeiger gesehen hat. */
    julia: { re: -0.4, im: 0.6 },

    /* Die verlassene Kamera der jeweils anderen Menge (siehe Menge.js). */
    gemerkt: { mandelbrot: null, julia: null },

    laufzeit: {
      iterationen: 200,     // waechst mit dem Zoom mit (siehe Iterationen.js)
      neuZeichnen: true,    // true = das naechste Bild muss gerechnet werden
      grob: false,          // true = Bild in halber Aufloesung (Bewegung)
      letzteDauer: 0,       // Millisekunden fuer das letzte Bild
      notbremse: 1.0,       // < 1 = Tiefe gedrosselt, weil es zu lange dauerte
      modus: 'einfach',     // womit das letzte Bild gerechnet wurde
      stellen: 0,           // Dezimalstellen, die das Bild noch traegt
      bildrate: 0
    },

    anfang: anfang,
    anfangJulia: anfangJulia,
    BASIS_HOEHE: BASIS_HOEHE
  };

  /* Zoomfaktor als gewoehnliche Zahl. */
  function zoom() {
    return Math.pow(2, zustand.ansicht.log2Zoom);
  }

  /* Hoehe des sichtbaren Ausschnitts in der komplexen Ebene. */
  function sichtHoehe() {
    return BASIS_HOEHE / zoom();
  }

  /* Weltbreite eines Pixels - der Umrechnungsfaktor fuer den Shader.
   * Beide Achsen benutzen denselben Faktor, sonst waere das Bild verzerrt. */
  function skala(hoeheInPixeln) {
    return sichtHoehe() / hoeheInPixeln;
  }

  /* Anstossen, dass das naechste Bild neu gerechnet wird. */
  function veraendert() {
    zustand.laufzeit.neuZeichnen = true;
  }

  zustand.zoom = zoom;
  zustand.sichtHoehe = sichtHoehe;
  zustand.skala = skala;
  zustand.veraendert = veraendert;
  return zustand;
})();
