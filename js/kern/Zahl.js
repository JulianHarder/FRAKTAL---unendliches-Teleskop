/* Eine Zahl in zwei Teile zerlegen.
 *
 * JavaScript rechnet mit 64-Bit-Zahlen (rund 16 Stellen), die Grafikkarte nur
 * mit 32 Bit (rund 7 Stellen). Schickt man eine Koordinate einfach so an den
 * Shader, gehen neun Stellen verloren - und genau die braucht man tief drinnen.
 *
 * Der Ausweg: die Zahl wird in eine Summe aus zwei 32-Bit-Zahlen zerlegt.
 *     wert ~ hoch + tief
 * `hoch` ist der naechstgelegene 32-Bit-Wert, `tief` der Rest, der dabei
 * verloren ginge. Zusammen tragen sie rund 14 Stellen. Der Shader rechnet
 * dann mit beiden Teilen weiter (siehe js/shader/bausteine.js).
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Zahl = (function () {
  'use strict';

  /* Zerlegt `wert` in [hoch, tief].
   *
   * `Math.fround` rundet auf die naechste 32-Bit-Zahl. Die Differenz
   * `wert - hoch` ist in 64 Bit exakt darstellbar - sie ist klein und teilt
   * sich den Exponenten mit dem Original. Deshalb geht beim Zerlegen nichts
   * verloren, was nicht ohnehin verloren waere. */
  function teilen(wert) {
    var hoch = Math.fround(wert);
    var tief = Math.fround(wert - hoch);
    return [hoch, tief];
  }

  /* Die Gegenprobe: aus beiden Teilen wieder eine Zahl machen. */
  function zusammen(teile) {
    return teile[0] + teile[1];
  }

  /* Wie viele Stellen traegt ein Zahlenformat in der Naehe der Mandelbrot-
   * Menge? Dort sind die Betraege rund 2, der Abstand zweier benachbarter
   * Zahlen ist also 2^(1-Bits). */
  function aufloesung(bits) {
    return Math.pow(2, 1 - bits);
  }

  return {
    teilen: teilen,
    zusammen: zusammen,
    aufloesung: aufloesung,

    // Nutzbare Mantissenbits. 24 ist der Normwert fuer 32-Bit-Zahlen.
    // 46 statt 48 fuer die Doppelgenauigkeit: die Emulation verliert durch
    // das staendige Renormalisieren rund zwei Bit.
    BITS_EINFACH: 24,
    BITS_DOPPELT: 46
  };
})();
