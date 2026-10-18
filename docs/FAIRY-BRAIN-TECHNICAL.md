# Fee-Gehirn: technische Spezifikation

## Aktueller Ausbau — 18.10.2026

Die folgenden A1/A2-Verträge sind um den [aktiven Begleiter](ACTIVE-COMPANION.md) erweitert: `BrainSnapshot.decision` hält Aktion, Grund, unterdrückte Alternative und monotone Zeit; `availableActions` benennt vorhandene Befehle. Ein getrennter deterministischer Entscheidungskern steuert Platzmachen, Rückkehr und Hilfeangebote. Diagnose-Navigation und bestätigte optionale Erinnerungen sind lokal implementiert. Eine echte Live-Webview projiziert die Zustände ohne Editor-/Antworttexte; 50 Entscheidungen bleiben im RAM. Der Sprachadapter setzt einen ausdrücklich registrierten vorhandenen Aufnahme-/Transkriptionsanbieter voraus, der aktuell nicht angebunden ist. Die älteren Abschnitte unten dokumentieren den ursprünglichen A1/A2-Umfang.

Stand: 17.10.2026. Grundlage: [Produktkonzept und Formeln](FAIRY-BRAIN.md). Umsetzungsschritte: [Plan](FAIRY-BRAIN-PLAN.md).

## Architekturentscheidung

Der Kern ist TypeScript ohne VS-Code-Abhängigkeit, Netzwerkzugriff oder Sprachmodell. Die Extension übersetzt verfügbare Ereignisse. Die bestehende `ActivityController` entscheidet weiterhin über konkurrierende Chat-/Codex-Anfragen; der erste Gehirn-Ausbau beobachtet deren bereits ausgewählte Anzeigeereignisse. Er führt keine zusätzliche Aktionssteuerung parallel ein.

```text
ActivityController ── akzeptierte Anzeigeereignisse ─┐
VS-Code-Fokus, Editor, Auswahl, Diagnosen ───────────┼→ Brain → Snapshot → Selbstauskunft
Native Fenstermausposition ─────────────────────────┘             (lokal, ohne Modell)
Bestehende Darstellung ← ActivityController bleibt zunächst unverändert
```

## Zustandsvertrag für Etappe A1

`BrainSnapshot` enthält Revision, monotone Aktualisierungszeit, Fokus, Phase, Ereignisquelle, die aktuelle beziehungsweise letzte ausgewählte `requestId`, eine optionale fensterlokale Mausposition, eine begrenzte Beobachtung des aktiven Editors, einen nachvollziehbaren Entscheidungsgrund und ein begrenztes Fähigkeitsregister. Phasen: `idle`, `working`, `completed`, `cancelled`, `error`. Die Darstellungsbereitschaft `quiet` bei fehlendem Fokus ist davon getrennt: Eine Anfrage kann währenddessen weiterarbeiten.

Normalisierte Ereignisse:

| Ereignis | Daten | Wirkung |
|---|---|---|
| `activity` | Quelle, requestId bei Task-Status, busy/completed/cancelled/error/message, monotone Zeit | Zustandswechsel, Task-Zuordnung und belegter Grund |
| `focus` | Boolean, monotone Zeit | Darstellungsbereitschaft ändern; Anfragezustand erhalten |
| `pointer` | Fensterlokale x/y-Koordinaten in DIPs oder `null`, monotone Empfangszeit | Letzte Mausposition ersetzen; Fokusverlust oder Pointer-Verlust löscht sie |
| `editor` | Sprache, Version, Auswahlbereich, begrenzter Kontext und Diagnosen des aktiven Dokuments | Vorherige Editorbeobachtung ersetzen; kein Dokumentpfad oder Volltext |

Quellen: `vscode`, `codex`, `manual`. Der Adapter übernimmt nur typisierte lokale Ereignisse. Die Bridge behält ihre eigene Validierung. Im Gehirn werden **keine Nachrichteninhalte, Prompts oder Antworten** gespeichert. `requestId` ist die von NAVI erzeugte oder vom Codex-Aufrufer übergebene Korrelationskennung, keine interne Modellanbieter-ID. Es bleibt nur die aktuelle beziehungsweise letzte ausgewählte ID erhalten; ein Ereignisprotokoll wird nicht gespeichert. Veraltete Zeitstempel und terminale Ereignisse zu einem anderen aktuellen `source + requestId`-Schlüssel verändern den Zustand nicht. Gleiche Zeitstempel bleiben in der seriellen Aufrufreihenfolge gültig.

Mathematisch: `S[n+1] = reduce(S[n], e[n])`. Dieselbe initiale Konfiguration und Ereignisfolge müssen denselben Snapshot ergeben. Der Runtime-Adapter verwendet `performance.now()`; Replay-Tests geben Zeiten explizit vor. Keine Timer, Zufallszahlen oder Dateizugriffe im Reducer.

## Selbstmodell und Beleggrenzen

Jede Fähigkeit unterscheidet `implemented` und `availability` (`unknown` oder `available`) mit Beleg. In A1 wird kein komplexer Permission-Manager vorgetäuscht. Fehlende Berechtigungen werden erst bei einer tatsächlichen Aktionsschicht modelliert.

- VS-Code-Chat implementiert: ja. Eine gestartete Anfrage beweist noch keinen erreichbaren Anbieter. Ein erfolgreicher Abschluss ist ein zeitlich markierter Erfolgsbeleg, keine dauerhafte Verfügbarkeitsgarantie.
- Codex-Übergabe implementiert: ja. Erst eine tatsächlich empfangene Übergabe belegt den Kanal. Das Erzeugen einer Konfiguration tut dies nicht.
- Diagnose-Navigation und Companion-Erinnerungen werden im aktuellen Ausbau als implementiert registriert; ausgeschaltete Erinnerungen bleiben als nicht verfügbar ausgewiesen. Der ursprüngliche reine A1-Initialzustand behauptet diese Adapterfähigkeiten weiterhin nicht ohne Registrierung.
- Modellfehler: Erfolgsaussage zurücknehmen und Verfügbarkeit als unbekannt markieren; Ursache nicht erfinden.
- Aus früheren Erfolgen wird nur „zuletzt bestätigt“ formuliert, nie „gerade sicher verbunden“.

Die Funktion `describeBrain(snapshot)` erzeugt eine regelbasierte Selbstauskunft zu Zustand, Quelle, Grund und Grenzen. Keine zusätzlichen Modellaufrufe. Ein VS-Code-Befehl öffnet diese Daten als lesbares Dokument und zeigt die begrenzte Beobachtungstiefe ausdrücklich an.

## Schnittstellen und Lebensdauer

`Brain.observe(activity)` normalisiert ein freigegebenes Aktivitätsereignis einschließlich seiner Task-ID. `Brain.focus(boolean)` übernimmt den Fensterfokus. `Brain.snapshot()` liefert eine abgetrennte Kopie, die den internen Zustand nicht verändern kann. `Brain.describe()` formatiert diese Kopie einschließlich der bekannten Task-ID.

Initialisierung pro Extension-Fenster, Daten ausschließlich im RAM, Reset bei Reload. Kein weiterer Server, keine neue Einstellung und keine automatische Langzeitspeicherung. Die Offline-Konzeptgrafik bleibt bis zu einer späteren echten Zustandsanbindung als Simulation markiert.

Die native Windows-x64-Überlagerung sendet höchstens vier Mauspositionen pro Sekunde. Koordinaten sind lokale DIPs innerhalb des aktiven VS-Code-Clientfensters, keine Bildschirmkoordinaten. Ohne aktiven/fokussierten Overlay-Prozess ist die Position nicht verfügbar. Die Extension aktualisiert Editorbeobachtungen bei Editor-, Auswahl-, Dokument- und Diagnoseänderungen mit kurzer Entprellung. Sie enthält höchstens 2.000 Zeichen aus der Auswahl oder einem Ausschnitt um den Cursor derselben Zeile sowie 25 Diagnosen mit je höchstens 500 Zeichen Meldung. Der Brain-Report zeigt diese Texte nicht an und fordert damit kein Modell auf.

## Invarianten und Tests

1. Fokusverlust beendet keine Modellanfrage und darf keinen Erfolg erzeugen.
2. `busy` bedeutet laufender Auftrag, nicht fertige oder korrekte Antwort.
3. `completed` bedeutet Abschluss; keine Aussage „Tests bestanden“ ohne Testnachweis.
4. Ein Fehler oder Abbruch wird niemals in `completed` umgedeutet.
5. Geplante Fähigkeiten erscheinen nie als implementiert.
6. Chat-Nachrichteninhalte gelangen nicht in den Snapshot. Editor-Kontext bleibt begrenzt, flüchtig und wird im Brain-Report nicht ausgegeben.
7. Wiederholbares Replay, Pointer-/Editorersetzung und unveränderbare Ausgabe-Kopien werden getestet.
8. Konkurrenz bleibt beim getesteten ActivityController. Das Brain sieht nur dessen ausgewählten Owner, nicht alle parallelen Task-Verläufe. A1/A2 ändern weder Lease-Verhalten noch dessen Besitzregeln.

## Abgrenzung späterer Etappen

A2 ist teilweise umgesetzt: Task-IDs passieren ActivityController, Brain und Codex-Bridge; begrenzte Editor-/Diagnosebeobachtung und Fenstermausgeometrie sind ebenfalls angebunden. Replay und Datenschutzgrenzen sind automatisiert geprüft. Echte Modellanfragen und Codex-Host-Einrichtung bleiben separat live abzunehmen. B ergänzt inzwischen deterministische Aktionskandidaten und Hinweisbudgets, C ausdrückliche Diagnose-Navigation, D bestätigte Erinnerungen und E eine echte Live-Ansicht. Eine offene autonome Programmierplanung gehört weiterhin nicht zum Umfang. Siehe [aktueller Ausbau](ACTIVE-COMPANION.md).

## Lokale Ausdruckssteuerung — 18.10.2026

Die Modell-Lebensdauer unterscheidet jetzt empfangene Anfrage, Warten vor dem ersten Fragment und laufendes Streaming. Der ActivityController behält Besitzregeln und Anfrage-IDs; BrainPhase ergänzt acknowledging und waiting. ExpressionController übersetzt dies in zeitlich begrenzte oder gehaltene Ausdruckszustände für beide Renderer. [Gemeinsame Profile, Generierung und Abnahme](BRAIN-EXPRESSION.md).
