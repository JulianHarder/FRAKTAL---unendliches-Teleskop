/* Ein großes Bild in Kacheln rechnen.
 *
 * Fuer den Export wird nicht die Leinwand abfotografiert - die hat die
 * Fenstergroesse. Gerechnet wird neu, in der Zielgroesse, mit doppelter Tiefe
 * und Kantenglaettung. Und zwar in Stuecken von 1024 Pixeln, aus zwei
 * Gruenden:
 *
 *   1. Ein einzelnes Bild dieser Groesse kann laenger rechnen, als der
 *      Grafiktreiber erlaubt. Er haelt den Prozess dann fuer haengend und
 *      schiesst den WebGL-Kontext ab - mitten im Export.
 *   2. Zwischen zwei Kacheln kommt der Browser wieder an die Reihe. Ohne das
 *      steht die Seite sekundenlang, der Fortschrittsbalken bewegt sich nicht,
 *      und niemand weiss, ob noch etwas passiert.
 *
 * Jede Kachel ist ein eigenes kleines Bild mit eigener Mitte - dieselbe
 * Rechnung wie das grosse, nur ein anderer Ausschnitt. Die Mitte wird in
 * JavaScript mit voller Genauigkeit bestimmt und erst danach fuer den Shader
 * aufgeteilt; tief drinnen haengt daran, ob die Kacheln zusammenpassen.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Kachel = (function () {
  'use strict';

  var KANTE = 1024;

  /* `auftrag` beschreibt das ganze Bild: breite, hoehe, mitteRe, mitteIm,
   * skala (Weltbreite je Pixel), iterationen, proben, doppelt.
   * `melden(fertige, gesamt)` laeuft nach jeder Kachel,
   * `fertig(leinwand)` am Ende - mit null, wenn abgebrochen wurde.
   *
   * Gibt ein Handwerkszeug mit `abbrechen()` zurueck. */
  function malen(gl, auftrag, melden, fertig) {
    var breite = Math.max(1, Math.round(auftrag.breite));
    var hoehe = Math.max(1, Math.round(auftrag.hoehe));
    // `auftrag.kante` nur fuer Pruefungen und fuer den Notfall - normal gilt
    // KANTE, und groesser als das Bild wird die Kachel ohnehin nie.
    var kante = Math.min(auftrag.kante || KANTE, Math.max(breite, hoehe));

    var spalten = Math.ceil(breite / kante);
    var zeilen = Math.ceil(hoehe / kante);
    var gesamt = spalten * zeilen;

    var leinwand = document.createElement('canvas');
    leinwand.width = breite;
    leinwand.height = hoehe;
    var ctx = leinwand.getContext('2d');

    var ziele = {};        // Zeichenziele, nach Kachelgroesse
    var getan = 0;
    var abgebrochen = false;

    function aufraeumen() {
      for (var name in ziele) {
        if (ziele.hasOwnProperty(name)) ziele[name].loeschen();
      }
      ziele = {};
    }

    function zielFuer(kBreite, kHoehe) {
      // Hoechstens vier verschiedene Groessen: volle Kachel, Rand rechts,
      // Rand unten, Ecke. Die werden wiederverwendet statt neu angelegt.
      var name = kBreite + 'x' + kHoehe;
      if (!ziele[name]) ziele[name] = FRAKTAL.Ziel.erzeugen(gl, kBreite, kHoehe);
      return ziele[name];
    }

    function naechste() {
      if (abgebrochen) { aufraeumen(); fertig(null); return; }

      var spalte = getan % spalten;
      // Von unten nach oben: so zaehlt auch der Zeichenpuffer.
      var zeile = Math.floor(getan / spalten);

      var links = spalte * kante;
      var unten = zeile * kante;
      var kBreite = Math.min(kante, breite - links);
      var kHoehe = Math.min(kante, hoehe - unten);

      var ziel = zielFuer(kBreite, kHoehe);
      if (!ziel.taugt) { abgebrochen = true; aufraeumen(); fertig(null); return; }

      /* Die Mitte dieser Kachel, in Weltkoordinaten. Der Versatz wird in
       * Pixeln gerechnet und erst zum Schluss mit der Schrittweite
       * multipliziert - so bleibt er bis zuletzt exakt. */
      var versatzX = links + kBreite / 2 - breite / 2;
      var versatzY = unten + kHoehe / 2 - hoehe / 2;

      var gemalt = FRAKTAL.Zeichner.inZiel(ziel, {
        breite: kBreite,
        hoehe: kHoehe,
        mitteRe: auftrag.mitteRe + versatzX * auftrag.skala,
        mitteIm: auftrag.mitteIm + versatzY * auftrag.skala,
        skala: auftrag.skala,
        iterationen: auftrag.iterationen,
        proben: auftrag.proben,
        // Muss mit: sonst rechnet jede Kachel den Rechenweg fuer sich aus,
        // und ein Bild aus zwei verschiedenen Rechenwegen passt nicht zusammen.
        doppelt: auftrag.doppelt
      });
      if (!gemalt) { abgebrochen = true; aufraeumen(); fertig(null); return; }

      var puffer = new Uint8Array(kBreite * kHoehe * 4);
      ziel.lesen(puffer);

      var bild = ctx.createImageData(kBreite, kHoehe);
      FRAKTAL.Ziel.spiegeln(puffer, bild.data, kBreite, kHoehe);
      // Der 2D-Canvas zaehlt von oben, der Zeichenpuffer von unten.
      ctx.putImageData(bild, links, hoehe - unten - kHoehe);

      getan++;
      melden(getan, gesamt);

      if (getan >= gesamt) { aufraeumen(); fertig(leinwand); return; }
      // Den Browser dazwischenlassen, sonst steht die Seite still.
      window.requestAnimationFrame(naechste);
    }

    melden(0, gesamt);
    window.requestAnimationFrame(naechste);

    return {
      abbrechen: function () { abgebrochen = true; },
      gesamt: gesamt
    };
  }

  /* Wie viele Kacheln waeren das? Fuer die Anzeige, bevor es losgeht. */
  function anzahl(breite, hoehe, eigene) {
    var kante = Math.min(eigene || KANTE, Math.max(breite, hoehe));
    return Math.ceil(breite / kante) * Math.ceil(hoehe / kante);
  }

  return { malen: malen, anzahl: anzahl, KANTE: KANTE };
})();
