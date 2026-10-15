/* Dauerzoom: Leertaste drücken, und es fährt von allein weiter hinein.
 *
 * Das ist das Gefuehl des ganzen Projekts in Reinform - man haelt nichts
 * gedrueckt, man steuert nicht, man sieht nur zu, wie eine Ebene nach der
 * anderen aufgeht und nie die letzte kommt.
 *
 * Bis die Genauigkeit zu Ende ist. Dann haelt es von selbst an, und zwar
 * vorher und nicht hinterher: unterhalb einer Dezimalstelle liegen zwei
 * Nachbarpixel auf derselben Zahl, und was dann noch groesser wird, ist nicht
 * mehr die Menge, sondern der Rechenfehler. Weiterzufahren waere eine Luege.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Dauerzoom = (function () {
  'use strict';

  var z = FRAKTAL.Zustand;

  var TEMPO = 0.7;         // log2-Stufen je Sekunde: gut eine Verdopplung
  var SCHLUSS = 1.0;       // bei weniger Stellen ist Schluss

  var laeuft = false;
  var beiAenderung = function () {};

  function horchen(rueckruf) {
    if (typeof rueckruf === 'function') beiAenderung = rueckruf;
  }

  function an() {
    if (laeuft) return;
    laeuft = true;
    beiAenderung(true, null);
  }

  /* `grund` sagt dem Aufrufer, warum Schluss ist: 'grenze' heisst, die
   * Genauigkeit ist zu Ende - das gehoert gesagt und nicht verschwiegen. */
  function aus(grund) {
    if (!laeuft) return;
    laeuft = false;
    beiAenderung(false, grund || null);
  }

  function umschalten() {
    if (laeuft) aus(); else an();
    return laeuft;
  }

  function laeuftGerade() {
    return laeuft;
  }

  /* Ein Bildtakt. Gibt true zurueck, solange gefahren wird. */
  function schritt(dt) {
    if (!laeuft) return false;

    /* Ein Bildtakt ohne vergangene Zeit ist kein Anschlag, sondern einfach
     * nichts zu tun. Der allererste Takt nach dem Laden hat dt = 0, und zwei
     * Bildtakte mit demselben Zeitstempel kommen auch sonst vor - ohne diese
     * Zeile haelt der Dauerzoom in der Sekunde an, in der er angeht. */
    if (dt <= 0) return false;

    /* Gefragt wird nach der Stelle, die dieser Schritt ansteuert - nicht
     * nach der, wo wir stehen. Sonst wird der Schritt noch gemacht und erst
     * danach gemerkt, dass er einer zu viel war: angehalten wuerde dann
     * jenseits der Grenze statt davor. */
    var naechster = z.ziel.log2Zoom + TEMPO * dt;
    var uebrig = FRAKTAL.Genauigkeit.stellen(
      naechster,
      FRAKTAL.Leinwand.volleHoehe(),
      FRAKTAL.Genauigkeit.aktuell()
    );
    if (uebrig < SCHLUSS) {
      aus('grenze');
      return false;
    }

    var vorher = z.ziel.log2Zoom;
    FRAKTAL.Kamera.zoomenMitte(TEMPO * dt);

    // Am Anschlag der Kamera bewegt sich nichts mehr - dann ist es auch gut.
    if (z.ziel.log2Zoom === vorher) {
      aus('anschlag');
      return false;
    }
    return true;
  }

  return {
    horchen: horchen,
    an: an,
    aus: aus,
    umschalten: umschalten,
    laeuft: laeuftGerade,
    schritt: schritt,
    TEMPO: TEMPO
  };
})();
