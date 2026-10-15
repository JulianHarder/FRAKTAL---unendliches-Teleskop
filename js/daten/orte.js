/* Beruehmte Stellen in der Mandelbrot-Menge - Daten, kein Code.
 *
 * Ohne diese Liste findet man tief drinnen nichts: die interessanten Stellen
 * sind winzig, und wer zufaellig zoomt, landet fast immer im Schwarzen oder
 * im leeren Aussenfeld. Die Namen sind die, die sich seit den Achtzigern
 * eingebuergert haben.
 *
 * `zoom` ist der gewoehnliche Zoomfaktor, nicht der Logarithmus - so steht
 * hier eine Zahl, die man im Bild wiedererkennt. Umgerechnet wird beim
 * Hinfliegen.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Orte = (function () {
  'use strict';

  var liste = [
    {
      name: 'uebersicht',
      titel: 'Ganze Menge',
      re: -0.6, im: 0.0, zoom: 1,
      satz: 'Der Apfel mit seinen Knospen – von hier geht jede Reise los.'
    },
    {
      name: 'seepferdchen',
      titel: 'Seepferdchen-Tal',
      re: -0.7435, im: 0.1314, zoom: 400,
      satz: 'In der Kerbe zwischen Kopf und Koerper draengen sich Figuren, '
        + 'die aussehen wie aufgerollte Seepferdchen.'
    },
    {
      name: 'elefanten',
      titel: 'Elefanten-Prozession',
      re: 0.2750, im: 0.0060, zoom: 1500,
      satz: 'Am rechten Rand zieht eine Reihe von Ruesseln vorbei, einer '
        + 'immer kleiner als der vorige.'
    },
    {
      name: 'tripelspirale',
      titel: 'Tripelspirale',
      re: -0.0889, im: 0.6546, zoom: 1500,
      satz: 'Arme, die sich ineinander drehen – und in jedem Arm sitzt die '
        + 'Figur noch einmal.'
    },
    {
      name: 'zepter',
      titel: 'Zepter-Tal',
      re: -1.768778833, im: 0.001738996, zoom: 1000,
      satz: 'Weit links, am dünnen Stiel der Menge: eine Figur wie ein Zepter, '
        + 'mit Schaft und verziertem Kopf.'
    },
    {
      name: 'mini',
      titel: 'Mini-Mandelbrot',
      re: -0.743643887037151, im: 0.131825904205330, zoom: 5e5,
      satz: 'Eine halbe Million Mal vergrößert sitzt hier die ganze Menge noch '
        + 'einmal – die Probe darauf, dass es wirklich nicht aufhört. So tief '
        + 'rechnet nur noch die Doppelgenauigkeit scharf.'
    }
  ];

  function nach(name) {
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].name === name) return liste[i];
    }
    return null;
  }

  /* Als Kamerastand, also mit dem Zoom im Zweierlogarithmus. */
  function alsStand(ort) {
    return {
      mitteRe: ort.re,
      mitteIm: ort.im,
      log2Zoom: Math.log2(ort.zoom)
    };
  }

  return { liste: liste, nach: nach, alsStand: alsStand };
})();
