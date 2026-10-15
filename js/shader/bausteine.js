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
 * das Bild bleibt trotz Doppelmodus stufig.
 *
 * Dagegen stehen hier zwei Dinge:
 *
 *   1. Die Aufspaltungskonstante 4097 kommt als Uniform von aussen und steht
 *      nicht als Literal im Code.
 *   2. An jeder Stelle, an der ein Zwischenwert mathematisch gleich einem
 *      Eingabewert ist, steht `fest(...)` - eine Multiplikation mit einer
 *      Eins, die der Compiler nicht kennt. Am Wert aendert das nichts (mal
 *      eins ist in Gleitkomma exakt), aber die Kette ist unterbrochen: aus
 *      `s - (s - a)` darf nicht mehr `a` werden, weil er ueber `s` nichts
 *      mehr weiss.
 *
 * Ohne Punkt 2 rechnete die Emulation auf manchen Treibern heimlich doch nur
 * mit 32 Bit. Nachgemessen wird das beim Start (js/gl/Nachmessen.js) - was
 * dabei herauskommt, steht in der Seitenleiste.
 */
window.FRAKTAL = window.FRAKTAL || {};
FRAKTAL.Shader = FRAKTAL.Shader || {};

FRAKTAL.Shader.bausteine = `
uniform float u_split;        // 4097.0 = 2^12 + 1, siehe oben
uniform float u_eins;         // genau 1.0 - aber der Compiler weiss es nicht

/* Die Sperre. Mathematisch eine Multiplikation mit eins, also ohne jede
 * Wirkung auf den Wert - aber der Optimierer kann hinter u_eins nicht
 * schauen und muss den Zwischenwert ab hier als unbekannt behandeln. */
float fest(float x) {
  return x * u_eins;
}

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
  float s = fest(a.x + b.x);
  float v = fest(s - a.x);
  float e = (a.x - (s - v)) + (b.x - v);

  float t = e + a.y + b.y;
  float hoch = fest(s + t);
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
  float aTrenn = fest(a.x * u_split);
  float bTrenn = fest(b.x * u_split);
  float aHoch = fest(aTrenn - fest(aTrenn - a.x));
  float bHoch = fest(bTrenn - fest(bTrenn - b.x));
  float aTief = a.x - aHoch;
  float bTief = b.x - bHoch;

  float p = fest(a.x * b.x);
  float fehler = ((aHoch * bHoch - p) + aHoch * bTief + aTief * bHoch)
                 + aTief * bTief;

  // Die gemischten Glieder: hoch mal tief und umgekehrt.
  float kreuz = a.x * b.y + a.y * b.x;

  float s = fest(p + kreuz);
  float v = fest(s - p);
  float rest = (p - (s - v)) + (kreuz - v) + fehler + a.y * b.y;

  float hoch = fest(s + rest);
  float tief = rest - (hoch - s);
  return vec2(hoch, tief);
}
`;
