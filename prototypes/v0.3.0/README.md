# NAVI — Copilot Companion v0.3.0

> **Status: internal development / pre-release prototype.** This repository is proposed for **private** GitHub development first. NAVI is an independent, unofficial third-party VS Code extension; it is not affiliated with or endorsed by GitHub, Microsoft or Nintendo. The real Copilot end-to-end integration has not yet been validated. Read [GitHub setup](docs/GITHUB_SETUP.md), [security](SECURITY.md) and [release checklist](docs/PUBLIC_RELEASE_CHECKLIST.md) before distributing it.

> **Local Session Storage MVP, 16.10.2026** · inspiriert vom lokalen Sitzungsindex von GitHub Copilot · offline installierbare VS-Code-Extension.

## Architekturentscheidung

**Pro lokalem VS-Code-Benutzerprofil ein NAVI-Speicher** unter `ExtensionContext.globalStorageUri`. **Pro Workspace / Session eine JSONL-Ereignisdatei**. **Eine lokale SQLite-Datenbank** dient als abfragbarer, vollständig regenerierbarer Index. Die `.vsix` enthält ausschließlich die statischen Programmdateien. Kein NAVI-Konto, kein Server, kein Cloud-Sync.

Das **Speicherprinzip** ist wie bei Copilot, **nicht dessen geheimes internes Dateischema**. NAVI liest oder modifiziert keine fremden Copilot-Datenbanken oder Chats.

```text
<globalStorageUri> /  # durch VS Code ermittelt, nie hart kodieren
├── sessions/
│   ├── <workspace-hash>/
│   │   ├── <session-hash>.jsonl
│   │   └── <weitere-session-hash>.jsonl
│   └── <anderer-workspace-hash>/...
├── navi-index.sqlite
├── hook-events.jsonl         # temporärer Hook-Eingang
├── copilot-otel.jsonl        # optionaler lokaler OTel-Eingang
└── .navi-v03-migration-complete
```

**Es werden keine Rohprompts oder Quellcodes in NAVIs Sitzungsdateien gespeichert.** Nur feste Regel-IDs mit vordefinierten Empfehlungstexten, Sitzungsmetadaten (als Hash) und Token-Aggregate. Die Hook-Eingangsdatei enthält bereits nur abstrahierte Flags/Themen; eine separat aktivierte OTel-Quelle kann Metadaten enthalten und sollte bewusst aktiviert werden. Export und Löschen betreffen ausschließlich NAVIs eigene Daten.

## Funktionen

- Animierte NAVI-Fee in einer Webview, lokale Prompt-Prüfung ohne LLM und sanfte Sprechblasen
- Optionaler Copilot-Hook-Adapter für unterstützte Agent-Harnesses; **kein** genereller Lesezugriff auf Copilot-Chat
- Optionale OpenTelemetry-Tokenmetriken für unterstützte `chat`-Spans
- **Neu:** JSONL-Sitzungsjournale (Quelle der Wahrheit) und SQLite-Index (abgeleitet)
- **Neu:** bei jedem Start Wiederaufbau/Konsistenzprüfung des SQLite-Index aus JSONL; nach Indexverlust durch `NAVI: Reindex local sessions`
- **Neu:** `NAVI: Export local session data` und Löschbefehl, Migration alter 0.2-Hinweise
- **Neu:** Aufbewahrungsdauer 30 Tage (Startup-Pruning und Index-Rebuild)
- Falls `node:sqlite` im Extension Host fehlt: **sichtbarer JSONL-only-Fallback**; kein falsches Versprechen von SQLite-Funktionalität

## Installation und erste Schritte

1. In VS Code `Extensions` → `…` → `Install from VSIX…` → `navi-0.3.0.vsix` auswählen.
2. Die Ansicht **NAVI** über die Activity Bar öffnen und neben Copilot platzieren.
3. `Demo-Ereignis auslösen` verwenden; prüfen, dass Hinweise erscheinen.
4. Via `NAVI: Open Local Data Folder` den Inhalt von `sessions/` und, wenn unterstützt, `navi-index.sqlite` prüfen.
5. Die Befehle **Reindex local sessions**, **Export local session data** und **Delete Local Data** testen.
6. Für echte Copilot-Ereignisse Hooks und OTel **nur nach Opt-in** installieren/aktivieren (lokaler, vertrauenswürdiger Single-Root-Workspace und unterstützter Harness).

**Entwicklung:** Node.js ≥22.13 für echten eingebauten SQLite-Treiber. `node:sqlite` ist in Node.js 22 noch als experimentell markiert und steht nicht in jedem VS-Code-/Electron-Extension-Host zur Verfügung. Der PoC benutzt keine native Zusatzbibliothek und benötigt für die Extension selbst kein npm-Install. Für eine garantierte SQLite-Verfügbarkeit auf allen VS-Code-Plattformen wäre später ein plattformübergreifender SQLite-Treiber zu paketieren.

```bash
npm run check   # Syntaxprüfungen + Unit-Tests
npm run vsix    # schreibt ../navi-0.3.0.vsix
```

## Abgrenzung und Status

- Tests von Dateispeicherung, Migrationseinträgen, SQLite-Reindexierung und Löschung sind automatisiert. **Kein bestätigter End-to-End-Test an einem echten angemeldeten Copilot**.
- Kein offizieller allgemeiner Zugriff auf beliebige Copilot-Nachrichten. Erfasst wird ausschließlich die Teilmenge, die kompatible Hooks und OTel zur Verfügung stellen.
- SQLite ist ein **Index**, keine zweite Quelle, die JSONL-Journale können ihn rekonstruieren.
- Weder die VSIX noch die Extension verschieben Benutzerdaten zur GitHub-Cloud.
- Beim Export stehen Session- und Workspace-Hashwerte im JSON; diese sollten dennoch als interne Metadaten behandelt werden.
- Datenbank-Backups sind nicht erforderlich, um den Index zu retten: Ein Reindex aus den Sitzungsdateien genügt. **Für echten Datenverlust müssen JSONL-Dateien separat gesichert werden.**

**Dokumentation v0.3:** [Speicherarchitektur](docs/storage-architecture-v03.md), [Speicherdiagramm](docs/diagrams/09-copilot-style-storage.svg), [SQL-Schema](docs/schema/sqlite-v1.sql). Andere Architekturdiagramme in `docs/` stammen aus dem Architektur-MVP v0.2 und bilden frühere, inzwischen abgelöste Speicherentscheidungen ab.

**Öffentliche technische Referenzen**
- https://code.visualstudio.com/docs/copilot/chat/session-insights
- https://code.visualstudio.com/api/extension-capabilities/common-capabilities
- https://nodejs.org/api/sqlite.html
- https://code.visualstudio.com/docs/agent-customization/hooks

MIT-Lizenz · Eigenständig gezeichnete Fee ohne Zelda-Originalassets.
