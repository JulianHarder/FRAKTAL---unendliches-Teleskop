/* Maus und Finger.
 *
 * Alles laeuft ueber Pointer-Events: Maus, Trackpad und Touch kommen damit
 * durch dieselbe Tuer, und `setPointerCapture` sorgt dafuer, dass ein Zug
 * nicht abreisst, wenn der Zeiger die Leinwand verlaesst.
 *
 * Ein Finger schiebt, zwei Finger kneifen (zoomen) und schieben gleichzeitig.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Maus = (function () {
  'use strict';

  var leinwand = null;
  var zeiger = {};         // pointerId -> { x, y }
  var anzahl = 0;
  var letzterAbstand = 0;  // fuer die Kneifgeste

  function starten(element) {
    leinwand = element;

    // passive:false, weil wir das Scrollen der Seite verhindern muessen.
    element.addEventListener('wheel', beiRad, { passive: false });
    element.addEventListener('pointerdown', beiRunter);
    element.addEventListener('pointermove', beiBewegung);
    element.addEventListener('pointerup', beiHoch);
    element.addEventListener('pointercancel', beiHoch);
    element.addEventListener('dblclick', beiDoppelklick);
  }

  function rechteck() {
    return leinwand.getBoundingClientRect();
  }

  function ortVon(ereignis, r) {
    return { x: ereignis.clientX - r.left, y: ereignis.clientY - r.top };
  }

  // --- Mausrad ---

  function beiRad(ereignis) {
    ereignis.preventDefault();

    var r = rechteck();
    var o = ortVon(ereignis, r);
    FRAKTAL.Kamera.zoomen(rastungen(ereignis) * FRAKTAL.Kamera.RASTUNG, o.x, o.y, r);
    FRAKTAL.Zeichner.eingabe();
  }

  /* Mausraeder melden in Pixeln, Zeilen oder Seiten - je nach Browser und
   * Geraet. Ohne Umrechnung zoomt ein Trackpad hundertmal so schnell wie
   * ein Rad. */
  function rastungen(ereignis) {
    var menge = ereignis.deltaY;
    if (ereignis.deltaMode === 1) menge *= 16;        // Zeilen
    else if (ereignis.deltaMode === 2) menge *= 400;  // Seiten
    return -menge / 100;
  }

  // --- Ziehen und Kneifen ---

  function beiRunter(ereignis) {
    if (zeiger[ereignis.pointerId]) return;

    try { leinwand.setPointerCapture(ereignis.pointerId); } catch (fehler) { /* egal */ }
    var r = rechteck();
    zeiger[ereignis.pointerId] = ortVon(ereignis, r);
    anzahl++;
    leinwand.classList.add('greift');

    if (anzahl === 2) letzterAbstand = abstand();
  }

  function beiBewegung(ereignis) {
    var alt = zeiger[ereignis.pointerId];
    if (!alt) return;

    var r = rechteck();
    var neu = ortVon(ereignis, r);
    var dx = neu.x - alt.x;
    var dy = neu.y - alt.y;
    zeiger[ereignis.pointerId] = neu;

    if (anzahl === 1) {
      FRAKTAL.Kamera.ziehen(dx, dy, r);
    } else if (anzahl === 2) {
      kneifen(r);
    }
    FRAKTAL.Zeichner.eingabe();
  }

  /* Zwei Finger: der Abstand steuert den Zoom, der Mittelpunkt ist der
   * Festpunkt. log2 des Abstandsverhaeltnisses passt direkt in unseren
   * Logarithmus-Zoom - ein doppelter Abstand ist genau eine Stufe. */
  function kneifen(r) {
    var jetztAbstand = abstand();
    if (letzterAbstand <= 0 || jetztAbstand <= 0) {
      letzterAbstand = jetztAbstand;
      return;
    }

    var m = mittelpunkt();
    FRAKTAL.Kamera.zoomen(Math.log2(jetztAbstand / letzterAbstand), m.x, m.y, r);
    letzterAbstand = jetztAbstand;
  }

  function beiHoch(ereignis) {
    if (!zeiger[ereignis.pointerId]) return;

    try { leinwand.releasePointerCapture(ereignis.pointerId); } catch (fehler) { /* egal */ }
    delete zeiger[ereignis.pointerId];
    anzahl = Math.max(0, anzahl - 1);
    if (anzahl < 2) letzterAbstand = 0;
    if (anzahl === 0) leinwand.classList.remove('greift');
  }

  function beiDoppelklick(ereignis) {
    ereignis.preventDefault();

    var r = rechteck();
    var o = ortVon(ereignis, r);
    // Eine ganze log2-Stufe: doppelt so nah. Mit Shift wieder heraus.
    FRAKTAL.Kamera.zoomen(ereignis.shiftKey ? -1 : 1, o.x, o.y, r);
    FRAKTAL.Zeichner.eingabe();
  }

  // --- Hilfsrechnungen fuer zwei Zeiger ---

  function beide() {
    var liste = [];
    for (var id in zeiger) if (zeiger.hasOwnProperty(id)) liste.push(zeiger[id]);
    return liste;
  }

  function abstand() {
    var p = beide();
    if (p.length < 2) return 0;
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  function mittelpunkt() {
    var p = beide();
    if (p.length < 2) return { x: 0, y: 0 };
    return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
  }

  return { starten: starten };
})();
