/* Die Wahl des Rechenwegs.
 *
 * Normalerweise entscheidet das Programm selbst. Von Hand umschalten zu
 * koennen ist trotzdem wichtig: nur im direkten Vergleich sieht man, was die
 * Doppelgenauigkeit ueberhaupt bringt - tief drinnen auf "einfach" gestellt
 * zerfaellt dasselbe Bild in Kloetzchen.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Rechenmodus = (function () {
  'use strict';

  var z = FRAKTAL.Zustand;

  var WAHL = [
    { wert: 'automatisch', titel: 'automatisch', hilfe: 'schaltet um, wenn die Stellen knapp werden' },
    { wert: 'einfach', titel: 'einfach', hilfe: '32 Bit – schnell, reicht bis Zoom ~1e4' },
    { wert: 'doppelt', titel: 'doppelt', hilfe: 'zwei 32-Bit-Zahlen je Wert – reicht bis ~1e11' }
  ];

  var beiAenderung = function () {};
  var knoepfe = [];

  function starten(rueckruf) {
    beiAenderung = rueckruf || function () {};

    var behaelter = document.getElementById('modus-liste');
    behaelter.innerHTML = '';
    knoepfe = [];

    WAHL.forEach(function (eintrag) {
      var knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'modus';
      knopf.textContent = eintrag.titel;
      knopf.title = eintrag.hilfe;
      knopf.addEventListener('click', function () { setzen(eintrag.wert); });
      behaelter.appendChild(knopf);
      knoepfe.push({ wert: eintrag.wert, element: knopf });
    });

    markieren();
  }

  function setzen(wert) {
    z.regler.rechenmodus = wert;
    markieren();
    beiAenderung();
  }

  /* Taste G: reihum durch die drei Einstellungen. */
  function weiter() {
    var stelle = 0;
    for (var i = 0; i < WAHL.length; i++) {
      if (WAHL[i].wert === z.regler.rechenmodus) stelle = i;
    }
    setzen(WAHL[(stelle + 1) % WAHL.length].wert);
  }

  /* Steht der doppelte Weg gar nicht zur Verfuegung, wird sein Knopf
   * abgeschaltet statt stillschweigend ignoriert. */
  function verfuegbarkeit(doppeltGeht) {
    knoepfe.forEach(function (eintrag) {
      if (eintrag.wert !== 'doppelt') return;
      eintrag.element.disabled = !doppeltGeht;
      if (!doppeltGeht) eintrag.element.title = 'Diese Grafikkarte kann es nicht';
    });
  }

  function markieren() {
    knoepfe.forEach(function (eintrag) {
      eintrag.element.setAttribute('aria-pressed',
        eintrag.wert === z.regler.rechenmodus ? 'true' : 'false');
    });
  }

  return { starten: starten, setzen: setzen, weiter: weiter, verfuegbarkeit: verfuegbarkeit };
})();
