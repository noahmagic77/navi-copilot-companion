# Vorhandene KI-Zugänge mit NAVI verbinden

Stand: lokale v0.5.3-Vorschau. Kein zusätzliches Modell, Ollama, Cloud-API-Schlüssel oder Modellserver erforderlich. NAVI verwendet den vorhandenen VS-Code-Modellzugang und kann gezielte Meldungen von einem konfigurierten Codex-MCP-Client empfangen.

## VS Code: vorhandenes Modell

1. NAVI-VSIX installieren und VS Code neu laden.
2. Im VS-Code-Chat ein verfügbares Modell auswählen und `@navi` eine Frage stellen.
3. Die Fee zeigt während der Modellanfrage den Nachdenken-Zustand. Bei erfolgreichem Abschluss erscheinen eine Abschlussanimation und ein begrenzter Antwortauszug. Abbruch und Fehler erhalten eigene Rückmeldungen.

Es bleibt derselbe Modellaufruf wie bisher: `request.model.sendRequest`. Der neue Code macht keinen zusätzlichen KI-Aufruf. NAVI sieht die eigenen Anfragen, nicht beliebige Unterhaltungen anderer Teilnehmer. Die optionalen Historienregeln bleiben erhalten; abgebrochene Antworten werden nicht als fertiger Austausch gespeichert.

## Codex: gezielte Übergabe über MCP

1. Im gewünschten VS-Code-Fenster **NAVI: Configure Codex Connection / Codex-Verbindung einrichten** ausführen.
2. NAVI startet ihre lokale Verbindung und öffnet einen fertigen TOML-Konfigurationsblock. Er verwendet den installierten VS-Code-Prozess als JavaScript-Laufzeit (`ELECTRON_RUN_AS_NODE=1`) und die im VSIX enthaltene MCP-Datei.
3. Den Block in die MCP-Konfiguration des verwendeten Codex-Hosts übernehmen. Falls `[mcp_servers.navi]` dort bereits existiert, dessen Block ersetzen statt ein zweites gleichnamiges Feld anzuhängen. NAVI ändert die Codex-Konfiguration nicht automatisch.
4. Den Codex-Client beziehungsweise die IDE-Erweiterung neu starten und prüfen, ob die NAVI-Werkzeuge angezeigt werden. Die [offizielle OpenAI-Dokumentation](https://developers.openai.com/codex/extend/mcp) beschreibt die unterstützten Hosts und MCP-Einstellungen. Ein gehosteter Chat kann andere Tool-Grenzen haben; lokale Konfiguration schaltet nicht automatisch Werkzeuge in jede laufende Sitzung frei.
5. Testauftrag an Codex: „Verwende `navi_show_message`, um NAVI die Meldung ›Verbindung funktioniert‹ zu übergeben.“ Die NAVI-Ansicht beziehungsweise Vordergrund-Fee muss sichtbar, das VS-Code-Fenster fokussiert und die Sprechblase aktiviert sein.

Die Konfiguration gehört zu genau diesem NAVI-Fenster. Nach einem Reload, Neustart oder Extension-Update den Befehl erneut ausführen und den Block aktualisieren. Ein anderes VS-Code-Fenster hat eine eigene Verbindung; es wird nicht stillschweigend das aktive Fenster ausgewählt.

### Werkzeuge

| Werkzeug | Argumente | Verhalten |
|---|---|---|
| `navi_show_message` | `message` | Zeigt eine ausdrücklich geteilte Meldung, sofern keine Anfrage die Fee belegt. |
| `navi_set_status` | `requestId`, `state`, optional `message` | `received`, `waiting` oder `busy` starten beziehungsweise aktualisieren die Aktivität. `completed`, `cancelled` oder `error` beenden dieselbe Anfrage. Bei `completed` kann `message` einen Ergebnis-Auszug enthalten. |

Beispielhafte Werkzeugargumente:

```json
{"requestId":"aufgabe-1","state":"busy"}
{"requestId":"aufgabe-1","state":"completed","message":"Die ausgewählten Tests sind erfolgreich durchgelaufen."}
```

Bei Aufgaben über zwei Minuten `busy` mit derselben ID erneuern. Ohne Erneuerung verfällt der Status nach etwa zwei Minuten, damit NAVI nicht unbegrenzt beschäftigt bleibt. Eine unbestätigte oder bereits beendete ID kann keinen neuen Abschluss auslösen.

MCP meldet `accepted` und `displayed`. `displayed` bedeutet, dass die Aktivitätssteuerung die Meldung weitergegeben hat; es ist kein Nachweis sichtbarer Pixel. Fokus, Sichtbarkeit und deaktivierte Sprechblasen gelten weiter. Während einer anderen aktiven Anfrage können Meldungen unterdrückt werden. Es gibt keine dauerhafte Nachrichtenwarteschlange.

## Manuelle Übergabe

**NAVI: Share Text / Text an Fee übergeben** zeigt ausdrücklich markierten Editor-Text oder einen eingegebenen Text in der Sprechblase. Das funktioniert auch ohne MCP-Client. Ein Codex-Chat wird dabei nicht ausgelesen; der gewünschte Text muss gezielt übergeben werden.

## Architektur und Grenzen

```text
VS-Code-@navi → vorhandenes ausgewähltes Modell → Aktivitätssteuerung → Fee / Blase
Codex-Werkzeug → gebündelter MCP-Prozess → lokale Pipe → Aktivitätssteuerung → Fee / Blase
```

Die Pipe verwendet eine zufällige Kennung und ein Authentifizierungstoken. Die zugehörige Verbindungsdatei liegt im lokalen Extension-Speicher, enthält keine Chat-Historie und wird beim geordneten Schließen entfernt. Unter Windows wird eine Named Pipe verwendet, auf anderen Systemen ein Unix-Socket. Es wird kein TCP-Port geöffnet. Nachrichten sind begrenzt; sichtbare Textauszüge verwenden die bestehende Begrenzung auf 160 Unicode-Zeichen. Die Verbindung liest keine Dateien oder Chat-Historien und führt keine Modellantworten als Befehle aus.

Die zuerst aktive Anfrage behält die Kontrolle über NAVI. Weitere Aktivitäten können warten; verspätete Ergebnisse überschreiben keine andere laufende Anfrage. Die Aktivitätssteuerung ist eine Anzeige, kein Einblick in interne Denkprozesse und kein automatischer Mitschnitt aller Codex-Ereignisse. Codex muss die Werkzeuge gezielt verwenden.

CPU, GPU und RAM für das Modell werden weiterhin vom vorhandenen Modell-Setup bestimmt. Ein bereits vorhandener lokaler Zugang kann lokal rechnen; Cloud-/Remote-Zugänge und eigene Modellserver rechnen dort. Die NAVI-Verbindung verändert diesen Rechenort nicht.

## Prüfstand

Automatische Tests decken Aktivitätskonkurrenz und Ablauf, Streaming, Abbruch, Fehler sowie echten MCP-stdio-Verkehr mit einer laufenden lokalen Pipe ab. Der MCP-Test wurde zusätzlich mit der installierten Windows-VS-Code-Laufzeit durchgeführt. Ein Browserlauf prüft die sichtbaren Aktivitätszustände. Der Live-Aufruf eines echten VS-Code-Modells und die Registrierung beim tatsächlich verwendeten Codex-Host bleiben separat zu prüfen; diese Sitzung hat die neuen Werkzeuge noch nicht geladen.

Ab der lokalen v0.6.0-Ausdrucksschicht zeigt NAVI den Nachrichtenempfang, Warten auf die erste Antwort und laufendes Streaming getrennt. Empfang löst eine kurze Geste aus; wiederholte Textfragmente starten diese nicht neu. [Ausdrucksverhalten](BRAIN-EXPRESSION.md).
