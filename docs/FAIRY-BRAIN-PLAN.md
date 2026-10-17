# Fee-Gehirn: Umsetzungsplan

Stand: 17.10.2026. Reihenfolge: [Konzept](FAIRY-BRAIN.md) → [technische Spezifikation](FAIRY-BRAIN-TECHNICAL.md) → kleine geprüfte Implementierungsschritte. Keine zugesagten Termine.

| Etappe | Lieferung | Abnahme | Stand |
|---|---|---|---|
| A1 | Reiner Zustandskern, Selbstmodell und lokale Selbstauskunft aus bestehenden Aktivitäten/Fokus | Deterministischer Reducer, Fokus-/Fehler-/Abbruchtests, wahrheitsgemäße Fähigkeiten, keine Inhalte im Snapshot | Lokal implementiert, 48 Gesamttests bestanden; VS-Code-Live-Prüfung offen |
| A2 | Empfangsbestätigung, echte Anfrage-IDs und Ereignis-Replay über die Adapter | Verspätete und konkurrierende Ergebnisse korrekt zugeordnet; Live-Test der Nachrichtenreaktion | Geplant |
| B | Begrenzte Aktionsauswahl mit Prioritäten, Begründung und Hinweisbudget | `wait` als Standard, Stop-/Fokusregeln, keine Hinweisflut; keine zusätzlichen Modellaufrufe für reine Reaktionen | Geplant |
| C | Ausgewählte Diagnose öffnen, markieren und auf Wunsch erklären | Ziel-/Dokumentversion prüfen; keine behauptete Pixelposition; echte Editor-Abnahme | Geplant |
| D | Bestätigte Vorlieben und Erinnerungen | Opt-in, begrenzte Speicherung, Ansicht, Löschen und Reset | Geplant |
| E | Live-Gehirnansicht mit nachvollziehbaren Entscheidungen | Echte Daten klar von Simulation und unbekannten Werten getrennt | Geplant |

## Konkreter Start: A1

1. `src/brain/brain.ts`: Typen, Initialzustand, reiner Reducer, Runtime-Adapter und regelbasierte Selbstauskunft.
2. Bestehende ausgewählte Aktivitätsereignisse und Fensterfokus in der Extension anbinden. Besitzregeln, Modellanfragen und Darstellung beibehalten.
3. Befehl **NAVI: About My State / Eigenen Zustand erklären** bereitstellen.
4. `test/brain.test.ts`: Ereignisfolgen, Fokus, Fähigkeiten, Fehler, veraltete Ereignisse, Datenschutz und getrennte Snapshots prüfen.
5. Bestehende Tests ausführen; VSIX bauen und Statusbericht aktualisieren. Den neuen Befehl im echten VS Code separat live prüfen.

Abschluss eines Schritts bedeutet lokale Implementierung plus dokumentierte Prüfung. Commit, GitHub-Release, echter Modell-Live-Test und Codex-Registrierung werden separat ausgewiesen. Die frühere v0.5.3-Vorschau bleibt vom jeweiligen neuen Testartefakt unterscheidbar.

## Übergabe A1

Neuer Befehl: **NAVI: About My State / Eigenen Zustand erklären**. Die Anzeige ist eine Momentaufnahme, keine laufend aktualisierte Gehirnansicht. Selbstmodell und Zustandskern sind in `src/brain/brain.ts` enthalten; vier neue Tests stehen in `test/brain.test.ts`. Nächster Implementierungsschritt ist A2, nicht sofort eine autonome Datei- oder Terminalsteuerung.
