/* Die Julia-Vorschau: ein kleines Fenster, das dem Mauszeiger folgt.
 *
 * Unter dem Zeiger liegt eine Zahl c. Die Vorschau zeigt, welche Julia-Menge
 * zu genau diesem c gehoert - und macht damit sichtbar, was die
 * Mandelbrot-Menge eigentlich ist: eine Landkarte aller Julia-Mengen. Ein
 * Klick holt die gezeigte Menge auf die Hauptbuehne.
 *
 * Gezeichnet wird in ein eigenes Ziel auf der Grafikkarte (js/gl/Ziel.js) und
 * von dort in einen gewoehnlichen 2D-Canvas kopiert. Der Umweg ist Absicht:
 * die Vorschau muss dem Zeiger auch dann folgen, wenn das Hauptbild still
 * steht. Wuerde sie in eine Ecke der Leinwand gezeichnet, muesste bei jeder
 * Mausbewegung das ganze Fraktal mitgerechnet werden - tief drinnen kostet
 * das eine halbe Sekunde, und das Bild bliebe dauerhaft grob.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.JuliaVorschau = (function () {
  'use strict';

  var z = FRAKTAL.Zustand;

  var KANTE = 220;          // Kantenlaenge in CSS-Pixeln
  var SICHT_HOEHE = 3.6;    // Weltausschnitt - so passt jede Julia-Menge hinein
  var ITERATIONEN = 280;    // fest: die Vorschau steht immer bei Zoom ~1

  var huelle = null;        // Rahmen um Bild und Beschriftung
  var leinwand = null;      // der 2D-Canvas der Vorschau
  var ctx = null;
  var marke = null;         // Zeile "c = ..." unter dem Bild
  var schild = null;        // Hinweis, solange die Julia-Menge gross zu sehen ist
  var schildC = null;

  var ziel = null;          // Zeichenziel auf der Grafikkarte
  var puffer = null;        // Pixel von dort
  var bild = null;          // dieselben Pixel, gespiegelt, fuer den 2D-Canvas

  var ort = null;           // letzte Zeigerstelle { x, y, breite, hoehe }
  // Bis der Zeiger das erste Mal ueber die Leinwand faehrt, steht das c aus
  // dem Zustand da. Die Vorschau zeigt dann schon beim Laden eine Julia-Menge:
  // sonst wuesste niemand, dass es sie gibt - und auf einem Tastbildschirm,
  // der kein Ueberfahren kennt, kaeme sie nie zum Vorschein.
  var cRe = z.julia.re;
  var cIm = z.julia.im;
  var faellig = false;
  var verdrahtet = false;

  function starten(gl) {
    huelle = document.getElementById('vorschau');
    leinwand = document.getElementById('vorschau-leinwand');
    marke = document.getElementById('vorschau-marke');
    schild = document.getElementById('julia-schild');
    schildC = document.getElementById('julia-schild-c');
    if (!huelle || !leinwand) return;

    ctx = leinwand.getContext('2d');

    // Auf feinen Bildschirmen mehr Pixel rechnen, sonst ist die Vorschau matschig.
    var dichte = Math.min(2, window.devicePixelRatio || 1);
    var kante = Math.max(1, Math.round(KANTE * dichte));
    leinwand.width = kante;
    leinwand.height = kante;

    ziel = FRAKTAL.Ziel.erzeugen(gl, kante, kante);
    puffer = new Uint8Array(kante * kante * 4);
    bild = ctx.createImageData(kante, kante);

    // Nach einem Kontextverlust laeuft starten() erneut - die Horcher haengen
    // dann schon, ein zweites Mal wuerde jeden Klick doppelt zaehlen.
    if (!verdrahtet) {
      verdrahtet = true;
      leinwand.addEventListener('click', beiKlick);
      var zurueck = document.getElementById('knopf-mandelbrot');
      if (zurueck) zurueck.addEventListener('click', function () {
        FRAKTAL.Menge.nachMandelbrot();
      });
    }

    faellig = true;
  }

  /* Von der Maus: der Zeiger steht an dieser Stelle der Leinwand.
   *
   * Gemerkt wird die Bildschirmstelle, nicht das fertige c. Denn waehrend die
   * Kamera noch gleitet, wandert die Welt unter dem stehenden Zeiger weg -
   * das c wird deshalb in jedem Takt neu bestimmt. */
  function zeigen(x, y, rechteck) {
    ort = { x: x, y: y, breite: rechteck.width, hoehe: rechteck.height };
    faellig = true;
  }

  /* Ein Bildtakt. `bewegt` = die Kamera fuhr noch.
   * Gibt true zurueck, wenn wirklich gerechnet wurde. */
  function schritt(bewegt) {
    if (!ziel || !ctx) return false;
    // Steht die Julia-Menge selbst auf der Buehne, braucht niemand ihr Briefmarkenbild.
    if (z.menge === 'julia') return false;
    if (!faellig && !bewegt) return false;

    faellig = false;

    if (ort) {
      var welt = FRAKTAL.Kamera.bildschirmZuWelt(
        ort.x, ort.y, { width: ort.breite, height: ort.hoehe }, z.ansicht);
      cRe = welt.re;
      cIm = welt.im;
    }

    if (!zeichnen()) return false;

    huelle.hidden = false;
    if (marke) marke.textContent = cText(cRe, cIm);
    return true;
  }

  function zeichnen() {
    var gelang = FRAKTAL.Zeichner.inZiel(ziel, {
      breite: ziel.breite,
      hoehe: ziel.hoehe,
      mitteRe: 0,
      mitteIm: 0,
      skala: SICHT_HOEHE / ziel.hoehe,
      iterationen: ITERATIONEN,
      proben: 1,
      julia: true,
      cRe: cRe,
      cIm: cIm
    });
    if (!gelang) return false;

    ziel.lesen(puffer);
    spiegeln(puffer, bild.data, ziel.breite, ziel.hoehe);
    ctx.putImageData(bild, 0, 0);
    return true;
  }

  /* readPixels zaehlt die Zeilen von unten, ein 2D-Canvas von oben. Ohne das
   * Spiegeln steht die Vorschau kopf - bei einer Julia-Menge faellt das nicht
   * sofort auf, weil viele von ihnen punktsymmetrisch sind. Genau deshalb
   * steht es hier. */
  function spiegeln(von, nach, breite, hoehe) {
    var zeile = breite * 4;
    for (var y = 0; y < hoehe; y++) {
      nach.set(von.subarray(y * zeile, y * zeile + zeile), (hoehe - 1 - y) * zeile);
    }
  }

  function beiKlick() {
    FRAKTAL.Menge.nachJulia(cRe, cIm);
  }

  /* Nach einem Wechsel der Menge aufraeumen: in der Julia-Menge selbst steht
   * anstelle der Vorschau das Schild mit dem c und dem Weg zurueck. */
  function mengeGewechselt() {
    var julia = z.menge === 'julia';
    if (huelle) huelle.hidden = julia;
    if (schild) schild.hidden = !julia;
    if (julia && schildC) schildC.textContent = cText(z.julia.re, z.julia.im);
    faellig = true;
  }

  /* Das c, das die Vorschau gerade zeigt - die Taste J nimmt es, wenn noch
   * keine Julia-Ansicht gemerkt ist. */
  function c() {
    return { re: cRe, im: cIm };
  }

  function cText(re, im) {
    return 'c = ' + zahl(re) + (im < 0 ? ' − ' : ' + ') + zahl(Math.abs(im)) + 'i';
  }

  function zahl(wert) {
    return wert.toFixed(4).replace('.', ',').replace('-', '−');
  }

  return {
    starten: starten,
    zeigen: zeigen,
    schritt: schritt,
    mengeGewechselt: mengeGewechselt,
    c: c
  };
})();
