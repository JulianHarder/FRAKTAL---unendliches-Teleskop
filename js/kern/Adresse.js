/* Die Stelle als Adresse: #re=...&im=...&zoom=...&palette=...
 *
 * Hinter dem Doppelkreuz, nicht hinter einem Fragezeichen. Grund: die Seite
 * soll per Doppelklick ueber file:// laufen, und dort gehoert ein ? noch zum
 * Dateinamen - der Browser suchte dann eine Datei "index.html?re=...". Das
 * Doppelkreuz trennt sauber, auf jedem Weg.
 *
 * Geschrieben wird die Adresse nur auf Zuruf (Taste L), nicht bei jeder
 * Bewegung: ein Hash, der sich staendig aendert, fuellt die Zurueck-Liste
 * des Browsers mit hunderten Zwischenstellen.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Adresse = (function () {
  'use strict';

  var z = FRAKTAL.Zustand;

  /* Die Adresse zur gezeigten Stelle. */
  function alsText() {
    var teile = [
      're=' + String(z.ansicht.mitteRe),
      'im=' + String(z.ansicht.mitteIm),
      'zoom=' + String(Math.pow(2, z.ansicht.log2Zoom)),
      'palette=' + z.regler.palette
    ];

    return ohneHash(location.href) + '#' + teile.join('&');
  }

  /* Eine Adresse auf den Zustand anwenden. Gibt true zurueck, wenn wirklich
   * etwas darin stand - nur dann darf sie einen gespeicherten Stand
   * verdraengen. */
  function lesen(hash) {
    var text = typeof hash === 'string' ? hash : location.hash;
    if (!text || text.length < 2) return false;

    var werte = teilen(text.replace(/^#/, ''));
    var re = zahl(werte.re);
    var im = zahl(werte.im);
    var zoom = zahl(werte.zoom);
    if (re === null || im === null || zoom === null || zoom <= 0) return false;

    setzen(re, im, Math.log2(zoom));

    if (werte.palette && FRAKTAL.Paletten.nach(werte.palette).name === werte.palette) {
      z.regler.palette = werte.palette;
    }
    return true;
  }

  /* Ansicht und Ziel zugleich: eine aufgerufene Adresse soll sofort dort
   * sein, nicht von der Startansicht aus hinfliegen. */
  function setzen(re, im, log2Zoom) {
    z.ansicht.mitteRe = re;
    z.ansicht.mitteIm = im;
    z.ansicht.log2Zoom = log2Zoom;
    z.ziel.mitteRe = re;
    z.ziel.mitteIm = im;
    z.ziel.log2Zoom = log2Zoom;
  }

  function teilen(text) {
    var werte = {};
    text.split('&').forEach(function (stueck) {
      var trenn = stueck.indexOf('=');
      if (trenn > 0) {
        werte[stueck.slice(0, trenn)] = decodeURIComponent(stueck.slice(trenn + 1));
      }
    });
    return werte;
  }

  /* Nur echte Zahlen durchlassen. Eine kaputte Adresse darf die Seite nicht
   * ins Nichts schicken - dann steht eben die Uebersicht da. */
  function zahl(text) {
    if (text === undefined || text === null || text === '') return null;
    var wert = parseFloat(text);
    return isFinite(wert) ? wert : null;
  }

  function ohneHash(url) {
    var stelle = url.indexOf('#');
    return stelle < 0 ? url : url.slice(0, stelle);
  }

  return { alsText: alsText, lesen: lesen };
})();
