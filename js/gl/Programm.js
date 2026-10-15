/* Shader kompilieren, linken und die Uniform-Plaetze merken.
 *
 * Die Uniform-Plaetze werden einmal gesucht und behalten: `getUniformLocation`
 * pro Bild aufzurufen kostet unnoetig Zeit, und es sind nur eine Handvoll.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Programm = (function () {
  'use strict';

  /* Baut ein Programm aus zwei Quelltexten.
   * Gibt { programm, benutzen(), ort(name) } zurueck oder wirft mit dem
   * Fehlertext des Compilers - der ist beim Shader-Schreiben Gold wert. */
  function bauen(gl, quelleVertex, quelleFragment) {
    var vertex = uebersetzen(gl, gl.VERTEX_SHADER, quelleVertex);
    var fragment = uebersetzen(gl, gl.FRAGMENT_SHADER, quelleFragment);

    var programm = gl.createProgram();
    gl.attachShader(programm, vertex);
    gl.attachShader(programm, fragment);
    gl.linkProgram(programm);

    // Die Shader-Objekte selbst braucht niemand mehr, sobald gelinkt ist.
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    if (!gl.getProgramParameter(programm, gl.LINK_STATUS)) {
      var fehler = gl.getProgramInfoLog(programm);
      gl.deleteProgram(programm);
      throw new Error('Programm nicht gelinkt:\n' + fehler);
    }

    var plaetze = {};

    function ort(name) {
      if (!(name in plaetze)) plaetze[name] = gl.getUniformLocation(programm, name);
      return plaetze[name];
    }

    return {
      programm: programm,
      benutzen: function () { gl.useProgram(programm); },
      ort: ort,
      loeschen: function () { gl.deleteProgram(programm); }
    };
  }

  function uebersetzen(gl, art, quelle) {
    var shader = gl.createShader(art);
    gl.shaderSource(shader, quelle);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var fehler = gl.getShaderInfoLog(shader);
      var name = art === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
      gl.deleteShader(shader);
      throw new Error(name + '-Shader:\n' + fehler + '\n\n' + mitZeilennummern(quelle));
    }
    return shader;
  }

  /* Der Compiler meldet Zeilennummern. Ohne Nummern im Ausdruck sucht man
   * sich die Stelle in einem zusammengesetzten Shader lange. */
  function mitZeilennummern(quelle) {
    return quelle.split('\n').map(function (zeile, i) {
      return String(i + 1).padStart(3, ' ') + ' | ' + zeile;
    }).join('\n');
  }

  return { bauen: bauen };
})();
