/* Wie tief darf die Schleife rechnen?
 *
 * Eine feste Zahl geht nicht. Je tiefer man zoomt, desto laenger brauchen die
 * Punkte nahe am Rand, um zu entkommen - mit 200 Iterationen wird bei Zoom
 * 1e6 alles schwarz, weil keiner mehr rechtzeitig rauskommt. Also waechst die
 * Tiefe mit dem Logarithmus des Zooms mit: jede Verdopplung kostet einen
 * festen Aufschlag, nicht das Doppelte.
 *
 * Die Obergrenze ist kein Geschmack, sondern Selbstschutz: ueber ~20.000
 * Iterationen je Pixel braucht ein Vollbild so lange, dass der Treiber den
 * WebGL-Kontext abschiesst.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Iterationen = (function () {
  'use strict';

  var GRUND = 80;        // Sockel
  var JE_STUFE = 90;     // Aufschlag je Zoom-Verdopplung
  var MINDESTENS = 150;
  var HOECHSTENS = 20000;

  /* `faktor` buendelt den Qualitaetsregler, das Grobbild und die Notbremse. */
  function fuer(log2Zoom, faktor) {
    var stufen = Math.max(0, log2Zoom);
    var tiefe = (GRUND + JE_STUFE * stufen) * faktor;

    tiefe = Math.round(tiefe);
    if (tiefe < MINDESTENS) tiefe = MINDESTENS;
    if (tiefe > HOECHSTENS) tiefe = HOECHSTENS;
    return tiefe;
  }

  return { fuer: fuer, HOECHSTENS: HOECHSTENS };
})();
