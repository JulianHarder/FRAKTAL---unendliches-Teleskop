// Prueft den Wechsel zwischen Mandelbrot- und Julia-Menge: das Kamera-
// Gedaechtnis, die Verdrahtung von Zeiger und Taste J, und ob der Zeichner
// den Schalter im Shader wirklich umlegt.
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

const kontext = { Math, console };
kontext.window = kontext;
kontext.globalThis = kontext;
kontext.window.addEventListener = (typ, fn) => { horcher['window:' + typ] = fn; };
vm.createContext(kontext);

for (const d of ['kern/Zustand.js', 'kern/Zahl.js', 'shader/vertex.js',
                 'shader/bausteine.js', 'shader/fraktal.js',
                 'ansicht/Kamera.js', 'ansicht/Menge.js', 'ansicht/Iterationen.js',
                 'ansicht/Genauigkeit.js', 'ansicht/Zeichner.js']) {
  vm.runInContext(fs.readFileSync(ordner + d, 'utf8'), kontext, { filename: d });
}

// Attrappen: die Vorschau wird nur mitgeschrieben, nicht gezeichnet.
let gemeldet = null;
kontext.FRAKTAL.JuliaVorschau = {
  zeigen: (x, y, r) => { gemeldet = { x, y, breite: r.width, hoehe: r.height }; },
};
for (const d of ['ui/Maus.js', 'ui/Tastatur.js']) {
  vm.runInContext(fs.readFileSync(ordner + d, 'utf8'), kontext, { filename: d });
}

const F = kontext.FRAKTAL, z = F.Zustand, M = F.Menge, K = F.Kamera;
let fehler = 0;
function pruefe(name, ok, zusatz) {
  console.log((ok ? 'OK   ' : 'FEHL ') + name + (zusatz ? '  ' + zusatz : ''));
  if (!ok) fehler++;
}
const nah = (a, b) => Math.abs(a - b) < 1e-12;

// --- 1. Hin zur Julia-Menge: Kamera merken, frisch anfangen ---
z.ziel.mitteRe = -0.743643887;
z.ziel.mitteIm = 0.131825904;
z.ziel.log2Zoom = 26.5;
z.ansicht.mitteRe = z.ziel.mitteRe;
z.ansicht.mitteIm = z.ziel.mitteIm;
z.ansicht.log2Zoom = z.ziel.log2Zoom;

let gewechselt = 0;
M.horchen(() => { gewechselt++; });
M.nachJulia(-0.8, 0.156);

pruefe('Klick auf die Vorschau schaltet auf Julia', z.menge === 'julia');
pruefe('Das c der Vorschau kommt an', nah(z.julia.re, -0.8) && nah(z.julia.im, 0.156));
pruefe('Die Julia-Kamera faengt bei der Uebersicht an',
  nah(z.ziel.mitteRe, 0) && nah(z.ziel.log2Zoom, z.anfangJulia.log2Zoom),
  'Zoom ' + Math.pow(2, z.ziel.log2Zoom).toFixed(2));
pruefe('Der Wechsel wird gemeldet', gewechselt === 1);
// Hart, nicht gleitend: eine Fahrt von einer Menge in die andere waere Unsinn.
pruefe('Ansicht und Ziel stehen gleich', nah(z.ansicht.log2Zoom, z.ziel.log2Zoom)
  && nah(z.ansicht.mitteRe, z.ziel.mitteRe) && nah(z.ansicht.mitteIm, z.ziel.mitteIm));
pruefe('Die Mandelbrot-Stelle ist gemerkt',
  !!z.gemerkt.mandelbrot && nah(z.gemerkt.mandelbrot.log2Zoom, 26.5)
  && nah(z.gemerkt.mandelbrot.mitteRe, -0.743643887));

// --- 2. Die Uebersicht gilt fuer die Menge, die gezeigt wird ---
z.ziel.log2Zoom = 9;
K.einpassen();
pruefe('0 fuehrt in der Julia-Menge zu deren Uebersicht',
  nah(z.ziel.mitteRe, 0) && nah(z.ziel.log2Zoom, z.anfangJulia.log2Zoom));

// --- 3. Zurueck: die tiefe Stelle ist wieder da ---
z.ziel.mitteRe = 0.25;
z.ziel.log2Zoom = 4;
M.nachMandelbrot();
pruefe('J fuehrt zurueck zur Mandelbrot-Menge', z.menge === 'mandelbrot');
pruefe('Die tiefe Stelle ist unveraendert wieder da',
  nah(z.ziel.log2Zoom, 26.5) && nah(z.ziel.mitteRe, -0.743643887)
  && nah(z.ziel.mitteIm, 0.131825904));
pruefe('Die Julia-Ansicht wurde samt c gemerkt',
  !!z.gemerkt.julia && nah(z.gemerkt.julia.re, -0.8) && nah(z.gemerkt.julia.log2Zoom, 4)
  && nah(z.gemerkt.julia.mitteRe, 0.25));

// --- 4. Zweimal J zeigt zweimal dasselbe ---
M.wechseln(0.3, 0.5);     // das c unter dem Zeiger darf die gemerkte nicht ueberschreiben
pruefe('J holt die gemerkte Julia-Ansicht zurueck',
  z.menge === 'julia' && nah(z.julia.re, -0.8) && nah(z.ziel.log2Zoom, 4)
  && nah(z.ziel.mitteRe, 0.25));
M.wechseln();
pruefe('Und J wieder heraus', z.menge === 'mandelbrot' && nah(z.ziel.log2Zoom, 26.5));
pruefe('istJulia stimmt mit dem Zustand ueberein', M.istJulia() === false);

// --- 5. Der Zeiger meldet seine Stelle an die Vorschau ---
F.Maus.starten(leinwand);
K.einpassen();
z.ansicht.log2Zoom = z.ziel.log2Zoom;
z.ansicht.mitteRe = z.ziel.mitteRe;
z.ansicht.mitteIm = z.ziel.mitteIm;

// Bewegung ohne gedrueckte Taste: nichts wird verschoben, die Vorschau folgt.
const vorRe = z.ansicht.mitteRe;
horcher.pointermove({ pointerId: 7, clientX: 300, clientY: 200 });
pruefe('Zeigerbewegung ohne Taste verschiebt nichts', z.ansicht.mitteRe === vorRe);
pruefe('Zeigerbewegung meldet die Stelle an die Vorschau',
  !!gemeldet && gemeldet.x === 300 && gemeldet.y === 200
  && gemeldet.breite === 800 && gemeldet.hoehe === 600);

// Gemeldet wird die Bildschirmstelle, nicht das fertige c - die Vorschau
// rechnet es selbst, weil die Kamera bis zum Bildtakt weiterfaehrt.
const welt = K.bildschirmZuWelt(gemeldet.x, gemeldet.y,
  { width: gemeldet.breite, height: gemeldet.hoehe }, z.ansicht);
pruefe('Aus der gemeldeten Stelle wird das richtige c',
  welt.re < 0 && welt.im > 0, 'c = ' + welt.re.toFixed(3) + ' + ' + welt.im.toFixed(3) + 'i');

// Auch beim Mausrad: der Zeiger steht, die Welt unter ihm wechselt.
gemeldet = null;
horcher.wheel({ deltaY: -100, deltaMode: 0, clientX: 120, clientY: 90,
                preventDefault: () => {} });
pruefe('Auch das Mausrad meldet die Stelle nach', !!gemeldet && gemeldet.x === 120);

// --- 6. Taste J ist verdrahtet ---
let jGerufen = 0;
F.Tastatur.starten({ menge: () => { jGerufen++; } });
let verhindert = false;
horcher['window:keydown']({ code: 'KeyJ', key: 'j', target: {},
                            preventDefault: () => { verhindert = true; } });
pruefe('J ruft den Mengenwechsel auf', jGerufen === 1);
pruefe('J wird nicht an die Seite weitergegeben', verhindert);
horcher['window:keyup']({ code: 'KeyJ', key: 'j' });

// --- 7. Der Shader bekommt den Schalter, nicht ein drittes Kompilat ---
const einfach = F.Shader.fraktal(false);
const doppelt = F.Shader.fraktal(true);
pruefe('Der einfache Shader kennt u_julia', einfach.indexOf('uniform int   u_julia;') >= 0);
pruefe('Der doppelte Shader kennt u_julia', doppelt.indexOf('uniform int   u_julia;') >= 0);
pruefe('Das feste c kommt doppelt genau hinueber',
  doppelt.indexOf('u_juliaReD') >= 0 && doppelt.indexOf('u_juliaImD') >= 0);
pruefe('Es gibt kein eigenes Julia-Kompilat', doppelt.indexOf('#define JULIA') < 0);
pruefe('#version steht in beiden ganz vorn',
  einfach.indexOf('#version 300 es\n') === 0 && doppelt.indexOf('#version 300 es\n') === 0);

// --- 8. Der Zeichner legt den Schalter um ---
let skalaZuletzt = 1;
F.Leinwand = {
  groesseAnpassen: (s) => { skalaZuletzt = s; return false; },
  groesse: () => ({ breite: Math.round(1200 * skalaZuletzt), hoehe: Math.round(800 * skalaZuletzt) }),
  zeichnen: (b, h) => { gezeichnet.push({ breite: b, hoehe: h }); },
};
F.PalettenTextur = { binden: () => true, aktuell: () => ({ innen: [0, 0, 0] }) };

const gezeichnet = [];
const gesetzt = {};
const gl = {
  uniform1i: (o, w) => { gesetzt[o] = w; },
  uniform1f: (o, w) => { gesetzt[o] = w; },
  uniform2f: (o, a, b) => { gesetzt[o] = [a, b]; },
  uniform3f: (o, a, b, c) => { gesetzt[o] = [a, b, c]; },
};
const programm = { benutzen() {}, ort: (n) => n };
F.Zeichner.starten(gl, { einfach: programm, doppelt: programm });

F.Zeichner.eingabe();
F.Zeichner.schritt(0, false);
pruefe('In der Mandelbrot-Menge steht der Schalter auf 0', gesetzt.u_julia === 0);

M.nachJulia(-0.1234567890123, 0.9876543210987);
F.Zeichner.eingabe();
F.Zeichner.schritt(1000, false);
pruefe('In der Julia-Menge steht der Schalter auf 1', gesetzt.u_julia === 1);
pruefe('Das feste c geht einfach genau hinueber',
  Math.abs(gesetzt.u_juliaC[0] - (-0.1234567890123)) < 1e-7);
// Die Probe geht nur ueber die Summe: der tiefe Teil ist ein Rest, keine
// abgeschnittenen Stellen (siehe CLAUDE.md).
pruefe('Das feste c geht doppelt genau hinueber',
  Math.abs((gesetzt.u_juliaReD[0] + gesetzt.u_juliaReD[1]) - (-0.1234567890123)) < 1e-14
  && Math.abs((gesetzt.u_juliaImD[0] + gesetzt.u_juliaImD[1]) - 0.9876543210987) < 1e-14,
  'Rest ' + (gesetzt.u_juliaReD[0] + gesetzt.u_juliaReD[1] + 0.1234567890123).toExponential(1));

// --- 9. Die Vorschau zeichnet in ihr eigenes Ziel, nicht auf die Leinwand ---
gezeichnet.length = 0;
const ziel = { breite: 220, hoehe: 220, taugt: true, gebunden: 0, geloest: 0,
               binden() { this.gebunden++; }, loesen() { this.geloest++; } };
const gelang = F.Zeichner.inZiel(ziel, {
  breite: 220, hoehe: 220, mitteRe: 0, mitteIm: 0, skala: 3.6 / 220,
  iterationen: 280, proben: 1, julia: true, cRe: -0.4, cIm: 0.6,
});
pruefe('Die Vorschau wird gezeichnet', gelang === true);
pruefe('Sie zeichnet in ihrer eigenen Groesse',
  gezeichnet.length === 1 && gezeichnet[0].breite === 220 && gezeichnet[0].hoehe === 220);
pruefe('Das Ziel wird gebunden und wieder geloest',
  ziel.gebunden === 1 && ziel.geloest === 1);
pruefe('Die Vorschau zeigt immer eine Julia-Menge', gesetzt.u_julia === 1);
pruefe('Ohne taugliches Ziel passiert nichts',
  F.Zeichner.inZiel({ taugt: false }, {}) === false && gezeichnet.length === 1);

// Und das Hauptbild danach wieder in voller Groesse und mit der Hauptmenge.
F.Zeichner.eingabe();
F.Zeichner.schritt(2000, false);
pruefe('Danach zeichnet das Hauptbild wieder auf die Leinwand',
  gezeichnet.length === 2 && gezeichnet[1].breite === undefined);

console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : '\n' + fehler + ' FEHLER');
process.exit(fehler === 0 ? 0 : 1);
