# NAVI lebendiger erleben

Stand: 18.10.2026 · lokale v0.6.0-Vorschau. Die Prompt-Analyse bleibt entfernt.

## Was sich bemerkbar macht

| Beobachtetes Ereignis | Sichtbare Reaktion |
|---|---|
| Anderes Textdokument aktiv | Neugierig neigen und aufleuchten |
| Auswahl per Maus/Tastatur verändert | Aufmerksam schauen |
| Sichtbarer Editorbereich verändert | Kurze Neugier; kein pixelgenaues Verfolgen einer Codezeile |
| Aktives Dokument gespeichert | Kleine positive Geste; „gespeichert“ bedeutet nicht „korrekt“ |
| Fehlerdiagnosen desselben Dokuments verschwinden | Lichtblick; kein behaupteter Testerfolg |
| VS-Code-Task startet | Aufmerksam werden |
| Task-Prozess meldet Exit-Code 0 | Positive Rückmeldung zum Prozessende, keine allgemeine Codefreigabe |
| Task-Prozess meldet anderen Exit-Code | Überraschte Reaktion |
| Task endet ohne bekannten Exit-Code | Neutrale Aufmerksamkeit |
| Debug-Sitzung startet/endet | Kurze Aufmerksamkeit, keine erfundene Ergebnisbewertung |
| Rückkehr nach mindestens zwei Sekunden ohne Fensterfokus | Wiederbegrüßen, mit Wiederholungssperre |
| Fee berührt | Erschrecken und Glitzer; im Companion auch mit Enter/Leertaste |
| Maus bewegt sich im beobachteten Bereich | Mausblick und gelegentliche Neugier |
| Mindestens 90 Sekunden ohne beobachteten Reiz | Ruhigere Flügel, gedämpfteres Licht und gelegentliche Ruhegeste |

Platzmachen beim Schreiben und die Chatreaktionen bleiben erhalten. Die 110 auswählbaren Animationen werden um sechs semantische Ausdrucksprofile und eine kontinuierliche Dynamikschicht ergänzt.

## Zusammenhängende Dynamik

Simulierte Energie, Aufmerksamkeit und Neugier liegen zwischen 0 und 1. Ereignisse geben begrenzte Impulse. Danach nähern sich die Werte ihren Ruhewerten an:

$$x(t+\Delta t)=x_{Ziel}+(x(t)-x_{Ziel})e^{-\Delta t/\tau}$$

Die Rechnung berücksichtigt den Ruheübergang nach 90 Sekunden unabhängig von der Tickzahl. Diese Werte steuern Flügeltempo, Sternenstaub, kleine Atembewegungen und den Blick. Die vorhandene gedämpfte Rig erhält weiche Übergänge. Das sind Animationsparameter, keine gemessenen Gefühle, kein Bewusstsein und kein Verständnis beliebiger Bildschirminhalte.

**NAVI: Live Brain** zeigt Aktivierung, letzten Ereignistyp, Grund und simulierte Werte. Dafür werden keine Dateipfade, Codeinhalte, Tasknamen oder Transkriptverläufe gespeichert. Alles bleibt in der Sitzung; keine zusätzlichen Modellaufrufe.

## Vorrang statt Dauerzappeln

- Pause, Fokusverlust, abgeschaltete Begleitung, direkte Aktionen, Spiele und Animationsvorschau begrenzen automatische Reaktionen. Maus-Ausweichen und Fluggrenzen bleiben unabhängig.
- Ereignisse werden zu höchstens einem passenden Kandidaten mit höherer Priorität zusammengefasst. Gewöhnliche Kandidaten verfallen nach 2,5 Sekunden; wichtige Ergebnisse/Berührungen nach sechs Sekunden. Während einer aktiven Anfrage oder anderen direkten Aktion werden sie verworfen.
- Gewöhnliche Reaktionen haben mindestens 3,5 Sekunden Abstand und zusätzliche Sperren je Ereignistyp. Ein wichtiges Folgeereignis, etwa ein schnelles Task-Ergebnis, darf nach einer weniger wichtigen Geste früher folgen. Laufende Modell- und Schlussreaktionen werden nicht ersetzt.
- Die Startanimation erhält drei Sekunden Ruhe; direkte Berührung darf sofort reagieren. Berührung hat eine eigene kurze Sperre. Automatische Sprechtexte werden höchstens einmal je 30 Sekunden freigegeben; viele Ereignisse bleiben still. Hilfeangebote behalten ihr separates Fünf-Minuten-/Stundenbudget.
- Die Dynamik verändert die Körperpose, keine Datei und keine Sicherheitsgeometrie. Die native Fee bleibt an ihr VS-Code-Fenster gebunden.

`navi.companion.lifelike` schaltet die Ebene separat aus. `navi.companion.enabled`, Animation und reduzierte Bewegung gelten zusätzlich. Klänge bleiben getrennt opt-in; kein Ton pro Mausbewegung oder Tastendruck.

## Tatsächliche Wahrnehmungsgrenzen

NAVI verwendet verfügbare VS-Code-Ereignisse und vorhandene Mausgeometrie. Sichtbarer Bereich und Editorinhalt können auch programmgesteuert verändert werden; daraus wird keine Nutzerabsicht abgeleitet. Taskreaktionen betreffen VS-Code-Tasks, nicht jeden Terminalbefehl. Debug-Ende und gespeicherte Dateien werden nicht als bestandene Tests ausgegeben.

Keine desktopweite Beobachtung, Kamera, Screenshotanalyse oder automatische Deutung fremder Chats. Sprache benötigt weiterhin einen unterstützten, ausdrücklich angebundenen Anbieter; aktuell ist keiner verbunden. „Auf alles reagieren“ bedeutet hier: auf tatsächlich gelieferte implementierte Ereignisse, sofern kein höherer Vorrang besteht.

## Prüfung

Deterministische Tests prüfen Abklingen, Ruheübergang, Prioritäten, schnelles Task-Ende, Sperren, Fokus, Pause, Modellvorrang und begrenzte Posen. Browser und Windows vergleichen 120 Ausdrucksposen und 45 Dynamikposen. Native Rastertests prüfen alle 15 Ausdruckszustände und den sichtbaren Blickwechsel; die native Posenberechnung bleibt ohne neue Allokationen pro Aufruf.

Der Browser-Test führt die neuen Zustände über den echten Controller zur Webview und prüft Mausblick und Tastaturberührung. Der isolierte VS-Code-Host prüft echte Speichervorgänge und einen echten Task-Prozess zusätzlich zur Editor-/Navigationsprüfung. Menschliche Sichtabnahme, echte Modellanfragen und vollständiger Debugger-/Mikrofon-Live-Test bleiben separat.
