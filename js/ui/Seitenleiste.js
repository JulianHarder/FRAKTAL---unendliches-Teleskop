/* Die Seitenleiste zeigt, wo man gerade steht und was das kostet.
 *
 * Zoomfaktor und Koordinaten sind in diesem Projekt keine Zierde: ohne sie
 * weiss man nach zwanzig Rastungen nicht mehr, wie tief man ist - und spaeter
 * haengt die Genauigkeitsanzeige am Zoomfaktor.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Seitenleiste = (function () {
  'use strict';

  var felder = {};

  function starten() {
    felder.zoom = document.getElementById('wert-zoom');
    felder.re = document.getElementById('wert-re');
    felder.im = document.getElementById('wert-im');
    felder.iterationen = document.getElementById('wert-iterationen');
    felder.dauer = document.getElementById('wert-dauer');
    felder.bildrate = document.getElementById('wert-bildrate');
    felder.karte = document.getElementById('wert-karte');
    felder.drosselung = document.getElementById('hinweis-drosselung');
    felder.modus = document.getElementById('wert-modus');
    felder.balken = document.getElementById('balken-stellen');
    felder.balkenRahmen = document.getElementById('balken-rahmen');
    felder.stellen = document.getElementById('text-stellen');
    felder.grenze = document.getElementById('grenze');
    felder.bits = document.getElementById('hinweis-bits');
    felder.erklaerungTitel = document.getElementById('erklaerung-titel');
    felder.erklaerung = document.getElementById('erklaerung');
  }

  /* Die Erklaerung in der Seitenleiste. Die Saetze stehen in
   * js/daten/texte.js, nicht hier. */
  function erklaerung() {
    if (!felder.erklaerung) return;

    var text = FRAKTAL.Texte.erklaerung.mandelbrot;
    felder.erklaerungTitel.textContent = text.titel;
    felder.erklaerung.innerHTML = '';

    text.saetze.forEach(function (satz) {
      var absatz = document.createElement('p');
      absatz.className = 'hinweis';
      absatz.textContent = satz;
      felder.erklaerung.appendChild(absatz);
    });
  }

  function aktualisieren(z) {
    var l = z.laufzeit;

    felder.zoom.textContent = zoomText(z.zoom());
    felder.re.textContent = koordinate(z.ansicht.mitteRe);
    felder.im.textContent = koordinate(z.ansicht.mitteIm);

    felder.iterationen.textContent = l.iterationen.toLocaleString('de-DE')
      + (l.grob ? ' (grob)' : '');
    felder.dauer.textContent = Math.round(l.letzteDauer) + ' ms';

    // 0 heisst nicht "haengt", sondern "es hat sich nichts geaendert".
    felder.bildrate.textContent = l.bildrate > 0
      ? Math.round(l.bildrate) + ' /s'
      : 'ruht';

    genauigkeitZeigen(l);

    /* Beide Stufen der Notbremse gehoeren gesagt. Wer nicht weiss, dass
     * gespart wird, haelt das Bild fuer das, was die Stelle hergibt. */
    felder.drosselung.hidden = l.notbremse >= 0.99 && l.glaetten;
    if (!felder.drosselung.hidden) {
      felder.drosselung.textContent = l.notbremse >= 0.99
        ? 'Ohne Kantenglättung – die Bilder haben zu lange gebraucht.'
        : 'Gedrosselt auf ' + Math.round(l.notbremse * 100)
          + ' % der Tiefe, ohne Kantenglättung – die Bilder haben zu lange gebraucht.';
    }
  }

  /* Die Genauigkeit ehrlich zeigen: wie viele Dezimalstellen traegt das Bild
   * an dieser Stelle noch? Bei weniger als einer ist Schluss - dann liegen
   * zwei Nachbarpixel auf derselben Zahl, und tiefer zu zoomen vergroessert
   * nur noch den Rechenfehler. */
  function genauigkeitZeigen(l) {
    felder.modus.textContent = l.modus === 'doppelt' ? 'doppelt' : 'einfach';

    // Sechs Stellen sind ein voller Balken - darueber ist ohnehin alles gut.
    var anteil = Math.max(0, Math.min(1, l.stellen / 6));
    felder.balken.style.width = (anteil * 100).toFixed(1) + '%';

    var knapp = l.stellen < 1;
    felder.balkenRahmen.classList.toggle('knapp', knapp);
    felder.stellen.classList.toggle('knapp', knapp);

    /* Dieselbe Nachricht noch einmal über der Leinwand.
     *
     * In der Seitenleiste steht sie weit unten, und wer gerade zoomt, sieht
     * dorthin nicht - er sieht die Klötzchen und hält sie für einen Fehler
     * des Programms. Die Grenze gehört dahin, wo man sie bemerkt. */
    if (felder.grenze) felder.grenze.hidden = !knapp;

    felder.stellen.textContent = knapp
      ? 'Grenze erreicht – tiefer wird das Bild stufig, nicht detaillierter.'
      : zahl(l.stellen) + ' Stellen übrig';
  }

  /* Einmal beim Start: was die Messung auf dieser Grafikkarte ergeben hat.
   * Steht da nichts, liess sie sich nicht messen - dann gilt die Annahme. */
  function genauigkeitGemessen(bits) {
    if (!felder.bits) return;

    if (!bits) {
      felder.bits.hidden = true;
      return;
    }

    felder.bits.hidden = false;
    var voll = bits >= 44;
    felder.bits.classList.toggle('knapp', !voll);
    felder.bits.textContent = voll
      ? 'Nachgemessen: ' + bits + ' Bit – die Doppelgenauigkeit greift auf dieser Karte.'
      : 'Nachgemessen: nur ' + bits + ' von 46 Bit. Diese Grafikkarte rechnet die '
        + 'Doppelgenauigkeit nur zum Teil – tief drinnen wird das Bild früher stufig, '
        + 'und die Stellenanzeige daneben weiß das.';
  }

  function zahl(wert) {
    return wert.toFixed(1).replace('.', ',');
  }

  function grafikkarte(name) {
    if (felder.karte) felder.karte.textContent = name;
  }

  /* Bis 10.000 als Zahl, darueber in Zehnerpotenzen - "1,2e7" liest sich
   * tief drinnen besser als zwoelf Ziffern. */
  function zoomText(wert) {
    if (wert < 10000) {
      return wert.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' ×';
    }
    var exponent = Math.floor(Math.log10(wert));
    var mantisse = wert / Math.pow(10, exponent);
    return mantisse.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + 'e' + exponent;
  }

  /* Je tiefer der Zoom, desto mehr Nachkommastellen braucht die Koordinate -
   * sonst zeigen zwei weit auseinanderliegende Stellen dieselbe Zahl. */
  function koordinate(wert) {
    var stellen = Math.min(17, Math.max(6, Math.round(FRAKTAL.Zustand.ansicht.log2Zoom * 0.302) + 5));
    return wert.toFixed(stellen).replace('.', ',');
  }

  return {
    starten: starten,
    aktualisieren: aktualisieren,
    erklaerung: erklaerung,
    genauigkeitGemessen: genauigkeitGemessen,
    grafikkarte: grafikkarte
  };
})();
