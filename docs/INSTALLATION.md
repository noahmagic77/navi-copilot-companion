# NAVI installieren – VSIX aus GitHub

> **Entwicklungsversion 0.2.0** für VS Code Desktop ab Version 1.100. Das GitHub-Repository ist öffentlich, NAVI ist jedoch **nicht** im VS Code Marketplace veröffentlicht.

## Direkt herunterladen (dauerhafter Link)

**[NAVI Copilot Companion v0.2.0 – .vsix direkt herunterladen](https://raw.githubusercontent.com/noahmagic77/navi-copilot-companion/main/downloads/navi-copilot-companion-0.2.0.vsix)**

Dies ist bereits die fertige `.vsix`-Datei, **kein ZIP-Archiv**. Speichere sie auf dem Rechner, auf dem du Visual Studio Code Desktop nutzt. Die Datei gehört zur Version 0.2.0; sie wird bei zukünftigen Versionen nicht automatisch aktualisiert.

**SHA-256** (optional zur Integritätsprüfung): `e25640ef8d28a81fd579edbebcafd59921d785bd18eabf510637882ec2bd7125`

Falls der Download im mobilen Browser nicht direkt startet: Link auf deinem Computer öffnen oder über **[downloads/ im Repository](https://github.com/noahmagic77/navi-copilot-companion/tree/main/downloads)** die VSIX auswählen und **Download raw file** verwenden.

## Installation in VS Code Desktop

1. Öffne **Visual Studio Code** am PC/Mac (mindestens Version 1.100).
2. Öffne **Erweiterungen** mit `Strg + Umschalt + X` (macOS `Cmd + Shift + X`).
3. Öffne das Menü **…** im Erweiterungsbereich und wähle **Install from VSIX…** / **Aus VSIX installieren…**.
4. Wähle die heruntergeladene Datei `navi-copilot-companion-0.2.0.vsix`.
5. Lade VS Code bei Bedarf neu, öffne links **NAVI Companion** und klicke nach Eingabe eines Prompts auf **Prompt analysieren**.

**Alternative im Terminal:**

```bash
code --install-extension navi-copilot-companion-0.2.0.vsix
```

## Alternative: Automatischer GitHub-Actions-Build

[Neueste erfolgreiche Builds auf main](https://github.com/noahmagic77/navi-copilot-companion/actions/workflows/ci.yml?query=branch%3Amain) sind ebenfalls verfügbar. Öffne einen grünen Lauf unter **CI and VSIX**, scrolle zu **Artifacts** und lade das ZIP-Artefakt herunter. Anders als beim direkten VSIX-Link musst du dort zuerst das ZIP entpacken; Artefakte werden nach 30 Tagen gelöscht.

## Schritt 3: NAVI ausprobieren

1. Klicke links in der **Activity Bar** auf das **NAVI-Symbol**.
2. Öffne **NAVI Companion**.
3. Tippe als Test: **„Kannst du meinen PowerShell-Code verständlicher strukturieren?“**
4. Klicke auf **Prompt analysieren**. Diese Heuristik läuft lokal ohne zusätzlichen LLM-Aufruf.

Alternativ: Öffne **Chat** in VS Code und schreibe

```text
@navi /explain Erkläre mir den Unterschied zwischen einer PowerShell-Funktion und einem Skript.
```

Dafür benötigst du einen verfügbaren Chat-Modellzugang in VS Code (z. B. GitHub Copilot). NAVI kann **nicht** automatisch fremde Copilot-Chatverläufe lesen oder den Tokenverbrauch bestehender Copilot-Unterhaltungen erfassen.

## Schritt 4: Datenschutz und Einstellungen

- Standardmäßig **deaktiviert**: `navi.history.enabled` (vollständige NAVI-eigene Prompts und Antworten).
- Standardmäßig **deaktiviert**: `navi.analytics.enabled` (lokale, bereinigte Sitzungsmetadaten).
- Daten liegen ausschließlich in der lokalen VS-Code-Erweiterungsspeicherung des jeweiligen Nutzers/Profils, wenn Speicherung aktiviert wird.
- Über die Befehlspalette findest du **NAVI: Show Status**, **NAVI: Open Local Data Folder**, **NAVI: Clear Local History** und die Analyseverwaltung.

**Achtung:** NAVI ist noch ein Prototyp. Tests und VSIX-Build werden automatisch geprüft; die Integration im realen VS-Code-Host muss noch separat getestet werden.

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
npm install
npm run check
npm test
npm run package
```

Die lokale Paketdatei heißt bei diesem Stand in der Regel `navi-copilot-companion-0.2.0.vsix`. GitHub Actions speichert sein Paket hingegen als temporäres Workflow-Artefakt und legt es **nicht** als Git-Commit oder GitHub Release ab.

## Sicherheitshinweis

Nur von vertrauenswürdigen Quellen stammende VSIX-Dateien installieren. Eine bestandene CI-Prüfung ist kein vollständiger Sicherheits- oder Kompatibilitätsnachweis. Eine Veröffentlichung im VS Code Marketplace erfordert einen gesonderten Freigabe- und Sicherheitsschritt.
