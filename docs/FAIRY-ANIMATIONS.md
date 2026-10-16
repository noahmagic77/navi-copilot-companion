# NAVIs zwölf Bewegungen

Ab Version 0.4.0 bewegt sich die weiße Fee nach einem gemeinsamen Ablauf. Flügelschlag, Körperbewegung, Licht, Schatten und Glitzer bleiben miteinander verbunden. Lagewechsel werden sanft abgefedert; Flügel und Glitzer behalten beim Wechsel ihre Phase. Beim Ausblenden oder Pausieren bleibt die gesamte Bewegungszeit stehen.

| Bewegung | Wann sie erscheint |
| --- | --- |
| Begrüßen | Beim Öffnen und beim Aufwachen nach einer Pause. |
| Ruhig schweben | Als ruhiger Grundzustand zwischen anderen Bewegungen. |
| Seitlich gleiten | Gelegentlich im Leerlauf. |
| Neugierig umsehen | Bei Mausbewegungen über der Fee und gelegentlich im Leerlauf. |
| Eine kleine Acht fliegen | Als gelegentliche Variation im Leerlauf. |
| Flügel strecken | Als gelegentliche Variation im Leerlauf. |
| Sanft drehen | Als gelegentliche Variation im Leerlauf. |
| Aufmerksam zuhören | Wenn das Prompt-Feld fokussiert ist. |
| Nachdenken | Während eine lokale Prompt-Prüfung auf ihr Ergebnis wartet; meist sehr kurz. |
| Einen Hinweis geben | Wenn die lokale Prüfung Hinweise liefert. |
| Sich freuen | Wenn die lokale Prüfung keine Hinweise liefert. |
| Ausruhen | Nach 90 Sekunden ohne Interaktion in der NAVI-Ansicht. |

Diese Reaktionen beziehen sich auf NAVIs eigene Ansicht und lokale Prüfung. Sie beobachten keine fremden Chat-Eingaben und greifen nicht auf Mikrofon, Kamera oder andere Anwendungen zu.

## Alle Bewegungen ansehen

1. **NAVI: Open Companion / Ansicht öffnen** in der Befehlspalette öffnen.
2. **12 Bewegungen entdecken** aufklappen.
3. Eine Bewegung auswählen oder **Alle ansehen** starten.

Einzelne Vorschauen und die vollständige Folge enden automatisch. **Natürlich bewegen** oder **Vorschau beenden** beendet die Vorschau sofort. Eine neue Prompt-Prüfung hat Vorrang vor einer Vorschau. Die Einstellung **Animation an/aus** und die Systemeinstellung für reduzierte Bewegung gelten für alle zwölf Bewegungen.

[Video der vollständigen Folge](navi-12-motions.mp4)

## Prüfung

Die fünf Bewegungstests prüfen zwölf unterschiedliche Posen, endliche und begrenzte Positionen, die Unabhängigkeit der Federberechnung von 30/60/120 Hz, stetige Zustandswechsel, vollständige Drehungen ohne Richtungswechsel am Winkelübergang und stabile Pausen. Die Webview wurde in Chromium mit ihrer strikten CSP geprüft: alle zwölf Bewegungen in Folge, Ruhemodus, Eingabereaktionen, Vorschau, nur eine Animationsschleife, feste Partikelanzahl, reduzierte Bewegung, ausgeblendete Ansicht sowie helle und dunkle Designs.

Die Browserprüfung ersetzt keinen Live-Test im VS-Code-Extension-Host. Die tatsächliche Bildrate hängt von Bildschirm und Rechner ab.

Ab v0.5.0 werden Bildraten ausdrücklich begrenzt. Neue Zustände erhalten einen kurzen weichen Übergang mit aktiver Bildrate; danach gelten niedrigere Ruhe-Budgets. Der Windows-Helfer unterstützt dieselben zwölf Bewegungszustände. [Vordergrund-Fee](OVERLAY.md).
