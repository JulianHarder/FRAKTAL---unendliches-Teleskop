// Prueft den Zeichner mit gestellter Uhr: wann grob, wann fein, wann gar nicht.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
// Relativ zur eigenen Lage - damit die Pruefung in jedem Klon laeuft.
const ordner = path.join(__dirname, '..', 'js') + path.sep;

const kontext = { Math, console };
kontext.window = kontext;
kontext.globalThis = kontext;
kontext.window.addEventListener = () => {};
vm.createContext(kontext);
for (const d of ['kern/Zustand.js', 'kern/Zahl.js', 'ansicht/Iterationen.js',
                 'ansicht/Genauigkeit.js', 'ansicht/Zeichner.js']) {
  vm.runInContext(fs.readFileSync(ordner + d, 'utf8'), kontext, { filename: d });
}
const F = kontext.FRAKTAL, z = F.Zustand;

// Attrappen fuer Grafikkarte und Leinwand
const bilder = [];
let skalaZuletzt = 1;
F.Leinwand = {
  groesseAnpassen: (s) => { skalaZuletzt = s; return false; },
  groesse: () => ({ breite: Math.round(1200 * skalaZuletzt), hoehe: Math.round(800 * skalaZuletzt) }),
  zeichnen: () => { bilder.push({ skala: skalaZuletzt, iter: null }); },
};
// Die Palette interessiert hier nicht, muss aber antworten.
F.PalettenTextur = { binden: () => true, aktuell: () => ({ innen: [0, 0, 0] }) };
const gesetzt = {};
const gl = {
  uniform2f(){}, uniform1f(){}, uniform3f(){},
  uniform1i(ort, wert) { gesetzt[ort] = wert; },
};
const programm = { benutzen(){}, ort: (n) => n };
// Beide Rechenwege zeigen hier auf dieselbe Attrappe.
F.Zeichner.starten(gl, { einfach: programm, doppelt: programm });

let fehler = 0;
function pruefe(name, ok, zusatz) {
  console.log((ok ? 'OK   ' : 'FEHL ') + name + (zusatz ? '  ' + zusatz : ''));
  if (!ok) fehler++;
}
function takt(t, inBewegung) {
  const vorher = bilder.length;
  F.Zeichner.schritt(t, !!inBewegung);
  if (bilder.length === vorher) return 'nichts';
  return z.laufzeit.grob ? 'grob' : 'fein';
}

// 1. Erstes Bild sofort fein, danach Ruhe.
pruefe('Erstes Bild ist fein', takt(0) === 'fein');
pruefe('Danach wird nicht weitergerechnet', takt(16) === 'nichts' && takt(32) === 'nichts');

// 2. Eine Eingabe -> grob, und zwar genau 120 ms lang, dann einmal fein.
F.Zeichner.eingabe();
pruefe('Nach einer Eingabe wird grob gerechnet', takt(100) === 'grob');
pruefe('Innerhalb der Ruhefrist bleibt es grob', takt(150) === 'grob' && takt(200) === 'grob');
pruefe('Nach der Ruhefrist kommt das Feinbild', takt(260) === 'fein', 'bei t=260 (Eingabe war t=100)');
pruefe('Und danach ist Schluss', takt(300) === 'nichts');

// 3. Waehrend die Kamera faehrt, bleibt es grob - egal wie lange.
pruefe('Fahrt haelt es grob (1)', takt(1000, true) === 'grob');
pruefe('Fahrt haelt es grob (2)', takt(5000, true) === 'grob');
// Kommt die Kamera von selbst zum Stehen, gibt es sofort das Feinbild - die
// Ruhefrist gilt nur dem Buendeln schneller Eingaben, nicht dem Ausrollen.
pruefe('Ende der Fahrt gibt sofort ein Feinbild', takt(5050, false) === 'fein');
pruefe('Dann Ruhe', takt(5400, false) === 'nichts');

// 4. Grobbild ist wirklich kleiner und flacher gerechnet.
// Erst ein paar schnelle Bilder, damit die Notbremse geloest ist und nicht
// zwischen den beiden Messungen dazwischenfunkt.
for (let t = 5440; t < 6200; t += 40) takt(t, true);
// Tief genug stellen, sonst greift fuer beide der Sockel von 150.
z.ansicht.log2Zoom = 20;
F.Zeichner.eingabe();
takt(6240, false);
const grobIter = z.laufzeit.iterationen;
pruefe('Grobbild hat halbe Kantenlaenge', skalaZuletzt === 0.5);
takt(6440, false);
const feinIter = z.laufzeit.iterationen;
pruefe('Feinbild hat volle Kantenlaenge', skalaZuletzt === 1.0);
pruefe('Grobbild rechnet flacher', grobIter < feinIter, grobIter + ' statt ' + feinIter);

// 5. Die Notbremse zieht in zwei Stufen - und die Reihenfolge ist der Witz:
//    zuerst faellt die Kantenglaettung weg (kostet das Vierfache, bringt
//    weichere Raender), erst danach die Iterationstiefe (das ist der Inhalt).
z.ansicht.log2Zoom = 30;             // tief, damit die Tiefe nicht am Sockel klebt

// Schnelle Bilder loesen beide Stufen wieder - sonst messen wir die Reste
// aus den Spruengen weiter oben.
let uhr = 7000;
function schnell(anzahl) {
  for (let i = 0; i < anzahl; i++) { F.Zeichner.eingabe(); takt(uhr, false); uhr += 40; }
}
function langsam() {
  F.Zeichner.eingabe();
  takt(uhr + 2000, false);           // das vorige Bild hat 2 s gebraucht
  uhr += 2000;
  takt(uhr + 200, false);            // und hier steht das Feinbild mit den Folgen
  uhr += 200;
}

schnell(20);
takt(uhr + 200, false);              // Feinbild im Ruhezustand
uhr += 200;
pruefe('Im Ruhezustand wird geglaettet', gesetzt.u_proben === 2 && z.laufzeit.glaetten);
const vorBremse = z.laufzeit.iterationen;

langsam();
pruefe('Erste Stufe: die Kantenglaettung faellt weg',
  gesetzt.u_proben === 1 && z.laufzeit.glaetten === false);
pruefe('Die Tiefe bleibt dabei unangetastet',
  z.laufzeit.notbremse === 1 && z.laufzeit.iterationen === vorBremse,
  z.laufzeit.iterationen + ' Iterationen');

langsam();
pruefe('Zweite Stufe: jetzt sinkt die Tiefe', z.laufzeit.notbremse < 1,
  'auf ' + Math.round(z.laufzeit.notbremse * 100) + ' %');
pruefe('Und die Iterationen sinken wirklich', z.laufzeit.iterationen < vorBremse,
  z.laufzeit.iterationen + ' statt ' + vorBremse);

// 6. Wird es wieder schnell, kommt erst die Tiefe zurueck, dann die Glaettung.
let tiefeZurueck = 0;
let glaettungZurueck = 0;
for (let i = 0; i < 40; i++) {
  F.Zeichner.eingabe();
  takt(uhr, false);
  uhr += 40;
  if (!tiefeZurueck && z.laufzeit.notbremse === 1) tiefeZurueck = i;
  if (!glaettungZurueck && z.laufzeit.glaetten) glaettungZurueck = i;
}
pruefe('Nach schnellen Bildern loest die Notbremse wieder',
  z.laufzeit.notbremse === 1 && z.laufzeit.glaetten === true,
  Math.round(z.laufzeit.notbremse * 100) + ' % Tiefe, Glaettung '
  + (z.laufzeit.glaetten ? 'an' : 'aus'));
pruefe('Und zwar die Tiefe vor der Glaettung', tiefeZurueck > 0
  && glaettungZurueck > tiefeZurueck, 'Tiefe nach ' + tiefeZurueck
  + ' Bildern, Glaettung nach ' + glaettungZurueck);

console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : '\n' + fehler + ' FEHLER');
process.exit(fehler === 0 ? 0 : 1);
