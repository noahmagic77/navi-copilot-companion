# NAVI Roadmap

Stand: 17.10.2026. Diese Datei beschreibt Reihenfolge, Umfang und Abnahmekriterien der geplanten Entwicklung. Den tatsächlichen Implementierungs-, Test- und Veröffentlichungsstand dokumentiert der separate [Statusbericht](STATUS.md). Es gibt keine zugesagten Veröffentlichungstermine.

## Aktuelle Position

Die Grundlage für eine umgebungsbezogene Fee ist umgesetzt: Windows-Overlay, geometrische Maus-Wahrnehmung, Ausweichen und einfache Zielflüge. Dazu kommen 110 Animationen, Begrüßungen, Feenklänge und Sprechblasen.

**Wir stehen bei der visuellen Prüfung der lokalen v0.5.3-Vorschau.** v0.5.2 ist auf GitHub veröffentlicht. v0.5.3 überarbeitet Transparenz, die Ausrichtung der Sprechblase und die Sichtbarkeit der Bewegungen; der Live-Test dieser Änderungen in VS Code steht aus. Die Verbindung zu den vorhandenen VS-Code- und Codex-Zugängen ist im lokalen v0.5.3-Arbeitsstand umgesetzt und automatisch geprüft; die echte Client-Einrichtung und Modell-Live-Prüfung stehen aus. Ein zusätzliches lokales Modell oder Ollama ist nicht gewünscht.

## Konzept: das Fee-Gehirn

Das [vollständige Konzept mit mathematischen Formeln](FAIRY-BRAIN.md) beschreibt lokale Zustände, Aufmerksamkeit, Arbeitsgedächtnis, Aktionsbewertung, Rechte und sichtbare Nachrichtenreaktionen. Eine [interaktive bildliche Darstellung](fairy-brain.html) ergänzt den Entwurf um ein zentrales Selbstmodell: Fähigkeiten, Verbindungen, Zustände, Entscheidungsgründe und Unsicherheit. Die Grafik ist eine Offline-Simulation, keine Live-Gehirnansicht. Die [technische Spezifikation](FAIRY-BRAIN-TECHNICAL.md) und der [Umsetzungsplan](FAIRY-BRAIN-PLAN.md) liegen vor. A1 ist lokal implementiert: deterministischer Zustandskern und begrenzte Selbstauskunft aus Aktivitäten/Fokus. Die Live-Abnahme bleibt offen. A2 ergänzt Empfangs- und Anfragezuordnung; Diagnose-Navigation und erlaubte Erinnerungen folgen später.

## Reihenfolge der nächsten Schritte

| Schritt | Ziel | Fertig, wenn … |
|---|---|---|
| 1. Visuelle Überarbeitung abschließen | Transparente Sprechblase mit Zeiger zur Fee und klar erkennbare Animationen | Die v0.5.3-Vorschau im echten VS Code geprüft ist; Text lesbar bleibt, die Spitze mitfliegt und Pause, Fokus sowie Fensterränder funktionieren. Danach Release vorbereiten. |
| 2. Vorhandene KI-Zugänge verbinden | NAVI reagiert auf eigene VS-Code-Modellanfragen und ausdrücklich übergebene Codex-Meldungen | Chat-Zustände, Antwortauszüge, Abbruch und Fehler getestet sind; der Codex-Übergabeweg in der tatsächlichen Umgebung eingerichtet und live geprüft ist. |
| 3. Reaktives Fee-Gehirn | Bestehende Ereignisse, Zustände und nachvollziehbare Entscheidungen verbinden | Empfang, Arbeit, Abschluss, Abbruch, Fokus und mehrere Quellen reproduzierbar geprüft sind; kein zusätzlicher Modellaufruf pro Reaktion nötig ist. |
| 4. Editor-Ziele und Chat-Navigation | Ein ausdrücklich ausgewähltes Problem öffnen und hervorheben | Datei und Bereich zuverlässig geöffnet werden; die Fee eine nachvollziehbare Fensterposition ansteuert. Exakte Codezeilen-Koordinaten brauchen eine unterstützte Zuordnung. |
| 5. Ausdruck und Bedienung erweitern | Klick-Glitzer und auswählbare Farbpaletten | Begrenzte Treffererkennung an der Fee funktioniert; andere Klicks weiterhin durchgehen und reduzierte Bewegung berücksichtigt bleibt. |
| 6. Sprachbedienung | Explizit aktivierbare Mikrofonbefehle | Aufnahme sichtbar ist, gestoppt werden kann und Verarbeitung sowie Datenweg festgelegt sind. |
| 7. Weitere Ausgabequellen und Lernmodus | Ausdrücklich geteilte KI-Ausgaben und schrittweise Lernhilfe | Unterstützte Schnittstellen geprüft sind und Antworten von ausführbaren Aktionen getrennt bleiben. |

## In Umsetzung: vorhandene VS-Code- und Codex-Anbindung

Anforderung: NAVI soll die bereits vorhandenen KI-Zugänge nutzen. Kein zusätzliches Modell, kein Ollama und kein neuer Modellserver als Voraussetzung. Der zuvor geplante lokale Modelladapter ist damit aus dem nächsten Entwicklungsschritt entfernt.

### VS-Code-Modell

Der vorhandene `@navi`-Teilnehmer verwendet bereits `request.model.sendRequest`. Darauf aufbauen: Anfrage, laufende Antwort, Abschluss, Abbruch und Fehler mit passenden Animationen und der bestehenden Sprechblase verbinden. Das betrifft NAVIs eigene Anfragen; die Extension erhält dadurch keinen allgemeinen Zugriff auf andere Copilot-Unterhaltungen.

### Codex

Ein gezielter Übergabeweg ermöglicht es einem konfigurierten Codex-Client, kurze Meldungen und ausdrücklich ausgewählte Ergebnisse an NAVI zu senden. Die gebündelte MCP-Brücke stellt `navi_show_message` und `navi_set_status` bereit. Einrichtung und Grenzen sind in [KI-Verbindung](AI-CONNECTION.md) dokumentiert. Automatische IPC-/MCP-Tests bestehen; die Registrierung beim tatsächlichen Codex-Host steht aus.

Die [offizielle OpenAI-Dokumentation zu MCP](https://developers.openai.com/codex/extend/mcp) beschreibt MCP-Verbindungen für lokale Codex-Clients einschließlich der IDE-Erweiterung. Daraus folgt keine automatische Verbindung zu dieser konkreten Chat-Sitzung: Tool-Verfügbarkeit, Host, Konfiguration und Verbindung zu der laufenden NAVI-Instanz müssen separat geprüft werden. Ein MCP-Werkzeug wird gezielt aufgerufen; es ist kein allgemeines Abonnement aller Chat-Nachrichten oder internen Denkprozesse.

Die Brücke ist mit NAVI gebündelt, ist zusätzlicher Integrationscode und benötigt eine unterstützte Registrierung beim Codex-Host. Keine neue Modellinstallation oder eigene Cloud-API ist für reine Meldungsübergaben vorgesehen. Ohne unterstützte automatische Verbindung bleibt eine manuelle Übergabe ausgewählten Textes als möglicher erster Umfang.

### Gemeinsame Abnahme

- Quelle und Zustand sind eindeutig: VS Code oder Codex; beschäftigt, fertig, abgebrochen oder Fehler.
- Kurze Meldungen und Antwortauszüge verwenden die bestehende sichere Textbegrenzung und Sprechblasen-Einstellung.
- Abbruch und Fehler erzeugen keine falsche Erfolgsmeldung; gleichzeitige Quellen überschreiben sich nicht unkontrolliert.
- Getrennte Tests für VS-Code-Anfragen und Codex-Werkzeugübergaben; Live-Prüfung der tatsächlich verbundenen Clients.
- Keine Einsicht in fremde Chatverläufe oder versteckte Denkprozesse voraussetzen. Kein zusätzlicher Modellaufruf für die reine Darstellung einer vorhandenen Antwort.

### Rechenort und Abhängigkeiten

Die vorhandenen Modellzugänge bleiben Voraussetzung. Die lokale Extension verarbeitet Darstellung, Ereignisse und Nachrichtenübergaben. Sie verlagert Modellberechnungen nicht automatisch auf lokale CPU oder GPU. Ein bereits vorhandenes lokales CPU-/GPU-Modell könnte über einen unterstützten bestehenden Zugang verwendet werden; ansonsten bleibt die Berechnung beim konfigurierten Remote-/Cloud-Anbieter oder eigenen Modellserver. NAVI richtet dafür im aktuellen Umfang keine weitere Laufzeit ein.

## Weitere geplante Fähigkeiten

- **Umgebung:** explizite Editor-, Auswahl- und Diagnoseereignisse nutzen. Geometrische Wahrnehmung von Bildschirmverständnis unterscheiden. Desktopweite Bewegung und Screenshot-Auswertung sind eigene, separat zu planende Funktionen.
- **Sprache:** Befehle wie „zur Seite“ oder „Datei öffnen“, mit Aufnahmeanzeige und Stoppschalter. Lokale oder serverbasierte Spracherkennung vorab festlegen; Klangeffekte und Sprachausgabe getrennt steuern.
- **Farben und Klicks:** Nacht-, Sonne/Mond- und Laternenfarben sowie mehr Glitzer bei gezielten Klicks auf die Fee.
- **Ausgabeadapter:** NAVIs eigene Modellantworten sind bereits angebunden. Für ausdrücklich geteilte Codex-/GitHub-Chat-Ausgaben zuerst unterstützte Schnittstellen untersuchen; kein Zugriff auf private fremde Chats voraussetzen.
- **Geführtes Lernen:** freiwilliger Modus mit Rückfragen, abgestuften Hinweisen und vollständigen Lösungen auf Wunsch. Kein Altersprofil ableiten oder speichern.

## Qualität vor weiteren Veröffentlichungen

Live-Testergebnisse mit getesteter Version und Umgebung festhalten. Neue Builds aus einem sauberen VS-Code-Profil installieren und Fokus, Sichtbarkeit, Skalierung, reduzierte Bewegung sowie Ressourcenverbrauch prüfen. Abhängigkeiten, native Paketintegrität und Datenschutzangaben bei relevanten Änderungen kontrollieren. Windows-x64-Overlay und eingebettete Ansicht auf anderen Plattformen getrennt ausweisen.

## Dokumente pflegen

Bei jedem Meilenstein den [Statusbericht](STATUS.md) aktualisieren: umgesetzt, automatisch geprüft, live bestätigt, veröffentlicht und noch offen. Die Roadmap nur ändern, wenn sich Umfang, Reihenfolge oder Abnahmekriterien ändern. Versionsbezogene Änderungen gehören zusätzlich ins [Changelog](../CHANGELOG.md).
