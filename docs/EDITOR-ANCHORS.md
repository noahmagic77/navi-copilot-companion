# Pixelnavigation zur Diagnose

Stand: 24.10.2026 · Hotfix v0.6.2 für Windows x64.

Nach **Probleme zeigen**, **Nächstes Problem** oder **Problem beheben** setzt NAVI einen eindeutigen zweifarbigen Anker ausschließlich im ausgewählten Editor. Der native Helfer erkennt dessen tatsächliche Pixelposition und fliegt auf dieselbe Höhe, 60 DIPs links daneben. Der Kern hält dort die Höhe; Flügel und Licht bleiben animiert.

## Diagnose und Fix

Die frühere Desktop-Aufnahme enthielt NAVIs eigenes transparentes Fenster. Der Anker wurde zunächst gefunden und kurz vor der Ankunft von der Fee verdeckt. Der strenge Erkenner verwarf das teilweise überlagerte Farbrechteck und beendete den Flug. Dies wurde sowohl in der Windows-CI als auch im tatsächlichen VS-Code-Host reproduziert.

Während der begrenzten Zielverfolgung nimmt Windows ausschließlich NAVIs eigene Fee und Sprechblase aus Aufnahmen aus. Das Overlay bleibt auf dem Bildschirm sichtbar. Beim Abbruch, nach Ablauf oder bei Fokusverlust wird die normale Aufnahmepolitik wiederhergestellt. Die Desktop-Komposition bleibt nötig, um auch die GPU-gerenderte Chromium-Oberfläche zu lesen; die separat getestete Aufnahme über den reinen Fenster-DC war dafür ungeeignet. GDI-Schreibvorgänge werden vor dem Lesen/Löschen des Bitmap-Speichers abgeschlossen.

## Datenweg und Grenzen

- Nur nach ausdrücklicher Diagnose-Navigation, höchstens 20 Sekunden und vier Messungen pro Sekunde. Vor der Aufnahme wird das aktive Besitzerfenster erneut geprüft.
- Nur Pixel innerhalb des Clientbereichs dieses Fensters werden flüchtig gelesen und sofort verworfen. Kein OCR, keine Speicherung oder Übertragung von Bildern. An die Extension gehen ausschließlich Kennung, Status, Koordinaten und ein begrenzter Fehlergrund.
- Fehlende oder mehrdeutige Marker ergeben kein geratenes Ziel. Der Hover nennt jetzt den tatsächlichen Ausfall: Aufnahme, fehlende/mehrdeutige Markierung, fehlende Windows-Unterstützung, Platzmangel oder Ablauf.
- Scrollen, Layout und Zoom werden während der Verfolgung erneut gemessen. Änderungen am Dokument, ein anderer aktiver Editor, Fokusverlust, Pause, Spiel, Vorschau, manuelle Ziele und direkte Anfragen beenden die Verfolgung. Maus-Ausweichen behält Vorrang.
- Der Flug benötigt Aufnahmeausschlüsse ab Windows 10 Version 2004. Während der höchstens 20 Sekunden können NAVIs eigene Fenster in Bildschirmaufnahmen fehlen. Das betrifft ausschließlich NAVI; nach dem Ende gilt wieder der normale Zustand. Die eingebettete Ansicht wird nicht aus Aufnahmen ausgenommen.
- `navi.overlay.editorAnchors: false` deaktiviert den Flug. Normale Problemnavigation und Quick Fixes bleiben nutzbar. Ohne erforderliche Windows-Unterstützung bleibt die Editor-Markierung mit Erklärung erhalten.
- Flächen über 16 Millionen Pixel, zu kleine Fenster, fehlende exakte Farben bei HDR/Farbkorrektur oder erzwungener Kontrastdarstellung ergeben kein geschätztes Ziel. Weitere physische Monitor-/DPI-Konfigurationen bleiben getrennt von den automatischen Geometrieprüfungen.

Verwendet werden öffentliche [VS-Code-Dekorationen](https://code.visualstudio.com/api/references/vscode-api#DecorationRenderOptions), [BitBlt](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-bitblt), [GdiFlush](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-gdiflush) und [SetWindowDisplayAffinity](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity). Keine DOM-Manipulation, DevTools-Verbindung oder zusätzliche Laufzeit im Produkt.

## Nachweise

- [Echter Überdeckungs-Regressionstest](../native/overlay/capture_windows_test.go): Ein tatsächlich dargestelltes und geprüftes Overlay verdeckt den Marker vollständig. Ohne Ausschluss schlägt die Erkennung fehl; mit Ausschluss bleibt sie korrekt. Danach wird die Wiederherstellung für Fee und Sprechblase geprüft.
- [Native Tests](../native/overlay/anchor_windows_test.go): eindeutige/fehlende/doppelte Ziele, Ablauf, Mausvorrang sowie Kernposition bei DPI-Faktoren 1, 1,25, 1,5, 2 und 2,25 einschließlich negativer Monitorursprünge.
- [Windows-Fenstertest](../scripts/test-overlay-window.ps1): tatsächliche sichtbare Landung mit höchstens einem Pixel Abweichung, Sprechblasen, Besitzerbewegung, Fokus, Minimieren und sauberes Beenden. Der bisher fehlgeschlagene gehostete Windows-Lauf besteht mit dem Fix.
- [Vollständiger isolierter VS-Code-Host](../scripts/companion-host-suite.cjs): Editoranker → Pixelaufnahme → native Ankunft für Ausgangslayout, Zoom und umgebrochenen Text in geteilten Gruppen. Nach Scrollen wird die geänderte Pixelhöhe erneut erreicht; Diagnoseentfernung stoppt die Verfolgung. Dies ist keine bloße Renderer-Simulation.
- [Bereinigter Anker-Prüfbericht](../downloads/navi-anchor-audit-0.6.2.json). Menschliche Sichtabnahme im normalen Profil sowie andere physische Displays bleiben zusätzlich erforderlich.

Der GitHub-Release wartet ab v0.6.2 sowohl auf CI/Paketprüfung als auch auf erfolgreiche native Windows-Abnahme desselben main-Commits. [Release-Notizen](releases/v0.6.2.de.md).
