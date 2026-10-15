/* Tastatur.
 *
 * Richtungs- und Zoomtasten werden nicht als Ereignis verarbeitet, sondern
 * gedrueckt gehalten und in der Bildschleife abgefragt. Nur so ist die
 * Bewegung gleichmaessig - die Wiederholrate des Betriebssystems waere
 * ruckelig und auf jedem Rechner anders.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Tastatur = (function () {
  'use strict';

  var gedrueckt = {};
  var aktionen = {};

  function starten(einmalige) {
    aktionen = einmalige || {};
    window.addEventListener('keydown', beiRunter);
    window.addEventListener('keyup', beiHoch);
    // Beim Fensterwechsel kommt kein keyup an - sonst laeuft das Bild weiter.
    window.addEventListener('blur', function () { gedrueckt = {}; });
  }

  /* `event.code` ist belegungsunabhaengig und damit der richtige Weg. Nur
   * nachgebildete Ereignisse (Tests, Hilfsmittel) liefern ihn nicht - dann
   * der Rueckfall auf `event.key`. */
  function nameVon(ereignis) {
    return ereignis.code || ereignis.key || '';
  }

  function beiRunter(ereignis) {
    if (ereignis.ctrlKey || ereignis.metaKey || ereignis.altKey) return;
    if (istEingabefeld(ereignis.target)) return;

    var name = nameVon(ereignis);
    gedrueckt[name] = true;

    /* Das Betriebssystem wiederholt gehaltene Tasten. Die Richtungstasten
     * leben davon nicht - sie werden gehalten abgefragt -, die einmaligen
     * Aktionen aber duerfen nichts davon mitbekommen: ein liegengebliebener
     * Finger auf der Leertaste schaltete den Dauerzoom sonst dreissigmal in
     * der Sekunde an und aus. */
    if (ereignis.repeat) return;

    if (name === 'Digit0' || name === 'Numpad0' || ereignis.key === '0') {
      aufrufen('einpassen');
      ereignis.preventDefault();
      return;
    }

    if (name === 'KeyG' || ereignis.key === 'g' || ereignis.key === 'G') {
      aufrufen('rechenweg');
      ereignis.preventDefault();
      return;
    }

    if (name === 'KeyJ' || ereignis.key === 'j' || ereignis.key === 'J') {
      aufrufen('menge');
      ereignis.preventDefault();
      return;
    }

    if (name === 'KeyB' || ereignis.key === 'b' || ereignis.key === 'B') {
      aufrufen('lesezeichen');
      ereignis.preventDefault();
      return;
    }

    if (name === 'KeyL' || ereignis.key === 'l' || ereignis.key === 'L') {
      aufrufen('verweis');
      ereignis.preventDefault();
      return;
    }

    // Die Leertaste scrollt sonst die Seite.
    if (name === 'Space' || ereignis.key === ' ' || ereignis.key === 'Spacebar') {
      aufrufen('dauerzoom');
      ereignis.preventDefault();
      return;
    }

    // Ziffern 1 bis 5 waehlen die Palette.
    var ziffer = zifferAus(name, ereignis.key);
    if (ziffer >= 1 && ziffer <= 5) {
      aufrufen('palette', ziffer);
      ereignis.preventDefault();
      return;
    }

    // Pfeiltasten scrollen sonst die Seite.
    if (name.indexOf('Arrow') === 0) ereignis.preventDefault();
  }

  function beiHoch(ereignis) {
    delete gedrueckt[nameVon(ereignis)];
  }

  function aufrufen(name, wert) {
    if (typeof aktionen[name] === 'function') aktionen[name](wert);
  }

  /* Ziffer aus Digit1/Numpad1 oder - als Rueckfall - aus der Taste selbst. */
  function zifferAus(name, taste) {
    var treffer = /^(?:Digit|Numpad)([1-9])$/.exec(name);
    if (treffer) return parseInt(treffer[1], 10);
    if (/^[1-9]$/.test(taste || '')) return parseInt(taste, 10);
    return 0;
  }

  function istEingabefeld(ziel) {
    if (!ziel || !ziel.tagName) return false;
    var art = ziel.tagName.toLowerCase();
    return art === 'input' || art === 'textarea' || art === 'select';
  }

  function an() {
    for (var i = 0; i < arguments.length; i++) {
      if (gedrueckt[arguments[i]]) return true;
    }
    return false;
  }

  /* Was gerade gehalten wird, als Richtung: x und y in -1..1, zoom in -1..1. */
  function richtung() {
    var x = 0, y = 0, zoom = 0;

    if (an('KeyD', 'ArrowRight')) x += 1;
    if (an('KeyA', 'ArrowLeft')) x -= 1;
    if (an('KeyW', 'ArrowUp')) y += 1;
    if (an('KeyS', 'ArrowDown')) y -= 1;

    if (an('Equal', 'NumpadAdd', 'BracketRight', '+')) zoom += 1;
    if (an('Minus', 'NumpadSubtract', 'Slash', '-')) zoom -= 1;

    return { x: x, y: y, zoom: zoom };
  }

  return { starten: starten, richtung: richtung };
})();
