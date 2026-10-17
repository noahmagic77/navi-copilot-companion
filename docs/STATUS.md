# NAVI Statusbericht

Stand: **17.10.2026**. Dieser Bericht beschreibt den nachweisbaren Projektstand. Die [Roadmap](roadmap.md) beschreibt die nächsten Schritte; das [Changelog](../CHANGELOG.md) die Änderungen pro Version.

## Wo stehen wir gerade?

**Die geometrische Wahrnehmung ist umgesetzt. Aktuell wird die Darstellung überarbeitet und live geprüft. Die Anbindung an vorhandene VS-Code- und Codex-Zugänge ist im lokalen v0.5.3-Arbeitsstand implementiert; echte Client-/Modell-Live-Prüfungen stehen aus. Eine zusätzliche lokale Modell-Laufzeit ist nicht gewünscht.**

| Versionsstand | Bedeutung |
|---|---|
| [v0.5.2 auf GitHub](https://github.com/noahmagic77/navi-copilot-companion/releases/tag/v0.5.2) | Veröffentlichte Preview mit Sprechblasen, zwölf eigenen Feenklängen und Animationsvorschau. Commit `2ad85ab`. CI, nativer Windows-Workflow und Veröffentlichung waren erfolgreich. |
| v0.5.3 im lokalen Arbeitsstand | Transparente Sprechblasen, stärkere Bewegungen, Modell-Aktivitätszustände und gebündelte Codex-MCP-Brücke. VSIX gebaut; Änderungen noch nicht als neue Version auf GitHub veröffentlicht und noch nicht committet. |
| Vorhandene KI-Zugänge | VS-Code-Modellanfragen über `@navi` mit Aktivitätszuständen; gebündelte MCP-Brücke für gezielte Codex-Meldungen, Einrichtungsbefehl und manuelle Textübergabe implementiert. Echte MCP-/Pipe-Tests bestehen. Keine bestätigte Verbindung zu dieser Chat-Sitzung. Siehe [Einrichtung](AI-CONNECTION.md). |

## Fee-Gehirn: Konzeptstand

Ein [mathematisch beschriebenes Konzept](FAIRY-BRAIN.md) für Wahrnehmung, Arbeitsgedächtnis, Aufmerksamkeit, Aktionsauswahl und VS-Code-Handlungen liegt vor. Es enthält Reaktionen auf Nachrichten, einen Etappenplan und ein technisches Selbstmodell. Eine [interaktive Grafik mit sechs Szenarien](fairy-brain.html) zeigt den Entwurf; sie verwendet simulierte Daten und ist nicht mit der laufenden Extension verbunden. Die [technische Spezifikation](FAIRY-BRAIN-TECHNICAL.md) und der [Umsetzungsplan](FAIRY-BRAIN-PLAN.md) sind erstellt. A1 ist lokal implementiert: deterministischer Zustandskern, begrenztes Selbstmodell, Fokus-/Aktivitätsadapter und der Befehl **NAVI: About My State / Eigenen Zustand erklären**. Die allgemeine Aktionsauswahl, dauerhaftes Companion-Gedächtnis und Diagnose-Navigation sind **noch nicht implementiert**. Vier neue Gehirn-Tests bestehen; die Momentaufnahme im echten VS Code ist noch live zu prüfen.

## Funktionsstand

„Umgesetzt“ bedeutet, dass Code vorhanden ist. „Automatisch geprüft“ und „live bestätigt“ sind eigene Nachweise; daraus folgt keine vollständige Prüfung aller Konfigurationen.

| Bereich | Umsetzung / automatische Prüfung | Live-Stand und offene Punkte |
|---|---|---|
| Windows-Fee | Nativer Windows-x64-Helfer, transparente Darstellung, Klickdurchleitung, Fokus-/Sichtbarkeitssteuerung | Frühere Live-Tests vom Projektinhaber als erfolgreich gemeldet. Neueste v0.5.3-Darstellung in VS Code noch offen. |
| Maus-Wahrnehmung | Geometrie, DPI-Skalierung, Ausweichen und sanftes Beruhigen; deterministische Tests vorhanden | Maus-Ausweich-VSIX vom Projektinhaber erfolgreich live getestet. Kein Screenshot- oder Bildverständnis. |
| Zielflug | Fünf Fensterpositionen, Abbruch und Vorrang der Maus; Navigations-/Protokolltests vorhanden | Neuer Zielflug braucht einen gezielten Live-Test. Keine Zuordnung zu exakten Codezeilen. |
| Animationen | 110 Bewegungen einschließlich zehn zusätzlicher Begrüßungen; gemeinsame Browser-/Native-Definitionen und Paritätstests | Nutzer meldete zu schwache Sichtbarkeit. v0.5.3 verstärkt Bewegung und Licht; visuelle Abnahme steht aus. |
| Sprechblase | Ereignisse und begrenzte Auszüge aus eigenen NAVI-Antworten; v0.5.3 mit Alpha-Transparenz und Zeiger zum Feenkern | Raster-, Browser- und isolierte sichtbare Windows-Tests bestanden. Darstellung und Chat-Anbindung im echten VS Code noch prüfen. Das Modell hat keinen gezeichneten Mund. |
| Geräusche | Zwölf eigene synthetisierte Klänge, Opt-in, Lautstärke und Testwiedergabe; automatische Tests vorhanden | **Vom Projektinhaber als hörbar bestätigt.** |
| Chat | `@navi` nutzt `request.model.sendRequest`, also das ausgewählte VS-Code-Modell | Kein eigener lokaler Modelladapter. Wo das Modell rechnet, hängt vom ausgewählten Anbieter und dessen Einrichtung ab. |
| Promptprüfung und Speicherung | Deterministische lokale Regeln; vollständige eigene Historie und bereinigte Analytik separat optional | Keine automatische Einsicht in fremde Copilot-Chats. |
| Mikrofon / Sprachbefehle | Noch nicht implementiert | Feenklänge sind keine Mikrofonfunktion oder Spracherkennung. |
| Diagnose-Navigation, Klick-Glitzer, Farbpaletten | Geplant | Noch keine Abnahme. |

## Vorliegende Prüfungen der v0.5.3-Vorschau

- 48 JavaScript-/TypeScript-Tests bestanden; darunter Katalog-, Bewegungs-, Klang-, Prozess- und Textprüfungen.
- Go-Tests für Helfer, Bewegung, Protokoll und Sprechblasen bestanden. Die Bewegungsparität umfasst 990 generierte Browser-/Native-Vergleichsposen.
- Native Rastertests prüfen transparente Flächen, Textpixel und die Zeigerspitze am Feenkern. Ein isolierter sichtbarer Blasentest prüft Mitbewegen, Ausblenden und fehlende Fokusübernahme.
- Ein echter Edge-Browserlauf prüft drei repräsentative Animationen, Wiederholung, Pause/Fortsetzen, Ausblenden, Blasenausrichtung, Klartextdarstellung und gestartete WAV-Wiedergabe. Die drei Beispiele bewegten sich im gemessenen Abschnitt ungefähr 19–43 Pixel. Das ist keine visuelle Live-Abnahme aller 110 Animationen.
- VSIX v0.5.3 gebaut; enthaltene Grafikskripte, CSS und Windows-Helfer stimmen mit den geprüften lokalen Dateien überein. SHA-256-Datei liegt daneben.

Die Angaben halten die bereits durchgeführten Prüfungen fest. Für die KI-Verbindung wurden die Anwendungstests erneut ausgeführt; hinzu kommen Tests für Modell-Streaming, Abbruch, Fehler, Aktivitätskonkurrenz, Ablauf und echten MCP-stdio-/Pipe-Verkehr. Der MCP-Prozess läuft hier auch mit der installierten VS-Code-Laufzeit. Der vollständige lokale Vordergrund-Testhost konnte zuletzt wegen einer Windows-Aktivierungsbeschränkung nicht ausgeführt werden; der frühere GitHub-Windows-Lauf für v0.5.2 war erfolgreich. Das ersetzt keinen VS-Code-End-to-End-Test von v0.5.3.

## Lokale Testartefakte

Die aktuelle VSIX und Prüfsumme liegen für den nächsten Commit unter `downloads/`. Die ergänzenden Prüfberichte und Bilder liegen im ignorierten Build-Verzeichnis. Noch keine Veröffentlichung dieser Version auf GitHub:

- [Installierbare v0.5.3-Vorschau](../downloads/navi-copilot-companion-0.5.3.vsix)
- [SHA-256](../downloads/navi-copilot-companion-0.5.3.vsix.sha256)
- [Browser-Prüfbericht](../build/preview-runtime/report.json)
- [Browser-Screenshot der Sprechblase](../build/preview-runtime/speech-bubble.png)
- [Nativer Sprechblasen-Raster](../build/preview-runtime/native-speech-bubble.png)

## Nächste konkrete Schritte

1. v0.5.3 in VS Code installieren und Sprechblase, Zeiger und Animationsstärke live prüfen; bei Bedarf korrigieren. Danach Commit und Veröffentlichung vorbereiten.
2. Den implementierten VS-Code-Modellweg live mit `@navi` prüfen; über **NAVI: Configure Codex Connection** die Verbindung beim verwendeten Codex-Client einrichten. Keine zusätzliche Modellinstallation.
3. VS-Code-Anfragen und ausdrücklich übergebene Codex-Meldungen einschließlich Abbruch, Fehlern und konkurrierenden Quellen testen. Codex-Verbindung im tatsächlichen Host live prüfen; reine Planung ist kein Verbindungsnachweis.
4. Die lokale A1-Selbstauskunft live prüfen, anschließend A2 mit Empfangsereignissen und echten Anfrage-IDs umsetzen. Danach die begrenzte Aktionsauswahl und ausgewählte Editor-Probleme angehen.

## Aktualisierungsregel

Nach einer Änderung oder Abnahme Datum, Version, Nachweis und offene Punkte aktualisieren. Nutzerbestätigungen getrennt von automatischen Prüfungen erfassen. Nach einem Release den lokalen Vorschau-Status und die Links anpassen. Ohne neuen Nachweis keinen Punkt als live bestätigt oder veröffentlicht markieren.

## Open Source

Der vorbereitete Arbeitsstand verwendet die MIT-Lizenz statt des bisherigen Weitergabeverbots. Paketmetadaten und Dokumentation sind angepasst; Drittanbieterhinweise einschließlich Go-Lizenz sind enthalten. Die Änderung wird mit dem nächsten Commit veröffentlicht und ist noch nicht auf GitHub gepusht.

## Übergabe zur Veröffentlichung v0.5.3

Alle neuen Änderungen sind [auf Englisch](releases/v0.5.3.en.md) und [auf Deutsch](releases/v0.5.3.de.md) zusammengefasst. Der GitHub-Release verwendet englische Notizen mit Link zur deutschen Fassung. Der Push und die Release-Workflows werden nach dem Commit geprüft; dieser Text ist der vorbereitete Stand vor der Veröffentlichung.
