// Laedt Zustand.js und Kamera.js in Node und prueft die Rechnung.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
// Relativ zur eigenen Lage - damit die Pruefung in jedem Klon laeuft.
const ordner = path.join(__dirname, '..', 'js') + path.sep;

// Im Browser IST window das globale Objekt - hier muss der Kontext sich
// selbst als window sehen, sonst findet `FRAKTAL.Zustand = ...` nichts.
const kontext = { Math, console };
kontext.window = kontext;
kontext.globalThis = kontext;
vm.createContext(kontext);
for (const datei of ['kern/Zustand.js', 'ansicht/Kamera.js', 'ansicht/Iterationen.js']) {
  vm.runInContext(fs.readFileSync(ordner + datei, 'utf8'), kontext, { filename: datei });
}
const F = kontext.FRAKTAL;
const z = F.Zustand, K = F.Kamera;

let fehler = 0;
function pruefe(name, bedingung, zusatz) {
  console.log((bedingung ? 'OK   ' : 'FEHL ') + name + (zusatz ? '  ' + zusatz : ''));
  if (!bedingung) fehler++;
}

const r = { width: 800, height: 600, left: 0, top: 0 };
const zeiger = { x: 640, y: 180 };   // bewusst weit aus der Mitte

// 1. Zoom zum Zeiger: der Punkt unter dem Zeiger muss stehen bleiben.
let vorher = K.bildschirmZuWelt(zeiger.x, zeiger.y, r, z.ziel);
for (let i = 0; i < 40; i++) K.zoomen(K.RASTUNG, zeiger.x, zeiger.y, r);
let nachher = K.bildschirmZuWelt(zeiger.x, zeiger.y, r, z.ziel);
let abw = Math.max(Math.abs(vorher.re - nachher.re), Math.abs(vorher.im - nachher.im));
let pixel = (z.BASIS_HOEHE / Math.pow(2, z.ziel.log2Zoom)) / r.height;
pruefe('Zoom zum Zeiger haelt den Punkt (40 Rastungen)', abw < pixel * 0.01,
  'Abweichung ' + (abw / pixel).toExponential(2) + ' Pixel, Zoom ' + Math.pow(2, z.ziel.log2Zoom).toExponential(2));

// 2. Herauszoomen muss es ebenso halten.
vorher = K.bildschirmZuWelt(zeiger.x, zeiger.y, r, z.ziel);
for (let i = 0; i < 20; i++) K.zoomen(-K.RASTUNG, zeiger.x, zeiger.y, r);
nachher = K.bildschirmZuWelt(zeiger.x, zeiger.y, r, z.ziel);
abw = Math.max(Math.abs(vorher.re - nachher.re), Math.abs(vorher.im - nachher.im));
pixel = (z.BASIS_HOEHE / Math.pow(2, z.ziel.log2Zoom)) / r.height;
pruefe('Zoom zum Zeiger haelt den Punkt (zurueck)', abw < pixel * 0.01);

// 3. Ziehen: 100 Pixel nach rechts muessen die Welt um 100 Pixelbreiten verschieben.
K.einpassen();
z.ansicht.mitteRe = z.ziel.mitteRe; z.ansicht.mitteIm = z.ziel.mitteIm;
z.ansicht.log2Zoom = z.ziel.log2Zoom;
const vorRe = z.ansicht.mitteRe, vorIm = z.ansicht.mitteIm;
const skala = (z.BASIS_HOEHE / Math.pow(2, z.ansicht.log2Zoom)) / r.height;
K.ziehen(100, -60, r);
pruefe('Ziehen nach rechts bewegt die Mitte nach links',
  Math.abs((z.ansicht.mitteRe - vorRe) - (-100 * skala)) < 1e-12);
pruefe('Ziehen nach oben bewegt die Mitte nach unten',
  Math.abs((z.ansicht.mitteIm - vorIm) - (-60 * skala)) < 1e-12);
pruefe('Ziehen nimmt das Ziel mit', Math.abs(z.ziel.mitteRe - z.ansicht.mitteRe) < 1e-12);

// 4. Glaettung: die Ansicht muss das Ziel erreichen und dann Ruhe geben.
K.einpassen();
K.zoomen(8, 400, 300, r);
let runden = 0;
while (K.schritt(1 / 60) && runden < 2000) runden++;
pruefe('Annaeherung kommt zur Ruhe', runden < 2000, runden + ' Bilder');
pruefe('Ansicht erreicht das Ziel', Math.abs(z.ansicht.log2Zoom - z.ziel.log2Zoom) < 1e-9);
pruefe('Danach meldet die Kamera Stillstand', K.schritt(1 / 60) === false);

// 5. Grenzen
K.einpassen();
for (let i = 0; i < 1000; i++) K.zoomenMitte(1);
pruefe('Zoom ist nach oben begrenzt', z.ziel.log2Zoom <= 50, 'log2 ' + z.ziel.log2Zoom);
for (let i = 0; i < 1000; i++) K.zoomenMitte(-1);
pruefe('Zoom ist nach unten begrenzt', z.ziel.log2Zoom >= -1.5);

// 6. Iterationstiefe waechst mit, bleibt aber in den Grenzen.
const flach = F.Iterationen.fuer(0, 1);
const tief = F.Iterationen.fuer(33, 1);
const extrem = F.Iterationen.fuer(200, 3);
pruefe('Tiefe waechst mit dem Zoom', tief > flach * 10, flach + ' -> ' + tief);
pruefe('Tiefe bleibt unter der Obergrenze', extrem === F.Iterationen.HOECHSTENS);
pruefe('Tiefe hat einen Sockel', F.Iterationen.fuer(0, 0.01) >= 150);

console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : '\n' + fehler + ' FEHLER');
process.exit(fehler === 0 ? 0 : 1);
