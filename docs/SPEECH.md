# Sprechblase neben NAVI (lokale v0.5.3-Vorschau)

Die fliegende Windows-Fee erhält eine eigene mitbewegte Sprechblase. Sie erscheint bei Begrüßungen, beim ersten Ausweichschritt vor der Maus und bei lokalen Prompt-Rückmeldungen. Nach einer abgeschlossenen Anfrage an `@navi` zeigt sie einen kurzen Auszug der Antwort. Die Companion-Ansicht zeigt dieselben Arten von Meldungen direkt neben der Fee; dort lässt sich **Mit @navi sprechen** anklicken.

## Bedienung

- **NAVI: Show Speech Bubble / Sprechblase anzeigen** aktiviert die Blase und zeigt eine Begrüßung.
- **NAVI: Talk to Fairy / Mit NAVI sprechen** öffnet VS Code Chat mit vorbereitetem `@navi`. Erst der Benutzer sendet die Nachricht ab.
- **NAVI: Hide Speech Bubble / Sprechblase ausschalten** oder das × in der Companion-Blase deaktiviert sie dauerhaft über `navi.bubble.enabled`.

Die Windows-Blase bleibt klickdurchlässig und übernimmt keinen Tastaturfokus. Sie ist deshalb nicht selbst als Eingabefeld anklickbar. Die Nachricht bleibt abhängig von der Textlänge rund vier bis zehn Sekunden sichtbar. Der Ablauf funktioniert auch bei pausierter Animation. Die Blase folgt dem Fenster und wird an dessen Rändern auf die andere Seite gesetzt; auf sehr kleinen Flächen kann sie sich mit der Fee überlappen. Fokusverlust und Verbergen löschen den aktiven Blasenzustand.

## Wahrnehmung und Grenzen

„Ich mache deiner Maus Platz“ bezieht sich auf die geometrische Maus-Wahrnehmung. Die Blase behauptet keine Mikrofon- oder Bildschirmwahrnehmung. Klang, Animation und Sprechblase haben getrennte Einstellungen. Die bestehende Animation verwendet weiter ihren Vorschaumodus; dieser erzeugt keine Statusblase für jede einzelne Vorschaubewegung.

Bis zu 160 Unicode-Zeichen aus NAVIs eigener abgeschlossener Antwort werden als Klartext an den lokalen Helfer übertragen. HTML wird nicht ausgeführt, Steuerzeichen werden entfernt und vollständige Markdown-Codeblöcke durch `[Code im Chat]` ersetzt. Die volle Antwort bleibt im Chat. Es werden keine fremden Chatverläufe gelesen; die Blase benötigt kein Mikrofon und keinen zusätzlichen Modellaufruf. Der Helfer protokolliert die Blasentexte nicht. Die bestehende optionale NAVI-Chat-Historie wird weiterhin unabhängig über `navi.history.enabled` gesteuert.

## Prüfung

Go-Tests prüfen Unicode-Begrenzung, Nachrichtenpriorität, Ablauf, Platzierung bei verschiedenen Skalierungen, native Klickdurchleitung und Fokusverhalten. Der opt-in Test `NAVI_TEST_VISIBLE_BUBBLE=1` zeigt kurz eine native Testblase und prüft Position, Bewegung und Ausblenden ohne Aktivierung eines anderen Fensters. Der Browser-Test prüft Klartextdarstellung, den Chat-Knopf und Ausschalten. Der vollständige Vordergrund-Testhost konnte in dieser Sitzung wegen der Windows-Aktivierungsbeschränkung nicht aktiviert werden; eine End-to-End-Prüfung im echten VS-Code-Extension-Host bleibt erforderlich.

Die visuelle Überarbeitung verwendet einen durchscheinenden Hintergrund mit separat lesbarem Text. Der Zeiger folgt dem leuchtenden Feenkern; das aktuelle Modell hat keinen gezeichneten Mund. Die native Blase wird selbst gezeichnet und verwendet kein Windows-Tooltip mehr. Rastertests prüfen echte Alpha-Werte, Textpixel und die Spitze am Feenkern.

Die lokale v0.5.3-Anbindung ergänzt Status für NAVIs eigene Modellanfragen und ausdrücklich übergebene Codex-/manuelle Meldungen. Auch diese Texte werden begrenzt und nicht als eigene Chat-Historie gespeichert. [Einrichtung und Datenweg](AI-CONNECTION.md).
