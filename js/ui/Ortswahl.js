/* Die Liste der berühmten Stellen.
 *
 * Angeklickt wird nicht gesprungen, sondern geflogen (siehe Kamera.js):
 * ueber anderthalb Sekunden zieht die Kamera erst hinaus, dann hinueber,
 * dann hinein. Wer springt, steht ploetzlich irgendwo und weiss nicht, wo -
 * wer fliegt, sieht die Ebenen vorbeiziehen und versteht, wie tief die
 * Stelle liegt.
 *
 * Die Stellen selbst stehen als Daten in js/daten/orte.js.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Ortswahl = (function () {
  'use strict';

  var beiAenderung = function () {};

  function starten(rueckruf) {
    beiAenderung = rueckruf || function () {};

    var behaelter = document.getElementById('orte-liste');
    if (!behaelter) return;
    behaelter.innerHTML = '';

    FRAKTAL.Orte.liste.forEach(function (ort) {
      var knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'ort';
      knopf.title = ort.satz;

      var name = document.createElement('span');
      name.textContent = ort.titel;
      var zoom = document.createElement('b');
      zoom.textContent = zoomText(ort.zoom);

      knopf.appendChild(name);
      knopf.appendChild(zoom);
      knopf.addEventListener('click', function () { hinfliegen(ort); });
      behaelter.appendChild(knopf);
    });
  }

  /* Hinfliegen - und dabei sagen, was dort zu sehen sein wird. Der Satz
   * laeuft waehrend des Fluges, dann liest man ihn, statt auf ein wanderndes
   * Bild zu starren. */
  function hinfliegen(ort) {
    // Die Stellen liegen alle in der Mandelbrot-Menge; aus einer Julia-Menge
    // heraus muss also erst zurueckgewechselt werden.
    if (FRAKTAL.Menge.istJulia()) FRAKTAL.Menge.nachMandelbrot();

    FRAKTAL.Dauerzoom.aus();
    FRAKTAL.Kamera.hinfliegen(FRAKTAL.Orte.alsStand(ort));
    FRAKTAL.Meldung.zeigen(ort.titel + ' – ' + ort.satz);
    beiAenderung();
  }

  function zoomText(wert) {
    if (wert < 10000) return wert.toLocaleString('de-DE') + ' ×';
    var exponent = Math.floor(Math.log10(wert));
    var mantisse = wert / Math.pow(10, exponent);
    return mantisse.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'e' + exponent;
  }

  return { starten: starten, hinfliegen: hinfliegen };
})();
