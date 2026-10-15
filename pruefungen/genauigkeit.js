// Prueft das Zerlegen der Zahlen und die Wahl des Rechenwegs.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
// Relativ zur eigenen Lage - damit die Pruefung in jedem Klon laeuft.
const ordner = path.join(__dirname, '..', 'js') + path.sep;

const kontext = { Math, console };
kontext.window = kontext;
kontext.globalThis = kontext;
vm.createContext(kontext);
for (const d of ['kern/Zustand.js', 'kern/Zahl.js', 'ansicht/Genauigkeit.js']) {
  vm.runInContext(fs.readFileSync(ordner + d, 'utf8'), kontext, { filename: d });
}
const F = kontext.FRAKTAL, Zahl = F.Zahl, G = F.Genauigkeit;

let fehler = 0;
function pruefe(name, ok, zusatz) {
  console.log((ok ? 'OK   ' : 'FEHL ') + name + (zusatz ? '  ' + zusatz : ''));
  if (!ok) fehler++;
}

// --- Zerlegen ---
const werte = [
  -0.743643887037151, 0.131825904205330, -1.7497219297423,
  3.725290298461914e-9, 1e-13, -2.0, 0.0, 1 / 3
];
let schlimmste = 0;
werte.forEach(function (w) {
  const [hoch, tief] = Zahl.teilen(w);
  const zurueck = Zahl.zusammen([hoch, tief]);
  const rel = w === 0 ? Math.abs(zurueck) : Math.abs((zurueck - w) / w);
  schlimmste = Math.max(schlimmste, rel);
  if (Math.fround(hoch) !== hoch) pruefe('hoch ist 32-Bit-rein (' + w + ')', false);
  if (Math.fround(tief) !== tief) pruefe('tief ist 32-Bit-rein (' + w + ')', false);
});
pruefe('Beide Teile sind echte 32-Bit-Zahlen', true, werte.length + ' Werte');
pruefe('Zusammen tragen sie ~14 Stellen', schlimmste < 1e-13,
  'groesster relativer Fehler ' + schlimmste.toExponential(2));

// Die Gegenprobe: nur der hohe Teil waere deutlich schlechter.
const nurHoch = Math.abs((Math.fround(-0.743643887037151) + 0.743643887037151) / 0.743643887037151);
pruefe('Ein einzelner 32-Bit-Wert traegt nur ~7 Stellen', nurHoch > 1e-9 && nurHoch < 1e-6,
  'Fehler ' + nurHoch.toExponential(2));

// --- Stellen ---
const HOEHE = 800;
const s0 = G.stellen(0, HOEHE, 'einfach');
pruefe('Uebersicht hat reichlich Stellen (einfach)', s0 > 4 && s0 < 5, s0.toFixed(2));
const sTief = G.stellen(13, HOEHE, 'einfach');
pruefe('Bei Zoom 8192 ist einfach fast am Ende', sTief < 1, sTief.toFixed(2) + ' Stellen');
const sDoppelt = G.stellen(13, HOEHE, 'doppelt');
pruefe('Doppelt hat dort noch viel Luft', sDoppelt > 7, sDoppelt.toFixed(2) + ' Stellen');
pruefe('Doppelt bringt rund 6,6 Stellen mehr',
  Math.abs((sDoppelt - sTief) - 6.62) < 0.1, (sDoppelt - sTief).toFixed(2));

// Ein groesseres Fenster hat kleinere Pixel und stoesst frueher an.
pruefe('Groesseres Fenster kostet Stellen',
  G.stellen(13, 1600, 'einfach') < G.stellen(13, 400, 'einfach'));

// --- Reichweite ---
const rE = G.reichweite(HOEHE, 'einfach');
const rD = G.reichweite(HOEHE, 'doppelt');
pruefe('Einfach reicht bis ~1e4', rE > 1e4 && rE < 1e5, rE.toExponential(2));
pruefe('Doppelt reicht bis ~1e11', rD > 1e10 && rD < 1e12, rD.toExponential(2));

// --- Umschaltung mit Hysterese ---
G.doppeltVerfuegbar(true);
pruefe('Start: einfach', G.aktualisieren(0, 'automatisch', HOEHE) === 'einfach');
pruefe('Flach bleibt es einfach', G.aktualisieren(8, 'automatisch', HOEHE) === 'einfach');
pruefe('Tief schaltet auf doppelt', G.aktualisieren(12, 'automatisch', HOEHE) === 'doppelt');
pruefe('Knapp zurueck bleibt es doppelt', G.aktualisieren(9.5, 'automatisch', HOEHE) === 'doppelt',
  'Hysterese haelt');
pruefe('Weit zurueck wird es wieder einfach', G.aktualisieren(6, 'automatisch', HOEHE) === 'einfach');

// Kein Flattern: an der Schwelle hin und her wackeln darf nicht umschalten.
let schwelle = 0;
for (let L = 0; L < 20; L += 0.01) {
  if (G.aktualisieren(L, 'automatisch', HOEHE) === 'doppelt') { schwelle = L; break; }
}
let wechsel = 0, vorher = 'doppelt';
for (let i = 0; i < 200; i++) {
  const L = schwelle + (i % 2 === 0 ? -0.05 : 0.05);
  const m = G.aktualisieren(L, 'automatisch', HOEHE);
  if (m !== vorher) { wechsel++; vorher = m; }
}
pruefe('An der Schwelle flattert nichts', wechsel === 0, wechsel + ' Wechsel bei 200 Zuckern');
pruefe('Die Schwelle liegt bei Zoom ~1000',
  Math.pow(2, schwelle) > 500 && Math.pow(2, schwelle) < 3000,
  'Zoom ' + Math.round(Math.pow(2, schwelle)));

// --- Von Hand ---
pruefe('Von Hand einfach bleibt einfach', G.aktualisieren(30, 'einfach', HOEHE) === 'einfach');
pruefe('Von Hand doppelt bleibt doppelt', G.aktualisieren(0, 'doppelt', HOEHE) === 'doppelt');

// --- Ohne doppelten Shader ---
G.doppeltVerfuegbar(false);
pruefe('Ohne doppelten Shader bleibt alles einfach',
  G.aktualisieren(30, 'doppelt', HOEHE) === 'einfach');

console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : '\n' + fehler + ' FEHLER');
process.exit(fehler === 0 ? 0 : 1);
