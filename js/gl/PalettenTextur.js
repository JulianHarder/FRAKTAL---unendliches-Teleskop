/* Aus den Stuetzpunkten einer Palette wird eine Textur auf der Grafikkarte.
 *
 * Warum eine Textur und nicht Farben im Shader? Weil der Shader die Farbe dann
 * mit einem einzigen Zugriff bekommt, statt bei jedem Pixel durch eine Liste
 * von Stuetzpunkten zu laufen. Und weil die Grafikkarte zwischen den
 * Texturpunkten von sich aus weich mischt - genau das, was hier gebraucht wird.
 *
 * Die Wiederholung ist gespiegelt (MIRRORED_REPEAT): die Farbkoordinate darf
 * beliebig wachsen, die Palette laeuft vor und wieder zurueck. Mit einfacher
 * Wiederholung gaebe es an jeder Nahtstelle eine harte Kante im Bild.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.PalettenTextur = (function () {
  'use strict';

  var BREITE = 1024;

  var gl = null;
  var textur = null;
  var palette = null;

  function starten(grafik) {
    gl = grafik;
    textur = null;
    if (palette) waehlen(palette.name);
  }

  /* Palette wechseln - die alte Textur wird freigegeben. */
  function waehlen(name) {
    palette = FRAKTAL.Paletten.nach(name);
    if (!gl) return palette;

    if (textur) gl.deleteTexture(textur);
    textur = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, textur);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, BREITE, 1, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, ausmalen(palette));

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return palette;
  }

  /* Die Stuetzpunkte zu 1024 Farbwerten ausrechnen. */
  function ausmalen(p) {
    var daten = new Uint8Array(BREITE * 4);
    var stufen = p.stufen;

    for (var x = 0; x < BREITE; x++) {
      var anteil = x / (BREITE - 1);

      // Das Paar Stuetzpunkte finden, zwischen denen dieser Punkt liegt.
      var i = 0;
      while (i < stufen.length - 2 && stufen[i + 1][0] < anteil) i++;

      var von = stufen[i];
      var bis = stufen[i + 1] || von;
      var spanne = bis[0] - von[0];
      var mischung = spanne > 0 ? (anteil - von[0]) / spanne : 0;
      if (mischung < 0) mischung = 0;
      if (mischung > 1) mischung = 1;

      var ziel = x * 4;
      daten[ziel] = Math.round(von[1][0] + (bis[1][0] - von[1][0]) * mischung);
      daten[ziel + 1] = Math.round(von[1][1] + (bis[1][1] - von[1][1]) * mischung);
      daten[ziel + 2] = Math.round(von[1][2] + (bis[1][2] - von[1][2]) * mischung);
      daten[ziel + 3] = 255;
    }
    return daten;
  }

  /* Vor dem Zeichnen auf Einheit 0 legen. */
  function binden() {
    if (!textur) return false;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textur);
    return true;
  }

  function aktuell() {
    return palette || FRAKTAL.Paletten.liste[0];
  }

  return {
    starten: starten,
    waehlen: waehlen,
    binden: binden,
    aktuell: aktuell,
    BREITE: BREITE
  };
})();
