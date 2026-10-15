/* Texte als Daten.
 *
 * Die Erklaerung in der Seitenleiste wechselt mit der Menge, die gerade auf
 * der Hauptbuehne steht. Sie gehoert deshalb nicht ins HTML, sondern hierher -
 * wie die Paletten und die Orte. Ein neuer Satz ist dann ein Dateneintrag und
 * keine Codeaenderung.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Texte = {

  erklaerung: {
    mandelbrot: {
      titel: 'Mandelbrot-Menge',
      saetze: [
        'Jedes Pixel ist eine Zahl c. Gefragt wird, ob die Folge z → z² + c '
          + 'beschränkt bleibt. Bleibt sie es, gehört c zur Menge – das ist '
          + 'das Schwarze. Draußen zeigt die Farbe, wie schnell die Folge '
          + 'entkommen ist.',
        'Beim Zoomen wird kurz grob gerechnet, im Stillstand dann scharf. '
          + 'Die Iterationstiefe wächst mit – sonst würde tief drinnen alles '
          + 'schwarz.'
      ]
    },

    julia: {
      titel: 'Julia-Menge',
      saetze: [
        'Dieselbe Folge z → z² + c, nur andersherum gefragt: c steht jetzt '
          + 'fest – eine einzige Zahl für das ganze Bild –, und jedes Pixel '
          + 'ist der Startwert z. Zu sehen ist also, welche Startwerte bei '
          + 'diesem c beschränkt bleiben.',
        'Jeder Punkt der Mandelbrot-Menge hat seine eigene Julia-Menge, und '
          + 'die Formen hängen zusammen: nahe am Rand der Mandelbrot-Menge '
          + 'wird die Julia-Menge filigran, weit außerhalb zerfällt sie zu '
          + 'Staub. Mit J geht es zurück.'
      ]
    }
  }
};
