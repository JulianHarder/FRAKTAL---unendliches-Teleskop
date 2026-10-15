// Prueft, was zum Merken und Anfahren von Stellen gehoert: den Flug der
// Kamera, die Adresse hinter dem Doppelkreuz und den Speicher samt vollem
// localStorage.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
// Relativ zur eigenen Lage - damit die Pruefung in jedem Klon laeuft.
const ordner = path.join(__dirname, '..', 'js') + path.sep;

const horcher = {};

// --- Attrappe fuer localStorage, mit Quote ---
let quote = 1e9;
const ablage = new Map();
const localStorage = {
  getItem: (k) => (ablage.has(k) ? ablage.get(k) : null),
  setItem: (k, v) => {
    if (String(v).length > quote) {
      const fehler = new Error('QuotaExceededError');
      fehler.name = 'QuotaExceededError';
      throw fehler;
    }
    ablage.set(k, String(v));
  },
  removeItem: (k) => ablage.delete(k),
};

const kontext = { Math, console, JSON, Date, Array, parseFloat, isFinite, String, Number };
kontext.window = kontext;
kontext.globalThis = kontext;
kontext.localStorage = localStorage;
kontext.location = { href: 'file:///home/julian/fraktal/index.html', hash: '' };
kontext.window.addEventListener = (typ, fn) => { horcher['window:' + typ] = fn; };
vm.createContext(kontext);

for (const d of ['daten/paletten.js', 'daten/orte.js', 'kern/Zustand.js', 'kern/Zahl.js',
                 'kern/Speicher.js', 'kern/Adresse.js', 'ansicht/Kamera.js',
                 'ansicht/Iterationen.js', 'ansicht/Genauigkeit.js',
                 'ui/Tastatur.js']) {
  vm.runInContext(fs.readFileSync(ordner + d, 'utf8'), kontext, { filename: d });
}

const F = kontext.FRAKTAL, z = F.Zustand, K = F.Kamera;
F.Leinwand = { volleHoehe: () => 900 };

let fehler = 0;
function pruefe(name, ok, zusatz) {
  console.log((ok ? 'OK   ' : 'FEHL ') + name + (zusatz ? '  ' + zusatz : ''));
  if (!ok) fehler++;
}
const nah = (a, b, e) => Math.abs(a - b) < (e || 1e-12);

function aufsetzen(re, im, log2Zoom) {
  z.ansicht.mitteRe = z.ziel.mitteRe = re;
  z.ansicht.mitteIm = z.ziel.mitteIm = im;
  z.ansicht.log2Zoom = z.ziel.log2Zoom = log2Zoom;
}

// ===== 1. Der Flug =====
const mini = F.Orte.nach('mini');
const ziel = F.Orte.alsStand(mini);
pruefe('Orte rechnen den Zoom in den Logarithmus um',
  nah(ziel.log2Zoom, Math.log2(mini.zoom), 1e-12),
  'Zoom ' + mini.zoom.toExponential(0) + ' = log2 ' + ziel.log2Zoom.toFixed(3));
// Die tiefste Stelle muss den einfachen Rechenweg wirklich ueberfordern -
// sonst zeigt sie nicht, wofuer die Doppelgenauigkeit da ist.
pruefe('Die tiefste Stelle liegt jenseits des einfachen Rechenwegs',
  F.Genauigkeit.stellen(ziel.log2Zoom, 800, 'einfach') < 1
  && F.Genauigkeit.stellen(ziel.log2Zoom, 800, 'doppelt') > 3,
  F.Genauigkeit.stellen(ziel.log2Zoom, 800, 'einfach').toFixed(1) + ' gegen '
  + F.Genauigkeit.stellen(ziel.log2Zoom, 800, 'doppelt').toFixed(1) + ' Stellen');

aufsetzen(z.anfang.mitteRe, z.anfang.mitteIm, z.anfang.log2Zoom);
K.hinfliegen(ziel);
pruefe('Nach dem Start fliegt die Kamera', K.fliegt());

// Durchfliegen und dabei mitmessen.
let tiefsterZoom = Infinity, hoechsterZoom = -Infinity, weitesteAbweichung = 0;
let takte = 0;
while (K.fliegt() && takte < 600) {
  K.schritt(1 / 60);
  takte++;
  tiefsterZoom = Math.min(tiefsterZoom, z.ansicht.log2Zoom);
  hoechsterZoom = Math.max(hoechsterZoom, z.ansicht.log2Zoom);

  // Wie weit ist das Ziel gerade weg - gemessen in Bildhoehen? Das ist die
  // Zahl, auf die es ankommt: in Weltkoordinaten naehert sich jeder Flug
  // gleichmaessig, aber sichtbar ist nur das Verhaeltnis zum Ausschnitt.
  const sicht = z.BASIS_HOEHE / Math.pow(2, z.ansicht.log2Zoom);
  const weg = Math.sqrt(Math.pow(ziel.mitteRe - z.ansicht.mitteRe, 2)
                      + Math.pow(ziel.mitteIm - z.ansicht.mitteIm, 2));
  weitesteAbweichung = Math.max(weitesteAbweichung, weg / sicht);
}

pruefe('Der Flug dauert rund anderthalb Sekunden', takte > 80 && takte < 120,
  (takte / 60).toFixed(2) + ' s');
pruefe('Er landet genau auf der Stelle',
  nah(z.ansicht.mitteRe, ziel.mitteRe) && nah(z.ansicht.mitteIm, ziel.mitteIm)
  && nah(z.ansicht.log2Zoom, ziel.log2Zoom));
pruefe('Ansicht und Ziel stehen danach gleich',
  nah(z.ziel.mitteRe, ziel.mitteRe) && nah(z.ziel.log2Zoom, ziel.log2Zoom));
pruefe('Er fliegt nicht tiefer als Start und Ziel',
  hoechsterZoom <= ziel.log2Zoom + 1e-9, 'bis log2 ' + hoechsterZoom.toFixed(2));
pruefe('Der Schwenk passiert im Weiten, nicht in der Tiefe',
  tiefsterZoom < 0.5, 'tiefster Punkt log2 ' + tiefsterZoom.toFixed(2));
// Ohne den Bogen schoesse das Ziel am Ende aus hunderttausenden Bildhoehen
// Entfernung herein - mit Bogen bleibt es die ganze Zeit fast im Bild.
pruefe('Das Ziel bleibt waehrend des ganzen Fluges im Bild',
  weitesteAbweichung < 0.5, 'hoechstens ' + weitesteAbweichung.toFixed(2) + ' Bildhoehen');

// Ein Flug ueber eine kurze Strecke braucht keinen Bogen.
aufsetzen(-0.75, 0.1, 12);
K.hinfliegen({ mitteRe: -0.7501, mitteIm: 0.1001, log2Zoom: 14 });
let tiefsterNah = Infinity;
while (K.fliegt()) { K.schritt(1 / 60); tiefsterNah = Math.min(tiefsterNah, z.ansicht.log2Zoom); }
pruefe('Ein Flug um die Ecke zoomt gar nicht erst hinaus', tiefsterNah >= 12 - 1e-9,
  'tiefster Punkt log2 ' + tiefsterNah.toFixed(3));

// Jede eigene Bewegung bricht den Flug ab.
aufsetzen(-0.6, 0, 0);
K.hinfliegen(ziel);
K.schritt(0.1);
K.ziehen(10, 10, { width: 800, height: 600 });
pruefe('Ziehen bricht den Flug ab', !K.fliegt());

K.hinfliegen(ziel);
K.zoomen(0.25, 400, 300, { width: 800, height: 600 });
pruefe('Das Mausrad bricht den Flug ab', !K.fliegt());

K.hinfliegen(ziel);
K.einpassen();
pruefe('Die Uebersicht bricht den Flug ab', !K.fliegt());

// ===== 2. Die Adresse =====
aufsetzen(-0.743643887037151, 0.131825904205330, 23.2534966642115);
z.regler.palette = 'eis';
z.menge = 'mandelbrot';
const adresse = F.Adresse.alsText();
pruefe('Die Adresse steht hinter dem Doppelkreuz', adresse.indexOf('#re=') > 0, adresse.slice(0, 60) + '…');
pruefe('Sie nennt Koordinate, Zoom und Palette',
  adresse.indexOf('im=') > 0 && adresse.indexOf('zoom=') > 0 && adresse.indexOf('palette=eis') > 0);
pruefe('Ohne Julia-Menge steht kein c darin', adresse.indexOf('c=') < 0);

// Hin und zurueck, ohne eine Stelle zu verlieren - sonst waere der Link
// wertlos: tief drinnen entscheidet die zwoelfte Nachkommastelle.
aufsetzen(0, 0, 0);
z.regler.palette = 'feuer';
pruefe('Die Adresse laesst sich wieder lesen', F.Adresse.lesen(adresse.split('#')[1]));
pruefe('Die Koordinate kommt unversehrt zurueck',
  z.ansicht.mitteRe === -0.743643887037151 && z.ansicht.mitteIm === 0.131825904205330);
pruefe('Der Zoom kommt zurueck', nah(z.ansicht.log2Zoom, 23.2534966642115, 1e-12));
pruefe('Die Palette kommt zurueck', z.regler.palette === 'eis');
pruefe('Eine aufgerufene Adresse steht sofort da, ohne Hinflug',
  z.ziel.mitteRe === z.ansicht.mitteRe && z.ziel.log2Zoom === z.ansicht.log2Zoom);

// Unsinn darf die Seite nicht ins Nichts schicken.
pruefe('Eine leere Adresse wird abgewiesen', F.Adresse.lesen('') === false);
pruefe('Kaputte Zahlen werden abgewiesen',
  F.Adresse.lesen('re=abc&im=0&zoom=4') === false);
pruefe('Ein fehlender Zoom wird abgewiesen', F.Adresse.lesen('re=0&im=0') === false);
pruefe('Eine unbekannte Palette aendert nichts',
  (function () {
    z.regler.palette = 'eis';
    F.Adresse.lesen('re=0&im=0&zoom=4&palette=gibtesnicht');
    return z.regler.palette === 'eis';
  })());

// ===== 3. Der Speicher =====
F.Speicher.laden();
aufsetzen(-1.25, 0.05, 7.5);
z.regler.dichte = 0.9;
F.Speicher.standMerken(z);

aufsetzen(0, 0, 0);
z.regler.dichte = 0.1;
F.Speicher.laden();
F.Speicher.standAnwenden(z);
pruefe('Der Stand ueberlebt das Neuladen',
  nah(z.ansicht.mitteRe, -1.25) && nah(z.ansicht.log2Zoom, 7.5));
pruefe('Die Regler ueberleben mit', nah(z.regler.dichte, 0.9));

// Der Rechenweg mit Absicht nicht: einmal auf "einfach" gestellt und
// vergessen, und jedes tiefe Bild waere beim naechsten Oeffnen stufig.
z.regler.rechenmodus = 'einfach';
F.Speicher.standMerken(z);
z.regler.rechenmodus = 'automatisch';
F.Speicher.laden();
F.Speicher.standAnwenden(z);
pruefe('Der Rechenweg wird nicht gemerkt', z.regler.rechenmodus === 'automatisch');

F.Speicher.merken({ name: 'Erstes', re: -0.5, im: 0, log2Zoom: 3, bild: 'xxx' });
F.Speicher.merken({ name: 'Zweites', re: -0.6, im: 0, log2Zoom: 9, bild: 'yyy' });
pruefe('Das neueste Lesezeichen steht oben',
  F.Speicher.lesezeichen()[0].name === 'Zweites');
pruefe('Jedes bekommt eine eigene Kennung',
  F.Speicher.lesezeichen()[0].id !== F.Speicher.lesezeichen()[1].id);

F.Speicher.vergessen(F.Speicher.lesezeichen()[0].id);
pruefe('Loeschen trifft genau eines',
  F.Speicher.lesezeichen().length === 1 && F.Speicher.lesezeichen()[0].name === 'Erstes');

for (let i = 0; i < 40; i++) F.Speicher.merken({ name: 'Nr ' + i, re: 0, im: 0, log2Zoom: i });
pruefe('Mehr als ' + F.Speicher.HOECHSTENS + ' werden nicht aufgehoben',
  F.Speicher.lesezeichen().length === F.Speicher.HOECHSTENS);

// Jetzt der volle Speicher: das aelteste Bild muss fliegen, der Eintrag bleiben.
ablage.clear();
F.Speicher.laden();
F.Speicher.merken({ name: 'Alt', re: 0, im: 0, log2Zoom: 1, bild: 'A'.repeat(400) });
F.Speicher.merken({ name: 'Neu', re: 0, im: 0, log2Zoom: 2, bild: 'B'.repeat(400) });
// So eng, dass noch genau ein Vorschaubild zu viel ist.
quote = ablage.get('fraktal.stand.v1').length + 150;
const vorher = F.Speicher.lesezeichen().length;
F.Speicher.merken({ name: 'Noch neuer', re: 0, im: 0, log2Zoom: 3, bild: 'C'.repeat(200) });
const liste = F.Speicher.lesezeichen();
pruefe('Bei vollem Speicher bleiben alle Eintraege', liste.length === vorher + 1);
pruefe('Dafuer faellt das aelteste Vorschaubild weg',
  liste[liste.length - 1].bild === null && liste[0].bild !== null,
  liste.map((e) => (e.bild ? 'Bild' : 'ohne')).join(', '));
pruefe('Und geschrieben wurde trotzdem', ablage.get('fraktal.stand.v1').length <= quote);
quote = 1e9;

// ===== 4. Die Tasten =====
const gerufen = [];
F.Tastatur.starten({
  lesezeichen: () => gerufen.push('lesezeichen'),
  verweis: () => gerufen.push('verweis'),
  hilfe: () => gerufen.push('hilfe'),
});
const runter = horcher['window:keydown'];
function taste(code, key, extra) {
  let verhindert = false;
  runter(Object.assign({ code, key, target: {},
    preventDefault: () => { verhindert = true; } }, extra || {}));
  return verhindert;
}
pruefe('B setzt ein Lesezeichen', taste('KeyB', 'b') && gerufen.indexOf('lesezeichen') >= 0);
pruefe('L kopiert den Link', taste('KeyL', 'l') && gerufen.indexOf('verweis') >= 0);
pruefe('H ruft die Hilfe', taste('KeyH', 'h') && gerufen.indexOf('hilfe') >= 0);

// Gehaltene Tasten wiederholen - einmalige Aktionen duerfen das nicht hoeren.
const vorWiederholung = gerufen.length;
taste('KeyH', 'h', { repeat: true });
taste('KeyB', 'b', { repeat: true });
pruefe('Gehaltene Tasten loesen nichts mehrfach aus', gerufen.length === vorWiederholung);

console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : '\n' + fehler + ' FEHLER');
process.exit(fehler === 0 ? 0 : 1);
