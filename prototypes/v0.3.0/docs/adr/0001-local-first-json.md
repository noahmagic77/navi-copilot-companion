# ADR-0001 — Local First + JSON-Snapshot vor SQLite

- **Status:** Accepted
- **Datum:** 2026-10-16

## Kontext

NAVI ist ein schmaler VS-Code-Begleiter mit wenigen abgeleiteten Hinweisen. Eine SQL-Datenbank würde im MVP zusätzliche Abhängigkeiten, Updates und Migrationsrisiken einführen.

## Entscheidung

Die persistierte History wird zunächst als atomarer, begrenzter und versionierter JSON-Snapshot in `globalStorageUri` gespeichert. Tokenmetriken kommen aus einer fremdverwalteten OTel-JSONL-Datei und werden im aktuellen UI-Lebenszyklus aggregiert. SQLite wird bei Anforderungen an größere Zeitreihen oder Querying eingeführt.

## Konsequenzen

- Pro: Kein nativer SQLite-Build, einfache Offline-Installation, transparente Datensätze.
- Contra: Eingeschränkte Filter- und Indexierbarkeit, begrenzte Query-Performance.
- Migration: `docs/schema/sqlite-v1.sql` und `docs/data-and-migrations.md`.
