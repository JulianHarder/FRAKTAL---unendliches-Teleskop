/* Doppelgenauigkeit auf einer Grafikkarte, die nur 32 Bit kann.
 *
 * Eine Zahl wird als Summe zweier floats gefuehrt: vec2(hoch, tief). `hoch`
 * traegt die ersten rund sieben Stellen, `tief` die naechsten sieben. Zusammen
 * sind es etwa 14 - genug, um statt bei Zoom 1e4 erst bei 1e10 an die Grenze
 * zu stossen.
 *
 * Die Verfahren stammen von Dekker und Knuth und sind ueber fuenfzig Jahre
 * alt. Ihr Kniff: bei jeder Rechnung wird nicht nur das Ergebnis, sondern auch
 * der Rundungsfehler bestimmt - und der wandert in den `tief`-Teil.
 *
 * ACHTUNG, hier lauert die groesste Falle des Projekts: die Fehlerterme
 * entstehen aus Ausdruecken, die mathematisch null sind, etwa (a+b)-a-b. Ein
 * Compiler, der Gleitkomma wie Schulmathematik behandelt, kuerzt sie weg - und
 * das Bild bleibt trotz Doppelmodus stufig. Deshalb kommt die
 * Aufspaltungskonstante 4097 als Uniform von aussen und steht nicht als
 * Literal im Code: so kann sie nicht wegoptimiert werden.
 */
window.FRAKTAL = window.FRAKTAL || {};
FRAKTAL.Shader = FRAKTAL.Shader || {};

FRAKTAL.Shader.bausteine = `
uniform float u_split;        // 4097.0 = 2^12 + 1, siehe oben

/* Eine gewoehnliche Zahl als Doppelzahl. */
vec2 dfVon(float x) {
  return vec2(x, 0.0);
}

/* Summe zweier Doppelzahlen.
 *
 * s ist die gewoehnliche Summe der hohen Teile, e der Fehler, den sie dabei
 * macht. e wird zusammen mit den tiefen Teilen aufgesammelt und das Ergebnis
 * zum Schluss wieder in hoch/tief sortiert. */
vec2 dfAdd(vec2 a, vec2 b) {
  float s = a.x + b.x;
  float v = s - a.x;
  float e = (a.x - (s - v)) + (b.x - v);

  float t = e + a.y + b.y;
  float hoch = s + t;
  float tief = t - (hoch - s);
  return vec2(hoch, tief);
}

vec2 dfSub(vec2 a, vec2 b) {
  return dfAdd(a, -b);          // negiert beide Teile, das ist richtig so
}

/* Produkt zweier Doppelzahlen.
 *
 * Der Kern ist Dekkers Trick: jeder hohe Teil wird in zwei Haelften mit je
 * zwoelf Mantissenbits zerlegt. Deren Teilprodukte passen exakt in 32 Bit,
 * und aus ihnen laesst sich der Fehler des gewoehnlichen Produkts genau
 * bestimmen. */
vec2 dfMul(vec2 a, vec2 b) {
  float aTrenn = a.x * u_split;
  float bTrenn = b.x * u_split;
  float aHoch = aTrenn - (aTrenn - a.x);
  float bHoch = bTrenn - (bTrenn - b.x);
  float aTief = a.x - aHoch;
  float bTief = b.x - bHoch;

  float p = a.x * b.x;
  float fehler = ((aHoch * bHoch - p) + aHoch * bTief + aTief * bHoch)
                 + aTief * bTief;

  // Die gemischten Glieder: hoch mal tief und umgekehrt.
  float kreuz = a.x * b.y + a.y * b.x;

  float s = p + kreuz;
  float v = s - p;
  float rest = (p - (s - v)) + (kreuz - v) + fehler + a.y * b.y;

  float hoch = s + rest;
  float tief = rest - (hoch - s);
  return vec2(hoch, tief);
}
`;
