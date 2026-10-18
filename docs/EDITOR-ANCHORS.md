# Pixelnavigation zur Diagnose

Stand: 18.10.2026 · experimentelle Funktion der v0.6.0-Vorschau für Windows x64.

Nach **Probleme zeigen**, **Nächstes Problem** oder **Problem beheben** erhält die ausgewählte Diagnose einen kleinen zweifarbigen Zielanker vor dem Text. Die Markierung gilt ausschließlich für den ausgewählten Editor, auch wenn dieselbe Datei in mehreren Gruppen geöffnet ist.

Der vorhandene Windows-Helfer sucht das tatsächlich gezeichnete Rechteck. Die Fee fliegt auf einer kurzen Kurve zur gemessenen Höhe, 60 logische Windows-Pixel links neben der Ankermitte. Der Kern hält dort die gemessene Höhe; Flügel und Licht bleiben animiert. Dies ist eine Zuordnung zur gerenderten Markierung an der Diagnose, keine Schätzung aus Zeilennummer und Schriftgröße.

## Datenweg und Grenzen

- Nur nach ausdrücklicher Diagnose-Navigation: höchstens 20 Sekunden und vier Suchvorgänge pro Sekunde. Keine fortlaufende allgemeine Bildschirmbeobachtung.
- Nur der Clientbereich des zugehörigen, aktiven VS-Code-Fensters wird kurz lokal gelesen. Pixel werden nach der Suche sofort verworfen. Kein OCR, keine Bildspeicherung oder Übertragung in der Produktfunktion; an die Extension gehen nur Kennung, Status und Koordinaten.
- Eine neue zufällige Ankerfarbe pro Navigation verhindert Verwechslungen mit älteren Markierungen. Ein fehlender, verdeckter oder mehrfach gefundener Anker liefert kein Flugziel. Die editorseitige Fehlermarkierung bleibt erhalten; ihr Hover erklärt den Zustand.
- Scrollen, Layout und Zoom werden über neue Messungen berücksichtigt, solange der Anker sichtbar bleibt. Bei Dokumentänderung, anderem aktiven Editor, Fokusverlust, Pause, Spiel, manueller Zieländerung oder Abschalten der Funktion endet die Verfolgung. Maus-Ausweichen hat Vorrang.
- Eine vorherige native Sprechblase wird beim Flugstart entfernt, damit sie das Ziel nicht verdeckt. Eine neue direkte Chat-Anfrage beendet den Ankerflug.
- `navi.overlay.editorAnchors: false` schaltet die Pixelverfolgung ab. Die gewöhnliche Problemnavigation und Quick Fixes funktionieren weiter. Andere Plattformen behalten die Editor-Markierung.
- Exakte Farben können bei verdeckten Fenstern, HDR/Farbkorrektur oder erzwungenen Kontrastfarben fehlen. In diesem Fall wird keine Position geraten. Sehr kleine Fenster und Aufnahmeflächen über 16 Millionen Pixel werden nicht für diese Erkennung verwendet.

Die Erweiterung verwendet öffentliche [VS-Code-Editor-Dekorationen](https://code.visualstudio.com/api/references/vscode-api#DecorationRenderOptions) und der Helfer die lokale Win32-[BitBlt-Schnittstelle](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-bitblt). Im Produkt gibt es keine DOM-Manipulation, DevTools-Verbindung oder zusätzliche Laufzeit.

## Nachweise

- Go-Tests prüfen eindeutige/fehlende/doppelte/verdeckte und teilweise geglättete Markierungen, abgelaufene Ziele, Mausvorrang und die Kernposition bei mehreren DPI-Skalierungen einschließlich negativer Monitorursprünge.
- Der native WinForms-Livetest erkennt einen tatsächlich gezeichneten Anker und prüft die sichtbare Overlay-Fensterposition mit höchstens einem Pixel Abweichung.
- Der isolierte echte VS-Code-Renderer zeigt genau einen Anker am ausgewählten Editor. Derselbe Erkenner findet ihn in drei Aufnahmen dieses ausschließlich synthetischen Testeditors: Grundzustand, Zoom mit Wortumbruch und dieselbe Datei in mehreren Editorgruppen. [Raster-Prüfbericht](../build/editor-anchor-render-report.json). Testbilder liegen nur als Entwicklungsartefakte unter `build/`; die Produktfunktion speichert keine Bilder.
- **Offen:** Der durchgehende Test VS Code → Windows-Overlay ist in dieser Umgebung nicht bestanden: der Helfer meldete `visible=false, owner=false`. Daher sind Zoom, Umbruch und geteilte Editoren als vollständige Overlay-Abnahme weiterhin offen. Der opt-in Lauf `NAVI_TEST_PIXEL_ANCHORS=1 npm run test:companion-host` enthält diese Abnahme und verwendet ausschließlich für die Testdiagnose einen lokalen Renderer-Debugzugang.

Die v0.6.0-VSIX ist zur Veröffentlichung als GitHub-Vorschau vorbereitet; den tatsächlichen Upload zeigt die [Release-Seite](https://github.com/noahmagic77/navi-copilot-companion/releases). Eine tatsächliche Fehlerdiagnose auswählen und das Zusammenspiel im normalen VS-Code-Profil abnehmen. Die offene vollständige Flugabnahme bleibt davon unabhängig.
