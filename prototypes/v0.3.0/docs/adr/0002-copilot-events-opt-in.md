# ADR-0002 — Offizielle Hook-/OTel-Schnittstellen statt Chat-Scraping

- **Status:** Accepted
- **Datum:** 2026-10-16

## Kontext

VS Code bietet keine allgemeine stabile API zum freien Mitlesen jeder Copilot-Chatnachricht. Inoffizielles Auslesen interner Speicher und UI-Hacks wäre fragil und datenschutzkritisch.

## Entscheidung

NAVI verwendet nur explizit konfigurierte agent-/harness-spezifische Hooks und OpenTelemetry. Ohne diese Integrationen bleibt die manuelle Promptprüfung funktionsfähig.

## Konsequenzen

- Pro: Klare Vertrauensgrenzen, geringere Wartungs- und Datenschutzrisiken.
- Contra: Kein vollständiger Verlauf, kein automatischer Eingriff vor jedem Prompt, abhängig vom Harness.
- Sicherheitsmaßnahme: Opt-in, SHA256-Verwaltungsmanifest, Content-Capture deaktiviert.
