/* Eigene Lesezeichen: Taste B, und die Stelle ist gemerkt.
 *
 * Mit Vorschaubild, denn eine Liste aus "Zoom 2,4e6" und "Zoom 8,1e6" sagt
 * nach drei Tagen nichts mehr - das Bild schon. Es wird auf der Grafikkarte
 * gerechnet (96x64 in ein eigenes Ziel) und als JPEG in den Speicher gelegt.
 *
 * Klein bleiben muss es, weil localStorage bei rund 5 MB zu ist: 96x64 als
 * JPEG sind etwa 2 KB, zwei Dutzend davon also 50 KB. Laeuft es trotzdem
 * voll, wirft js/kern/Speicher.js das aelteste Bild weg und behaelt den
 * Eintrag - lieber ohne Bild als verloren.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Lesezeichen = (function () {
  'use strict';

  var z = FRAKTAL.Zustand;

  var BREITE = 96;
  var HOEHE = 64;
  var GUETE = 0.72;          // JPEG - darunter wird das Fraktal matschig

  var behaelter = null;
  var hinweis = null;
  var maler = null;          // 2D-Canvas, nur zum Umwandeln in ein JPEG
  var ziel = null;           // Zeichenziel auf der Grafikkarte
  var puffer = null;
  var bild = null;
  var beiAenderung = function () {};

  function starten(gl, rueckruf) {
    behaelter = document.getElementById('lesezeichen-liste');
    hinweis = document.getElementById('lesezeichen-hinweis');
    beiAenderung = rueckruf || function () {};
    if (!behaelter) return;

    maler = document.createElement('canvas');
    maler.width = BREITE;
    maler.height = HOEHE;
    bild = maler.getContext('2d').createImageData(BREITE, HOEHE);

    ziel = FRAKTAL.Ziel.erzeugen(gl, BREITE, HOEHE);
    puffer = new Uint8Array(BREITE * HOEHE * 4);

    auflisten();
  }

  /* Taste B. Der Zoomfaktor steht als Vorschlag im Feld - wer nur bestaetigt,
   * hat wenigstens die Tiefe im Namen. */
  function setzen() {
    var vorschlag = vorschlagsname();
    var name = window.prompt('Name für das Lesezeichen:', vorschlag);
    if (name === null) return null;        // abgebrochen

    name = (name || vorschlag).trim().slice(0, 60) || vorschlag;

    var eintrag = FRAKTAL.Speicher.merken({
      name: name,
      re: z.ansicht.mitteRe,
      im: z.ansicht.mitteIm,
      log2Zoom: z.ansicht.log2Zoom,
      menge: z.menge,
      juliaRe: z.julia.re,
      juliaIm: z.julia.im,
      palette: z.regler.palette,
      bild: vorschaubild()
    });

    auflisten();
    FRAKTAL.Meldung.zeigen('Lesezeichen „' + name + '“ gesetzt.');
    return eintrag;
  }

  function vorschlagsname() {
    var zoom = Math.pow(2, z.ansicht.log2Zoom);
    var text = zoom < 10000
      ? 'Zoom ' + zoom.toLocaleString('de-DE', { maximumFractionDigits: 0 })
      : 'Zoom ' + zoom.toExponential(1).replace('.', ',').replace('e+', 'e');
    return z.menge === 'julia' ? 'Julia, ' + text : text;
  }

  /* Das Vorschaubild. Mit Kantenglaettung, weil 96x64 jede Treppe zeigt. */
  function vorschaubild() {
    if (!ziel || !ziel.taugt) return null;

    var weltHoehe = z.BASIS_HOEHE / Math.pow(2, z.ansicht.log2Zoom);
    var gelang = FRAKTAL.Zeichner.inZiel(ziel, {
      breite: BREITE,
      hoehe: HOEHE,
      mitteRe: z.ansicht.mitteRe,
      mitteIm: z.ansicht.mitteIm,
      skala: weltHoehe / HOEHE,
      iterationen: FRAKTAL.Iterationen.fuer(z.ansicht.log2Zoom, z.regler.qualitaet),
      proben: 2,
      julia: z.menge === 'julia',
      cRe: z.julia.re,
      cIm: z.julia.im
    });
    if (!gelang) return null;

    ziel.lesen(puffer);
    FRAKTAL.Ziel.spiegeln(puffer, bild.data, BREITE, HOEHE);
    maler.getContext('2d').putImageData(bild, 0, 0);

    try {
      return maler.toDataURL('image/jpeg', GUETE);
    } catch (fehler) {
      return null;     // manche Browser verweigern toDataURL ueber file://
    }
  }

  /* Hin zum Lesezeichen - geflogen, wie zu den berühmten Stellen auch. */
  function anfliegen(eintrag) {
    FRAKTAL.Dauerzoom.aus();

    // Ein Lesezeichen aus einer Julia-Menge bringt sein festes c mit.
    if (eintrag.menge === 'julia') FRAKTAL.Menge.nachJulia(eintrag.juliaRe, eintrag.juliaIm);
    else if (FRAKTAL.Menge.istJulia()) FRAKTAL.Menge.nachMandelbrot();

    if (eintrag.palette) FRAKTAL.Farbwahl.waehlen(eintrag.palette);

    FRAKTAL.Kamera.hinfliegen({
      mitteRe: eintrag.re,
      mitteIm: eintrag.im,
      log2Zoom: eintrag.log2Zoom
    });
    FRAKTAL.Meldung.zeigen(eintrag.name);
    beiAenderung();
  }

  function auflisten() {
    if (!behaelter) return;
    behaelter.innerHTML = '';

    var liste = FRAKTAL.Speicher.lesezeichen();

    if (!FRAKTAL.Speicher.moeglich()) {
      hinweis.textContent = 'Dieser Browser lässt nichts speichern – Lesezeichen '
        + 'wären beim nächsten Laden wieder weg.';
      hinweis.hidden = false;
      return;
    }

    hinweis.textContent = 'Noch keine. Mit B merkst du dir diese Stelle – '
      + 'höchstens ' + FRAKTAL.Speicher.HOECHSTENS + ' Stück.';
    hinweis.hidden = liste.length > 0;

    liste.forEach(function (eintrag) {
      behaelter.appendChild(zeileBauen(eintrag));
    });
  }

  function zeileBauen(eintrag) {
    var zeile = document.createElement('div');
    zeile.className = 'lesezeichen';

    var knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'lesezeichen-ziel';
    knopf.title = 'Hinfliegen';

    if (eintrag.bild) {
      var vorschau = document.createElement('img');
      vorschau.src = eintrag.bild;
      vorschau.alt = '';
      knopf.appendChild(vorschau);
    }

    var text = document.createElement('span');
    var name = document.createElement('b');
    name.textContent = eintrag.name;
    var unten = document.createElement('i');
    unten.textContent = zoomText(eintrag.log2Zoom)
      + (eintrag.menge === 'julia' ? ' · Julia' : '');
    text.appendChild(name);
    text.appendChild(unten);
    knopf.appendChild(text);
    knopf.addEventListener('click', function () { anfliegen(eintrag); });

    var weg = document.createElement('button');
    weg.type = 'button';
    weg.className = 'lesezeichen-weg';
    weg.textContent = '×';
    weg.title = 'Lesezeichen löschen';
    weg.addEventListener('click', function () {
      FRAKTAL.Speicher.vergessen(eintrag.id);
      auflisten();
    });

    zeile.appendChild(knopf);
    zeile.appendChild(weg);
    return zeile;
  }

  function zoomText(log2Zoom) {
    var zoom = Math.pow(2, log2Zoom);
    if (zoom < 10000) return zoom.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' ×';
    return zoom.toExponential(1).replace('.', ',').replace('e+', 'e');
  }

  return { starten: starten, setzen: setzen, auflisten: auflisten };
})();
