# NAVI: Entwicklungsumgebung einrichten

Stand: NAVI v0.5.0, 17. Oktober 2026.

Diese Anleitung beschreibt die Installation der Entwicklungswerkzeuge und den ersten lokalen Start. Für die frei über VS Code fliegende Vordergrund-Fee wird derzeit **Windows x64** benötigt. Die eingebettete Companion-Ansicht ist auch auf anderen Plattformen verfügbar.

## 1. Benötigte Programme installieren

| Programm | Version | Zweck |
| --- | --- | --- |
| [Visual Studio Code Desktop](https://code.visualstudio.com/download) | Mindestens 1.100 | Quellcode bearbeiten und die Erweiterung im Entwicklungsfenster testen |
| [Node.js](https://nodejs.org/en/download) inklusive npm | Empfohlen: 24 LTS; mindestens 22 | Projektwerkzeuge, TypeScript-Build und Tests ausführen |
| [Git](https://git-scm.com/downloads) | Aktuelle stabile Version | Repository herunterladen und Änderungen verwalten |
| [Go](https://go.dev/dl/) | Mindestens 1.24 | Zusätzlich nötig, wenn der native Windows-Helfer für die Vordergrund-Fee neu gebaut werden soll |

TypeScript und das VSIX-Paketwerkzeug werden mit den Projektabhängigkeiten installiert. Eine separate globale Installation ist dafür nicht erforderlich. Der fertige Windows-Helfer liegt bereits unter `bin/win32-x64/`; für Änderungen nur am TypeScript-Code oder an der Webview wird Go nicht benötigt.

Für KI-Antworten über `@navi` brauchst du außerdem einen in VS Code Chat verfügbaren Modellzugang, beispielsweise GitHub Copilot. Die Feenansicht und der lokale Prompt-Check funktionieren ohne KI-Zugang.

Nach der Installation PowerShell beziehungsweise das Terminal und gegebenenfalls VS Code neu öffnen. Dann prüfen:

```powershell
node --version
npm --version
git --version
```

Falls Go installiert wurde, zusätzlich `go version` ausführen.

## 2. Repository herunterladen und öffnen

In PowerShell in den gewünschten Entwicklungsordner wechseln und ausführen:

```powershell
git clone https://github.com/noahmagic77/navi-copilot-companion.git
cd navi-copilot-companion
npm install
code .
```

Wenn das Repository schon lokal vorhanden ist, dessen Ordner öffnen und dort `npm install` ausführen. Falls `code .` nicht erkannt wird, VS Code manuell starten und **Datei → Ordner öffnen** wählen.

## 3. Projekt prüfen

Im Terminal des Projektordners ausführen:

```powershell
npm run check
npm test
```

`check` prüft die TypeScript-Typen. `test` kompiliert das Projekt und führt die vorhandenen automatisierten Tests aus. Die sichtbare Integration wird anschließend im VS-Code-Entwicklungsfenster geprüft.

## 4. NAVI im Entwicklungsfenster starten

1. Den Repository-Ordner in VS Code öffnen.
2. **F5** drücken; falls eine Auswahl erscheint, **Run NAVI Extension** wählen.
3. VS Code kompiliert das Projekt und öffnet ein zweites Fenster, den **Extension Development Host**.
4. In diesem zweiten Fenster **Strg + Umschalt + P** drücken.
5. **NAVI: Open Companion / Ansicht öffnen** auswählen.

Dort lassen sich die 110 Bewegungen ansehen. **NAVI: Live Brain** zeigt Begleiterentscheidungen, **NAVI: Show Problems** öffnet die Problemauswahl. Die frühere Prompt-Analyse und ihr Befehl sind entfernt.

Auf Windows x64 startet **NAVI: Show Foreground Fairy / Vordergrund-Fee anzeigen** die native Fee. Sie ist sichtbar, solange das zugehörige VS-Code-Fenster aktiv ist. **NAVI: Hide Foreground Fairy / Vordergrund-Fee ausblenden** beendet den Helfer.

Wenn die Fee stillsteht, die NAVI-Einstellung `navi.fairy.animationEnabled` und die Systemeinstellung für reduzierte Bewegung prüfen. Ausgeblendete Ansichten pausieren ihre Animation.

## 5. Änderungen testen

Für Änderungen an TypeScript oder den eingebetteten Grafiken und Animationen:

1. Dateien speichern.
2. Den laufenden Debugger mit **Umschalt + F5** beenden.
3. Mit **F5** erneut starten. Der Start kompiliert TypeScript automatisch.

Nach Änderungen am nativen Code unter `native/overlay/` zuerst den Debugger beenden, damit der laufende Windows-Helfer geschlossen wird. Dann mit installiertem Go im Repository-Ordner ausführen:

```powershell
npm run build:overlay
```

Der Build erzeugt `bin/win32-x64/navi-overlay.exe` und die zugehörige SHA-256-Datei neu. Danach NAVI mit **F5** starten. Das Bauen ist auch auf anderen Plattformen möglich; das native Programm selbst muss unter Windows x64 getestet werden.

## 6. Installierbares Paket erstellen

```powershell
npm run package
```

Der Befehl kompiliert die Erweiterung, prüft den Windows-Helfer und erstellt eine VSIX-Datei im Projektordner. Diese lässt sich über **Erweiterungen → … → Install from VSIX…** installieren. Der Paketbefehl baut den Go-Helfer nicht automatisch neu; nach Änderungen an dessen Quellen vorher `npm run build:overlay` ausführen.

## Weiterführende Projektdateien

- [Installation einer fertigen VSIX](INSTALLATION.md)
- [Vordergrund-Fee, Ressourcenbudget und native Builds](OVERLAY.md)
- [Die zwölf Feenbewegungen](FAIRY-ANIMATIONS.md)
- [Projektübersicht](../README.md)
- [Projektbefehle und Abhängigkeiten](../package.json)
