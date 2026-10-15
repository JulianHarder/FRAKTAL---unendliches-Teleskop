/* Die Farbpaletten - Daten, kein Code.
 *
 * Jede Palette ist eine Liste von Stuetzpunkten: Position (0 bis 1) und Farbe.
 * Dazwischen wird linear gemischt, daraus entsteht eine 1024 Pixel breite
 * Textur (siehe PalettenTextur.js). Eine neue Palette ist also ein Eintrag
 * hier und sonst nichts.
 *
 * `innen` ist die Farbe der Mandelbrot-Menge selbst. Reines Schwarz wirkt
 * neben kraeftigen Farben wie ein Loch - ein sehr dunkler Ton der Palette
 * sieht ruhiger aus.
 *
 * Die Textur wird gespiegelt wiederholt. Eine Palette muss also nicht am Ende
 * wieder bei der Anfangsfarbe landen - der Rueckweg entsteht von selbst, und
 * es gibt keine Naht.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Paletten = (function () {
  'use strict';

  var liste = [
    {
      name: 'feuer',
      titel: 'Feuer',
      innen: [10, 6, 14],
      stufen: [
        [0.00, [  8,   4,  18]],
        [0.20, [ 66,  10, 104]],
        [0.42, [147,  38, 103]],
        [0.62, [221,  81,  58]],
        [0.82, [252, 165,  10]],
        [1.00, [252, 255, 164]]
      ]
    },
    {
      name: 'eis',
      titel: 'Eis',
      innen: [6, 10, 20],
      stufen: [
        [0.00, [  4,   6,  15]],
        [0.25, [ 18,  58,  99]],
        [0.50, [ 47, 122, 181]],
        [0.75, [134, 199, 232]],
        [1.00, [234, 246, 255]]
      ]
    },
    {
      name: 'nordlicht',
      titel: 'Nordlicht',
      innen: [5, 14, 12],
      stufen: [
        [0.00, [  4,  16,  12]],
        [0.22, [ 11,  59,  46]],
        [0.46, [ 24, 120,  90]],
        [0.68, [ 87, 209, 143]],
        [0.86, [201, 255, 217]],
        [1.00, [159, 208, 255]]
      ]
    },
    {
      name: 'sonnenaufgang',
      titel: 'Sonnenaufgang',
      innen: [16, 6, 28],
      stufen: [
        [0.00, [ 26,   6,  51]],
        [0.28, [122,  27, 109]],
        [0.55, [212,  69, 107]],
        [0.80, [255, 154,  82]],
        [1.00, [255, 233, 168]]
      ]
    },
    {
      name: 'graustufen',
      titel: 'Graustufen',
      innen: [0, 0, 0],
      stufen: [
        [0.00, [  0,   0,   0]],
        [1.00, [255, 255, 255]]
      ]
    }
  ];

  function nach(name) {
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].name === name) return liste[i];
    }
    return liste[0];
  }

  /* Fuer die Vorschau auf den Knoepfen: dieselben Stuetzpunkte als CSS. */
  function alsVerlauf(palette) {
    var teile = palette.stufen.map(function (stufe) {
      var f = stufe[1];
      return 'rgb(' + f[0] + ',' + f[1] + ',' + f[2] + ') ' + (stufe[0] * 100) + '%';
    });
    return 'linear-gradient(to right, ' + teile.join(', ') + ')';
  }

  return { liste: liste, nach: nach, alsVerlauf: alsVerlauf };
})();
