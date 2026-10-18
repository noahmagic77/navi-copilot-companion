# NAVIs 110 Bewegungen

Die Fee bietet 110 auswählbare Bewegungen: die zwölf bisherigen Grundbewegungen, 88 parametrisierte Choreografien in acht Familien und zehn zusätzliche Begrüßungen. Flügelschlag, Körperbewegung, Licht, Schatten und Glitzer bleiben miteinander verbunden. Lagewechsel werden sanft abgefedert; Flügel und Glitzer behalten beim Wechsel ihre Phase. Beim Ausblenden oder Pausieren bleibt die gesamte Bewegungszeit stehen.

## Wiedergabe ab Hotfix v0.6.1

Automatische Begleiterreaktionen unterbrechen eine ausdrücklich gewählte Vorschau nicht mehr. Eine echte laufende Modellanfrage hat weiterhin Vorrang. Einzelvorschauen laufen auch nativ selbstständig in Schleifen; nach dem Stoppen gilt der aktuelle Begleiterausdruck. Beim Wiederöffnen der Ansicht wird die laufende Vorschau erneut übermittelt. Natürliche Clips verwenden ihre Katalogdauer und die Webview ruht nach 90 stillen Sekunden.

`npm run test:animations` prüft alle 110 Auswahlen und die Gesamtfolge im echten Browser mit steuerbarer Animationszeit. Die nativen Go-Tests rendern jede Vorschau über zwei vollständige Zyklen in GDI+. Dies sind automatische Prüfungen; eine menschliche Sichtabnahme wird dadurch nicht behauptet.

## Zehn zusätzliche Begrüßungen

Flügelwinken, Verbeugen, Heranhüpfen, Willkommenskreis, Sonnenbogen, Funkeln, Willkommenswirbel, Wiegen, Willkommenstanz und Hervorschauen. Beim Erweiterungsstart, Zurückkehren ins VS-Code-Fenster und Wechsel zu einem anderen Texteditor-Tab wählt NAVI zufällig eine Begrüßung aus einem gemischten Zehner-Vorrat; jede kommt vor einer erneuten Mischung einmal vor, ohne direkte Wiederholung an der Rundengrenze; diese Ereignisse teilen eine Sperrzeit von 15 Sekunden. Bei erneutem Sichtbarwerden der NAVI-Ansicht gibt es ebenfalls eine Begrüßung mit 15 Sekunden Sperrzeit. Die Ansicht unterbricht dafür keine Vorschau oder aktive Prompt-Interaktion; der native Helfer schützt seine Zuhören-/Nachdenken-Zustände. Tabs außerhalb von VS Code werden nicht beobachtet.

| Familie | Anzahl | Beispiele |
| --- | --- | --- |
| Grundbewegungen | 12 | Begrüßen, Zuhören, Nachdenken, Ausruhen |
| Gleiten | 11 | Brise, Blatt, Feder, Luftband |
| Bögen | 11 | Sonnenbogen, Mondbogen, Regenbogen |
| Hüpfen | 11 | Tautropfen, Luftsteine, Freudensprung |
| Kreisen | 11 | Halo, Ellipse, Satellit |
| Spuren | 11 | Welle, Zickzack, Schlangenlinie |
| Spiralen | 11 | Muschel, Galaxie, Lichtrose |
| Leuchten | 11 | Glühwürmchen, Stern, Laterne |
| Gesten | 11 | Nicken, Verbeugen, Winken |

Die neuen Varianten unterscheiden sich in Pfadform, Amplitude, Rhythmus, Phase, Neigung und koordinierten Flügel-/Lichtbewegungen. Es sind prozedurale Animationen derselben Vektorfee. Gleiten, Bögen und Kreisen ergänzen die natürlichen Leerlaufbewegungen; alle 110 sind gezielt in der Vorschau verfügbar. Die semantischen Grundzustände bleiben an die bisherigen Interaktionen gebunden.

| Bewegung | Wann sie erscheint |
| --- | --- |
| Begrüßen | Beim Öffnen und beim Aufwachen nach einer Pause. |
| Ruhig schweben | Als ruhiger Grundzustand zwischen anderen Bewegungen. |
| Seitlich gleiten | Gelegentlich im Leerlauf. |
| Neugierig umsehen | Bei Mausbewegungen über der Fee und gelegentlich im Leerlauf. |
| Eine kleine Acht fliegen | Als gelegentliche Variation im Leerlauf. |
| Flügel strecken | Als gelegentliche Variation im Leerlauf. |
| Sanft drehen | Als gelegentliche Variation im Leerlauf. |
| Aufmerksam zuhören | Als auswählbare Bewegung oder kurze Empfangsreaktion; kein Nachweis einer Mikrofonaufnahme. |
| Nachdenken | Während einer eigenen aktiven Modellanfrage. |
| Einen Hinweis geben | Bei einer Diagnose oder einem Begleiterangebot. |
| Sich freuen | Als ausdrückliche Vorschau oder positive Spielreaktion; keine Prompt-Bewertung. |
| Ausruhen | Nach 90 Sekunden ohne Interaktion in der NAVI-Ansicht. |

Diese Reaktionen verwenden NAVIs eigene Zustände und verfügbare Editorereignisse. Sie beobachten keine fremden Chat-Eingaben. Eine Mikrofonaufnahme benötigt zusätzlich einen unterstützten Anbieter und ausdrückliche Aktivierung; aktuell ist kein echter Anbieter angebunden.

## Alle Bewegungen ansehen

1. **NAVI: Open Companion / Ansicht öffnen** in der Befehlspalette öffnen.
2. **110 Bewegungen entdecken** aufklappen.
3. Eine Bewegung auswählen oder **Alle ansehen** starten.

Die Auswahl ist nach Familien gruppiert. Eine ausgewählte Einzelbewegung wird wiederholt, bis die Vorschau beendet wird. **Alle ansehen** spielt die vollständige Folge einmal ab; sie dauert mehrere Minuten. Ein Fortschrittsbalken zeigt die aktuelle Bewegung an. **Natürlich bewegen** oder **Vorschau beenden** beendet die Vorschau sofort. Eine neue eigene Modellanfrage hat Vorrang vor einer Vorschau. Im Vorschaumodus werden Wege, Flügelbewegungen, Drehung und Licht betont; natürliche Leerlaufbewegungen bleiben zurückhaltender. Die native Fee übernimmt den Vorschaumodus und startet dabei keinen eigenen zufälligen Flug. Die Einstellung **Animation an/aus** gilt für alle 110 Bewegungen. Mit `navi.fairy.respectReducedMotion` lässt sich die Betriebssystempräferenz berücksichtigen; standardmäßig ist diese Option aus.

[Früheres Video der zwölf Grundbewegungen](navi-12-motions.mp4)

## Prüfung

Automatische Tests prüfen exakt 110 eindeutige IDs und Posen, endliche und begrenzte Positionen, alle 12.100 gerichteten Bewegungskombinationen beim Übergang, vollständige Drehungen, Pausen, Bildraten und wiederverwendbare Pose-Ausgaben. Die native Bewegungsberechnung wird auf Speicherallokationen geprüft. Wahrnehmungs- und Zielflugtests durchlaufen automatisch alle 110 Zustände.

`media/fairy-motion.js` ist die Quelle des Katalogs. `node scripts/native-motion-fixture.cjs` erzeugt den TypeScript-Katalog, native Definitionen und neun Referenzposen pro Bewegung (sechs normale, drei verstärkte Vorschauposen). `npm run check` und `npm test` erkennen veraltete generierte Dateien. Die Go-Tests vergleichen alle 990 Referenzposen mit der Webview-Berechnung. Zusätzliche Verlaufstests prüfen bei jeder Bewegung, ob sich die Choreografie über die Zeit ändert; Schweben und Ausruhen bleiben bewusst ruhige Zustände mit kontinuierlichem Flügelschlag.

`node scripts/test-fairy-preview.cjs` prüft die tatsächliche Webview in installiertem Edge/Chromium ohne zusätzliche Bibliotheken (`NAVI_CHROMIUM` kann den Browserpfad vorgeben). Der Lauf prüft den vollständigen Auswahlkatalog, sichtbare Frameänderungen bei Kreisflug, Leuchten und Gesten, Vorschau-Nachrichten an den Helfer, Wiederholung, Pause, Fortsetzen, Sichtbarkeit und Rückkehr zum Automatikmodus. Bericht und Bildschirmfoto liegen unter `build/preview-runtime/`. Eine visuelle Live-Prüfung im Extension-Host steht separat aus.

Die Browserprüfung ersetzt keinen Live-Test im VS-Code-Extension-Host. Die tatsächliche Bildrate hängt von Bildschirm und Rechner ab.

Ab v0.5.0 werden Bildraten ausdrücklich begrenzt. Neue Zustände erhalten einen kurzen weichen Übergang mit aktiver Bildrate; danach gelten niedrigere Ruhe-Budgets. Der Windows-Helfer unterstützt dieselben 110 Bewegungszustände. [Vordergrund-Fee](OVERLAY.md).
