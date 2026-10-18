# Fee-Gehirn: Umsetzungsplan

Stand: 17.10.2026. Reihenfolge: [Konzept](FAIRY-BRAIN.md) → [technische Spezifikation](FAIRY-BRAIN-TECHNICAL.md) → kleine geprüfte Implementierungsschritte. Keine zugesagten Termine.

| Etappe | Lieferung | Abnahme | Stand |
|---|---|---|---|
| A1 | Reiner Zustandskern, Selbstmodell und lokale Selbstauskunft aus bestehenden Aktivitäten/Fokus | Deterministischer Reducer, Fokus-/Fehler-/Abbruchtests, wahrheitsgemäße Fähigkeiten, keine Inhalte im Snapshot | Lokal implementiert, 48 Gesamttests bestanden; VS-Code-Live-Prüfung offen |
| A2 | Empfangsbestätigung, echte Anfrage-IDs und Ereignis-Replay über die Adapter | Verspätete und konkurrierende Ergebnisse korrekt zugeordnet; Live-Test der Nachrichtenreaktion | Teilweise lokal implementiert: ausgewählte Task-ID wird über ActivityEvent bis zum Brain-Snapshot geführt; Fremd-IDs bei Abschlüssen werden ignoriert. Keine Ereignisliste oder persistente Speicherung. End-to-End-Live-Prüfung offen. |
| A2b | Begrenzte lokale Wahrnehmung: Fenstermaus, aktiver Editor, Auswahl/Cursorzeile und Diagnosen | Pointer-Verlust/Fokus, Dokumentwechsel, Auswahl und Diagnosen werden korrekt ersetzt; Inhalte bleiben flüchtig und werden nicht automatisch an ein Modell gesendet | Lokal implementiert und automatisiert geprüft. Maximal 2.000 Zeichen Kontext und 25 Diagnosen; native Windows-Wahrnehmung noch live zu prüfen. |
| B | Begrenzte Aktionsauswahl mit Prioritäten, Begründung und Hinweisbudget | `wait` als Standard, Stop-/Fokusregeln, keine Hinweisflut; keine zusätzlichen Modellaufrufe für reine Reaktionen | Lokal umgesetzt; Zeitregeln und Budgets automatisch, Platzmachen/Rückkehr im echten isolierten VS-Code-Host geprüft |
| C | Ausgewählte Diagnose öffnen, markieren und auf Wunsch erklären | Ziel-/Dokumentversion prüfen; keine behauptete Pixelposition; echte Editor-Abnahme | Lokal umgesetzt; Diagnosemarkierung im echten isolierten VS-Code-Host geprüft, Modell-Erklärung separat live offen |
| D | Bestätigte Vorlieben und Erinnerungen | Opt-in, begrenzte Speicherung, Ansicht, Löschen und Reset | Lokal umgesetzt und automatisch geprüft; standardmäßig aus, Projekte getrennt |
| E | Live-Gehirnansicht mit nachvollziehbaren Entscheidungen | Echte Daten klar von Simulation und unbekannten Werten getrennt | Lokal umgesetzt; echte Snapshots, maximal 4 Hz sichtbar, 50 Entscheidungen nur RAM |

## Konkreter Start: A1

Aktueller Ausbau: [Aktiver Begleiter](ACTIVE-COMPANION.md). B umfasst jetzt Editorruhe, Platzmachen, Rückkehr, Diagnoseaufmerksamkeit und begrenzte Hilfeangebote. Der folgende A1-Start bleibt als historische Implementierungsbeschreibung erhalten.

1. `src/brain/brain.ts`: Typen, Initialzustand, reiner Reducer, Runtime-Adapter und regelbasierte Selbstauskunft.
2. Bestehende ausgewählte Aktivitätsereignisse und Fensterfokus in der Extension anbinden. Besitzregeln, Modellanfragen und Darstellung beibehalten.
3. Befehl **NAVI: About My State / Eigenen Zustand erklären** bereitstellen.
4. `test/brain.test.ts`: Ereignisfolgen, Fokus, Fähigkeiten, Fehler, veraltete Ereignisse, Datenschutz und getrennte Snapshots prüfen.
5. Bestehende Tests ausführen; VSIX bauen und Statusbericht aktualisieren. Den neuen Befehl im echten VS Code separat live prüfen.

Abschluss eines Schritts bedeutet lokale Implementierung plus dokumentierte Prüfung. Commit, GitHub-Release, echter Modell-Live-Test und Codex-Registrierung werden separat ausgewiesen. Die frühere v0.5.3-Vorschau bleibt vom jeweiligen neuen Testartefakt unterscheidbar.

## Übergabe A1

Neuer Befehl: **NAVI: About My State / Eigenen Zustand erklären**. Die Anzeige ist eine Momentaufnahme, keine laufend aktualisierte Gehirnansicht. Selbstmodell und Zustandskern sind in `src/brain/brain.ts` enthalten; vier neue Tests stehen in `test/brain.test.ts`. Nächster Implementierungsschritt ist A2, nicht sofort eine autonome Datei- oder Terminalsteuerung.

## A2: Task-ID-Verfolgung

`ActivityController` übergibt die ID des ausgewählten Tasks bei `busy`, Abschluss, Besitzerwechsel und Lease-Ablauf. `BrainSnapshot` hält die aktuelle beziehungsweise letzte ausgewählte `requestId`; terminale Ereignisse mit einem anderen `source + requestId`-Schlüssel werden als veraltet ignoriert. Der Codex-Adapter behält seine übergebene ID, der VS-Code-Chat nutzt die pro Anfrage generierte UUID. Replay wird über typisierte Ereignisfolgen und Adaptertests geprüft.

Das ist kein vollständiges Kurzzeitgedächtnis: Das Gehirn speichert keine Liste abgeschlossener Aufgaben und sieht weiterhin nur Ereignisse des durch `ActivityController` ausgewählten Owners. Die ID ist eine Korrelationskennung der Extension beziehungsweise des Aufrufers, keine ID des Modellanbieters. Live-Prüfung im Extension Host steht aus.

## A2b: Begrenzte Wahrnehmung

Der aktive Editor liefert Sprache, Dokumentversion, Auswahlbereich und höchstens 2.000 Zeichen aus der Auswahl; ohne Auswahl wird ein begrenzter Ausschnitt um den Cursor derselben Zeile gelesen. Dazu kommen höchstens 25 Diagnosen mit gekürzten Meldungen. Die native Windows-x64-Überlagerung liefert fensterlokale Mauskoordinaten höchstens viermal pro Sekunde; Fokus-/Overlay-Verlust löscht die letzte Position. Der Inhalt bleibt im RAM und wird weder im Brain-Report ausgeschrieben noch automatisch an ein Modell übergeben. Vollständige Dateien und Bildschirmbilder werden nicht erfasst.

## Ausdrucksschicht — 18.10.2026

Die lokale Ausdruckssteuerung ist implementiert: ausgewählte Gehirn-/Aktivitätsereignisse steuern gemeinsame Browser-/Windows-Profile für Empfang, Warten, Arbeit, lokale Hilfe/Klärung, Abschluss, Abbruch und Fehler. Der normale Flugregler und seine Maus-Sicherheit bleiben getrennt. Details und Grenzen: [Ausdruck der Fee](BRAIN-EXPRESSION.md). Dies implementiert keine allgemeine autonome Aktionsplanung aus Etappe B.
