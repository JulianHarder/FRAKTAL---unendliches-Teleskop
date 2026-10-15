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

  /* Den nachgemessenen Wert uebernehmen (siehe js/gl/Nachmessen.js).
   *
   * 46 ist eine Annahme ueber eine Grafikkarte, die sich an die Regeln haelt.
   * Was sie wirklich traegt, weiss man erst nach der Messung - und danach
   * muessen sich Umschaltschwelle und Anzeige richten, sonst verspricht die
   * Oberflaeche Stellen, die es nicht gibt. */
  function gemessen(bits) {
    if (!isFinite(bits)) return werte.BITS_DOPPELT;
    werte.BITS_DOPPELT = Math.max(werte.BITS_EINFACH, Math.min(46, bits));
    return werte.BITS_DOPPELT;
  }

  var werte = {
    teilen: teilen,
    zusammen: zusammen,
    aufloesung: aufloesung,
    gemessen: gemessen,

    // Nutzbare Mantissenbits. 24 ist der Normwert fuer 32-Bit-Zahlen.
    // 46 statt 48 fuer die Doppelgenauigkeit: die Emulation verliert durch
    // das staendige Renormalisieren rund zwei Bit. Beim Start wird dieser
    // Wert nachgemessen und gegebenenfalls heruntergesetzt.
    BITS_EINFACH: 24,
    BITS_DOPPELT: 46
  };

  return werte;
})();
