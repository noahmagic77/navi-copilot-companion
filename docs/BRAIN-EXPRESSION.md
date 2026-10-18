# Wie NAVIs Gehirn in der Fee sichtbar wird

Stand: 18.10.2026, lokale v0.6.0-Vorschau. Die Ausdruckssteuerung ist mit den vorhandenen Gehirn- und Aktivitätsereignissen verbunden. Sie ist keine Bewusstseinsanzeige und macht keine zusätzlichen Modellaufrufe.

## Sichtbare Reaktionen

| Ereignis | Ausdruck | Bedeutung |
|---|---|---|
| Anfrage empfangen | Kurzes Zuneigen, Flügelimpuls und helleres Leuchten | Die Nachricht ist angekommen. |
| Warten auf Modell / erstes Fragment | Geneigte, ruhigere Haltung und langsamerer Flügelschlag | Noch keine Antwort empfangen. |
| Textantwort läuft | Gleichmäßiges Nachdenken, sanfter Lichtpuls | Die bestehende Modellanfrage liefert Text. |
| Diagnosehilfe wird angeboten | Kleine Annäherungsbewegung und Neigung | Ein Begleiter-Hinweis ist verfügbar. |
| Ausdrückliche Klärungsreaktion | Fragende Neigung, zurückhaltende Bewegung | Unterstütztes Ausdrucksprofil; keine automatische Prompt-Bewertung. |
| Antwort abgeschlossen | Kurzes Heben und Abschlussgeste | Antwort angekommen; Inhalt und Code sind ungeprüft. Keine automatische Erfolgsfeier. |
| Abbruch / Aktivitätsfrist abgelaufen | Zurückweichen und beruhigen | Die Aktivität endet. Diese beiden Ursachen bleiben im bestehenden Adapter noch zusammengefasst. |
| Fehler | Kurzes seitliches Schütteln und neutrales Hinweissignal | Die Anfrage ist fehlgeschlagen. |

Eine erste Empfangsgeste dauert bis zu 650 ms. Anschließend zeigt die Steuerung den inzwischen aktuellen Zustand. Fehler, Abbruch und eine sehr schnelle fertige Antwort dürfen die Empfangsgeste sofort beenden. Neue Textfragmente starten die Bewegung nicht immer wieder neu. Kurze Schlussreaktionen gehen selbstständig in den Leerlauf zurück.

Die Fee reagiert auch bei deaktivierter Sprechblase durch Bewegung und Licht. Klänge bleiben separat opt-in und lautstärkegesteuert. Es gibt keinen Klang pro Textfragment. Die Statuszeile der Companion-Ansicht nennt den Zustand zusätzlich und ist für Screenreader markiert.

## Gemeinsame Steuerung statt zweier Zuordnungen

```text
Eigene Modellanfrage oder gezielte Codex-Übergabe
  → ActivityController ordnet Quelle und Anfrage zu
  → Brain hält Zustand und Grund
  → ExpressionController wählt die sichtbare Reaktion
  → Webview und nativer Windows-Helfer erhalten denselben Ausdruck
```

`src/brain/expression.ts` steuert Bedeutung, Prioritäten, Empfangsphase und Rückkehr in den Leerlauf. `media/fairy-expression.js` definiert gemeinsame Bewegungsprofile. `scripts/generate-expression.cjs` erzeugt die entsprechenden nativen Parameter und 120 Ausdrucks- und 45 Dynamik-Vergleichsposen; der Compile-Schritt prüft deren Aktualität.

Der Browser und der Windows-Helfer kombinieren die Grundbewegung mit denselben Profilen für Körperneigung, kleine Versätze, Licht, Flügelschlag und Sternenstaub. Gedämpfte Übergänge der bestehenden Rig bleiben erhalten. Zufällige Leerlaufbewegungen oder Begrüßungen ersetzen keine aktive Gehirnreaktion.

## Flug und Ausdruck bleiben getrennt

$$
p_{sichtbar}=p_{Flugregler}+s\,p_{Körperausdruck}
$$

$s$ ist der vorhandene Modell-/DPI-Maßstab. Der Flugregler führt weiterhin Zielflug, Fensterbegrenzung und Maus-Ausweichen aus. Die Ausdrucksschicht verändert die Körperpose und Flügel, nicht die Sicherheitsgeometrie. Eine denkende Fee kann deshalb gleichzeitig ausweichen. Die Körperversätze sind begrenzt und werden mit dem vorhandenen Fensterrand-Abstand geprüft.

Bei ausgeblendetem Fenster oder pausierter/reduzierter Bewegung laufen keine sichtbaren Animationsbilder. Eine Modellanfrage kann trotzdem weiterarbeiten. Beim Wiederanzeigen wird der aktuelle Ausdruck wiederhergestellt; verpasste kurze Gesten werden nicht als Ereignisfolge nachgespielt.

## Nutzung

Die lokale v0.6.0-VSIX installieren, VS Code neu laden und `@navi` eine Anfrage stellen. Eine langsame Antwort zeigt zuerst Warten, dann Bearbeitung. Abbrechen oder ein Modellfehler erzeugt die entsprechende Schlussreaktion. Für reine lokale Reaktionen kann in der Companion-Ansicht ein Prompt geprüft werden; dies startet keinen Modellaufruf.

Ein konfigurierter Codex-Client kann `navi_set_status` mit `received`, `waiting`, `busy`, `completed`, `cancelled` oder `error` verwenden. Es gelten dieselbe Anfrage-ID und die bestehende Konfiguration der lokalen Brücke. Der Client muss diese Ereignisse gezielt übergeben; fremde Chats werden nicht mitgelesen.

## Prüfung und verbleibende Grenzen

- Zustands-/Integrationstests führen echte `runModelTurn`-, Aktivitäts-, Gehirn- und Ausdrucksereignisse zusammen. Sie prüfen einmalige Empfangsreaktion, Warten, Streaming, Abbruch, Fehler, Quellenkonkurrenz und Erholung.
- Browserlauf: acht Ausdruckszustände werden aus Controller-Ereignissen gerendert; tatsächliche Veränderungen an Körper, Licht und Flügeln, Pause und Rückkehr in den Leerlauf werden geprüft.
- Native Tests vergleichen 120 Ausdrucks- und 45 Dynamikposen mit den Browserdefinitionen. Windows-Rastertests prüfen Bildänderungen für alle 15 Profile und den lebendigen Blick. Ein gemeinsamer Lauf von Maus-Ausweichen und Ausdruck prüft Fensterränder und Beruhigen. [Lebendigere Dynamik](LIFELIKE.md).
- Der native IPC-Test sendet Ausdrucksbefehle an die gebaute EXE. Diese Prüfungen ersetzen nicht den vollständigen Live-Test im eigenen VS-Code-Fenster mit einem echten Modellzugang.

Eine automatische Deutung beliebiger Nachrichten als Emotion, eine allgemeine autonome Aktionsauswahl und pixelgenaues Zeigen auf Codezeilen sind damit nicht implementiert. Die Gehirn-Konzeptgrafik bleibt weiterhin eine beschriftete Simulation.
