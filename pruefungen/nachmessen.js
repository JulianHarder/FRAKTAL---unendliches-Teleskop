// Prueft, was FRAKTAL beim Start aus der Messung auf der Grafikkarte macht.
// Die Messung selbst braucht eine Karte; ihre Auswertung nicht - und die
// entscheidet darueber, ob die Oberflaeche hinterher die Wahrheit sagt.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
// Relativ zur eigenen Lage - damit die Pruefung in jedem Klon laeuft.
const ordner = path.join(__dirname, '..', 'js') + path.sep;

const kontext = { Math, console, Float32Array, Uint8Array, String, isFinite };
kontext.window = kontext;
kontext.globalThis = kontext;
kontext.window.addEventListener = () => {};
vm.createContext(kontext);

for (const d of ['kern/Zahl.js', 'shader/vertex.js', 'shader/bausteine.js',
                 'gl/Nachmessen.js']) {
  vm.runInContext(fs.readFileSync(ordner + d, 'utf8'), kontext, { filename: d });
}
const F = kontext.FRAKTAL;

let fehler = 0;
function pruefe(name, ok, zusatz) {
  console.log((ok ? 'OK   ' : 'FEHL ') + name + (zusatz ? '  ' + zusatz : ''));
  if (!ok) fehler++;
}

/* So kodiert der Shader eine Zahl in drei Farbkanaele (siehe Nachmessen.js).
 * Hier herum gerechnet, um der Auswertung gestellte Messwerte vorzulegen. */
function kodieren(verhaeltnis) {
  let v = Math.min(0.99999988, Math.max(0, verhaeltnis * 0.5));
  const a = Math.floor(v * 256);
  const r1 = v * 256 - a;
  const b = Math.floor(r1 * 256);
  const r2 = r1 * 256 - b;
  return [a, b, Math.floor(r2 * 256), 255];
}

/* Eine gestellte Grafikkarte: sie gibt genau die Verhaeltnisse zurueck, die
 * man ihr vorgibt. `bis` ist die feinste Stufe, die sie noch auffloest. */
function karteMit(bis) {
  const werte = F.Nachmessen.STUFEN.map((k) => (k + 1 <= bis ? 1.0 : 0.0));
  const pixel = [];
  werte.forEach((v) => kodieren(v).forEach((b) => pixel.push(b)));

  F.Programm = { bauen: () => ({ benutzen() {}, ort: (n) => n, loeschen() {} }) };
  F.Ziel = {
    erzeugen: () => ({
      breite: werte.length, hoehe: 1, taugt: true,
      binden() {}, loesen() {}, loeschen() {},
      lesen: (puffer) => { puffer.set(pixel); return puffer; },
    }),
  };
  F.Leinwand = { zeichnen() {} };
  const gl = { uniform1f() {}, uniform2f() {}, uniform2fv() {} };
  return F.Nachmessen.doppelt(gl);
}

// 1. Eine Karte, die alles traegt.
let mass = karteMit(48);
pruefe('Eine ordentliche Karte wird als solche erkannt', mass && mass.bits === 48,
  mass ? mass.bits + ' Bit' : 'nicht messbar');
pruefe('Jede Stufe wird einzeln berichtet',
  mass.stufen.length === F.Nachmessen.STUFEN.length
  && mass.stufen.every((s) => s.getroffen));

// 2. Eine Karte, bei der der Compiler die Fehlerterme wegkuerzt: dann bleibt
//    genau das uebrig, was 32 Bit von sich aus koennen.
mass = karteMit(24);
pruefe('Wegoptimierte Fehlerterme fallen auf', mass && mass.bits === 24,
  mass ? mass.bits + ' Bit' : 'nicht messbar');
pruefe('Und das ist nicht mehr als der einfache Weg',
  mass.bits <= F.Zahl.BITS_EINFACH + 2, mass.bits + ' gegen ' + F.Zahl.BITS_EINFACH);

// 3. Der haeufigere Fall: es greift, aber nur halb.
mass = karteMit(30);
pruefe('Halb greifende Doppelgenauigkeit wird gemessen', mass && mass.bits === 30,
  mass ? mass.bits + ' Bit' : 'nicht messbar');

// 4. Und was daraus folgt: die Anzeige rechnet mit dem gemessenen Wert.
const vorher = F.Zahl.BITS_DOPPELT;
F.Zahl.gemessen(30);
pruefe('Der gemessene Wert tritt an die Stelle der Annahme',
  F.Zahl.BITS_DOPPELT === 30, 'statt ' + vorher);
pruefe('Die Aufloesung waechst damit um das Erwartete',
  Math.abs(F.Zahl.aufloesung(30) / F.Zahl.aufloesung(46) - Math.pow(2, 16)) < 1,
  F.Zahl.aufloesung(30).toExponential(1) + ' statt ' + F.Zahl.aufloesung(46).toExponential(1));

// Mehr als die Emulation hergibt, wird daraus nicht.
F.Zahl.gemessen(60);
pruefe('Ueber 46 Bit hinaus wird nicht geglaubt', F.Zahl.BITS_DOPPELT === 46,
  F.Zahl.BITS_DOPPELT + ' Bit');
// Und unter den einfachen Weg faellt sie auch nicht.
F.Zahl.gemessen(12);
pruefe('Unter den einfachen Weg faellt sie nicht',
  F.Zahl.BITS_DOPPELT === F.Zahl.BITS_EINFACH, F.Zahl.BITS_DOPPELT + ' Bit');
F.Zahl.gemessen(46);

// 5. Eine Karte, die gar nichts aufloest - dann lieber nichts behaupten.
mass = karteMit(0);
pruefe('Faellt jede Stufe durch, gibt es kein Messergebnis', mass === null);

console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : '\n' + fehler + ' FEHLER');
process.exit(fehler === 0 ? 0 : 1);
