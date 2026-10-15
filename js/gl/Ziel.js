/* Ein Zeichenziel neben dem Bildschirm: Framebuffer mit Textur dahinter.
 *
 * Gebraucht wird das von den Vorschaubildern der Lesezeichen und vom Export:
 * beide muessen ein Bild in einer anderen Groesse rechnen als die Leinwand
 * hat, ohne das Bild auf dem Schirm anzuruehren.
 *
 * Also wird nicht auf die Leinwand gezeichnet, sondern in einen eigenen
 * Puffer. Derselbe WebGL-Kontext, dieselben Shader, nur ein anderes Ziel -
 * ein zweiter Kontext waere deutlich teurer und muesste alles doppelt halten.
 *
 * `lesen()` holt die Pixel mit readPixels zurueck. Achtung: die Zeilen kommen
 * von unten. Wer sie in einen 2D-Canvas setzt, muss sie spiegeln.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Ziel = (function () {
  'use strict';

  /* Legt ein Ziel der Groesse breite x hoehe an.
   * `taugt` sagt, ob die Grafikkarte es angenommen hat - ist es false, muss
   * der Aufrufer ohne auskommen (die Vorschau bleibt dann leer). */
  function erzeugen(gl, breite, hoehe) {
    var textur = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textur);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, breite, hoehe, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, null);

    /* Diese vier Zeilen sind keine Kosmetik: eine Textur ohne Mipmap-Stufen
     * gilt als unvollstaendig, solange der Verkleinerungsfilter welche
     * verlangt - der Framebuffer wuerde dann gar nichts zeichnen. */
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Wieder loesen: auf Einheit 0 liegt sonst nicht mehr die Palette.
    gl.bindTexture(gl.TEXTURE_2D, null);

    var rahmen = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, rahmen);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                            gl.TEXTURE_2D, textur, 0);
    var taugt = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return {
      breite: breite,
      hoehe: hoehe,
      taugt: taugt,

      binden: function () { gl.bindFramebuffer(gl.FRAMEBUFFER, rahmen); },

      // Zurueck auf die Leinwand. Ohne das zeichnet das naechste Bild in den
      // Puffer statt auf den Bildschirm.
      loesen: function () { gl.bindFramebuffer(gl.FRAMEBUFFER, null); },

      lesen: function (puffer) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, rahmen);
        gl.readPixels(0, 0, breite, hoehe, gl.RGBA, gl.UNSIGNED_BYTE, puffer);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return puffer;
      },

      loeschen: function () {
        gl.deleteFramebuffer(rahmen);
        gl.deleteTexture(textur);
      }
    };
  }

  /* readPixels zaehlt die Zeilen von unten, jeder 2D-Canvas von oben. Wer
   * die Pixel in ein Bild uebernimmt, muss sie also spiegeln - sonst steht
   * das Ergebnis kopf. Das faellt bei einem Fraktal nicht unbedingt auf, und
   * genau deshalb steht es hier und nicht in jedem Aufrufer noch einmal. */
  function spiegeln(von, nach, breite, hoehe) {
    var zeile = breite * 4;
    for (var y = 0; y < hoehe; y++) {
      nach.set(von.subarray(y * zeile, y * zeile + zeile), (hoehe - 1 - y) * zeile);
    }
    return nach;
  }

  return { erzeugen: erzeugen, spiegeln: spiegeln };
})();
