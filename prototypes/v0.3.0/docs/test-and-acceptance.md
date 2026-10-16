# NAVI — Teststrategie, Abnahme und Qualitätskriterien

## 1. Testpyramide

| Testebene | Scope | Ausführung | Status |
|---|---|---|---|
| Unit | Prompt-Regeln, Topics, Empfehlungen | `npm test` / Node test runner | Implementiert |
| Unit | OTel Span-Parsing, Deduplizierung, Cache | `npm test` | Implementiert |
| Unit | JSON-Retention, atomare Snapshot-Struktur | `npm test` | Implementiert |
| Integration lokal | Hook-Dateien, SHA-256-Manifest, Change-Protection | temporäre Testordner | Implementiert |
| Integration lokal | JSONL-Tailing, Rotation/Truncation | temporäre Testdatei | Implementiert |
| Contract | Event-Schema, JSON-Schema, SQLite DDL | manuell / Validierung | DDL geprüft, vollautomatische Schema-Validierung geplant |
| E2E | VS Code: UI laden, Demo, Buttons | lokal per installiertem `.vsix` | Offen / Zielsystem |
| E2E | Copilot-Harness: echte Hook-Payload | GitHub angemeldet, unterstützter Harness | Offen / Zielsystem |
| E2E | Copilot OTel: reale Chat-Spans | GitHub angemeldet, exporter=file | Offen / Zielsystem |
| Security | SAST, untrusted workspace, Rechtetests | CI / Reviewer | Offen |

## 2. Definition of Done — MVP v0.2

- [x] Projektstruktur mit separaten Core-, UI-, Integration- und Storage-Modulen
- [x] Lokaler Prompt-Check mit erklärten Heuristiken
- [x] Animierte eigene Fee, Sprechblase und Sichtbarkeit der Hinweise
- [x] Eigenständiges VSIX-Archiv ohne Runtime-npm-Dependencies
- [x] Copilot-SDK-Hooks nur per Opt-in
- [x] Kein Prompttext in eigenem Hook-Ereignisprotokoll
- [x] Installation fremde Dateien nicht überschreiben
- [x] Deinstallation verändert eigene nachträglich bearbeitete Dateien nicht
- [x] OTel-Auswertung aus `chat`-Spans, ohne `invoke_agent`-Doppelzählung
- [x] Settings-Backup und vorsichtiger Restore bei NAVI OTel-Opt-in
- [x] Datenspeicher mit begrenzter History und Löschfunktion
- [x] Dokumentation mit Architektur-, Sequenz-, Klassen-, Daten- und Deploymentdiagrammen
- [ ] Installations- und UI-Test in VS Code Desktop auf dem Zielbetriebssystem
- [ ] Reale Copilot Agent-Hooks erfolgreich beobachtet
- [ ] Reale Copilot OTel-Spans erfolgreich beobachtet
- [ ] Windows PowerShell-, WSL- und Remote-Verhalten getrennt verifiziert
- [ ] Automatisierter VS-Code-Extension-Integrationstest und CI-Pipeline

Die offenen Punkte dürfen nicht als „funktioniert produktiv“ bezeichnet werden.

## 3. End-to-End-Abnahmeplan

### E2E-01: Installation ohne Marketplace

**Given** aktuelle kompatible VS-Code-Desktop-Installation, **when** `code --install-extension navi-0.2.0.vsix`, **then** `NAVI` erscheint in Activity Bar und die View öffnet ohne Fehlermeldung.

### E2E-02: Offline-Demo

**Given** keine GitHub-Anmeldung, **when** „Demo-Ereignis auslösen“, **then** Sprechblase und Hinweis-Liste zeigen Empfehlungen. Kein Outbound-KI-Request wird ausgelöst.

### E2E-03: Prompt-Check

**Given** „Mach alles besser“, **when** `Prüfen`, **then** NAVI zeigt Klarheits-/Scope-Hinweise. **Then** der Prompt erscheint weder in `navi-state-v1.json` noch in `hook-events.jsonl`.

### E2E-04: Opt-in Hook

**Given** vertrauenswürdiges Single-Root-Repo und Node ≥18, **when** Hook-Installation bestätigt wird, **then** drei Dateien plus lokales Manifest entstehen. Nach Start eines unterstützten Copilot-Harness und Absenden eines Prompts erscheint ein sanitisiertes Event in `hook-events.jsonl`.

### E2E-05: Hook-Integrität

**Given** installierte NAVI-Hooks, **when** ein Anwender eine der Dateien verändert, **then** NAVI verweigert die automatische Entfernung und verliert keine fremden Änderungen.

### E2E-06: OTel-Metriken

**Given** OTel Opt-in und unterstützte Agent-Harness-Sitzung, **when** ein Modellaufruf stattfindet, **then** NAVI zeigt tatsächliche `chat`-Span-Tokens für die laufende Beobachtung an; `invoke_agent` darf nicht doppelt zählen. **When** keine Spans erscheinen, **then** es erscheint `—`.

### E2E-07: Opt-out und Wiederherstellung

**Given** zuvor explizit eingestellte OTel-Werte, **when** NAVI OTel abschaltet, **then** unveränderte NAVI-globale Werte werden wiederhergestellt; externe Änderungen werden nicht blind überschrieben.

### E2E-08: Löschen

**When** `NAVI: Delete Local Data` bestätigt wird, **then** die drei NAVI-Runtime-Datendateien sind entfernt, nicht aber die Hooks oder die aktuelle OTel-Konfiguration. UI-Zähler starten bei null.

## 4. Qualitätsziele für Release Candidate v0.3 (Zielgrößen, nicht Messwerte)

| Metrik | Ziel |
|---|---|
| Core Unit-Test-Passrate | 100 % |
| Ungefangene Hook-Fehler, die Copilot stoppen | 0 |
| Persistierte Rohprompts | 0 |
| Einzelne Empfehlung in UI | max. 3 Hinweise pro Event |
| Wiederholte gleiche Empfehlung | 120 s Mindestabstand |
| Empfohlene Prompt-Prüfzeit ohne Modell | unter 50 ms bei normaler Promptlänge |
| VS Code Install-/Starttest | Windows, macOS, Linux jeweils erfolgreich |
| Hook-Kompatibilität | ausdrücklich pro Harness-Version dokumentiert |
| Datenschema-Migration | idempotent, reversible Sicherung |

## 5. Testbefehle

```bash
npm run check
npm test
npm run vsix
python3 -m zipfile -t ../navi-0.2.0.vsix
```

Die Archiveigenschaft allein beweist keine erfolgreiche Installation durch VS Code; Abnahmefall E2E-01 bleibt erforderlich.
