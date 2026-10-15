/* Das Bild als PNG sichern.
 *
 * Nicht die Leinwand abfotografiert - die hat die Fenstergroesse und ist im
 * Grobbild vielleicht gerade halb aufgeloest. Gerechnet wird neu, in der
 * gewuenschten Groesse, mit doppelter Iterationstiefe und Kantenglaettung.
 * Das dauert tief drinnen einige Sekunden, deshalb der Fortschrittsbalken:
 * ein Knopf, der nichts tut und nach zehn Sekunden eine Datei ausspuckt,
 * sieht aus wie ein Fehler.
 *
 * Gerechnet wird in Kacheln (js/gl/Kachel.js). Zusammengesetzt wird das Bild
 * in einem gewoehnlichen 2D-Canvas, der es am Ende als PNG ausgibt.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Export = (function () {
  'use strict';

  var z = FRAKTAL.Zustand;

  /* Die Tiefe wird fuer den Export verdoppelt: ein Bild, das man sich
   * aufhebt, darf laenger rechnen als eines, durch das man fliegt. */
  var TIEFER = 2;

  var GROESSEN = [
    { titel: 'Fenster', breite: 0, hoehe: 0 },
    { titel: 'Full HD', breite: 1920, hoehe: 1080 },
    { titel: 'WQHD', breite: 2560, hoehe: 1440 },
    { titel: '4K', breite: 3840, hoehe: 2160 }
  ];

  var gl = null;
  var knoepfe = [];
  var balken = null;
  var balkenRahmen = null;
  var stand = null;
  var abbruchKnopf = null;
  var lauf = null;

  function starten(grafik) {
    gl = grafik;

    var behaelter = document.getElementById('export-liste');
    if (!behaelter) return;
    behaelter.innerHTML = '';
    knoepfe = [];

    GROESSEN.forEach(function (groesse) {
      var knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'export';
      knopf.textContent = groesse.titel;
      knopf.addEventListener('click', function () { sichern(groesse); });
      behaelter.appendChild(knopf);
      knoepfe.push(knopf);
    });

    balkenRahmen = document.getElementById('export-balken-rahmen');
    balken = document.getElementById('export-balken');
    stand = document.getElementById('export-stand');
    abbruchKnopf = document.getElementById('knopf-export-abbrechen');
    abbruchKnopf.addEventListener('click', abbrechen);
    ruhe();
  }

  /* Die Zielgroesse in Pixeln. "Fenster" meint die Leinwand so, wie sie
   * gerade dasteht - mal der Pixeldichte, sonst kaeme auf einem feinen
   * Bildschirm ein kleineres Bild heraus als das, was man sieht. */
  function masse(groesse) {
    if (groesse.breite && groesse.hoehe) {
      return { breite: groesse.breite, hoehe: groesse.hoehe };
    }
    var dichte = Math.min(2, window.devicePixelRatio || 1);
    var leinwand = document.getElementById('leinwand');
    return {
      breite: Math.max(1, Math.round(leinwand.clientWidth * dichte)),
      hoehe: Math.max(1, Math.round(leinwand.clientHeight * dichte))
    };
  }

  function sichern(groesse) {
    if (lauf) return;

    var mass = masse(groesse);

    /* Die Hoehe bestimmt den Ausschnitt: was oben und unten zu sehen war,
     * ist auch im Bild zu sehen. Bei einem anderen Seitenverhaeltnis wird
     * seitlich mehr oder weniger - das ist die Erwartung, die man an einen
     * Bildschirmausschnitt hat. */
    var skala = z.sichtHoehe() / mass.hoehe;

    knoepfeSperren(true);
    FRAKTAL.Meldung.zeigen('Bild wird gerechnet: ' + mass.breite + ' × ' + mass.hoehe
      + ' Pixel, ' + FRAKTAL.Kachel.anzahl(mass.breite, mass.hoehe) + ' Kacheln.');

    lauf = FRAKTAL.Kachel.malen(gl, {
      breite: mass.breite,
      hoehe: mass.hoehe,
      mitteRe: z.ansicht.mitteRe,
      mitteIm: z.ansicht.mitteIm,
      skala: skala,
      iterationen: FRAKTAL.Iterationen.fuer(z.ansicht.log2Zoom, z.regler.qualitaet * TIEFER),
      proben: 2,
      // Immer der genaue Weg: siehe inZiel in js/ansicht/Zeichner.js.
      doppelt: true
    }, fortschritt, function (leinwand) {
      lauf = null;
      knoepfeSperren(false);
      if (!leinwand) { ruhe('Abgebrochen.'); return; }
      ausgeben(leinwand, mass);
    });
  }

  function fortschritt(getan, gesamt) {
    balkenRahmen.hidden = false;
    abbruchKnopf.hidden = false;
    balken.style.width = Math.round(getan / gesamt * 100) + '%';
    stand.textContent = 'Kachel ' + getan + ' von ' + gesamt;
  }

  function ruhe(text) {
    if (!balkenRahmen) return;
    balkenRahmen.hidden = true;
    abbruchKnopf.hidden = true;
    balken.style.width = '0%';
    stand.textContent = text || '';
  }

  function abbrechen() {
    if (lauf) lauf.abbrechen();
  }

  /* Aus dem fertigen Canvas eine Datei machen.
   *
   * `toBlob` statt `toDataURL`: ein 4K-Bild als Zeichenkette waere rund
   * 30 MB Text im Speicher, und manche Browser steigen bei langen
   * data:-Adressen aus. */
  function ausgeben(leinwand, mass) {
    stand.textContent = 'Wird gepackt …';

    try {
      leinwand.toBlob(function (blob) {
        if (!blob) { ruhe('Das Packen hat nicht geklappt.'); return; }

        var adresse = URL.createObjectURL(blob);
        var verweis = document.createElement('a');
        verweis.href = adresse;
        verweis.download = dateiname();
        document.body.appendChild(verweis);
        verweis.click();
        document.body.removeChild(verweis);
        // Erst spaeter freigeben, sonst ist die Datei weg, bevor sie liegt.
        window.setTimeout(function () { URL.revokeObjectURL(adresse); }, 20000);

        ruhe();
        FRAKTAL.Meldung.zeigen('Bild gesichert: ' + mass.breite + ' × ' + mass.hoehe
          + ' Pixel, ' + Math.round(blob.size / 1024) + ' KB.');
      }, 'image/png');
    } catch (fehler) {
      ruhe('Dieser Browser gibt das Bild nicht heraus.');
    }
  }

  /* Ein Name, in dem die Stelle steht - sonst heissen nach einer Woche alle
   * Dateien gleich und keine laesst sich wiederfinden. */
  function dateiname() {
    var zoom = Math.pow(2, z.ansicht.log2Zoom);
    var teile = [
      'fraktal',
      'z' + zoom.toExponential(1).replace('+', ''),
      zahl(z.ansicht.mitteRe),
      zahl(z.ansicht.mitteIm) + 'i'
    ];
    return teile.join('_').replace(/[^a-zA-Z0-9_.\-]/g, '') + '.png';
  }

  function zahl(wert) {
    return (wert < 0 ? 'm' : '') + Math.abs(wert).toFixed(9);
  }

  function knoepfeSperren(gesperrt) {
    knoepfe.forEach(function (knopf) { knopf.disabled = gesperrt; });
  }

  function laeuft() {
    return !!lauf;
  }

  return { starten: starten, sichern: sichern, abbrechen: abbrechen, laeuft: laeuft };
})();
