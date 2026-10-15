/* Palettenwahl und Regler.
 *
 * Die Knoepfe werden aus den Daten gebaut, nicht im HTML aufgezaehlt - eine
 * neue Palette in js/daten/paletten.js erscheint dadurch von selbst, samt
 * Vorschau-Verlauf aus denselben Stuetzpunkten.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Farbwahl = (function () {
  'use strict';

  var z = FRAKTAL.Zustand;
  var beiAenderung = function () {};
  var knoepfe = [];

  var REGLER = [
    { id: 'dichte', titel: 'Dichte', min: 0.08, max: 1.6, schritt: 0.01,
      zeigen: function (w) { return w.toFixed(2).replace('.', ','); } },
    { id: 'verschiebung', titel: 'Farbdrehung', min: 0, max: 1, schritt: 0.01,
      zeigen: function (w) { return Math.round(w * 100) + ' %'; } },
    { id: 'qualitaet', titel: 'Tiefe', min: 0.5, max: 3, schritt: 0.1,
      zeigen: function (w) { return w.toFixed(1).replace('.', ',') + ' ×'; } }
  ];

  function starten(rueckruf) {
    beiAenderung = rueckruf || function () {};
    knoepfeBauen();
    reglerBauen();
  }

  function knoepfeBauen() {
    var behaelter = document.getElementById('paletten-liste');
    behaelter.innerHTML = '';
    knoepfe = [];

    FRAKTAL.Paletten.liste.forEach(function (palette, nummer) {
      var knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'palette';
      knopf.title = palette.titel + ' (' + (nummer + 1) + ')';

      var streifen = document.createElement('i');
      streifen.style.background = FRAKTAL.Paletten.alsVerlauf(palette);
      knopf.appendChild(streifen);
      knopf.appendChild(document.createTextNode(palette.titel));

      knopf.addEventListener('click', function () { waehlen(palette.name); });
      behaelter.appendChild(knopf);
      knoepfe.push({ name: palette.name, element: knopf });
    });

    markieren();
  }

  function reglerBauen() {
    var behaelter = document.getElementById('regler-liste');
    behaelter.innerHTML = '';

    REGLER.forEach(function (regler) {
      var zeile = document.createElement('div');
      zeile.className = 'regler-zeile';

      var beschriftung = document.createElement('label');
      beschriftung.setAttribute('for', 'regler-' + regler.id);
      var titel = document.createElement('span');
      titel.textContent = regler.titel;
      var wert = document.createElement('b');
      wert.textContent = regler.zeigen(z.regler[regler.id]);
      beschriftung.appendChild(titel);
      beschriftung.appendChild(wert);

      var schieber = document.createElement('input');
      schieber.type = 'range';
      schieber.id = 'regler-' + regler.id;
      schieber.min = regler.min;
      schieber.max = regler.max;
      schieber.step = regler.schritt;
      schieber.value = z.regler[regler.id];

      schieber.addEventListener('input', function () {
        z.regler[regler.id] = parseFloat(schieber.value);
        wert.textContent = regler.zeigen(z.regler[regler.id]);
        beiAenderung();
      });

      zeile.appendChild(beschriftung);
      zeile.appendChild(schieber);
      behaelter.appendChild(zeile);
    });
  }

  /* Palette setzen - per Knopf oder per Zifferntaste. */
  function waehlen(name) {
    z.regler.palette = name;
    FRAKTAL.PalettenTextur.waehlen(name);
    markieren();
    beiAenderung();
  }

  /* Taste 1 bis 5. */
  function nachNummer(nummer) {
    var palette = FRAKTAL.Paletten.liste[nummer - 1];
    if (palette) waehlen(palette.name);
  }

  function markieren() {
    knoepfe.forEach(function (eintrag) {
      eintrag.element.setAttribute('aria-pressed',
        eintrag.name === z.regler.palette ? 'true' : 'false');
    });
  }

  return { starten: starten, waehlen: waehlen, nachNummer: nachNummer };
})();
