/* Vertex-Shader: erzeugt das Vollbild-Dreieck ohne jeden Puffer.
 *
 * Drei Eckpunkte, die aus der Nummer des Eckpunkts (`gl_VertexID`) berechnet
 * werden: (0,0), (2,0), (0,2) im Einheitsquadrat, mal zwei minus eins ergibt
 * (-1,-1), (3,-1), (-1,3). Das Dreieck ist groesser als der Bildschirm und
 * ueberdeckt ihn damit vollstaendig - billiger als zwei Dreiecke fuer ein
 * Rechteck, weil jedes Pixel nur einmal angefasst wird.
 *
 * `#version 300 es` MUSS die erste Zeile sein, ohne Leerzeichen davor.
 */
window.FRAKTAL = window.FRAKTAL || {};
FRAKTAL.Shader = FRAKTAL.Shader || {};

FRAKTAL.Shader.vertex = `#version 300 es

void main() {
  vec2 ecke = vec2(
    float((gl_VertexID << 1) & 2),
    float(gl_VertexID & 2)
  );
  gl_Position = vec4(ecke * 2.0 - 1.0, 0.0, 1.0);
}
`;
