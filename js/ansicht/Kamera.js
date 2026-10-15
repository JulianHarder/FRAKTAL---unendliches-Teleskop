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
  var FLUG_DAUER = 1.6;    // Sekunden fuer einen Flug zu einer Stelle
  var SCHWENK = 0.6;       // Anteil des Fluges, in dem der Schwenk erledigt ist
  var NAEHE = 0.35;        // so nah bleibt das Ziel, in Bildhoehen gemessen

  // Laeuft ein Flug, fuehrt er die Kamera; jede eigene Bewegung bricht ihn ab.
  var flug = null;

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
    flug = null;
    var vorher = bildschirmZuWelt(x, y, rechteck, z.ziel);

    z.ziel.log2Zoom = begrenzen(z.ziel.log2Zoom + deltaLog2);

    var nachher = bildschirmZuWelt(x, y, rechteck, z.ziel);
    z.ziel.mitteRe += vorher.re - nachher.re;
    z.ziel.mitteIm += vorher.im - nachher.im;
  }

  /* Zoomen ohne Zeiger - fuer die Tasten + und -. Mitte bleibt Mitte. */
  function zoomenMitte(deltaLog2) {
    flug = null;
    z.ziel.log2Zoom = begrenzen(z.ziel.log2Zoom + deltaLog2);
  }

  /* Ziehen mit der Maus. Beide Staende wandern sofort mit: beim Ziehen soll
   * das Bild am Finger kleben, eine Glaettung wuerde sich wie Gummi anfuehlen. */
  function ziehen(dxPixel, dyPixel, rechteck) {
    flug = null;
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
    flug = null;
    var hoehe = z.BASIS_HOEHE / Math.pow(2, z.ziel.log2Zoom);
    z.ziel.mitteRe += anteilX * hoehe;
    z.ziel.mitteIm += anteilY * hoehe;
  }

  /* Zurueck zur Uebersicht. */
  function einpassen() {
    flug = null;
    z.ziel.mitteRe = z.anfang.mitteRe;
    z.ziel.mitteIm = z.anfang.mitteIm;
    z.ziel.log2Zoom = z.anfang.log2Zoom;
  }

  /* Zu einer Stelle hinfliegen, statt hinzuspringen.
   *
   * Ein Sprung ueber sieben Zehnerpotenzen ist unlesbar - man steht ploetzlich
   * woanders und weiss nicht, wie man dorthin kam. Geflogen wird deshalb im
   * Bogen: erst hinaus, bis Start und Ziel zusammen ins Bild passen, dann
   * hinueber, dann hinein.
   *
   * Der Bogen ist nicht Zierde. Schwenkt man auf voller Tiefe, wandert das
   * Ziel in Pixeln gerechnet erst unmerklich und schiesst dann im letzten
   * Augenblick von der Seite herein: in Weltkoordinaten naehert es sich
   * gleichmaessig, aber der Massstab wird dabei millionenfach feiner. Auf dem
   * Bogen dagegen passiert der Schwenk dort, wo das Bild weit ist - und man
   * sieht die Ebenen vorbeifliegen. */
  function hinfliegen(stand, dauer) {
    var a = z.ansicht;
    var zielZoom = begrenzen(stand.log2Zoom);
    var weg = Math.sqrt(Math.pow(stand.mitteRe - a.mitteRe, 2)
                      + Math.pow(stand.mitteIm - a.mitteIm, 2));

    // Der Zoom, bei dem der Weg gerade noch ins Bild passt.
    var passend = weg > 0 ? Math.log2(z.BASIS_HOEHE / weg) : Infinity;
    var naeher = Math.min(a.log2Zoom, zielZoom);

    /* Steuerpunkt einer quadratischen Kurve. Liegt er auf der Geraden
     * zwischen Start und Ziel, ist die Kurve genau diese Gerade - und es
     * wird gar nicht erst hinausgezoomt. Noetig ist der Bogen nur, wenn der
     * Weg selbst bei der flacheren der beiden Tiefen nicht ins Bild passt. */
    var bogen = (a.log2Zoom + zielZoom) / 2;
    if (passend < naeher) bogen = 2 * passend - (a.log2Zoom + zielZoom) / 2;

    flug = {
      vonRe: a.mitteRe, vonIm: a.mitteIm, vonZoom: a.log2Zoom,
      nachRe: stand.mitteRe, nachIm: stand.mitteIm, nachZoom: zielZoom,
      bogen: bogen,
      weg: weg,
      rest: 1,             // wieviel vom Schwenk noch offen ist
      weit: false,         // passt der Weg schon ins Bild?
      dauer: dauer || FLUG_DAUER,
      t: 0
    };

    // Das Ziel gleich setzen: nach der Landung hat die Glaettung nichts mehr zu tun.
    z.ziel.mitteRe = stand.mitteRe;
    z.ziel.mitteIm = stand.mitteIm;
    z.ziel.log2Zoom = zielZoom;
  }

  function fliegt() {
    return !!flug;
  }

  function flugSchritt(dt) {
    var f = flug;
    f.t += dt / f.dauer;

    if (f.t >= 1) {
      flug = null;
      z.ansicht.mitteRe = f.nachRe;
      z.ansicht.mitteIm = f.nachIm;
      z.ansicht.log2Zoom = f.nachZoom;
      return true;
    }

    // Weich an- und abschwellen statt mit voller Fahrt loszuschiessen.
    var s = f.t * f.t * (3 - 2 * f.t);
    var g = 1 - s;
    z.ansicht.log2Zoom = g * g * f.vonZoom + 2 * s * g * f.bogen + s * s * f.nachZoom;

    /* Der Schwenk haengt nicht an der Uhr, sondern am Ausschnitt.
     *
     * Nach der Uhr allein geschwenkt, steht das Ziel bei halber Flugzeit
     * rechnerisch schon fast da - und trotzdem sechzehn Bildhoehen daneben,
     * weil der Massstab inzwischen tausendfach feiner ist. Man saehe einen
     * leeren Anflug und am Schluss ein Bild, das von der Seite hereinspringt.
     *
     * Also wird der Rest des Weges so gefuehrt, dass das Ziel nie weiter als
     * NAEHE Bildhoehen entfernt liegt: je enger der Ausschnitt wird, desto
     * mehr ist geschwenkt. Daneben laeuft die Uhr als zweite Schranke, denn
     * ein reiner Schwenk ohne Zoomaenderung kaeme sonst nie an.
     *
     * Die Bedingung `weit` haelt das Ganze am Anfang zurueck: solange der Weg
     * gar nicht ins Bild passt - tiefer Start, fernes Ziel - wird nicht
     * geschwenkt, sondern erst hinausgefahren. Sonst spraenge die Mitte im
     * ersten Bildtakt quer durch die Ebene. */
    var ps = Math.min(1, f.t / SCHWENK);
    var rest = 1 - ps * ps * (3 - 2 * ps);

    var sichtHoehe = z.BASIS_HOEHE / Math.pow(2, z.ansicht.log2Zoom);
    var nahGenug = f.weg > 0 ? NAEHE * sichtHoehe / f.weg : 0;
    if (nahGenug >= 1) f.weit = true;
    if (f.weit) rest = Math.min(rest, nahGenug);

    // Nie rueckwaerts: ein Schwenk, der sich besinnt, sieht nach Fehler aus.
    f.rest = Math.min(f.rest, rest);

    z.ansicht.mitteRe = f.nachRe - (f.nachRe - f.vonRe) * f.rest;
    z.ansicht.mitteIm = f.nachIm - (f.nachIm - f.vonIm) * f.rest;
    return true;
  }

  /* Ein Schritt der Annaeherung. Gibt true zurueck, solange sich noch etwas
   * bewegt - daran erkennt die Schleife, ob grob gezeichnet werden muss. */
  function schritt(dt) {
    if (flug) return flugSchritt(dt);

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
    hinfliegen: hinfliegen,
    fliegt: fliegt,
    schritt: schritt,
    MAX_ZOOM: MAX_ZOOM
  };
})();
