/* Einstieg: Kontext holen, Shader bauen, Bildschleife starten.
 *
 * Ablauf beim Laden:
 *   1. WebGL2-Kontext holen - fehlt er, bleibt ein ehrlicher Hinweis stehen
 *   2. Shader kompilieren
 *   3. Eingabe verdrahten
 *   4. Schleife: Kamera bewegen, zeichnen lassen
 *
 * Die Schleife laeuft dauerhaft, rechnet aber nichts, solange das Bild steht.
 * Ein Fraktal pro Bild neu zu rechnen, obwohl sich nichts bewegt, waere
 * verschenkte Rechenzeit und bei tiefen Stellen hoerbar (Luefter).
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Haupt = (function () {
  'use strict';

  var z = FRAKTAL.Zustand;

  var TEMPO = 0.8;        // Bildhoehen je Sekunde beim Schieben mit Tasten
  var ZOOM_TEMPO = 1.8;   // log2-Stufen je Sekunde bei + und -
  var MERK_ABSTAND = 2000; // Millisekunden zwischen zwei Schreibvorgaengen

  var leinwand = null;
  var gl = null;

  var letzteZeit = 0;
  var bildzaehler = 0;
  var bildrateZeit = 0;
  var letzteBreite = 0;
  var letzteHoehe = 0;
  var merkZeit = 0;
  var letzterStand = '';

  function starten() {
    leinwand = document.getElementById('leinwand');

    /* Erst der gemerkte Stand, dann die Adresse: ein geteilter Link soll das
     * Gedaechtnis ueberstimmen. Wer einen Link bekommt, will die Stelle aus
     * dem Link sehen und nicht die, bei der er selbst zuletzt war. */
    FRAKTAL.Speicher.laden();
    FRAKTAL.Speicher.standAnwenden(z);
    FRAKTAL.Adresse.lesen();

    gl = FRAKTAL.Kontext.erzeugen(leinwand);
    if (!gl) {
      keinWebglZeigen();
      return;
    }

    FRAKTAL.Leinwand.starten(gl, leinwand);
    FRAKTAL.PalettenTextur.starten(gl);
    FRAKTAL.PalettenTextur.waehlen(z.regler.palette);
    FRAKTAL.Seitenleiste.starten();
    FRAKTAL.Seitenleiste.erklaerung();
    FRAKTAL.Seitenleiste.grafikkarte(FRAKTAL.Kontext.faehigkeiten(gl).renderer);

    FRAKTAL.Kontext.ueberwachen(leinwand, neuAufbauen);

    // Die Moduswahl muss stehen, bevor programmBauen ihre Verfügbarkeit setzt.
    FRAKTAL.Rechenmodus.starten(function () { FRAKTAL.Zeichner.eingabe(); });
    if (!programmBauen()) return;

    FRAKTAL.Meldung.starten();
    FRAKTAL.Ortswahl.starten(function () { FRAKTAL.Zeichner.eingabe(); });
    FRAKTAL.Lesezeichen.starten(gl, function () { FRAKTAL.Zeichner.eingabe(); });
    FRAKTAL.Export.starten(gl);
    FRAKTAL.Hilfe.starten();

    FRAKTAL.Seitenleiste.genauigkeitGemessen(z.laufzeit.bits);
    FRAKTAL.Maus.starten(leinwand);
    FRAKTAL.Farbwahl.starten(function () { FRAKTAL.Zeichner.eingabe(); });
    FRAKTAL.Tastatur.starten({
      einpassen: uebersicht,
      palette: function (nummer) { FRAKTAL.Farbwahl.nachNummer(nummer); },
      rechenweg: function () { FRAKTAL.Rechenmodus.weiter(); },
      lesezeichen: function () { FRAKTAL.Lesezeichen.setzen(); },
      verweis: function () { FRAKTAL.Verweis.kopieren(); },
      hilfe: function () { FRAKTAL.Hilfe.umschalten(); },
      schliessen: schliessen
    });

    document.getElementById('knopf-uebersicht').addEventListener('click', uebersicht);
    document.getElementById('knopf-merken')
      .addEventListener('click', function () { FRAKTAL.Lesezeichen.setzen(); });
    document.getElementById('knopf-link')
      .addEventListener('click', function () { FRAKTAL.Verweis.kopieren(); });
    document.getElementById('knopf-hilfe')
      .addEventListener('click', function () { FRAKTAL.Hilfe.umschalten(); });

    letzteBreite = leinwand.clientWidth;
    letzteHoehe = leinwand.clientHeight;
    window.addEventListener('resize', fenstergroesse);

    window.requestAnimationFrame(schleife);
  }

  /* Beide Shader übersetzen: den einfachen und den doppelt genauen.
   *
   * Der einfache muss gelingen, sonst gibt es kein Bild. Der doppelte darf
   * scheitern - alte Grafikkarten können ihn nicht, und dann bleibt es eben
   * beim schnellen Weg mit seiner früheren Grenze. Still ignorieren wäre
   * aber falsch: der Knopf wird abgeschaltet, damit niemand auf eine
   * Genauigkeit wartet, die nie kommt. */
  function programmBauen() {
    var einfach = null;
    var doppelt = null;

    try {
      einfach = FRAKTAL.Programm.bauen(gl, FRAKTAL.Shader.vertex, FRAKTAL.Shader.fraktal(false));
    } catch (fehler) {
      console.error(fehler.message);
      keinWebglZeigen('Der Shader ließ sich nicht übersetzen. Die Einzelheiten stehen in der Browser-Konsole.');
      return false;
    }

    // Ohne hohe Genauigkeit im Fragment-Shader hat die Emulation keine Basis.
    var bits = FRAKTAL.Kontext.faehigkeiten(gl).highpBits;
    if (bits >= 23) {
      try {
        doppelt = FRAKTAL.Programm.bauen(gl, FRAKTAL.Shader.vertex, FRAKTAL.Shader.fraktal(true));
      } catch (fehler) {
        console.warn('Doppelgenauigkeit nicht verfügbar:\n' + fehler.message);
      }
    } else {
      console.warn('Diese Grafikkarte rechnet im Fragment-Shader nur mit '
        + bits + ' Bit - zu wenig für die Doppelgenauigkeit.');
    }

    if (doppelt) doppelt = nachmessen(doppelt);

    FRAKTAL.Genauigkeit.doppeltVerfuegbar(!!doppelt);
    FRAKTAL.Rechenmodus.verfuegbarkeit(!!doppelt);
    FRAKTAL.Zeichner.starten(gl, { einfach: einfach, doppelt: doppelt });
    return true;
  }

  /* Nachmessen, was die Karte im Doppelmodus wirklich traegt.
   *
   * Ohne diese Messung glaubt die Oberflaeche der Annahme von 46 Bit und
   * verspricht Stellen, die es auf dieser Karte vielleicht gar nicht gibt -
   * das Bild wird stufig und daneben steht "doppelt, 5 Stellen uebrig". Wer
   * das sieht, sucht den Fehler bei sich.
   *
   * Bringt der doppelte Weg nichts, wird er abgeschaltet: er kostet das
   * Fuenffache und waere nur eine teure Luege. */
  function nachmessen(programm) {
    var mass = FRAKTAL.Nachmessen.doppelt(gl);
    if (!mass) return programm;            // nicht messbar - bei der Annahme bleiben

    // Was gemessen wurde, kann ueber der Annahme liegen - mehr als die
    // Emulation hergibt, wird daraus trotzdem nicht. Angezeigt wird der
    // Wert, mit dem auch gerechnet wird.
    z.laufzeit.bits = FRAKTAL.Zahl.gemessen(mass.bits);

    if (mass.bits <= FRAKTAL.Zahl.BITS_EINFACH + 2) {
      console.warn('Die Doppelgenauigkeit bringt auf dieser Grafikkarte nichts: '
        + 'nachgemessen ' + mass.bits + ' statt 46 Bit. Der Shader-Compiler hat '
        + 'die Fehlerterme vermutlich wegoptimiert.');
      programm.loeschen();
      return null;
    }

    if (mass.bits < 44) {
      console.warn('Diese Grafikkarte traegt im Doppelmodus nur ' + mass.bits
        + ' von 46 Bit - tief drinnen wird das Bild frueher stufig.');
    }
    return programm;
  }

  /* Nach einem Kontextverlust: alles, was auf der Grafikkarte lag, ist weg. */
  function neuAufbauen() {
    FRAKTAL.Leinwand.starten(gl, leinwand);
    // Auch die Palettentextur lag auf der Grafikkarte und ist weg.
    FRAKTAL.PalettenTextur.starten(gl);
    if (programmBauen()) FRAKTAL.Zeichner.eingabe();
  }

  /* Browser melden `resize` auch, wenn sich an der Leinwand nichts aendert -
   * etwa beim Ein- und Ausblenden von Browserleisten. Ein volles Neuzeichnen
   * kostet tief drinnen eine halbe Sekunde, also wird erst nachgesehen. */
  function fenstergroesse() {
    if (leinwand.clientWidth === letzteBreite && leinwand.clientHeight === letzteHoehe) return;

    letzteBreite = leinwand.clientWidth;
    letzteHoehe = leinwand.clientHeight;
    FRAKTAL.Zeichner.eingabe();
  }

  function uebersicht() {
    FRAKTAL.Kamera.einpassen();
    FRAKTAL.Zeichner.eingabe();
  }

  /* Taste Esc: wegraeumen, was offen ist - nur eines je Druck. Wer die Hilfe
   * schliesst, will nicht zugleich den Export abbrechen. */
  function schliessen() {
    if (FRAKTAL.Hilfe.offen()) { FRAKTAL.Hilfe.zu(); return; }
    if (FRAKTAL.Export.laeuft()) FRAKTAL.Export.abbrechen();
  }

  /* Der ehrliche Hinweis statt einer schwarzen Flaeche.
   *
   * Zwei Wege fuehren hierher: gar kein WebGL2-Kontext, oder ein Shader, den
   * der Treiber nicht uebersetzt. Beides ist nichts, was der Benutzer falsch
   * gemacht hat - also steht es da, und die leere Leinwand geht weg. */
  function keinWebglZeigen(text) {
    var hinweis = document.getElementById('kein-webgl');
    if (text) document.getElementById('kein-webgl-text').textContent = text;
    hinweis.hidden = false;
    leinwand.style.display = 'none';
  }

  // --- Die Schleife ---

  function schleife(jetzt) {
    if (!letzteZeit) letzteZeit = jetzt;
    var dt = (jetzt - letzteZeit) / 1000;
    letzteZeit = jetzt;
    // Nach einem Tabwechsel nicht mit einem Riesenschritt durch die Ebene springen.
    if (dt > 0.1) dt = 0.1;

    var bewegt = tasten(dt);
    if (FRAKTAL.Kamera.schritt(dt)) bewegt = true;

    if (FRAKTAL.Zeichner.schritt(jetzt, bewegt)) bildzaehler++;

    bildrateMessen(jetzt);
    standMerken(jetzt);
    FRAKTAL.Seitenleiste.aktualisieren(z);
    window.requestAnimationFrame(schleife);
  }

  /* Gehaltene Tasten in Bewegung umsetzen. */
  function tasten(dt) {
    var r = FRAKTAL.Tastatur.richtung();
    if (!r.x && !r.y && !r.zoom) return false;

    if (r.x || r.y) FRAKTAL.Kamera.schieben(r.x * TEMPO * dt, r.y * TEMPO * dt);
    if (r.zoom) FRAKTAL.Kamera.zoomenMitte(r.zoom * ZOOM_TEMPO * dt);

    FRAKTAL.Zeichner.eingabe();
    return true;
  }

  /* Den Stand ab und zu wegschreiben, damit das naechste Laden dort anfaengt,
   * wo man aufgehoert hat.
   *
   * Nicht bei jeder Bewegung: localStorage schreibt synchron auf die Platte,
   * und waehrend einer Mausradserie waeren das hundert Schreibvorgaenge, die
   * alle der Bildschleife im Weg stehen. Alle zwei Sekunden genuegt - und nur
   * dann, wenn sich wirklich etwas geaendert hat. */
  function standMerken(jetzt) {
    if (jetzt - merkZeit < MERK_ABSTAND) return;
    merkZeit = jetzt;

    var jetztStand = [z.ansicht.mitteRe, z.ansicht.mitteIm, z.ansicht.log2Zoom,
      z.regler.palette, z.regler.dichte, z.regler.verschiebung,
      z.regler.qualitaet].join('|');
    if (jetztStand === letzterStand) return;

    letzterStand = jetztStand;
    FRAKTAL.Speicher.standMerken(z);
  }

  /* Gezaehlt werden nur wirklich gerechnete Bilder, nicht die Leerlaufrunden -
   * sonst zeigt die Anzeige im Stillstand stolze 60 statt der Wahrheit. */
  function bildrateMessen(jetzt) {
    if (!bildrateZeit) bildrateZeit = jetzt;
    if (jetzt - bildrateZeit < 500) return;

    z.laufzeit.bildrate = bildzaehler === 0
      ? 0
      : bildzaehler * 1000 / (jetzt - bildrateZeit);
    bildzaehler = 0;
    bildrateZeit = jetzt;
  }

  return { starten: starten };
})();

window.addEventListener('DOMContentLoaded', function () { FRAKTAL.Haupt.starten(); });
