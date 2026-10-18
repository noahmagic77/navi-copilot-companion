# NAVI installieren – VSIX aus GitHub

> **Vorschau 0.6.1** für VS Code Desktop ab Version 1.100. Das GitHub-Repository ist öffentlich, NAVI ist jedoch **nicht** im VS Code Marketplace veröffentlicht.

## Direkt herunterladen (dauerhafter Link)

**[NAVI Copilot Companion v0.6.1 – .vsix direkt herunterladen](https://raw.githubusercontent.com/noahmagic77/navi-copilot-companion/main/downloads/navi-copilot-companion-0.6.1.vsix)**

Dies ist bereits die fertige `.vsix`-Datei, **kein ZIP-Archiv**. Speichere sie auf dem Rechner, auf dem du Visual Studio Code Desktop nutzt. Die Datei gehört zur Version 0.6.1; sie wird bei zukünftigen Versionen nicht automatisch aktualisiert.

**SHA-256** (optional zur Integritätsprüfung): [Prüfsummendatei](../downloads/navi-copilot-companion-0.6.1.vsix.sha256).

Falls der Download im mobilen Browser nicht direkt startet: Link auf deinem Computer öffnen oder über **[downloads/ im Repository](https://github.com/noahmagic77/navi-copilot-companion/tree/main/downloads)** die VSIX auswählen und **Download raw file** verwenden.

## Installation in VS Code Desktop

1. Öffne **Visual Studio Code** am PC/Mac (mindestens Version 1.100).
2. Öffne **Erweiterungen** mit `Strg + Umschalt + X` (macOS `Cmd + Shift + X`).
3. Öffne das Menü **…** im Erweiterungsbereich und wähle **Install from VSIX…** / **Aus VSIX installieren…**.
4. Wähle die heruntergeladene Datei `navi-copilot-companion-0.6.1.vsix`.
5. Lade VS Code bei Bedarf neu. Unter Windows x64 erscheint die aktivierte Fee vor dem aktiven VS-Code-Fenster. Falls nötig: `Strg + Umschalt + P` → **NAVI: Show Foreground Fairy / Vordergrund-Fee anzeigen**.
6. Für Einstellungen und die Vorschau: **NAVI: Open Companion / Ansicht öffnen** oder links das NAVI-Symbol wählen.
7. Öffne **110 Bewegungen entdecken**. Wähle eine Bewegung oder starte **Alle ansehen**. Mit **Vorschau beenden** kehrst du sofort zum natürlichen Verhalten zurück.
8. Mit **Animation an/aus** pausierst du alle Bewegungen. Rechtsklick auf NAVI öffnet die gemeinsamen Programmieraktionen.

**Alternative im Terminal:**

```bash
code --install-extension navi-copilot-companion-0.6.1.vsix
```

## Vordergrund-Fee steuern

- **NAVI: Show Foreground Fairy / Vordergrund-Fee anzeigen** startet den nativen Windows-x64-Helfer.
- **NAVI: Hide Foreground Fairy / Vordergrund-Fee ausblenden** beendet ihn und deaktiviert den automatischen Start.
- **Sparmodus an/aus** in der NAVI-Ansicht oder `navi.fairy.powerMode` steuert den Ressourcenmodus.
- **Animation an/aus** friert beide Darstellungen ein; die statische Fee kann sichtbar bleiben.
- Bei Fensterwechsel oder Minimierung blendet sich die Vordergrund-Fee automatisch aus.
- Auf anderen Betriebssystemen und Architekturen ist die eingebettete NAVI-Ansicht verfügbar.

Der native Helfer ist bereits im VSIX enthalten und braucht keine zusätzliche Browser- oder .NET-Laufzeit. [Details und Messgrenzen](OVERLAY.md).

## Alternative: Automatischer GitHub-Actions-Build

[Neueste erfolgreiche Builds auf main](https://github.com/noahmagic77/navi-copilot-companion/actions/workflows/ci.yml?query=branch%3Amain) sind ebenfalls verfügbar. Öffne einen grünen Lauf unter **CI and VSIX**, scrolle zu **Artifacts** und lade das ZIP-Artefakt herunter. Anders als beim direkten VSIX-Link musst du dort zuerst das ZIP entpacken; Artefakte werden nach 30 Tagen gelöscht.

## Schritt 3: NAVI ausprobieren

1. Klicke links in der **Activity Bar** auf das **NAVI-Symbol**.
2. Öffne **NAVI Companion**. Die Fee ist sofort sichtbar. Die Ansicht kann über das VS-Code-Kontextmenü an eine andere Position, etwa neben Copilot, verschoben werden.
3. Öffne eine Codedatei und mache einige Änderungen: Die v0.6.1-Vorschau kann Platz machen und später zurückkommen.
4. Öffne **NAVI: Live Brain** für die aktuellen Zustände oder **NAVI: Show Problems** für Diagnosen. Die frühere Prompt-Analyse ist entfernt. Der gemessene Windows-Diagnoseflug ist experimentell; die vollständige Overlay-Abnahme bleibt offen.

Alternativ: Öffne **Chat** in VS Code und schreibe

```text
@navi /explain Erkläre mir den Unterschied zwischen einer PowerShell-Funktion und einem Skript.
```

Dafür benötigst du einen verfügbaren Chat-Modellzugang in VS Code (z. B. GitHub Copilot). NAVI kann **nicht** automatisch fremde Copilot-Chatverläufe lesen oder den Tokenverbrauch bestehender Copilot-Unterhaltungen erfassen.

## Schritt 4: Datenschutz und Einstellungen

- Standardmäßig **aktiviert**: `navi.overlay.enabled` für den Vordergrund-Helfer auf unterstützten Windows-x64-Systemen.
- Standardmäßig **balanced**: `navi.fairy.powerMode`; **eco** reduziert Bildrate und Glitzer.
- Standardmäßig **aktiviert**: `navi.fairy.animationEnabled`; mit dem Schalter in der Ansicht oder in den Benutzereinstellungen ändern. `navi.fairy.respectReducedMotion` ist standardmäßig aus und berücksichtigt bei Aktivierung die Systempräferenz für reduzierte Bewegung.
- Standardmäßig **deaktiviert**: `navi.history.enabled` (vollständige NAVI-eigene Prompts und Antworten).
- Lokale Prompt-Analyse, Metrikimport und Analyseindex sind in v0.6.1 entfernt.
- Daten liegen ausschließlich in der lokalen VS-Code-Erweiterungsspeicherung des jeweiligen Nutzers/Profils, wenn Speicherung aktiviert wird.
- Über die Befehlspalette findest du **NAVI: Show Status**, **NAVI: Open Local Data Folder**, **NAVI: Clear Local History** und **NAVI: Memories / Erinnerungen verwalten**.

NAVI ist noch ein Prototyp. TypeScript, bestehende Tests, das VSIX-Paket und die Animation in Chromium sind geprüft; native Fensterintegration und lokale Steuer-Pipes sind auf Windows geprüft. Ein vollständiger Live-Test in deiner VS-Code-Umgebung steht noch aus.

## Probleme beheben

| Problem | Lösung |
| --- | --- |
| Kein Artefakt auf GitHub | Prüfe den Job **Package VSIX** und ob der Workflow erfolgreich abgeschlossen wurde. |
| ZIP wird nicht akzeptiert | ZIP entpacken und die enthaltene `.vsix` auswählen. |
| „Extension is not compatible“ | VS Code Desktop aktualisieren (mindestens 1.100); keine Web- oder mobile VS-Code-Version verwenden. |
| NAVI-Symbol nicht sichtbar | VS Code neu laden, Erweiterung unter **Extensions → Installed** aktivieren und die Activity Bar einblenden. |
| `@navi` antwortet nicht | VS-Code-Chat/Modellzugang prüfen und unter **Output/Developer Tools** nach Fehlern sehen. |
| Alte und neue NAVI-Version kollidieren | Unter **Extensions** die alte NAVI-Preview deaktivieren oder deinstallieren und VS Code neu laden. |

## Für Entwickler: VSIX selbst bauen

```bash
git clone https://github.com/noahmagic77/navi-copilot-companion.git
cd navi-copilot-companion
npm ci
npm run package
```

`npm run package` baut den Windows-x64-Helfer, führt Compile und Tests aus, prüft die Prüfsumme und erzeugt die VSIX im Repository-Root. Node.js >=22 und Go >=1.24 werden benötigt. CI stellt zusätzlich ein temporäres Paket bereit. Der Workflow **Publish GitHub preview** veröffentlicht nach erfolgreicher CI die separat geprüfte, unter downloads/ versionierte VSIX mit Prüfsumme und englisch-deutschen Release-Notizen. Maßgeblich ist der Status auf der GitHub-Release-Seite.

## Sicherheitshinweis

Nur von vertrauenswürdigen Quellen stammende VSIX-Dateien installieren. Eine bestandene CI-Prüfung ist kein vollständiger Sicherheits- oder Kompatibilitätsnachweis. Eine Veröffentlichung im VS Code Marketplace erfordert einen gesonderten Freigabe- und Sicherheitsschritt.
