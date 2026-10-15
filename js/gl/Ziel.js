/* Ein Zeichenziel neben dem Bildschirm: Framebuffer mit Textur dahinter.
 *
 * Gebraucht wird das fuer die Julia-Vorschau. Die soll dem Mauszeiger folgen,
 * auch wenn das Hauptbild gerade still steht - und das Hauptbild darf dafuer
 * nicht neu gerechnet werden: tief drinnen kostet es eine halbe Sekunde, die
 * Vorschau waere dann ein Ruckelbild und das Fraktal dauernd grob.
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

  return { erzeugen: erzeugen };
})();
