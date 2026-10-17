# Fee-Gehirn: technische Spezifikation

Stand: 17.10.2026. Grundlage: [Produktkonzept und Formeln](FAIRY-BRAIN.md). Umsetzungsschritte: [Plan](FAIRY-BRAIN-PLAN.md).

## Architekturentscheidung

Der Kern ist TypeScript ohne VS-Code-Abhängigkeit, Netzwerkzugriff oder Sprachmodell. Die Extension übersetzt verfügbare Ereignisse. Die bestehende `ActivityController` entscheidet weiterhin über konkurrierende Chat-/Codex-Anfragen; der erste Gehirn-Ausbau beobachtet deren bereits ausgewählte Anzeigeereignisse. Er führt keine zusätzliche Aktionssteuerung parallel ein.

```text
ActivityController ── akzeptierte Anzeigeereignisse ─┐
VS-Code-Fokus ──────────────────────────────────────┼→ Brain → Snapshot → Selbstauskunft
                                                   └             (lokal, ohne Modell)
Bestehende Darstellung ← ActivityController bleibt zunächst unverändert
```

## Zustandsvertrag für Etappe A1

`BrainSnapshot` enthält Revision, monotone Aktualisierungszeit, Fokus, Phase, Ereignisquelle, nachvollziehbaren Entscheidungsgrund und ein begrenztes Fähigkeitsregister. Phasen: `idle`, `working`, `completed`, `cancelled`, `error`. Die Darstellungsbereitschaft `quiet` bei fehlendem Fokus ist davon getrennt: Eine Anfrage kann währenddessen weiterarbeiten.

Normalisierte Ereignisse:

| Ereignis | Daten | Wirkung |
|---|---|---|
| `activity` | Quelle, busy/completed/cancelled/error/message, monotone Zeit | Zustandswechsel und belegter Grund |
| `focus` | Boolean, monotone Zeit | Darstellungsbereitschaft ändern; Anfragezustand erhalten |

Quellen: `vscode`, `codex`, `manual`. Der Adapter übernimmt nur typisierte lokale Ereignisse. Die Bridge behält ihre eigene Validierung. Im Gehirn werden **keine Nachrichteninhalte, Prompts oder Antworten** gespeichert. Seine Ereigniskennung ist eine lokale Revision, keine Modell-Anfrage-ID. Veraltete Zeitstempel verändern den Zustand nicht. Gleiche Zeitstempel bleiben in der seriellen Aufrufreihenfolge gültig.

Mathematisch: `S[n+1] = reduce(S[n], e[n])`. Dieselbe initiale Konfiguration und Ereignisfolge müssen denselben Snapshot ergeben. Der Runtime-Adapter verwendet `performance.now()`; Replay-Tests geben Zeiten explizit vor. Keine Timer, Zufallszahlen oder Dateizugriffe im Reducer.

## Selbstmodell und Beleggrenzen

Jede Fähigkeit unterscheidet `implemented` und `availability` (`unknown` oder `available`) mit Beleg. In A1 wird kein komplexer Permission-Manager vorgetäuscht. Fehlende Berechtigungen werden erst bei einer tatsächlichen Aktionsschicht modelliert.

- VS-Code-Chat implementiert: ja. Eine gestartete Anfrage beweist noch keinen erreichbaren Anbieter. Ein erfolgreicher Abschluss ist ein zeitlich markierter Erfolgsbeleg, keine dauerhafte Verfügbarkeitsgarantie.
- Codex-Übergabe implementiert: ja. Erst eine tatsächlich empfangene Übergabe belegt den Kanal. Das Erzeugen einer Konfiguration tut dies nicht.
- Diagnose-Navigation und dauerhaftes Companion-Gedächtnis: noch nicht implementiert.
- Modellfehler: Erfolgsaussage zurücknehmen und Verfügbarkeit als unbekannt markieren; Ursache nicht erfinden.
- Aus früheren Erfolgen wird nur „zuletzt bestätigt“ formuliert, nie „gerade sicher verbunden“.

Die Funktion `describeBrain(snapshot)` erzeugt eine regelbasierte Selbstauskunft zu Zustand, Quelle, Grund und Grenzen. Keine zusätzlichen Modellaufrufe. Ein VS-Code-Befehl öffnet diese Daten als lesbares Dokument und zeigt die begrenzte Beobachtungstiefe ausdrücklich an.

## Schnittstellen und Lebensdauer

`Brain.observe(activity)` normalisiert ein freigegebenes Aktivitätsereignis. `Brain.focus(boolean)` übernimmt den Fensterfokus. `Brain.snapshot()` liefert eine abgetrennte Kopie, die den internen Zustand nicht verändern kann. `Brain.describe()` formatiert diese Kopie.

Initialisierung pro Extension-Fenster, Daten ausschließlich im RAM, Reset bei Reload. Kein weiterer Server, keine neue Einstellung und keine automatische Langzeitspeicherung. Die Offline-Konzeptgrafik bleibt bis zu einer späteren echten Zustandsanbindung als Simulation markiert.

## Invarianten und Tests

1. Fokusverlust beendet keine Modellanfrage und darf keinen Erfolg erzeugen.
2. `busy` bedeutet laufender Auftrag, nicht fertige oder korrekte Antwort.
3. `completed` bedeutet Abschluss; keine Aussage „Tests bestanden“ ohne Testnachweis.
4. Ein Fehler oder Abbruch wird niemals in `completed` umgedeutet.
5. Geplante Fähigkeiten erscheinen nie als implementiert.
6. Nachrichteninhalte gelangen nicht in den Snapshot.
7. Wiederholbares Replay und unveränderbare Ausgabe-Kopien werden getestet.
8. Konkurrenz bleibt beim getesteten ActivityController. A1 ersetzt weder Lease-Verhalten noch dessen Besitzregeln.

## Abgrenzung späterer Etappen

A2 ergänzt echte Empfangs- und Anfrage-IDs, Quellen-/Versionsprüfung und vollständige Replay-Szenarien über die Adapter. B führt Aktionskandidaten, Nutzenbewertung, Hinweisbudgets und Ausführungsrechte ein. C verbindet Diagnoseziele mit Editor-Aktionen. D implementiert bestätigte Erinnerungen. Diese Funktionen sind mit A1 noch nicht vorhanden.
