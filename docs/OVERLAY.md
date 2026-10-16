# Vordergrund-Fee und Ressourcenbudget

NAVI v0.5.0 ergänzt die VS-Code-Ansicht um einen lokalen Windows-x64-Helfer. Eine normale VS-Code-Webview bleibt auf ihre Ansicht beschränkt. Der Helfer besitzt deshalb ein kleines transparentes Win32-Fenster, das ausschließlich vor dem zugeordneten aktiven VS-Code-Fenster sichtbar ist. Die Erweiterung bleibt eine normale VSIX; VS Code selbst wird nicht verändert.

## Darstellung und Steuerung

- Win32-Layered-Window mit Click-through, Toolwindow und No-activate: keine Übernahme von Mausklicks oder Tastaturfokus.
- Kleine Zeichenfläche von normalerweise 192 × 192 DIPs; bei hoher DPI maximal 512 × 512 physische Pixel.
- Rund 80 DIPs große weiße Fee, vier Flügel, zwischengespeicherter Leuchtkern und feste Partikelzahl.
- Native Go-/GDI+-Darstellung ohne zusätzliches Electron, Browser- oder .NET-Runtime-Paket.
- Fensterposition, Fokus und Größenänderungen werden über Windows-Ereignisse verarbeitet. Es gibt kein regelmäßiges Bildschirm-Abtasten und keine Screenshots.
- Der Helfer prüft die Vorfahren des angegebenen Extension-Host-Prozesses und bindet sich an dessen beim Start aktives Fenster. Auf anderen Betriebssystemen/Architekturen bleibt die Webview verfügbar.
- Die Erweiterung prüft die SHA-256 des mitgelieferten Helfers und startet ihn mit einem festen Dateipfad ohne Shell. Die Steuerung läuft über geerbte stdin/stdout-Pipes. Nachrichten enthalten nur Fokus, Ressourcenmodus und Bewegungskennungen, keine Prompts oder Dateiinhalte.
- Beim Ausblenden wird der native Animationstimer entfernt. Beim Beenden der Erweiterung oder Schließen der Steuer-Pipe beendet sich der Helfer; ein begrenzter Kill-Fallback verhindert ein dauerhaft verwaistes Kindprogramm.

## Startwerte

| Einstellung | Normal | Sparmodus |
| --- | --- | --- |
| Nativer Flug / aktive Bewegung | höchstens 30 FPS | höchstens 24 FPS |
| Ruhiges Schweben / Zuhören | höchstens 15 FPS | höchstens 12 FPS |
| Ausruhen | höchstens 10 FPS | höchstens 10 FPS |
| Kurzer Zustandsübergang | bis 30 FPS für 0,7 s | bis 24 FPS für 0,7 s |
| Native Glitzerpartikel | 12 | 6 |
| Unsichtbar / Animation pausiert | 0 Animationsbilder | 0 Animationsbilder |

Die Webview nutzt entsprechende feste Budgets. Sie besitzt einen festen Pool mit maximal 24 Partikeln, von denen normalerweise 12 und im Sparmodus 6 sichtbar sind. Bei kurzen Freude-Effekten kann die Vorschau zusätzliche Partikel verwenden.

Neue Flugziele werden in Abständen von 15–30 aktiven Sekunden geplant, bevorzugt an den Fensterrändern. Eine Bézierkurve und eine weiche zeitliche Interpolation steuern Start und Landung. Das durchschnittliche Reisetempo liegt bei ungefähr 80 DIPs/s. Alle Kontrollpunkte bleiben innerhalb des zulässigen Bereichs. Nach 90 Sekunden ohne Interaktion mit NAVI ruht die Fee; andere Programme oder fremde Chat-Eingaben werden dafür nicht überwacht.

Die Flügelphase läuft bei Zustandswechseln weiter. Die Federberechnung verwendet vorbereiteten Speicher und nur zwei Dämpfungskoeffizienten pro Bild. Partikel, Verlaufspunkte, Pfade, Brushes, Bitmap und Leuchttextur werden wiederverwendet. Der native Test prüft, dass die reine Bewegungs-/Flugberechnung keine Speicherallokationen pro Bild erzeugt.

## Geprüft und noch zu messen

- 22 TypeScript-/Prozesstests und 8 native Go-Tests, einschließlich eines gemeinsamen Pose-Vertrags mit den zwölf Webview-Bewegungen.
- Chromium-Prüfung aller zwölf Bewegungen, Pausen, reduziertem Bewegungsmodus, Sparmodus, schmaler Darstellung und strikter CSP.
- Bei simulierten 240 Hz: 30 Zeichenaktualisierungen/s aktiv, 15 beim Schweben und 12 beim Schweben im Sparmodus.
- Windows-Rendering aller zwölf Bewegungen, korrektes vormultipliziertes Alpha, konstante GDI-Handle-Zahl und funktionierende lokale Pipes.
- Native Fensterprüfung mit einem WinForms-Testfenster: Fokus bleibt beim Besitzer, Bewegung auch bei pausierter Animation, Einhaltung der Fenstergrenzen, Verbergen über anderen Fenstern sowie Minimieren/Wiederherstellen.

[Windows-Prüflauf](https://github.com/noahmagic77/navi-copilot-companion/actions/runs/38935451114) · [Renderer-Messwerte](native-benchmark.json) · [Fenster-Prüfbericht](native-window-integration.json)

Der isolierte Test auf dem Windows-Runner verwendete eine Zeichenfläche von 192 × 192 Pixeln und 360 Render-Bilder. Dabei wurden ungefähr 15,6 MB Working Set, 18,3 MB private Bytes und rund 0,53 ms mediane Renderzeit gemessen. Das ist ein Renderer-Mikrobenchmark mit verstecktem Testfenster, keine CPU-/GPU-Prozentmessung in VS Code und keine Zusage für andere Rechner, Bildschirmskalierungen oder GPU-Treiber.

Eine vollständige Live-Prüfung im VS-Code-Extension-Host und ein Vorher-/Nachher-Vergleich der CPU-, GPU- und Speicherauslastung auf dem Zielrechner stehen noch aus.

## Selbst bauen

Node.js ab 22, Go ab 1.24 und VS Code Desktop ab 1.100:

```bash
npm ci
npm run build:overlay
npm run check
npm test
npm run package
```

Der Go-Build erzeugt auch unter Linux einen Windows-x64-Helfer, ohne C-Compiler. Der Windows-Workflow prüft das echte GUI-Programm mit `--self-test`, dem Pipe-Test und dem Fenster-Test. Native Quellen und Tests werden nicht ins VSIX aufgenommen.
