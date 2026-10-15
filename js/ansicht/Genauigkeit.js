/* Wie genau wird gerechnet - und wie weit reicht das noch?
 *
 * Zwei Aufgaben:
 *
 * 1. Den Rechenweg waehlen. Oben genuegt die schnelle einfache Genauigkeit,
 *    ab einer Schwelle muss die teure Doppelgenauigkeit uebernehmen.
 *    Die Schwelle ist bewusst kein fester Zoomwert, sondern die Zahl der
 *    Stellen, die der einfache Weg noch traegt - denn die haengt auch an der
 *    Fenstergroesse: ein grosses Fenster hat kleinere Pixel und stoesst
 *    frueher an die Grenze.
 *    Umgeschaltet wird mit Hysterese: hinunter bei 1,4 Stellen, zurueck erst
 *    bei 2,0. Mit nur einer Schwelle wuerde genau dort jedes Mausradzucken
 *    zwischen schnell und langsam hin- und herspringen.
 *
 * 2. Ehrlich sagen, wie viel Luft noch bleibt. Ein Pixel kann nie kleiner
 *    sein als der Abstand zweier benachbarter darstellbarer Zahlen. Je naeher
 *    beides zusammenrueckt, desto stufiger wird das Bild - und irgendwann
 *    zoomt man nur noch in Rechenfehler hinein. Diese Grenze wird angezeigt
 *    und nicht versteckt.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Genauigkeit = (function () {
  'use strict';

  // Stellen, die der einfache Weg noch traegt.
  var KNAPP = 1.4;     // weniger -> auf doppelt umschalten
  var REICHLICH = 2.0; // mehr -> wieder zurueck auf einfach

  var modus = 'einfach';
  var doppeltMoeglich = true;

  /* Meldet, ob der Doppelmodus ueberhaupt zur Verfuegung steht. Faellt das
   * Uebersetzen des zweiten Shaders durch, bleibt es bei einfach. */
  function doppeltVerfuegbar(ja) {
    doppeltMoeglich = !!ja;
    if (!doppeltMoeglich) modus = 'einfach';
  }

  /* Vor jedem Bild aufrufen. `wunsch` ist die Einstellung aus der
   * Seitenleiste: 'automatisch', 'einfach' oder 'doppelt'. */
  function aktualisieren(log2Zoom, wunsch, hoeheInPixeln) {
    if (!doppeltMoeglich) return (modus = 'einfach');

    if (wunsch === 'einfach' || wunsch === 'doppelt') {
      modus = wunsch;
      return modus;
    }

    var uebrig = stellen(log2Zoom, hoeheInPixeln, 'einfach');

    if (modus === 'doppelt') {
      if (uebrig > REICHLICH) modus = 'einfach';
    } else if (uebrig < KNAPP) {
      modus = 'doppelt';
    }
    return modus;
  }

  function aktuell() {
    return modus;
  }

  /* Wie viele Dezimalstellen traegt das Bild noch?
   *
   * Verglichen wird die Breite eines Pixels in der komplexen Ebene mit dem
   * Abstand zweier benachbarter darstellbarer Zahlen. Sind beide gleich gross,
   * ist Schluss: dann liegen zwei Nachbarpixel auf derselben Zahl. */
  function stellen(log2Zoom, hoeheInPixeln, welcherModus) {
    if (!hoeheInPixeln) return 0;

    var pixelbreite = FRAKTAL.Zustand.BASIS_HOEHE / Math.pow(2, log2Zoom) / hoeheInPixeln;
    var bits = welcherModus === 'doppelt'
      ? FRAKTAL.Zahl.BITS_DOPPELT
      : FRAKTAL.Zahl.BITS_EINFACH;

    return Math.log10(pixelbreite / FRAKTAL.Zahl.aufloesung(bits));
  }

  /* Bis zu welchem Zoom reicht ein Modus bei dieser Bildhoehe? Nur fuer die
   * Anzeige - damit dort eine Zahl steht und keine Behauptung. */
  function reichweite(hoeheInPixeln, welcherModus) {
    var bits = welcherModus === 'doppelt'
      ? FRAKTAL.Zahl.BITS_DOPPELT
      : FRAKTAL.Zahl.BITS_EINFACH;

    // stellen(z) = 0  <=>  Pixelbreite = Aufloesung
    var hoehe = hoeheInPixeln || 800;
    return FRAKTAL.Zustand.BASIS_HOEHE / (FRAKTAL.Zahl.aufloesung(bits) * hoehe);
  }

  return {
    doppeltVerfuegbar: doppeltVerfuegbar,
    aktualisieren: aktualisieren,
    aktuell: aktuell,
    stellen: stellen,
    reichweite: reichweite,
    KNAPP: KNAPP,
    REICHLICH: REICHLICH
  };
})();
