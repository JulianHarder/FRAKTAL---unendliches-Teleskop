/* Die Leinwand: Groesse, Pixeldichte und das Dreieck, auf das gezeichnet wird.
 *
 * Es gibt keine Geometrie in diesem Projekt. Gezeichnet wird ein einziges
 * Dreieck, das den ganzen Bildschirm ueberdeckt; die Eckpunkte entstehen im
 * Vertex-Shader aus `gl_VertexID`, es gibt also gar keinen Puffer. Jedes Pixel
 * darin ist ein Punkt der komplexen Ebene - die Arbeit macht der Fragment-Shader.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Leinwand = (function () {
  'use strict';

  var gl = null;
  var leinwand = null;
  var vao = null;

  var breite = 1;      // Pixel im Zeichenpuffer (nicht CSS-Pixel)
  var hoehe = 1;

  function starten(grafik, element) {
    gl = grafik;
    leinwand = element;
    // WebGL2 verlangt ein gebundenes Vertex-Array, auch wenn es leer ist.
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
  }

  /* Puffergroesse an das Fenster anpassen.
   * `skalierung` < 1 rechnet absichtlich grob (waehrend der Bewegung),
   * `skalierung` 1 ist volle Aufloesung.
   * Gibt true zurueck, wenn sich die Groesse geaendert hat. */
  function groesseAnpassen(skalierung) {
    var dichte = window.devicePixelRatio || 1;
    // Ueber 2 bringt kein sichtbares Plus, kostet aber das Vierfache.
    if (dichte > 2) dichte = 2;

    var zielBreite = Math.max(1, Math.round(leinwand.clientWidth * dichte * skalierung));
    var zielHoehe = Math.max(1, Math.round(leinwand.clientHeight * dichte * skalierung));

    if (zielBreite === breite && zielHoehe === hoehe) return false;

    breite = zielBreite;
    hoehe = zielHoehe;
    leinwand.width = breite;
    leinwand.height = hoehe;
    return true;
  }

  /* Das Vollbild-Dreieck zeichnen. Drei Eckpunkte, kein Puffer.
   *
   * Ohne Argumente gilt die Leinwand. Die beiden Masse gibt nur an, wer in
   * ein anderes Ziel zeichnet (js/gl/Ziel.js) - ein Vorschaubild oder eine
   * Exportkachel, die eine andere Groesse haben als das Fenster. */
  function zeichnen(inBreite, inHoehe) {
    gl.bindVertexArray(vao);
    gl.viewport(0, 0, inBreite || breite, inHoehe || hoehe);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function groesse() {
    return { breite: breite, hoehe: hoehe };
  }

  /* Die Hoehe bei voller Aufloesung, auch waehrend gerade grob gezeichnet
   * wird. Die Genauigkeitsgrenze haengt an der echten Pixelgroesse - mit der
   * halbierten Grobhoehe saehe es nach einer halben Stelle mehr aus, als das
   * fertige Bild traegt. */
  function volleHoehe() {
    var dichte = Math.min(2, window.devicePixelRatio || 1);
    return Math.max(1, Math.round(leinwand.clientHeight * dichte));
  }

  /* Seitenverhaeltnis des Zeichenpuffers - die Kamera rechnet damit. */
  function verhaeltnis() {
    return breite / hoehe;
  }

  return {
    starten: starten,
    groesseAnpassen: groesseAnpassen,
    zeichnen: zeichnen,
    groesse: groesse,
    volleHoehe: volleHoehe,
    verhaeltnis: verhaeltnis
  };
})();
