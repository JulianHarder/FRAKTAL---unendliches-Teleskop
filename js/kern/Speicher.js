/* Was den Neustart ueberlebt: der letzte Stand und die eigenen Lesezeichen.
 *
 * Alles liegt in einem einzigen localStorage-Eintrag. Kein Server, keine
 * Datei - die Seite laeuft ueber file://, und das ist der einzige Ort, an dem
 * ein Browser ihr etwas aufzubewahren erlaubt.
 *
 * Zwei Dinge koennen schiefgehen, und beide duerfen die Seite nicht
 * mitreissen:
 *
 *   1. localStorage ist gesperrt (privates Fenster, strenge Einstellung).
 *      Dann wirft schon der Zugriff. Also steht jeder davon in try/catch,
 *      und ohne Speicher laeuft FRAKTAL eben ohne Gedaechtnis weiter.
 *   2. Der Platz ist voll (~5 MB). Lesezeichen tragen Vorschaubilder, und die
 *      sind der grosse Posten. Beim Volllaufen fliegt das aelteste Bild
 *      heraus - der Eintrag selbst bleibt, nur ohne Bild.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Speicher = (function () {
  'use strict';

  var SCHLUESSEL = 'fraktal.stand.v1';
  var HOECHSTENS = 24;       // mehr Lesezeichen sprengen die Quote

  var inhalt = { stand: null, regler: null, lesezeichen: [] };
  var geht = true;
  var vollGemeldet = false;
  var zaehler = 0;

  /* Beim Start einmal lesen. Gibt zurueck, was gefunden wurde. */
  function laden() {
    // Erst zuruecksetzen: was im Speicher steht, ist die Wahrheit - auch
    // wenn dort nichts steht.
    inhalt = { stand: null, regler: null, lesezeichen: [] };

    try {
      var text = window.localStorage.getItem(SCHLUESSEL);
      if (text) {
        var gelesen = JSON.parse(text);
        if (gelesen && typeof gelesen === 'object') {
          inhalt.stand = gelesen.stand || null;
          inhalt.regler = gelesen.regler || null;
          inhalt.lesezeichen = Array.isArray(gelesen.lesezeichen) ? gelesen.lesezeichen : [];
        }
      }
    } catch (fehler) {
      geht = false;
      console.warn('Kein Zugriff auf den Speicher – FRAKTAL merkt sich nichts.');
    }
    return inhalt;
  }

  /* Den gezeigten Stand und die Regler merken. */
  function standMerken(z) {
    inhalt.stand = {
      re: z.ansicht.mitteRe,
      im: z.ansicht.mitteIm,
      log2Zoom: z.ansicht.log2Zoom,
      menge: z.menge,
      juliaRe: z.julia.re,
      juliaIm: z.julia.im
    };
    inhalt.regler = {
      palette: z.regler.palette,
      dichte: z.regler.dichte,
      verschiebung: z.regler.verschiebung,
      qualitaet: z.regler.qualitaet,
      rechenmodus: z.regler.rechenmodus
    };
    schreiben();
  }

  /* Einen gespeicherten Stand auf den Zustand legen. */
  function standAnwenden(z) {
    var s = inhalt.stand;
    if (!s || !isFinite(s.re) || !isFinite(s.im) || !isFinite(s.log2Zoom)) return false;

    z.menge = s.menge === 'julia' ? 'julia' : 'mandelbrot';
    if (isFinite(s.juliaRe) && isFinite(s.juliaIm)) {
      z.julia.re = s.juliaRe;
      z.julia.im = s.juliaIm;
    }
    z.ansicht.mitteRe = z.ziel.mitteRe = s.re;
    z.ansicht.mitteIm = z.ziel.mitteIm = s.im;
    z.ansicht.log2Zoom = z.ziel.log2Zoom = s.log2Zoom;

    var r = inhalt.regler;
    if (r) {
      if (r.palette) z.regler.palette = r.palette;
      if (isFinite(r.dichte)) z.regler.dichte = r.dichte;
      if (isFinite(r.verschiebung)) z.regler.verschiebung = r.verschiebung;
      if (isFinite(r.qualitaet)) z.regler.qualitaet = r.qualitaet;
      if (r.rechenmodus) z.regler.rechenmodus = r.rechenmodus;
    }
    return true;
  }

  function lesezeichen() {
    return inhalt.lesezeichen;
  }

  function merken(eintrag) {
    /* Die Uhr allein genuegt nicht: zwei Lesezeichen in derselben
     * Millisekunde bekaemen dieselbe Kennung, und das Loeschen des einen
     * nimmt dann das andere mit. Der Zaehler macht sie eindeutig. */
    eintrag.id = 'lz' + Date.now().toString(36) + '-' + (++zaehler).toString(36);
    inhalt.lesezeichen.unshift(eintrag);
    // Die aeltesten fallen hinten heraus, sonst waechst es ohne Ende.
    if (inhalt.lesezeichen.length > HOECHSTENS) {
      inhalt.lesezeichen.length = HOECHSTENS;
    }
    schreiben();
    return eintrag;
  }

  function vergessen(id) {
    inhalt.lesezeichen = inhalt.lesezeichen.filter(function (eintrag) {
      return eintrag.id !== id;
    });
    schreiben();
  }

  /* Schreiben, und bei vollem Speicher Platz schaffen: das aelteste
   * Vorschaubild wegwerfen und noch einmal versuchen. Lieber ein Lesezeichen
   * ohne Bild als ein verlorenes Lesezeichen. */
  function schreiben() {
    if (!geht) return false;

    for (var versuch = 0; versuch < HOECHSTENS + 1; versuch++) {
      try {
        window.localStorage.setItem(SCHLUESSEL, JSON.stringify(inhalt));
        return true;
      } catch (fehler) {
        /* Voll. Erst Platz schaffen, dann noch einmal. Geht gar nichts mehr,
         * wird nur dieser eine Schreibvorgang aufgegeben - nicht das Merken
         * ueberhaupt: wer gleich darauf ein Lesezeichen loescht, soll wieder
         * speichern koennen. */
        if (!bildWegwerfen()) {
          if (!vollGemeldet) {
            vollGemeldet = true;
            console.warn('Der Speicher ist voll – dieser Stand wird nicht gemerkt.');
          }
          return false;
        }
      }
    }
    return false;
  }

  /* Das aelteste noch vorhandene Vorschaubild verwerfen. */
  function bildWegwerfen() {
    for (var i = inhalt.lesezeichen.length - 1; i >= 0; i--) {
      if (inhalt.lesezeichen[i].bild) {
        inhalt.lesezeichen[i].bild = null;
        return true;
      }
    }
    return false;
  }

  function moeglich() {
    return geht;
  }

  return {
    laden: laden,
    standMerken: standMerken,
    standAnwenden: standAnwenden,
    lesezeichen: lesezeichen,
    merken: merken,
    vergessen: vergessen,
    moeglich: moeglich,
    HOECHSTENS: HOECHSTENS
  };
})();
