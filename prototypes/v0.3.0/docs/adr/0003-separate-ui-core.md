# ADR-0003 — Layered / Ports-and-Adapters / Message-Based UI

- **Status:** Accepted
- **Datum:** 2026-10-16

## Kontext

Eine monolithische `extension.js` erschwert Testbarkeit, spätere Harness-Adapter und Datenbankmigration.

## Entscheidung

Core-Heuristik, Session- und Tokenaggregation sind eigenständige Node-Module ohne VS-Code-Abhängigkeit. `NaviController` orchestriert. Die Webview ist eine eigene, CSP-geschützte Präsentationsschicht, die ausschließlich über strukturierte Nachrichten kommuniziert.

## Konsequenzen

- Pro: Klare Zuständigkeiten, isolierbare Tests, spätere TypeScript-Konvertierung.
- Contra: Mehr Dateien und Schnittstellen; Controller bleibt im MVP bewusst schlank zusammenführend.
- Nächster Schritt: Formale Dependency-Injection-Interfaces und use-case-spezifische Services.
