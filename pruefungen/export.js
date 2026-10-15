// Prueft die Geometrie der Kacheln: deckt sich das, was gerechnet wird, mit
// dem, was ins Bild gesetzt wird? Ein Versatz um eine halbe Kachel oder eine
// gekippte Zeile sieht im fertigen Bild nach Fraktal aus, nicht nach Fehler.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
// Relativ zur eigenen Lage - damit die Pruefung in jedem Klon laeuft.
const ordner = path.join(__dirname, '..', 'js') + path.sep;

const kontext = { Math, console };
kontext.window = kontext;
kontext.globalThis = kontext;
kontext.window.addEventListener = () => {};
// Der Bildtakt laeuft hier sofort - so liegt der ganze Lauf in einer Zeile.
kontext.window.requestAnimationFrame = (fn) => { fn(0); };

// Attrappe fuer den 2D-Canvas: merkt sich nur, was wohin gesetzt wurde.
const gesetzt = [];
kontext.document = {
  createElement: () => ({
    width: 0, height: 0,
    getContext: () => ({
      createImageData: (b, h) => ({ width: b, height: h, data: new Uint8Array(b * h * 4) }),
      putImageData: (bild, x, y) => { gesetzt.push({ x, y, breite: bild.width, hoehe: bild.height }); },
    }),
  }),
};
vm.createContext(kontext);
vm.runInContext(fs.readFileSync(ordner + 'gl/Kachel.js', 'utf8'), kontext, { filename: 'Kachel.js' });

const F = kontext.FRAKTAL;
// Zeichner und Ziel sind hier nur Zaehlwerke.
const gemalt = [];
F.Zeichner = { inZiel: (ziel, o) => { gemalt.push(o); return true; } };
const ziele = [];
F.Ziel = {
  erzeugen: (gl, b, h) => {
    const ziel = { breite: b, hoehe: h, taugt: true, geloescht: false,
                   lesen: () => {}, loeschen() { this.geloescht = true; } };
    ziele.push(ziel);
    return ziel;
  },
  spiegeln: (von, nach) => nach,
};

let fehler = 0;
function pruefe(name, ok, zusatz) {
  console.log((ok ? 'OK   ' : 'FEHL ') + name + (zusatz ? '  ' + zusatz : ''));
  if (!ok) fehler++;
}
const nah = (a, b) => Math.abs(a - b) < 1e-12;

// Absichtlich krumm: drei Spalten, zwei Zeilen, Randkacheln angeschnitten.
const BREITE = 300, HOEHE = 220, KANTE = 128;
const AUFTRAG = {
  breite: BREITE, hoehe: HOEHE, kante: KANTE,
  mitteRe: -0.5, mitteIm: 0.25, skala: 0.001,
  iterationen: 700, proben: 2, doppelt: true,
};

pruefe('Die Kachelzahl stimmt mit der Ankuendigung ueberein',
  F.Kachel.anzahl(BREITE, HOEHE, KANTE) === 6, F.Kachel.anzahl(BREITE, HOEHE, KANTE) + ' Kacheln');

let fertigeLeinwand = null;
const meldungen = [];
F.Kachel.malen(null, AUFTRAG, (getan, gesamt) => meldungen.push([getan, gesamt]),
  (leinwand) => { fertigeLeinwand = leinwand; });

pruefe('Alle Kacheln wurden gerechnet', gemalt.length === 6, gemalt.length + ' Stueck');
pruefe('Am Ende kommt ein Bild heraus', !!fertigeLeinwand);
pruefe('Es hat die bestellte Groesse',
  fertigeLeinwand && fertigeLeinwand.width === BREITE && fertigeLeinwand.height === HOEHE);
pruefe('Der Fortschritt zaehlt von 0 bis 6',
  meldungen.length === 7 && meldungen[0][0] === 0 && meldungen[6][0] === 6
  && meldungen.every((m) => m[1] === 6));

// 1. Decken die Kacheln das Bild genau ab - ohne Loch und ohne Ueberlappung?
const abgedeckt = new Uint8Array(BREITE * HOEHE);
gesetzt.forEach((k) => {
  for (let y = k.y; y < k.y + k.hoehe; y++) {
    for (let x = k.x; x < k.x + k.breite; x++) {
      if (x >= 0 && x < BREITE && y >= 0 && y < HOEHE) abgedeckt[y * BREITE + x]++;
    }
  }
});
let luecken = 0, doppelt = 0;
for (let i = 0; i < abgedeckt.length; i++) {
  if (abgedeckt[i] === 0) luecken++;
  if (abgedeckt[i] > 1) doppelt++;
}
pruefe('Die Kacheln decken das ganze Bild ab', luecken === 0, luecken + ' Pixel ohne Kachel');
pruefe('Und keine liegt auf einer anderen', doppelt === 0, doppelt + ' Pixel doppelt belegt');
pruefe('Keine Kachel ragt ueber den Rand hinaus',
  gesetzt.every((k) => k.x >= 0 && k.y >= 0
    && k.x + k.breite <= BREITE && k.y + k.hoehe <= HOEHE));

// 2. Stimmt die Mitte jeder Kachel mit ihrer Lage im Bild ueberein?
//    Nachgerechnet wird ueber die Weltkoordinate der linken oberen Ecke:
//    sie muss fuer jede Kachel dasselbe ergeben wie fuer das ganze Bild.
let groessterVersatz = 0;
gemalt.forEach((o, i) => {
  const k = gesetzt[i];
  // Linke Kante der Kachel in Weltkoordinaten ...
  const linksWelt = o.mitteRe - (o.breite / 2) * AUFTRAG.skala;
  // ... und dieselbe Kante, aus der Lage im Gesamtbild gerechnet.
  const sollLinks = AUFTRAG.mitteRe + (k.x - BREITE / 2) * AUFTRAG.skala;

  // Oben entsprechend - der Imaginaerteil zeigt nach oben, die Bildzeilen
  // nach unten, daher das umgedrehte Vorzeichen.
  const obenWelt = o.mitteIm + (o.hoehe / 2) * AUFTRAG.skala;
  const sollOben = AUFTRAG.mitteIm + (HOEHE / 2 - k.y) * AUFTRAG.skala;

  groessterVersatz = Math.max(groessterVersatz,
    Math.abs(linksWelt - sollLinks) / AUFTRAG.skala,
    Math.abs(obenWelt - sollOben) / AUFTRAG.skala);
});
pruefe('Jede Kachel rechnet genau den Ausschnitt, an dem sie liegt',
  groessterVersatz < 1e-9, 'hoechstens ' + groessterVersatz.toExponential(1) + ' Pixel daneben');

// 3. Die uebrigen Werte muessen unveraendert durchgereicht werden.
pruefe('Tiefe, Abtastung und Rechenweg gehen an jede Kachel',
  gemalt.every((o) => o.iterationen === 700 && o.proben === 2 && o.doppelt === true
    && o.skala === AUFTRAG.skala));

// 4. Nur vier verschiedene Kachelgroessen - volle, Rand rechts, Rand unten, Ecke.
pruefe('Es werden nur so viele Ziele angelegt wie noetig',
  ziele.length === 4, ziele.length + ' Ziele fuer 6 Kacheln');
pruefe('Und am Ende wieder freigegeben', ziele.every((z) => z.geloescht));

// 5. Abbrechen
gemalt.length = 0;
gesetzt.length = 0;
let abgebrochenesBild = 'nichts';
// Dieses Mal laeuft der Bildtakt erst auf Zuruf.
const warteschlange = [];
kontext.window.requestAnimationFrame = (fn) => { warteschlange.push(fn); };
const lauf = F.Kachel.malen(null, AUFTRAG, () => {}, (leinwand) => { abgebrochenesBild = leinwand; });
warteschlange.shift()(0);         // eine Kachel
lauf.abbrechen();
warteschlange.shift()(0);         // und jetzt soll Schluss sein
pruefe('Abbrechen haelt den Lauf an', gemalt.length === 1, gemalt.length + ' Kachel gerechnet');
pruefe('Und meldet, dass nichts herauskam', abgebrochenesBild === null);

console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : '\n' + fehler + ' FEHLER');
process.exit(fehler === 0 ? 0 : 1);
