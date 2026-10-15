/* Das Hilfefenster.
 *
 * Die Fußzeile nennt die wichtigsten Tasten, aber nicht alle - und sie
 * erklaert nicht, was man ueberhaupt ansieht. Beides steht hier, und die
 * Texte dazu in js/daten/texte.js, nicht in diesem Code.
 *
 * Das Fenster liegt ueber der Leinwand und wird mit Esc, mit dem Kreuz oder
 * mit einem Klick daneben wieder zu. Alle drei Wege, weil jeder sie woanders
 * sucht.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Hilfe = (function () {
  'use strict';

  var huelle = null;
  var offen = false;

  function starten() {
    huelle = document.getElementById('hilfe');
    if (!huelle) return;

    bauen();

    document.getElementById('knopf-hilfe-zu').addEventListener('click', zu);
    // Klick auf den Hintergrund, nicht auf das Fenster selbst.
    huelle.addEventListener('click', function (ereignis) {
      if (ereignis.target === huelle) zu();
    });
  }

  function bauen() {
    var daten = FRAKTAL.Texte.hilfe;
    var fenster = document.getElementById('hilfe-inhalt');
    fenster.innerHTML = '';

    var titel = document.createElement('h2');
    titel.textContent = daten.titel;
    fenster.appendChild(titel);

    daten.absaetze.forEach(function (satz) {
      var absatz = document.createElement('p');
      absatz.textContent = satz;
      fenster.appendChild(absatz);
    });

    daten.gruppen.forEach(function (gruppe) {
      var ueberschrift = document.createElement('h3');
      ueberschrift.textContent = gruppe.titel;
      fenster.appendChild(ueberschrift);

      var liste = document.createElement('dl');
      gruppe.tasten.forEach(function (paar) {
        var taste = document.createElement('dt');
        // Eine Liste heisst: mehrere Tasten, jede in ihrem eigenen Kaestchen.
        // Ein Wort wie "Doppelklick" bleibt eines - es in vier Kaestchen zu
        // zerlegen sieht aus wie vier Tasten.
        var tasten = Array.isArray(paar[0]) ? paar[0] : [paar[0]];
        tasten.forEach(function (stueck) {
          var kasten = document.createElement('kbd');
          kasten.textContent = stueck;
          taste.appendChild(kasten);
        });

        var wirkung = document.createElement('dd');
        wirkung.textContent = paar[1];

        liste.appendChild(taste);
        liste.appendChild(wirkung);
      });
      fenster.appendChild(liste);
    });

    var schluss = document.createElement('p');
    schluss.className = 'hilfe-schluss';
    schluss.textContent = daten.schluss;
    fenster.appendChild(schluss);
  }

  function auf() {
    if (!huelle) return;
    huelle.hidden = false;
    offen = true;
    document.getElementById('knopf-hilfe-zu').focus();
  }

  function zu() {
    if (!huelle) return;
    huelle.hidden = true;
    offen = false;
  }

  function umschalten() {
    if (offen) zu(); else auf();
    return offen;
  }

  function istOffen() {
    return offen;
  }

  return { starten: starten, auf: auf, zu: zu, umschalten: umschalten, offen: istOffen };
})();
