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
    felder.zeileJulia = document.getElementById('zeile-julia');
    felder.juliaC = document.getElementById('wert-julia-c');
    felder.erklaerungTitel = document.getElementById('erklaerung-titel');
    felder.erklaerung = document.getElementById('erklaerung');
  }

  /* Die Erklaerung wechselt mit der Menge auf der Hauptbuehne. Die Saetze
   * selbst stehen in js/daten/texte.js, nicht hier. */
  function erklaerung(menge) {
    if (!felder.erklaerung) return;

    var text = FRAKTAL.Texte.erklaerung[menge] || FRAKTAL.Texte.erklaerung.mandelbrot;
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

    // Das feste c gibt es nur in der Julia-Menge.
    if (felder.zeileJulia) {
      felder.zeileJulia.hidden = z.menge !== 'julia';
      if (z.menge === 'julia') {
        felder.juliaC.textContent = juliaText(z.julia.re, z.julia.im);
      }
    }

    felder.iterationen.textContent = l.iterationen.toLocaleString('de-DE')
      + (l.grob ? ' (grob)' : '');
    felder.dauer.textContent = Math.round(l.letzteDauer) + ' ms';

    // 0 heisst nicht "haengt", sondern "es hat sich nichts geaendert".
    felder.bildrate.textContent = l.bildrate > 0
      ? Math.round(l.bildrate) + ' /s'
      : 'ruht';

    genauigkeitZeigen(l);

    felder.drosselung.hidden = l.notbremse >= 0.99;
    if (!felder.drosselung.hidden) {
      felder.drosselung.textContent = 'Gedrosselt auf '
        + Math.round(l.notbremse * 100)
        + ' % der Tiefe – die Bilder haben zu lange gebraucht.';
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

    felder.stellen.textContent = knapp
      ? 'Grenze erreicht – tiefer wird das Bild stufig, nicht detaillierter.'
      : zahl(l.stellen) + ' Stellen übrig';
  }

  function zahl(wert) {
    return wert.toFixed(1).replace('.', ',');
  }

  /* Das feste c der Julia-Menge. Sechs Stellen genuegen - anders als die
   * Bildmitte wird es nicht hineingezoomt. */
  function juliaText(re, im) {
    return re.toFixed(6).replace('.', ',')
      + (im < 0 ? ' − ' : ' + ')
      + Math.abs(im).toFixed(6).replace('.', ',') + 'i';
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
    grafikkarte: grafikkarte
  };
})();
