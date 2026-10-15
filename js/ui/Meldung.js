/* Eine kurze Meldung über der Leinwand.
 *
 * Fuer die Dinge, die sonst lautlos passieren: ein Lesezeichen ist gesetzt,
 * ein Link liegt in der Zwischenablage, der Dauerzoom ist an der Grenze
 * stehengeblieben. Ohne Rueckmeldung weiss niemand, ob die Taste ankam.
 *
 * Der Zusatz ist fuer den Fall, dass der Browser das Kopieren verweigert -
 * dann steht der Link selbst da und laesst sich von Hand markieren.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Meldung = (function () {
  'use strict';

  var DAUER = 2600;

  var huelle = null;
  var text = null;
  var zusatz = null;
  var uhr = 0;

  function starten() {
    huelle = document.getElementById('meldung');
    text = document.getElementById('meldung-text');
    zusatz = document.getElementById('meldung-zusatz');
  }

  /* `nachtrag` bleibt stehen, bis die naechste Meldung kommt - er ist zum
   * Lesen und Markieren da, nicht zum Aufblitzen. */
  function zeigen(satz, nachtrag) {
    if (!huelle) return;

    text.textContent = satz;
    zusatz.textContent = nachtrag || '';
    zusatz.hidden = !nachtrag;
    huelle.hidden = false;

    window.clearTimeout(uhr);
    if (!nachtrag) uhr = window.setTimeout(verbergen, DAUER);
  }

  function verbergen() {
    window.clearTimeout(uhr);
    if (huelle) huelle.hidden = true;
  }

  return { starten: starten, zeigen: zeigen, verbergen: verbergen };
})();
