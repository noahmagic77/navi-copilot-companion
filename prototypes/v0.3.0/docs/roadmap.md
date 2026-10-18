# NAVI — Produktroadmap

## Release v0.2.0 – Architecture MVP (implementiert)

- Eigenständiges Companion-Webview, animierte Fee, Hinweise, Demo.
- Lokaler Prompt-Check, Regelsystem, Topic-Heuristik.
- Opt-in Copilot-SDK-Hooks für bekannte Ereignisse.
- Token-Parsing aus lokalem OTel JSONL; ohne Modellaufrufe durch NAVI.
- Begrenzte Event-Historie, manuelle Datenlöschung, Sicherung globaler OTel-Einstellungen.
- Tests, Sicherheit, Datenmodell, ADRs und Architekturdiagramme.

## Release v0.2.1 – Integrationshärtung

- Abnahmetests mit VS Code Desktop / realem Copilot auf Windows.
- Diagnoseansicht: „Hook geladen“, „Events zuletzt empfangen“, „OTel zuletzt empfangen“, „Harness nicht kompatibel“.
- Behebung von Payload- und Versionsunterschieden anhand echter E2E-Mitschnitte ohne Rohprompt-Speicherung.
- Getrennte Hook-Adapter für Copilot SDK und Local-Harness.
- Robuster File-Watcher statt zeitlichem Polling wo möglich.
- VSIX-Build mit offiziellem `@vscode/vsce` in CI und verifiziertem Marketplace-Manifest.

## Release v0.3 – Engineering Foundation

- TypeScript-Migration aller Runtime-Module mit `strict: true`.
- Ports-and-adapters-Interfaces (`IEventRepository`, `IHookAdapter`, `IMetricsReader`).
- Persistente SQLite-Datenbank mit Migration und Retention.
- Diagnostics/Health und strukturierte Fehlermeldungen.
- Multi-root / Remote-Workspace-Support nach explizitem Scope.
- Automatisierte CI, SBOM, Dependency-Audit und Signierungskonzept.
- Snapshot-Tests des Webviews und Screenreader-/Keyboard-Audit.

## Release v0.4 – Context Intelligence

- Regel-Editor und per-Workspace-Schwellwerte.
- Modellunabhängige Kontext-Warnungen auf Grundlage echter Agent-Metriken.
- Erkennung übermäßiger oder wiederholter Tool-Aufrufe (rein lokal, keine Snippet-Telemetrie).
- Empfehlungen für `#file`, modulare Aufgaben, Testkriterien und separate Chat-Sessions.
- Messbare A/B-Vergleiche: Tool-Aufrufe, Tokens, Abschlussrate, Iterationszahl und Ergebnisqualität.
- „Snooze“ / „Diese Empfehlung nicht mehr zeigen“ und klare Erklärbarkeit jeder Regel.

## Release v1.0 – Release-Gates

- Testabdeckung definierter Qualitätskriterien, kein Rohprompt-Leak.
- Offizielle Distribution- und Unternehmensfreigaben.
- Verifizierte Supportmatrix für Harnesses und VS-Code-Versionen.
- Professionelles Onboarding, Datenschutz-/Löschdialoge, Accessibility.
- Security Review und belastbare Produktmetriken.

## Bewusste Nicht-Ziele

- Vollständiges Mitschneiden des bestehenden Copilot-Chats über inoffizielle APIs.
- Anweisungen an den Agenten ohne aktive Zustimmung des Nutzers.
- Automatisches kostenpflichtiges KI-Modell hinter dem Rücken des Nutzers.
- Behauptungen über „eingesparte Tokens“ ohne kontrollierten Vergleich.
- Nachbildung geschützter Nintendo-/Zelda-Assets.
