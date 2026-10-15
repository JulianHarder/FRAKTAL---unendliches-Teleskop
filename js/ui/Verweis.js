/* Taste L: einen Link zu dieser Stelle in die Zwischenablage.
 *
 * Der Link ist die ehrlichste Art, eine Stelle weiterzugeben - er enthaelt
 * Koordinate, Zoom, Palette und notfalls das feste c, und mehr braucht es
 * nicht, um genau dasselbe Bild wieder aufzubauen.
 *
 * Das Kopieren kann der Browser verweigern: die Zwischenablage braucht in
 * vielen Fassungen eine Benutzergeste und einen sicheren Kontext, und ueber
 * file:// ist beides nicht sicher zu haben. Deshalb der zweite Weg ueber ein
 * verstecktes Textfeld - und wenn auch der nicht geht, steht der Link eben
 * zum Markieren da. Was nicht passieren darf: dass die Taste nichts tut und
 * niemand weiss, warum.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Verweis = (function () {
  'use strict';

  function kopieren() {
    var link = FRAKTAL.Adresse.alsText();

    if (window.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(
        function () { gelungen(); },
        function () { ueberTextfeld(link); }
      );
      return;
    }
    ueberTextfeld(link);
  }

  function ueberTextfeld(link) {
    if (altModus(link)) gelungen();
    else FRAKTAL.Meldung.zeigen('Kopieren hat der Browser abgelehnt – hier ist der Link:', link);
  }

  /* Der alte Weg: Text in ein Feld, markieren, kopieren lassen. */
  function altModus(link) {
    try {
      var feld = document.createElement('textarea');
      feld.value = link;
      feld.setAttribute('readonly', '');
      // Ausserhalb des Bildes, aber nicht display:none - sonst laesst sich
      // nichts markieren und das Kopieren schlaegt fehl.
      feld.style.position = 'fixed';
      feld.style.left = '-9999px';
      document.body.appendChild(feld);
      feld.select();

      var gelang = document.execCommand && document.execCommand('copy');
      document.body.removeChild(feld);
      return !!gelang;
    } catch (fehler) {
      return false;
    }
  }

  function gelungen() {
    FRAKTAL.Meldung.zeigen('Link zu dieser Stelle kopiert.');
  }

  return { kopieren: kopieren };
})();
