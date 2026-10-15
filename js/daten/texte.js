/* Texte als Daten.
 *
 * Die Erklaerung in der Seitenleiste wechselt mit der Menge, die gerade auf
 * der Hauptbuehne steht. Sie gehoert deshalb nicht ins HTML, sondern hierher -
 * wie die Paletten und die Orte. Ein neuer Satz ist dann ein Dateneintrag und
 * keine Codeaenderung.
 */
window.FRAKTAL = window.FRAKTAL || {};

FRAKTAL.Texte = {

  /* Das Hilfefenster. `tasten` ist eine Liste aus Taste und Wirkung. */
  hilfe: {
    titel: 'Was hier zu sehen ist',
    absaetze: [
      'Jedes Pixel ist eine komplexe Zahl c. Gefragt wird, ob die Folge '
        + 'z → z² + c beschränkt bleibt. Bleibt sie es, gehört c zur '
        + 'Mandelbrot-Menge – das ist das Schwarze. Draußen zeigt die Farbe, '
        + 'wie schnell die Folge entkommen ist.',
      'Gerechnet wird das für jedes Pixel einzeln auf der Grafikkarte, bei '
        + 'jedem Bild neu. Deshalb kann man hineinfahren, ohne an ein Ende '
        + 'zu kommen: es gibt kein fertiges Bild, in das man hineinzoomt, '
        + 'sondern jede Ebene wird gerechnet, wenn man sie ansieht.',
      'Irgendwann ist trotzdem Schluss, und zwar nicht beim Fraktal, sondern '
        + 'bei den Zahlen. Wie viel Luft noch bleibt, steht links unter '
        + '„Genauigkeit“ – ehrlich, statt versteckt.'
    ],
    gruppen: [
      {
        titel: 'Bewegen',
        tasten: [
          ['Mausrad', 'zoomen, und zwar dorthin, wo der Zeiger steht'],
          ['Ziehen', 'das Bild verschieben'],
          ['Doppelklick', 'eine Stufe näher heran, mit Umschalt wieder heraus'],
          [['W', 'A', 'S', 'D'], 'schieben, auch mit den Pfeiltasten'],
          [['+', '−'], 'zoomen ohne Maus'],
          ['0', 'zurück zur Übersicht']
        ]
      },
      {
        titel: 'Sehen',
        tasten: [
          [['1', '…', '5'], 'Palette wählen'],
          ['G', 'Rechenweg: automatisch, einfach, doppelt genau']
        ]
      },
      {
        titel: 'Behalten',
        tasten: [
          ['B', 'Lesezeichen für diese Stelle, mit Vorschaubild'],
          ['L', 'Link zu dieser Stelle in die Zwischenablage'],
          ['H', 'diese Hilfe auf und zu'],
          ['Esc', 'Fenster schließen']
        ]
      }
    ],
    schluss: 'Nichts davon wird ins Netz geschickt. Die Seite lädt keine '
      + 'Bibliothek, keine Schrift und kein Bild; Lesezeichen und der letzte '
      + 'Stand liegen im Speicher des Browsers, sonst nirgends.'
  },

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

  }
};
