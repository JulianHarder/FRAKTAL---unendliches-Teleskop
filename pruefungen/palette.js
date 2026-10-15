// Prueft, ob aus den Stuetzpunkten die richtige Farbleiste wird.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
// Relativ zur eigenen Lage - damit die Pruefung in jedem Klon laeuft.
const ordner = path.join(__dirname, '..', 'js') + path.sep;

const kontext = { Math, console, Uint8Array };
kontext.window = kontext;
kontext.globalThis = kontext;
vm.createContext(kontext);
for (const d of ['daten/paletten.js', 'gl/PalettenTextur.js']) {
  vm.runInContext(fs.readFileSync(ordner + d, 'utf8'), kontext, { filename: d });
}
const F = kontext.FRAKTAL;

// Attrappe der Grafikkarte: faengt nur die Texturdaten ab.
let daten = null, parameter = {};
const gl = {
  RGBA: 'RGBA', UNSIGNED_BYTE: 'UB', TEXTURE_2D: 'T2D',
  TEXTURE_WRAP_S: 'wrapS', TEXTURE_WRAP_T: 'wrapT',
  TEXTURE_MIN_FILTER: 'min', TEXTURE_MAG_FILTER: 'mag',
  MIRRORED_REPEAT: 'gespiegelt', CLAMP_TO_EDGE: 'geklemmt', LINEAR: 'weich',
  createTexture: () => ({}), deleteTexture: () => {}, bindTexture: () => {},
  texImage2D: (z, s, if_, b, h, r, f, t, d) => { daten = d; },
  texParameteri: (ziel, name, wert) => { parameter[name] = wert; },
};

let fehler = 0;
function pruefe(name, ok, zusatz) {
  console.log((ok ? 'OK   ' : 'FEHL ') + name + (zusatz ? '  ' + zusatz : ''));
  if (!ok) fehler++;
}
function farbeBei(anteil) {
  const x = Math.round(anteil * (F.PalettenTextur.BREITE - 1));
  return [daten[x * 4], daten[x * 4 + 1], daten[x * 4 + 2], daten[x * 4 + 3]];
}
const nah = (a, b, d = 2) => Math.abs(a - b) <= d;

F.PalettenTextur.starten(gl);

// 1. Jede Palette ergibt eine vollstaendige Leiste.
F.Paletten.liste.forEach(function (p) {
  F.PalettenTextur.waehlen(p.name);
  const erste = p.stufen[0][1];
  const letzte = p.stufen[p.stufen.length - 1][1];
  pruefe('Palette "' + p.titel + '" hat 1024 Farben', daten.length === 1024 * 4);
  pruefe('  beginnt mit ihrem ersten Stuetzpunkt',
    nah(farbeBei(0)[0], erste[0]) && nah(farbeBei(0)[1], erste[1]) && nah(farbeBei(0)[2], erste[2]),
    farbeBei(0).slice(0, 3).join(','));
  pruefe('  endet mit ihrem letzten Stuetzpunkt',
    nah(farbeBei(1)[0], letzte[0]) && nah(farbeBei(1)[1], letzte[1]) && nah(farbeBei(1)[2], letzte[2]),
    farbeBei(1).slice(0, 3).join(','));
});

// 2. Stuetzpunkte in der Mitte muessen genau getroffen werden.
F.PalettenTextur.waehlen('feuer');
const mitte = F.Paletten.nach('feuer').stufen[2];   // [0.42, [147, 38, 103]]
const dort = farbeBei(mitte[0]);
pruefe('Ein Stuetzpunkt in der Mitte wird genau getroffen',
  nah(dort[0], mitte[1][0]) && nah(dort[1], mitte[1][1]) && nah(dort[2], mitte[1][2]),
  dort.slice(0, 3).join(',') + ' statt ' + mitte[1].join(','));

// 3. Graustufen muessen eine saubere Rampe sein.
F.PalettenTextur.waehlen('graustufen');
let maxAbweichung = 0, spruenge = 0;
for (let x = 0; x < 1024; x++) {
  const soll = Math.round(255 * x / 1023);
  maxAbweichung = Math.max(maxAbweichung, Math.abs(daten[x * 4] - soll));
  if (x > 0 && daten[x * 4] - daten[(x - 1) * 4] > 1) spruenge++;
}
pruefe('Graustufen laufen linear durch', maxAbweichung <= 1, 'groesste Abweichung ' + maxAbweichung);
pruefe('Keine Spruenge in der Rampe', spruenge === 0, spruenge + ' Spruenge');

// 4. Undurchsichtig, sonst scheint der Hintergrund durch.
let undurchsichtig = true;
for (let x = 0; x < 1024; x++) if (daten[x * 4 + 3] !== 255) undurchsichtig = false;
pruefe('Alle Farben sind undurchsichtig', undurchsichtig);

// 5. Die Wiederholung muss gespiegelt sein - sonst Naht im Bild.
pruefe('Textur wiederholt sich gespiegelt', parameter.wrapS === 'gespiegelt');
pruefe('Textur wird weich gefiltert', parameter.min === 'weich' && parameter.mag === 'weich');

// 6. Unbekannter Name faellt auf die erste Palette zurueck.
pruefe('Unbekannte Palette faellt zurueck', F.PalettenTextur.waehlen('gibtsnicht').name === 'feuer');

// 7. Der CSS-Verlauf fuer die Knoepfe nennt alle Stuetzpunkte.
const verlauf = F.Paletten.alsVerlauf(F.Paletten.nach('nordlicht'));
pruefe('CSS-Verlauf enthaelt alle Stufen',
  (verlauf.match(/rgb\(/g) || []).length === F.Paletten.nach('nordlicht').stufen.length);

console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : '\n' + fehler + ' FEHLER');
process.exit(fehler === 0 ? 0 : 1);
