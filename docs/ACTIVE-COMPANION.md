# NAVI als aktiver Begleiter

Stand: 18.10.2026 · lokaler v0.6.0-Entwicklungsstand.

## Ausprobieren

- Innerhalb von fünf Sekunden mindestens drei Änderungen im aktiven Editor machen: NAVI macht Platz. Zehn Sekunden nach der letzten Änderung kehrt sie zur Mitte zurück. Einfügen und Werkzeugänderungen zählen ebenfalls; NAVI leitet daraus keine menschliche Konzentration ab.
- Neue Fehlerdiagnosen lösen Aufmerksamkeit aus. Nach acht Sekunden Editorruhe darf NAVI Hilfe anbieten: höchstens einmal je fünf Minuten und dreimal je rollender Stunde. Dasselbe unveränderte Problemset wird in der Sitzung nicht erneut angeboten. Korrelationen sind auf 256 Einträge begrenzt; nach Reload beginnt das flüchtige Budget neu.
- Rechtsklick auf die Fee oder **Was kannst du tun?** öffnet ein gemeinsames Aktionsmenü in der eingebetteten Ansicht und im Windows-Overlay. Der Linksklick bleibt eine Berührung mit Glitzer.
- **NAVI: Show Problems / Probleme zeigen** öffnet eine sortierte Auswahl: Fehler vor Warnungen, danach Dokumentposition. **Next Problem** geht beim nächsten Aufruf zum folgenden Problem und springt am Ende zum Anfang. Die Aktion funktioniert auch bei fokussierter NAVI-Webview, solange der zugehörige Texteditor sichtbar bleibt. Offene Hinweisnachrichten blockieren das Weitergehen nicht.
- **Workspace Problems / Projektprobleme zeigen** sammelt bereits bekannte VS-Code-Diagnosen innerhalb der geöffneten Workspace-Ordner. Fehler zuerst, danach Dateipfad und Position. Kein eigener Projekt-Scan; nicht von VS Code gemeldete Probleme sind unbekannt.
- **Quick Fixes / Korrekturvorschläge anzeigen** lässt ein Problem auswählen, markiert es und öffnet das vorhandene VS-Code-Korrekturmenü. Welche Vorschläge erscheinen, bestimmen die installierten Spracherweiterungen; NAVI wendet keine Korrektur selbst an.
- **Fix Problem / Problem beheben** behandelt das Problem am Cursor, sonst den ersten Eintrag. Nach deinem ausdrücklichen Klick wird ein eindeutig vom Sprachdienst empfohlener Quick Fix unmittelbar angewendet. Mehrere empfohlene Vorschläge bleiben auswählbar; ohne Empfehlung öffnet sich die normale Vorschlagsliste, ohne Korrektur wird nichts geändert. Dadurch werden reine „Mit KI beheben“-/„Erklären“-Aktionen nicht automatisch gestartet. Die vorhandene VS-Code-Aktion übernimmt Ausführung und Rückgängig-Unterstützung. NAVI speichert die Datei nicht selbst und startet dafür keinen Modellaufruf. Ob etwa eine fehlende Klammer automatisch ergänzt werden kann, hängt vom Sprachdienst ab; es gibt keinen eigenen universellen Syntaxparser. Dokument-, Diagnose- oder Auswahlwechsel während der Abfrage brechen die Aktion ab.
- **Discuss Selection / Markierten Code besprechen** bereitet bis zu 2.000 Zeichen der Auswahl im vorhandenen `@navi`-Chat vor. Erst Absenden startet die Modellanfrage.
- **NAVI: Live Brain / Gehirn live ansehen** zeigt echte Wahrnehmung, Zustand, Quelle, Entscheidung, Grund, unterdrückte Alternative, Ausdruck und Fähigkeiten. Das ist keine Ansicht interner Modellgedanken.
- **NAVI: Memories / Erinnerungen verwalten** aktiviert auf Wunsch ausdrücklich bestätigte Vorlieben und Projekteinträge.

`navi.companion.enabled` ist standardmäßig an; `navi.memory.enabled` standardmäßig aus. **Toggle Initiative** schaltet die automatische Begleitung um. Direkte Problemaktionen funktionieren unabhängig davon.

## Vorrang und Darstellung

Der TypeScript-Entscheidungskern arbeitet mit expliziten monotonen Zeiten ohne Netzwerk, Zufallszahlen oder zusätzliche Modellaufrufe. Fokusverlust, pausierte Animation und ausgeschaltete Initiative sperren automatische Aktionen. Direkte Aktionen, Vorschau, Spiele und laufende Anfragen haben Vorrang. Der native Helfer meldet Spielstart, Spielende und Klickinteraktion. Unterbrechungen stornieren ausschließlich eigene automatische Flugziele.

Windows-NAVI fliegt unten rechts an den Fensterrand und später zur Mitte. Die eingebettete Ansicht verschiebt ihre Fee innerhalb der eigenen Fläche. Maus-Ausweichen bleibt unabhängig. Dies sind Fensterpositionen, keine behaupteten Pixelkoordinaten einer Codezeile.

Beim ausdrücklichen Zeigen oder Beheben einer Diagnose erscheint NAVIs Feensymbol im Zeilenrand, zusammen mit einer Hervorhebung des Diagnosebereichs. Die Markierung verschwindet bei Änderungen im Dokument oder wenn die Diagnose entfällt; nach Undo wird sie nicht ungeprüft wiederhergestellt. Die neue [Pixelnavigation](EDITOR-ANCHORS.md) ergänzt einen sichtbaren Anker: Der Windows-Helfer misst seine echte Position und fliegt daneben auf dieselbe gemessene Höhe. Nur der aktive Editor erhält den Anker; bei fehlender Erkennung bleibt die Fehlermarkierung. Native Landung und echte Editor-Ankerdarstellung sind geprüft, die vollständige VS-Code-Overlay-Abnahme ist noch offen.

Dateien öffnen ausschließlich nach Klick oder Befehl. Vor dem Markieren werden Diagnoseidentität, Dokumentversion und Bereich erneut geprüft. Verschwundene oder veränderte Ziele werden nicht auf andere Bereiche geklemmt. **Mit @navi erklären** bereitet nach ausdrücklicher Auswahl eine prüfbare Chat-Eingabe mit höchstens 500 Zeichen Diagnose und 2.000 Zeichen Codekontext vor. Kein automatischer Versand. Nur die ausdrücklich gestartete Aktion **Problem beheben** darf einen eindeutig empfohlenen Quick Fix direkt anwenden; gewöhnliche Begleiterreaktionen ändern keinen Code.

Die native Sprechblase bleibt klickdurchlässig. Ihre Problemaktion steht in der VS-Code-Benachrichtigung bereit; die eingebettete Sprechblase bietet eine Schaltfläche. Angebote nennen Diagnose und Zeile und öffnen genau das angebotene Problem nach erneuter Prüfung. Die Schaltfläche wird bei anderen Blasentexten ausgeblendet. Der wiederholte Namens-Titel entfällt in beiden Renderern. Die Spitze folgt dem tatsächlich dargestellten Feenkern einschließlich Skalierung und Bewegung; das Modell hat keinen gezeichneten Mund.

## Erinnerungen und Live-Daten

Vorlieben liegen in `ExtensionContext.globalState`, Projekteinträge getrennt in `workspaceState`. NAVI richtet keine eigene Synchronisation ein und schreibt keine Projektdateien. Der tatsächliche VS-Code-Host bestimmt den Speicherort, einschließlich Remote-Umgebungen. Bis zu 100 Einträge je Speicherbereich mit jeweils maximal 500 Unicode-Zeichen sind möglich.

Hinzufügen und Bearbeiten erfordern eine Bestätigung. Inhalt, Nutzerherkunft und Bestätigungszeit bleiben sichtbar. Aufgaben und nächste Schritte sind **zuletzt bestätigt**, kein automatisch ermittelter Fortschritt. Einzelnes Löschen, projektweises Löschen und Zurücksetzen der Vorlieben einschließlich des aktuellen Projekts sind verfügbar. Andere Workspaces bleiben getrennt und werden dort verwaltet. Ausschalten löscht vorhandene Daten nicht; auch ausgeschaltet ist eine Löschaktion erreichbar. Keine automatische Erfassung von Code, Chats, Audio oder persönlichen Eigenschaften und keine automatische Übergabe der Erinnerungen an ein Modell.

Die Live-Webview verwendet dieselben Zustände wie die Extension, aktualisiert nur sichtbar und höchstens viermal pro Sekunde. Editorcode, Diagnosemeldungen und Antworttexte werden aus der Projektion ausgeschlossen. Die letzten 50 Entscheidungen bleiben ausschließlich im RAM. `null`/`unknown` bedeutet unbekannt. Gewählter Ausdruck und tatsächliche Sichtbarkeit werden unterschieden. Die bisherige `fairy-brain.html` bleibt eine separate Offline-Simulation.

## Sprachzugang und Extension-API

Die lokal installierte Erweiterung `openai.codex-audio` kennzeichnet ihr Manifest mit `api: none`; interne `_codex`-Befehle werden nicht als unterstützte Schnittstelle verwendet. Die installierten stabilen VS-Code-Typen enthalten keine öffentliche Mikrofon-/Transkriptionsschnittstelle. Aktuell ist daher kein echter Anbieter automatisch angebunden. **Zuhören** erklärt diesen Zustand, statt eine Aufnahme vorzutäuschen.

Ein bereits vorhandener, kompatibler Anbieter kann sich ausdrücklich registrieren:

```ts
const api = await vscode.extensions
  .getExtension('navi-labs.navi-copilot-companion')!.activate();
const registration = api.registerVoiceProvider({
  metadata: {
    name: 'Vorhandener Anbieter',
    device: 'Tatsächliches Aufnahmegerät',
    processing: 'unknown', // local-cpu | local-gpu | remote | server | unknown
    dataPath: 'Konkreter Datenweg einschließlich Audioempfänger',
    continuous: true
  },
  async start({transcript, error}) {
    // Bestehende unterstützte Aufnahme starten; ausschließlich finale
    // Transkripte liefern. Fehler über error melden.
  },
  async stop() {
    // Aufnahme und Übertragung tatsächlich beenden.
  }
});
// registration.dispose() trennt den Anbieter und beendet das Zuhören.
```

Die Registrierung startet keine Aufnahme. Erst **NAVI: Listen** zeigt Anbieter, Gerät, Verarbeitung und Datenweg zur ausdrücklichen Aktivierung. Die Statusleiste zeigt Aufnahme/Start dauerhaft mit Stoppschalter. Fokusverlust, Fehler, Anbietertrennung und Schließen stoppen; kein automatischer Neustart. NAVI speichert kein Audio und keinen Transkriptverlauf. Die Angaben zum Datenweg stammen vom Anbieter und müssen bei einer echten Integration separat geprüft werden.

Befehle: „Zur Seite“, „Komm zurück“, „Zeig das nächste Problem“, „Öffne Datei …“, „Stopp“, „Nicht mehr zuhören“. Dateisuche nur im geöffneten Workspace, maximal 5.000 Kandidaten; mehrdeutige Treffer öffnen eine Auswahl. Keine Shell-Ausführung. Lokale CPU/GPU-Nutzung, Remote-/Cloud- oder Serververarbeitung richtet sich ausschließlich nach dem tatsächlichen Anbieter; ein Textmodellzugang genügt nicht für Audio.

`getCompanionState()` liefert zusätzlich dieselbe bereinigte Datenprojektion wie die Live-Ansicht einschließlich aktivierter bestätigter Erinnerungen. Die Rückgabe ist vom internen Zustand getrennt.

## Prüfung

- `npm test`: Zeitregeln, Budgets, Vorrang, Diagnoseidentität/Bereiche, Erinnerungsisolierung, bereinigte Live-Daten, Sprachbefehle und verzögerter Anbieterstart/Stopp sowie vorhandene Regressionen.
- `npm run test:companion-host`: echtes isoliertes VS-Code-Profil mit Editoränderungen, Diagnosen, Konfiguration, Live-Ansicht und expliziter Markierung. Bericht: `build/companion-host-report.json`.
- `node scripts/test-fairy-preview.cjs`: echter Edge-Browser, Platzmachen und Aktionsschaltflächen plus bestehende Darstellungsprüfungen.
- Native Go-, Raster- und IPC-Tests bleiben erforderlich. Menschliche Sichtprüfung, echte Modellantworten und Mikrofonaufnahme mit unterstütztem Anbieter bleiben separate Abnahmen.
