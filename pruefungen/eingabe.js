// Prueft Maus.js und Tastatur.js gegen ein nachgebautes Mini-DOM:
// kommen echte Ereignisse wirklich bei der Kamera an?
const fs = require('fs');
const vm = require('vm');
const path = require('path');
// Relativ zur eigenen Lage - damit die Pruefung in jedem Klon laeuft.
const ordner = path.join(__dirname, '..', 'js') + path.sep;

const horcher = {};            // typ -> handler
const leinwand = {
  addEventListener: (typ, fn) => { horcher[typ] = fn; },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  setPointerCapture: () => {},
  releasePointerCapture: () => {},
  classList: { add() {}, remove() {} },
};

const kontext = { Math, console, performance: { now: () => 0 } };
kontext.window = kontext;
kontext.globalThis = kontext;
kontext.window.addEventListener = (typ, fn) => { horcher['window:' + typ] = fn; };
vm.createContext(kontext);

for (const datei of ['kern/Zustand.js', 'ansicht/Kamera.js', 'ansicht/Iterationen.js']) {
  vm.runInContext(fs.readFileSync(ordner + datei, 'utf8'), kontext, { filename: datei });
}
// Der Zeichner wird hier nur gezaehlt, nicht wirklich gebraucht.
let eingaben = 0;
kontext.FRAKTAL.Zeichner = { eingabe: () => { eingaben++; } };
for (const datei of ['ui/Maus.js', 'ui/Tastatur.js']) {
  vm.runInContext(fs.readFileSync(ordner + datei, 'utf8'), kontext, { filename: datei });
}

const F = kontext.FRAKTAL, z = F.Zustand, K = F.Kamera;
let fehler = 0;
function pruefe(name, ok, zusatz) {
  console.log((ok ? 'OK   ' : 'FEHL ') + name + (zusatz ? '  ' + zusatz : ''));
  if (!ok) fehler++;
}

F.Maus.starten(leinwand);
let einpassenGerufen = 0;
F.Tastatur.starten({ einpassen: () => { einpassenGerufen++; } });

const r = leinwand.getBoundingClientRect();
function rad(dy, x, y, modus) {
  let verhindert = false;
  horcher.wheel({ deltaY: dy, deltaMode: modus || 0, clientX: x, clientY: y,
                  preventDefault: () => { verhindert = true; } });
  return verhindert;
}

// 1. Mausrad: zoomt es, haelt es den Punkt, und verhindert es das Scrollen?
const zx = 640, zy = 180;
const vorher = K.bildschirmZuWelt(zx, zy, r, z.ziel);
const verhindert = rad(-100, zx, zy);
for (let i = 0; i < 23; i++) rad(-100, zx, zy);
const nachher = K.bildschirmZuWelt(zx, zy, r, z.ziel);
const pixel = (z.BASIS_HOEHE / Math.pow(2, z.ziel.log2Zoom)) / r.height;
const abw = Math.max(Math.abs(vorher.re - nachher.re), Math.abs(vorher.im - nachher.im)) / pixel;

pruefe('Mausrad verhindert das Scrollen der Seite', verhindert);
pruefe('24 Rastungen ergeben 6 log2-Stufen', Math.abs(z.ziel.log2Zoom - 6) < 1e-9,
  'Zoom ' + Math.pow(2, z.ziel.log2Zoom).toFixed(1));
pruefe('Mausrad haelt den Punkt unter dem Zeiger', abw < 1e-6, abw.toExponential(2) + ' Pixel');
pruefe('Jede Rastung meldet eine Eingabe', eingaben === 24, String(eingaben));

// 2. Zeilen- und Seitenmodus duerfen nicht hundertfach zoomen.
let stand = z.ziel.log2Zoom;
rad(-3, zx, zy, 1);
const proZeile = z.ziel.log2Zoom - stand;
pruefe('Zeilenmodus zoomt massvoll', proZeile > 0 && proZeile < 0.5, proZeile.toFixed(3) + ' Stufen');

// 3. Ziehen mit einem Zeiger
K.einpassen();
z.ansicht.log2Zoom = z.ziel.log2Zoom;
z.ansicht.mitteRe = z.ziel.mitteRe; z.ansicht.mitteIm = z.ziel.mitteIm;
const vorRe = z.ansicht.mitteRe, vorIm = z.ansicht.mitteIm;
const skala = (z.BASIS_HOEHE / Math.pow(2, z.ansicht.log2Zoom)) / r.height;
horcher.pointerdown({ pointerId: 1, clientX: 400, clientY: 300 });
horcher.pointermove({ pointerId: 1, clientX: 500, clientY: 240 });
horcher.pointerup({ pointerId: 1, clientX: 500, clientY: 240 });
pruefe('Ziehen verschiebt um genau die Zugstrecke',
  Math.abs((z.ansicht.mitteRe - vorRe) + 100 * skala) < 1e-15
  && Math.abs((z.ansicht.mitteIm - vorIm) + 60 * skala) < 1e-15);

// 4. Nach dem Loslassen darf nichts mehr folgen.
const ruheRe = z.ansicht.mitteRe;
horcher.pointermove({ pointerId: 1, clientX: 700, clientY: 100 });
pruefe('Nach dem Loslassen zieht nichts mehr', z.ansicht.mitteRe === ruheRe);

// 5. Kneifen mit zwei Fingern
K.einpassen();
const vorKneif = z.ziel.log2Zoom;
horcher.pointerdown({ pointerId: 1, clientX: 300, clientY: 300 });
horcher.pointerdown({ pointerId: 2, clientX: 500, clientY: 300 });   // Abstand 200
horcher.pointermove({ pointerId: 2, clientX: 700, clientY: 300 });   // Abstand 400
pruefe('Doppelter Fingerabstand = eine Zoomstufe',
  Math.abs((z.ziel.log2Zoom - vorKneif) - 1) < 1e-9,
  '+' + (z.ziel.log2Zoom - vorKneif).toFixed(4));
horcher.pointerup({ pointerId: 1, clientX: 300, clientY: 300 });
horcher.pointerup({ pointerId: 2, clientX: 700, clientY: 300 });

// 6. Doppelklick
K.einpassen();
const vorDoppel = z.ziel.log2Zoom;
horcher.dblclick({ clientX: 200, clientY: 200, shiftKey: false, preventDefault: () => {} });
pruefe('Doppelklick holt eine Stufe naeher', Math.abs((z.ziel.log2Zoom - vorDoppel) - 1) < 1e-9);
horcher.dblclick({ clientX: 200, clientY: 200, shiftKey: true, preventDefault: () => {} });
pruefe('Shift-Doppelklick geht wieder heraus', Math.abs(z.ziel.log2Zoom - vorDoppel) < 1e-9);

// 7. Tastatur: gehaltene Tasten
const runter = horcher['window:keydown'], hoch = horcher['window:keyup'];
function taste(fn, code, key) { fn({ code, key, target: {}, preventDefault: () => {} }); }

taste(runter, 'KeyD', 'd');
pruefe('D haelt nach rechts', F.Tastatur.richtung().x === 1);
taste(runter, 'KeyW', 'w');
pruefe('W haelt nach oben', F.Tastatur.richtung().y === 1);
taste(hoch, 'KeyD', 'd');
pruefe('Loslassen beendet die Richtung', F.Tastatur.richtung().x === 0);
taste(hoch, 'KeyW', 'w');

taste(runter, 'Equal', '+');
pruefe('+ zoomt hinein', F.Tastatur.richtung().zoom === 1);
taste(hoch, 'Equal', '+');
taste(runter, 'Minus', '-');
pruefe('- zoomt heraus', F.Tastatur.richtung().zoom === -1);
taste(hoch, 'Minus', '-');

taste(runter, 'Digit0', '0');
pruefe('0 ruft die Uebersicht auf', einpassenGerufen === 1);

// 8. Tippt man in ein Eingabefeld, darf die Leinwand nicht mitfahren.
runter({ code: 'KeyW', key: 'w', target: { tagName: 'INPUT' }, preventDefault: () => {} });
pruefe('Eingabefelder schlucken die Tasten', F.Tastatur.richtung().y === 0);

// 9. Fensterwechsel loest gehaltene Tasten
taste(runter, 'KeyA', 'a');
horcher['window:blur']();
pruefe('Fensterwechsel loest gehaltene Tasten', F.Tastatur.richtung().x === 0);

console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : '\n' + fehler + ' FEHLER');
process.exit(fehler === 0 ? 0 : 1);
