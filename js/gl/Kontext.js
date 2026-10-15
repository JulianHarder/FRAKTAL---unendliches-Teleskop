/* Den WebGL2-Kontext holen und am Leben halten.
 *
 * Zwei Dinge koennen schiefgehen, und beide muss die Seite ueberleben:
 *   1. Der Browser kann kein WebGL2 -> ehrlicher Hinweis statt schwarzes Bild.
 *   2. Der Treiber wirft den Kontext weg, weil ein Bild zu lange gerechnet hat
 *      ("context lost"). Dann muessen Programme und Texturen neu gebaut werden.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Kontext = (function () {
  'use strict';

  /* Liefert den Kontext oder null. Bei null zeigt main.js den Hinweis. */
  function erzeugen(leinwand) {
    var moeglichkeiten = {
      alpha: false,              // kein Durchblick nach unten -> schneller
      depth: false,              // ein Fraktal hat keine Tiefe
      stencil: false,
      antialias: false,          // Kanten glaetten wir selbst im Shader
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      desynchronized: true
    };

    var gl = null;
    try {
      gl = leinwand.getContext('webgl2', moeglichkeiten);
    } catch (fehler) {
      gl = null;
    }
    return gl || null;
  }

  /* Auf Kontextverlust reagieren. `neuAufbauen` wird aufgerufen, sobald der
   * Kontext zurueck ist - dort muessen Programme und Texturen neu entstehen. */
  function ueberwachen(leinwand, neuAufbauen) {
    leinwand.addEventListener('webglcontextlost', function (ereignis) {
      // Ohne preventDefault stellt der Browser den Kontext nie wieder her.
      ereignis.preventDefault();
      console.warn('WebGL-Kontext verloren - warte auf Wiederherstellung.');
    }, false);

    leinwand.addEventListener('webglcontextrestored', function () {
      console.info('WebGL-Kontext wieder da - baue neu auf.');
      neuAufbauen();
    }, false);
  }

  /* Was die Grafikkarte hergibt. Die Werte landen spaeter in der Hilfe und
   * entscheiden, ob der Doppelgenauigkeits-Modus ueberhaupt Sinn hat. */
  function faehigkeiten(gl) {
    var genauigkeit = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    return {
      maxViewport: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      maxTextur: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      highpBits: genauigkeit ? genauigkeit.precision : 0,
      renderer: leseName(gl)
    };
  }

  function leseName(gl) {
    var info = gl.getExtension('WEBGL_debug_renderer_info');
    if (!info) return 'unbekannt';
    return gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || 'unbekannt';
  }

  return {
    erzeugen: erzeugen,
    ueberwachen: ueberwachen,
    faehigkeiten: faehigkeiten
  };
})();
