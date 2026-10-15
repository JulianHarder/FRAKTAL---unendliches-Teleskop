/* Die Kamera: wo wir hinschauen und wie wir dorthin kommen.
 *
 * Zwei Staende: `ziel` ist, wo man hin will, `ansicht` ist, was gerade zu
 * sehen ist. Pro Bild zieht `ansicht` ein Stueck an `ziel` heran. Dadurch
 * gleitet jede Bewegung aus, statt zu springen - bei einem Fraktal ist das
 * nicht Kosmetik: ein harter Sprung ueber zwei Zehnerpotenzen macht das Bild
 * unlesbar, weil das Auge die Zwischenebenen braucht, um zu verstehen, wo es
 * gelandet ist.
 *
 * Gezoomt wird im Zweierlogarithmus (siehe Zustand.js): eine Mausrad-Rastung
 * ist immer "plus 0,25", egal ob bei Zoom 2 oder bei Zoom 2 Millionen.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Kamera = (function () {
  'use strict';

  var z = FRAKTAL.Zustand;

  var GLATT = 0.18;        // Anteil der Restdistanz je 1/60 s
  var RASTUNG = 0.25;      // log2-Schritte je Mausrad-Rastung
  var MIN_ZOOM = -1.5;     // weiter hinaus wird die Menge nur noch ein Punkt
  var MAX_ZOOM = 50.0;     // ~1e15; die echte Grenze setzt die Genauigkeit

  /* Einen Zustand (ansicht oder ziel) von Bildschirm- auf Weltkoordinaten.
   * `rechteck` ist die Leinwand in CSS-Pixeln, wie sie die Maus sieht. */
  function bildschirmZuWelt(x, y, rechteck, stand) {
    var skala = (z.BASIS_HOEHE / Math.pow(2, stand.log2Zoom)) / rechteck.height;
    return {
      // Die imaginaere Achse zeigt nach oben, die Bildschirm-y-Achse nach
      // unten - daher das umgedrehte Vorzeichen.
      re: stand.mitteRe + (x - rechteck.width * 0.5) * skala,
      im: stand.mitteIm + (rechteck.height * 0.5 - y) * skala
    };
  }

  /* Zoomen, und zwar so, dass der Punkt unter dem Zeiger stehen bleibt.
   *
   * Die Reihenfolge ist entscheidend: erst merken, welche Weltkoordinate
   * unter dem Zeiger liegt, dann den Zoom aendern, dann die Mitte um genau
   * die Differenz zurueckschieben. Andersherum driftet das Bild weg. */
  function zoomen(deltaLog2, x, y, rechteck) {
    var vorher = bildschirmZuWelt(x, y, rechteck, z.ziel);

    z.ziel.log2Zoom = begrenzen(z.ziel.log2Zoom + deltaLog2);

    var nachher = bildschirmZuWelt(x, y, rechteck, z.ziel);
    z.ziel.mitteRe += vorher.re - nachher.re;
    z.ziel.mitteIm += vorher.im - nachher.im;
  }

  /* Zoomen ohne Zeiger - fuer die Tasten + und -. Mitte bleibt Mitte. */
  function zoomenMitte(deltaLog2) {
    z.ziel.log2Zoom = begrenzen(z.ziel.log2Zoom + deltaLog2);
  }

  /* Ziehen mit der Maus. Beide Staende wandern sofort mit: beim Ziehen soll
   * das Bild am Finger kleben, eine Glaettung wuerde sich wie Gummi anfuehlen. */
  function ziehen(dxPixel, dyPixel, rechteck) {
    var skala = (z.BASIS_HOEHE / Math.pow(2, z.ansicht.log2Zoom)) / rechteck.height;
    var dRe = -dxPixel * skala;
    var dIm = dyPixel * skala;

    z.ansicht.mitteRe += dRe;
    z.ansicht.mitteIm += dIm;
    z.ziel.mitteRe += dRe;
    z.ziel.mitteIm += dIm;
  }

  /* Verschieben in Anteilen der Bildhoehe - fuer die Tasten. */
  function schieben(anteilX, anteilY) {
    var hoehe = z.BASIS_HOEHE / Math.pow(2, z.ziel.log2Zoom);
    z.ziel.mitteRe += anteilX * hoehe;
    z.ziel.mitteIm += anteilY * hoehe;
  }

  /* Zurueck zur Uebersicht. */
  function einpassen() {
    z.ziel.mitteRe = z.anfang.mitteRe;
    z.ziel.mitteIm = z.anfang.mitteIm;
    z.ziel.log2Zoom = z.anfang.log2Zoom;
  }

  /* Ein Schritt der Annaeherung. Gibt true zurueck, solange sich noch etwas
   * bewegt - daran erkennt die Schleife, ob grob gezeichnet werden muss. */
  function schritt(dt) {
    var a = z.ansicht;
    var zi = z.ziel;

    // Der Faktor wird auf die vergangene Zeit umgerechnet, damit die Bewegung
    // bei 30 und bei 144 Bildern je Sekunde gleich schnell ausklingt.
    var faktor = 1 - Math.pow(1 - GLATT, dt * 60);

    var dZoom = zi.log2Zoom - a.log2Zoom;
    var dRe = zi.mitteRe - a.mitteRe;
    var dIm = zi.mitteIm - a.mitteIm;

    // Nah genug? Dann aufsetzen und Ruhe geben. Die Schwelle haengt am
    // Zoom: tief drinnen sind "kleine" Abstaende riesig.
    var sichtHoehe = z.BASIS_HOEHE / Math.pow(2, a.log2Zoom);
    var nah = Math.abs(dZoom) < 1e-4
           && Math.abs(dRe) < sichtHoehe * 1e-4
           && Math.abs(dIm) < sichtHoehe * 1e-4;

    if (nah) {
      if (dZoom === 0 && dRe === 0 && dIm === 0) return false;
      a.log2Zoom = zi.log2Zoom;
      a.mitteRe = zi.mitteRe;
      a.mitteIm = zi.mitteIm;
      return true;    // dieses eine Bild noch, danach steht es
    }

    a.log2Zoom += dZoom * faktor;
    a.mitteRe += dRe * faktor;
    a.mitteIm += dIm * faktor;
    return true;
  }

  function begrenzen(wert) {
    if (wert < MIN_ZOOM) return MIN_ZOOM;
    if (wert > MAX_ZOOM) return MAX_ZOOM;
    return wert;
  }

  return {
    RASTUNG: RASTUNG,
    bildschirmZuWelt: bildschirmZuWelt,
    zoomen: zoomen,
    zoomenMitte: zoomenMitte,
    ziehen: ziehen,
    schieben: schieben,
    einpassen: einpassen,
    schritt: schritt
  };
})();
