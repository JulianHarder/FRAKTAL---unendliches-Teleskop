/* Der Zeichner entscheidet, wie teuer das naechste Bild sein darf.
 *
 * Ein Fraktal in voller Aufloesung und voller Tiefe zu rechnen dauert tief
 * drinnen mehrere hundert Millisekunden. Waehrend man zoomt waere das
 * unbrauchbar - man will fluessig fahren, nicht auf Dias warten. Also:
 *
 *   in Bewegung  -> halbe Aufloesung, 60 % der Iterationen (unscharf, fluessig)
 *   im Stillstand -> volle Aufloesung, volle Tiefe (einmal, dann Ruhe)
 *
 * Dazu eine Notbremse: dauert ein Bild laenger als eine Sekunde, wird die
 * Tiefe gedrosselt. Sonst kann der Grafiktreiber den WebGL-Kontext abschiessen,
 * weil er den Prozess fuer haengend haelt.
 *
 * Ausserdem liegen hier zwei uebersetzte Shader bereit - einfach und doppelt
 * genau. Welcher zeichnet, sagt js/ansicht/Genauigkeit.js.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Zeichner = (function () {
  'use strict';

  var z = FRAKTAL.Zustand;

  var GROB_SKALA = 0.5;       // halbe Kantenlaenge = ein Viertel der Pixel
  var GROB_ITER = 0.6;
  var RUHE_MS = 120;          // so lange nach der letzten Eingabe bleibt es grob
  var ZU_LANGSAM_MS = 1000;
  var SCHNELL_GENUG_MS = 200;

  /* Die Notbremse zieht in zwei Stufen, und die Reihenfolge ist der ganze
   * Witz daran: zuerst faellt die Kantenglaettung weg, erst danach wird an
   * der Iterationstiefe gespart.
   *
   * Die Glaettung kostet das Vierfache und bringt ein bisschen weichere
   * Raender. Die Tiefe dagegen ist der Inhalt: wer dort spart, dem faellt
   * tief drinnen die Struktur weg und das Bild wird schwarz. Andersherum
   * gedrosselt sieht es aus, als waere das Fraktal zu Ende. */
  var glaetten = true;

  /* 2^12 + 1. Kommt als Uniform in den Shader, damit der Compiler die
   * Aufspaltung nicht wegkuerzen kann - siehe js/shader/bausteine.js. Dort
   * steht auch, warum es daneben eine Eins als Uniform gibt. Beide muessen
   * gesetzt werden: ein vergessenes Uniform ist null, und dann rechnet die
   * halbe Arithmetik null. */
  var SPLIT = 4097.0;

  var gl = null;
  var programme = { einfach: null, doppelt: null };

  // -Infinity, nicht 0: die Zeitmessung beginnt beim Laden der Seite, und
  // mit 0 galten die ersten 120 ms als "gerade eben eine Eingabe" - das
  // erste Bild waere unnoetig grob gewesen.
  var letzteEingabe = -Infinity;
  var eingabeOffen = false;
  var feinAusstehend = true;
  var begonnen = 0;
  var notbremse = 1.0;

  function starten(grafik, gebaute) {
    gl = grafik;
    programme = gebaute;
    feinAusstehend = true;
    glaetten = true;
    notbremse = 1.0;
  }

  /* Von jeder Eingabe aufrufen: Mausrad, Ziehen, Taste, Fenstergroesse.
   *
   * Hier wird bewusst KEINE Zeit genommen. Der Zeitstempel kommt im naechsten
   * Bildtakt aus derselben Uhr, mit der auch gerechnet wird. Nimmt man hier
   * `performance.now()`, vergleicht `schritt()` zwei verschiedene Uhren -
   * und wenn die auseinanderlaufen, gilt die letzte Eingabe fuer immer als
   * "gerade eben" und das Bild bleibt dauerhaft grob. */
  function eingabe() {
    eingabeOffen = true;
    feinAusstehend = true;
  }

  /* Ein Durchgang. Gibt true zurueck, wenn wirklich gerechnet wurde. */
  function schritt(jetzt, inBewegung) {
    messen(jetzt);

    // Seit dem letzten Takt eingegangene Eingaben jetzt stempeln.
    if (eingabeOffen) {
      eingabeOffen = false;
      letzteEingabe = jetzt;
    }

    // Kurz nach einer Eingabe noch grob bleiben: sonst schiebt sich bei einer
    // Mausradserie zwischen zwei Rastungen ein teures Feinbild dazwischen.
    var frisch = (jetzt - letzteEingabe) < RUHE_MS;

    if (inBewegung || frisch) {
      feinAusstehend = true;
      z.laufzeit.neuZeichnen = false;
      zeichnen(GROB_SKALA, GROB_ITER, jetzt);
      return true;
    }

    if (feinAusstehend || z.laufzeit.neuZeichnen) {
      feinAusstehend = false;
      z.laufzeit.neuZeichnen = false;
      zeichnen(1.0, 1.0, jetzt);
      return true;
    }

    return false;
  }

  function zeichnen(skala, iterFaktor, jetzt) {
    FRAKTAL.Leinwand.groesseAnpassen(skala);
    var g = FRAKTAL.Leinwand.groesse();
    var fein = skala >= 1.0;

    // Rechenweg waehlen, bevor die Uniforms gesetzt werden.
    var modus = FRAKTAL.Genauigkeit.aktualisieren(z.ansicht.log2Zoom, z.regler.rechenmodus, g.hoehe);
    var programm = programme[modus] || programme.einfach;

    var iterationen = FRAKTAL.Iterationen.fuer(
      z.ansicht.log2Zoom,
      z.regler.qualitaet * iterFaktor * notbremse
    );

    bildSetzen(programm, {
      breite: g.breite,
      hoehe: g.hoehe,
      mitteRe: z.ansicht.mitteRe,
      mitteIm: z.ansicht.mitteIm,
      skala: z.skala(g.hoehe),
      iterationen: iterationen,
      // Kanten glaetten nur im Standbild, und nur solange Zeit dafuer ist.
      proben: (fein && glaetten) ? 2 : 1
    });

    FRAKTAL.Leinwand.zeichnen();

    z.laufzeit.iterationen = iterationen;
    z.laufzeit.grob = !fein;
    z.laufzeit.modus = modus;
    z.laufzeit.stellen = FRAKTAL.Genauigkeit.stellen(z.ansicht.log2Zoom, g.hoehe, modus);
    begonnen = jetzt;
  }

  /* Alle Uniforms fuer ein Bild setzen.
   *
   * `o` beschreibt das Bild vollstaendig: Groesse, Ausschnitt, Tiefe,
   * Unterabtastung. Dadurch setzt derselbe Weg das Hauptbild, die
   * Vorschaubilder der Lesezeichen und die Kacheln des Exports - die
   * unterscheiden sich nur in diesen Werten, nicht im Vorgehen. */
  function bildSetzen(programm, o) {
    var palette = FRAKTAL.PalettenTextur.aktuell();

    programm.benutzen();
    gl.uniform2f(programm.ort('u_groesse'), o.breite, o.hoehe);
    gl.uniform1i(programm.ort('u_iterationen'), o.iterationen);

    /* Beide Zahlenformate werden gesetzt. Das jeweils andere gibt es im
     * uebersetzten Shader nicht, `ort` liefert dafuer null - und WebGL
     * ignoriert Uniforms ohne Platz stillschweigend. Das erspart hier eine
     * Fallunterscheidung. */
    gl.uniform2f(programm.ort('u_mitte'), o.mitteRe, o.mitteIm);
    gl.uniform1f(programm.ort('u_skala'), o.skala);

    var mitteRe = FRAKTAL.Zahl.teilen(o.mitteRe);
    var mitteIm = FRAKTAL.Zahl.teilen(o.mitteIm);
    var feinSchritt = FRAKTAL.Zahl.teilen(o.skala);
    gl.uniform2f(programm.ort('u_mitteReD'), mitteRe[0], mitteRe[1]);
    gl.uniform2f(programm.ort('u_mitteImD'), mitteIm[0], mitteIm[1]);
    gl.uniform2f(programm.ort('u_skalaD'), feinSchritt[0], feinSchritt[1]);
    gl.uniform1f(programm.ort('u_split'), SPLIT);
    gl.uniform1f(programm.ort('u_eins'), 1.0);

    FRAKTAL.PalettenTextur.binden();
    gl.uniform1i(programm.ort('u_palette'), 0);
    gl.uniform1f(programm.ort('u_dichte'), z.regler.dichte);
    gl.uniform1f(programm.ort('u_verschiebung'), z.regler.verschiebung);
    gl.uniform3f(programm.ort('u_innen'),
      palette.innen[0] / 255, palette.innen[1] / 255, palette.innen[2] / 255);
    gl.uniform1i(programm.ort('u_proben'), o.proben);
  }

  /* Ein Bild in ein Ziel neben dem Bildschirm zeichnen; der Aufrufer holt
   * sich die Pixel danach mit `lesen` von dort.
   *
   * Welcher Rechenweg, entscheidet dasselbe Mass wie beim Hauptbild - nur
   * fuer dieses Bild gerechnet. Das Vorschaubild eines Lesezeichens von einer
   * tiefen Stelle zerfiele sonst in Kloetzchen, waehrend das grosse Bild
   * daneben scharf ist.
   *
   * `o.doppelt` erzwingt den genauen Weg. Davon lebt der Export: er rechnet
   * das Bild in Kacheln, und jede Kachel hat ihre eigene Mitte. Mathematisch
   * ist das dasselbe, in 32 Bit gerundet aber nicht - wo nur noch knapp zwei
   * Stellen Luft sind, treffen zwei Kacheln am Stoss nicht mehr exakt
   * dieselbe Farbe. Mit vierzehn Stellen Luft ist der Unterschied kleiner
   * als jede Farbstufe. Ein Bild, das man sich aufhebt, darf dafuer laenger
   * rechnen. */
  function inZiel(ziel, o) {
    if (!gl || !ziel || !ziel.taugt || !programme.einfach) return false;

    var log2Zoom = Math.log2(z.BASIS_HOEHE / (o.skala * o.hoehe));
    var knapp = o.doppelt
      || FRAKTAL.Genauigkeit.stellen(log2Zoom, o.hoehe, 'einfach') < FRAKTAL.Genauigkeit.KNAPP;
    bildSetzen((knapp && programme.doppelt) || programme.einfach, o);
    ziel.binden();
    FRAKTAL.Leinwand.zeichnen(ziel.breite, ziel.hoehe);
    ziel.loesen();
    return true;
  }

  /* Wie lange hat das letzte Bild gebraucht?
   *
   * Gemessen wird der Abstand bis zum naechsten Bildtakt. Das ist keine reine
   * GPU-Zeit, aber die ehrlichste Zahl, die ohne `gl.finish()` zu haben ist -
   * und `gl.finish()` wuerde genau die Blockade erzeugen, die wir vermeiden. */
  function messen(jetzt) {
    if (!begonnen) return;

    var dauer = jetzt - begonnen;
    begonnen = 0;
    z.laufzeit.letzteDauer = dauer;

    if (dauer > ZU_LANGSAM_MS) {
      if (glaetten) glaetten = false;          // Stufe 1: Glaettung weg
      else notbremse = Math.max(0.2, notbremse * 0.6);   // Stufe 2: Tiefe kuerzen
    } else if (dauer < SCHNELL_GENUG_MS) {
      // Wieder Luft: in umgekehrter Reihenfolge zuruecknehmen.
      if (notbremse < 1.0) notbremse = Math.min(1.0, notbremse * 1.2);
      else glaetten = true;
    }
    z.laufzeit.notbremse = notbremse;
    z.laufzeit.glaetten = glaetten;
  }

  return {
    starten: starten,
    eingabe: eingabe,
    schritt: schritt,
    inZiel: inZiel
  };
})();
