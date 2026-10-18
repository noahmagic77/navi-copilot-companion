# NAVI Statusbericht

Stand: **18.10.2026**. Die [Roadmap](roadmap.md) beschreibt die Reihenfolge; [Bedienung und Architektur](ACTIVE-COMPANION.md) den aktuellen Begleiter und seine Grenzen.

## Animations-Hotfix v0.6.1

Alle 110 Vorschauen sind gegen Unterbrechungen durch automatische Reaktionen abgesichert; echte Modellanfragen behalten Vorrang. Native Vorschauen laufen eigenständig in Schleifen. Begrüßungen funktionieren nach Zuhören/Nachdenken, die Blende kehrt nach dem Vorschauende zum aktuellen Ausdruck zurück und der Ruhezustand beginnt in der Webview nach 90 statt neun Sekunden.

Die vollständige Browserprüfung erfasst jede Auswahl über mehrere Zyklen und alle 110 Einträge in Reihenfolge. Native Windows-Rasterprüfungen erfassen jede Animation über zwei volle Zyklen. Der bestehende 83-Tests-Satz bleibt erhalten; zusätzliche native und isolierte Host-Prüfungen sichern die Vorschau-Prioritäten. Ein reproduzierbarer Test des alten v0.6.0-Browsercodes scheitert bereits an der durch Begleiterreaktionen gesperrten Auswahl.

[v0.6.1-VSIX](../downloads/navi-copilot-companion-0.6.1.vsix) · [Prüfsumme](../downloads/navi-copilot-companion-0.6.1.vsix.sha256) · [Änderungen Deutsch](releases/v0.6.1.de.md) · [English release notes](releases/v0.6.1.en.md). Der tatsächliche Veröffentlichungsstand steht auf [GitHub Releases](https://github.com/noahmagic77/navi-copilot-companion/releases). Die gesonderte Ankerflug-Abnahme bleibt offen; der entsprechende gehostete Windows-Fenstertest ist kein bestandener Nachweis.

## Aktueller Stand

**Pixelnavigation lokal ergänzt:** Ein sichtbarer Zielanker an der Diagnose liefert dem Windows-Helfer echte Pixelkoordinaten. Die Fee landet auf derselben gemessenen Höhe, 60 DIPs links daneben. Maximal 20 Sekunden und vier Messungen pro Sekunde; keine Produkt-Bildspeicherung oder Übertragung. Erkennung, DPI-Geometrie, native Live-Landung und Anker aus dem echten VS-Code-Renderer geprüft. Die durchgehende VS-Code-Overlay-Abnahme ist weiterhin offen: der isolierte Helfer konnte kein sichtbares zugehöriges Fenster anbinden (`owner=false`). Details und Grenzen: [Editor-Anker](EDITOR-ANCHORS.md).

Die drei echten Editor-Rasterfälle Grundzustand, Zoom mit Wortumbruch und duplizierte Datei in geteilten Gruppen werden jeweils vom nativen Erkenner gefunden. Der aktuelle erfolgreiche Host-Lauf ist ausdrücklich ein Renderer-/Quick-Fix-Lauf; die vollständige Fensteraktivierung wurde separat verweigert und gilt nicht als bestanden.

**Explizites Beheben ergänzt:** „Problem beheben“ verwendet die vorhandene VS-Code-Quick-Fix-Ausführung: eindeutig empfohlener Vorschlag nach Klick direkt, mehrere oder nicht empfohlene zur Auswahl, ohne Vorschlag keine Änderung. Reine KI-/Erkläraktionen werden nicht automatisch gewählt. Die ausgewählte Diagnose erhält ein Feensymbol im Zeilenrand. Kein eigener Syntaxparser, kein Modellaufruf und kein automatisches Speichern durch NAVI. Die neue Pixelnavigation ist als lokale Testfunktion angebunden; ihre vollständige VS-Code-Abnahme bleibt offen.

**Konkrete Programmierhilfe ergänzt:** Rechtsklick-Aktionsmenü in beiden Darstellungen, Diagnose-Navigation mit Weitergehen und Rücksprung, Auswahl bekannter Workspace-Probleme, Öffnen vorhandener Quick Fixes und vorbereitete Besprechung einer Codeauswahl. Hilfeangebote nennen ihre Diagnose; veraltete Ziele werden erneut geprüft. Offene Hinweisnachrichten blockieren weitere Navigation nicht mehr. Die Blasenspitze folgt dem tatsächlich gerenderten Kern; passende Aktionsknöpfe erscheinen nur bei Hilfeangeboten.

**Auch lokale Auswertungen entfernt:** Analysejournal, SQLite-Index, Metrikimport und die zugehörigen Befehle sind aus dem aktuellen Stand entfernt. Beim Start werden diese Daten nicht mehr geladen oder rekonstruiert. Alte Dateien bleiben unangetastet; Wahrnehmung, Reaktionen, Chat und bestätigte Erinnerungen bleiben erhalten.

**Lebendigere Fee:** Die [neue Verhaltensebene](LIFELIKE.md) reagiert auf weitere Editor-, Task-, Debug-, Fokus- und Berührungsereignisse. Sechs neue gemeinsame Ausdrucksprofile, simulierte Dynamik, Mausblick und sanfte Atembewegungen sind lokal umgesetzt. Die tatsächliche VS-Code-Prüfung bestätigt Speichern → positive Geste und Task-Prozessende → passende Rückmeldung; ein vollständiger Debugger-/Mikrofon-/Modell-Live-Test bleibt offen.

**Prompt-Analyse entfernt:** Eingabeformular, Prüfbefehl, Heuristiken, Themenwechselbewertung und automatische Chat-Auswertung sind vollständig aus dem aktuellen Stand entfernt. Modellanfragen, Diagnosehilfe und Begleiterentscheidungen bleiben erhalten. Auch historische Analyseereignisse werden nicht mehr geladen; die Dateien bleiben unangetastet.

**v0.6.0 implementiert B, C und D/E:** begrenzte Eigeninitiative, ausdrückliche Problemnavigation, bestätigte optionale Erinnerungen und eine echte Live-Gehirnansicht. Die geprüfte VSIX samt SHA-256 ist gemeinsam mit dem Quellcode unter downloads/ versioniert. Der GitHub-Workflow veröffentlicht nach erfolgreicher CI eine ausdrücklich als Vorschau gekennzeichnete Version mit englischen und deutschen Notizen. Den tatsächlichen Veröffentlichungsstand zeigen [GitHub Releases](https://github.com/noahmagic77/navi-copilot-companion/releases) und [GitHub Actions](https://github.com/noahmagic77/navi-copilot-companion/actions). Die vollständige VS-Code-Overlay-Flugabnahme bleibt offen.

| Bereich | Umsetzung | Nachweis / offene Abnahme |
|---|---|---|
| Windows-Fee und Maus | Native Windows-x64-Fee, geometrische Wahrnehmung, DPI, Ausweichen und Zielflüge | Frühere Maus-Ausweichfunktion vom Projektinhaber live bestätigt; native Fenster-, Raster- und IPC-Prüfungen bestanden. Zusammenspiel aller neuen Funktionen im normalen VS-Code-Profil visuell offen. |
| Animationen und Ausdruck | 110 Bewegungen, zehn zusätzliche Begrüßungen; Empfang, Warten, Arbeit, Hinweise, Abschluss, Abbruch und Fehler | 990 Bewegungs- und 120 Ausdrucks-Vergleichsposen und 45 Dynamikposen, native Raster und echte Browserprüfungen. Keine menschliche Abnahme aller 110 Bewegungen behauptet. |
| Sprechblase | Transparenter Körper, Zeiger zum Feenkern; wiederholter NAVI-Name entfernt | Browser und nativer Fenstertest: Darstellung, Mitbewegen, Klickdurchleitung und kein Fokusdiebstahl geprüft. Das Modell hat keinen gezeichneten Mund. |
| Geräusche | Zwölf eigene synthetisierte Klänge; Opt-in, Lautstärke, Testwiedergabe | Vom Projektinhaber als hörbar bestätigt; tatsächliche WAV-Wiedergabe im Browser erneut geprüft. |
| Mausspiele und Kitzeln | Fangen, Mausjagd, Verstecken; direkte Spielknöpfe, Start/Stopp, begrenzte freiwillige Einladungen, Klick-Glitzer | Regeln und Protokoll automatisch geprüft; Spielstart/-ende und direkte Klickinteraktion geben der Begleitersteuerung Vorrangsignale. Selektive Spielklicks im normalen VS Code noch live abnehmen. |
| A1/A2: Zustand und Anfragen | Zustandskern, Selbstmodell, Anfrage-IDs, Konkurrenzregeln, Selbstauskunft und Ausdruckssteuerung | Automatische Lebenszyklus-, Konkurrenz-, Abbruch- und Fehlerprüfungen bestehen. Echte Modell-/Client-Anfragen separat offen. |
| A2b: Wahrnehmung | Fenstermaus, Auswahl/Cursorzeile bis 2.000 Zeichen, maximal 25 Diagnosen im Brain-Snapshot | RAM-only; keine automatische Modellweitergabe. Reale Editoränderungen und Diagnosebeobachtung im isolierten VS-Code-Host geprüft. |
| B: Begleiterentscheidungen | Nach drei Änderungen in fünf Sekunden Platz machen, nach zehn Sekunden Ruhe zurückkommen; Diagnoseaufmerksamkeit und begrenzte Angebote | Zeit-/Vorrangtests bestehen. Tatsächlicher VS-Code-Host bestätigt Platzmachen, Rückkehr und Abschalten. |
| C: Probleme zeigen | Fehler vor Warnungen, Auswahl, Diagnosezyklus, bekannte Projektprobleme, Markierung, vorhandene Quick Fixes und gemessene Anker-Pixelnavigation als Testfunktion | Diagnosemarkierung, Weitergehen/Rücksprung, Fix und Undo im Host geprüft. Ankerdarstellung und native Landung getrennt bestanden; vollständige VS-Code-Overlay-Abnahme und echte Modellantwort separat offen. |
| D: Erinnerungen | Bestätigte Vorlieben im Profil, Projektmerksätze/Aufgaben/nächste Schritte je Workspace; ansehen, bearbeiten, löschen und zurücksetzen | Standardmäßig aus. Speichergrenzen, Rekonstruktion und Projekttrennung automatisch geprüft. Kein automatisches Sammeln oder Modellversand. Andere Workspaces werden dort getrennt verwaltet. |
| E: Live-Gehirn | Echte Wahrnehmung → Zustand → Entscheidung → Ausdruck; Gründe, Fähigkeiten, Erinnerungen und 50 Entscheidungen im RAM | Ansicht nur sichtbar mit maximal 4 Hz aktualisiert. Sichere Textdarstellung und Schaltflächen im Edge-Browser geprüft, Webview im echten VS-Code-Host geöffnet. Konzeptgrafik bleibt Simulation. |
| Sprache | Anbieterschnittstelle, expliziter Zuhörmodus, Statusleiste mit Stopp, Befehlsparser und Fokus-/Fehler-/Schließlogik | Mit simuliertem Anbieter getestet. Kein kompatibler echter Audio-/Transkriptionsanbieter angebunden: deaktiviert mit Erklärung. Installiertes Codex Audio hat laut Manifest keine öffentliche API. |
| Farben | Nacht-/Sonne-/Mond-/Laternenpaletten | Weiterhin geplant; Helligkeitssteuerung ist keine vollständige Farbpalette. |

## Vorhandene KI-Zugänge

`@navi` verwendet das in VS Code ausgewählte Modell über `request.model.sendRequest`. Die gebündelte MCP-Brücke erlaubt ausdrücklich übergebene Codex-Meldungen und Zustände; **Configure Codex Connection** erstellt die Konfiguration. Echte MCP-stdio-/Pipe-Tests bestehen. Eine Verbindung zu dieser Chat-Sitzung ist nicht bestätigt; keine allgemeine Einsicht in fremde Chats oder interne Modellgedanken.

Die Extension verarbeitet Entscheidungen und Darstellung lokal im Extension-Host. Lokale CPU/GPU-, Remote-/Cloud- oder Serverberechnung eines Modells hängt vom tatsächlich konfigurierten Anbieter ab. Es wird kein zusätzliches Modell oder Ollama installiert. Ein Textmodellzugang liefert nicht automatisch Mikrofonaufnahme oder Transkription. [Einrichtung](AI-CONNECTION.md).

## Prüfstand

- **83 JavaScript-/TypeScript-Tests bestanden**, einschließlich Ankerfarben, begrenzter Geometrie, Helper-Lebenszyklus, Fix-Ziel am Cursor, Diagnosezyklus, Begleiterregeln, Hinweisbudgets, Aufgabenbesitz, Wahrnehmung, Problemidentität/Bereiche, Erinnerungen, Live-Projektion und Sprach-Lebenszyklus. Ein fehlgeschlagener Mikrofon-Stopp bleibt sichtbar unbestätigt und kann erneut versucht werden.
- Native Go-Tests für Overlay, Bewegung, Ausdruck, Spiele, Trefferregionen, Protokoll und Sprechblasen bestanden.
- Echter Edge-Browser: Platzmachen, Hilfe-/Gehirnaktionen, sichere Live-Darstellung, Vorschau, Pause/Fortsetzen, Sichtbarkeit, Mausreaktion, Sprechblase und tatsächlicher Audiostart bestanden. Drei repräsentative Animationen zeigen im gemessenen Abschnitt ungefähr 26–46 Pixel Bewegung; keine Prüfung aller Animationen durch einen Menschen.
- Echter isolierter VS-Code-Extension-Host: aktueller gezielter Lauf prüft Diagnosebeobachtung, bereinigte Live-Daten, Anbieterregistrierung ohne Aufnahme, Markieren/Weitergehen/Rücksprung bei offenen Hinweisen und die Auswahl eines Projektproblems. Mit kontrolliertem registriertem Code-Action-Anbieter: fehlende Klammer ergänzen, echtes Undo, mehrdeutige/fehlende Fixes ohne Änderung und Abbruch bei Änderungen während der Abfrage bestanden. Fokusabhängige Zeitprüfungen wurden in diesem Lauf ausdrücklich ausgelassen; frühere fokussierte Läufe prüften Platzmachen/Rückkehr, Speichern und Task-Ergebnis. Menschliche Sichtabnahme und produktive Sprachdienste bleiben separat offen.
- Nativer WinForms-Fenstertest: neuer Rechtsklick meldet die Aktionsanforderung, Klickdurchleitung der Sprechblase, keine Fokusübernahme, Fensterbewegung, Grenzen, Ausblenden über anderen Fenstern und Minimieren/Wiederherstellen bestanden. Das ist keine vollständige VS-Code-Spielabnahme.
- Tatsächliche native Kontrollpipes und sauberes Beenden geprüft. Neue Test-VSIX gebaut, SHA-256 erzeugt und 54 enthaltene Laufzeit-/Asset-/Manifest-/Lizenzdateien mit dem aktuellen geprüften Stand per Hash verglichen. README-/Changelog-Links werden durch VSCE beim Verpacken umgeschrieben und deshalb nicht byteweise verglichen.

Diese Nachweise ersetzen keine menschliche Sichtabnahme und keine echte Modell- oder Mikrofonprüfung.

## Testdateien und Berichte

- [v0.6.0 – vorbereitetes Release-Paket](../downloads/navi-copilot-companion-0.6.0.vsix) · [SHA-256](../downloads/navi-copilot-companion-0.6.0.vsix.sha256)
- [VS-Code-Host-Bericht](../build/companion-host-report.json)
- [Browserbericht](../build/preview-runtime/report.json)
- [Nativer Fensterbericht](../build/companion-native-window/native-window-integration.json)
- [Frühere v0.5.3-VSIX](../downloads/navi-copilot-companion-0.5.3.vsix)

Build-Berichte bleiben im ignorierten Build-Verzeichnis. Das neue Release-Paket liegt unter downloads/; bestehende ältere Downloads bleiben erhalten. Quellcode und Download gehören zum selben Release-Stand; temporäre Build-Berichte werden nicht mit veröffentlicht.

## Nächste Abnahme

1. Die neue Vorschau installieren, VS Code neu laden und im normalen Profil Verhalten, reduzierte Bewegung, Fokus, Skalierung und Spiele prüfen.
2. Mit dem tatsächlich eingerichteten VS-Code-Modell Anfrage, Streaming, Abschluss, Fehler und Abbruch prüfen; Codex-MCP beim tatsächlichen Host einrichten und separat testen.
3. Erinnerungsverwaltung mit bewusst bestätigten Einträgen durchspielen; Projekttrennung, Löschen und Neustart im normalen Profil abnehmen.
4. Für Sprache erst einen unterstützten vorhandenen Anbieter belegen und anbinden. Dann Aufnahmegerät, Datenweg, dauerhaften Indikator und tatsächliches Beenden separat prüfen. Bis dahin keine Aufnahme.
5. Die CI und den automatischen GitHub-Vorschau-Release prüfen. Die vollständige Flug-/Sichtabnahme bleibt offen und wird im Release genannt; ihre erfolgreiche Abnahme wird separat dokumentiert.

## Veröffentlichung und Open Source

Projektcode und projekteigene Assets verwenden MIT; Go-Drittanbieterhinweise sind enthalten. Das ist von einem Marketplace-Eintrag unabhängig. Die v0.6.0-Änderungsnotizen liegen [auf Englisch](releases/v0.6.0.en.md) und [auf Deutsch](releases/v0.6.0.de.md) vor. Der Release-Workflow fügt englische und deutsche Notizen direkt in die GitHub-Release-Beschreibung ein.

Bei jeder Abnahme Umsetzung, automatische Prüfung, menschliche Bestätigung und Veröffentlichung getrennt fortschreiben. Ohne Nachweis keinen Punkt als live bestätigt oder veröffentlicht markieren.
