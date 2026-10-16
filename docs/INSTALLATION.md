# NAVI installieren – VSIX aus GitHub Actions

> **Entwicklungsversion 0.2.0** für VS Code Desktop ab Version 1.100. Es handelt sich um einen privaten Entwicklungs-Workflow, **nicht** um eine Veröffentlichung im VS Code Marketplace. Im Repository muss die gewünschte Sichtbarkeit separat unter **Settings** festgelegt werden.

## Schritt 1: Installationspaket von GitHub herunterladen

1. Öffne **[NAVI – GitHub Actions](https://github.com/noahmagic77/navi-copilot-companion/actions)** und melde dich bei GitHub an (falls du dazu aufgefordert wirst).
2. Öffne den neuesten erfolgreichen Lauf mit dem Namen **CI and VSIX**, der den Branch `feature/navi-typescript-core-ui-storage` oder dessen Pull Request betrifft.
3. Kontrolliere, dass die Jobs **build-and-test** und **Package VSIX** grün sind.
4. Scrolle auf der Seite des Workflow-Laufs zu **Artifacts** und klicke auf **NAVI-VSIX-<Laufnummer>**.
5. GitHub lädt eine **ZIP-Datei** herunter. Entpacke sie; darin liegt die eigentliche Datei **`navi-copilot-companion-0.2.0.vsix`**.

Die ZIP ist nur die GitHub-Transportverpackung. Installiere **die entpackte `.vsix`**, nicht das ZIP-Archiv. Falls kein Artefakt angezeigt wird, warte auf den erfolgreichen Abschluss des `Package VSIX`-Jobs. Artefakte werden 30 Tage aufbewahrt.

**Wichtig:** GitHub-Repositories und GitHub-Actions-Artefakte können je nach Repository-Sichtbarkeit für Dritte sichtbar sein. Überprüfe die Sichtbarkeit in **Settings → General → Danger Zone → Change repository visibility**, wenn NAVI privat bleiben soll.

## Schritt 2: In VS Code installieren

1. Öffne **Visual Studio Code Desktop** auf deinem Windows-, Linux- oder macOS-Rechner.
2. Öffne die **Erweiterungen** mit `Strg + Umschalt + X` (macOS: `Cmd + Shift + X`).
3. Klicke rechts oben im Erweiterungsbereich auf das Menü **…**.
4. Wähle **Install from VSIX…** beziehungsweise **Aus VSIX installieren…**.
5. Wähle die entpackte **`navi-copilot-companion-0.2.0.vsix`**.
6. Bestätige die Installation und klicke auf **Reload/Neu laden**, falls VS Code dies anbietet.

**Alternative über das Terminal:**

```bash
code --install-extension navi-copilot-companion-0.2.0.vsix
```

Der `code`-Befehl muss in deiner Shell verfügbar sein und die Datei im aktuellen Verzeichnis liegen (sonst den vollständigen Pfad zur VSIX angeben).

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
git checkout feature/navi-typescript-core-ui-storage
npm install
npm run check
npm test
npm run package
```

Die lokale Paketdatei heißt bei diesem Stand in der Regel `navi-copilot-companion-0.2.0.vsix`. GitHub Actions speichert sein Paket hingegen als temporäres Workflow-Artefakt und legt es **nicht** als Git-Commit oder GitHub Release ab.

## Sicherheitshinweis

Nur von vertrauenswürdigen Quellen stammende VSIX-Dateien installieren. Eine bestandene CI-Prüfung ist kein vollständiger Sicherheits- oder Kompatibilitätsnachweis. Veröffentliche NAVI nicht im Marketplace und öffne das Repository nicht für alle, solange dafür keine separate Entscheidung getroffen wurde.
