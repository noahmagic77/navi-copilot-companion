# NAVI — Copilot Companion

**Hotfix v0.6.2:** Der Zielmarker bleibt beim Anflug erkannt. Die vollständige Kette vom echten VS-Code-Editor zur nativen Ankunft ist mit Zoom, geteilten Editoren und Scroll-Verfolgung geprüft; die Windows-CI besteht. Während der Zielverfolgung können NAVIs eigene Fenster für höchstens 20 Sekunden in Bildschirmaufnahmen fehlen. [Details](docs/EDITOR-ANCHORS.md).

**Animations-Hotfix v0.6.1:** Die 110 Animationsvorschauen bleiben bei automatischen Begleiterreaktionen aktiv. Native Schleifen, Begrüßungswechsel und der Ruhezustand sind korrigiert. Alle 110 Einträge werden im Browser und im Windows-Renderer automatisch geprüft.

**Lebendigere Fee:** Reaktionen auf Dateiwechsel, Auswahl, Scrollen, Speichern, Diagnoseänderungen, Tasks, Debugging und Berührung. Simulierte Aufmerksamkeit, ruhiges Abklingen, sanfte Atembewegungen und Mausblick ergänzen die Animationen. [Verhalten und Grenzen](docs/LIFELIKE.md).

**Neu in der v0.6.2-Vorschau:** NAVI macht bei Editoraktivität Platz, bietet begrenzt Hilfe an und kann ausgewählte Probleme öffnen und markieren. Bestätigte Erinnerungen sind optional; eine Live-Gehirnansicht zeigt echte Entscheidungen. Sprachsteuerung hat eine Anbieterschnittstelle, bleibt ohne kompatiblen vorhandenen Mikrofon-/Transkriptionsanbieter deaktiviert. [Bedienung und Grenzen](docs/ACTIVE-COMPANION.md).

**[English release overview](docs/releases/v0.6.2.en.md) · [Alle Änderungen auf Deutsch](docs/releases/v0.6.2.de.md)**

## NAVI direkt herunterladen

**[NAVI Copilot Companion v0.6.2 – VSIX direkt herunterladen](https://raw.githubusercontent.com/noahmagic77/navi-copilot-companion/main/downloads/navi-copilot-companion-0.6.2.vsix)**

Die Datei ist direkt installierbar – **kein ZIP-Entpacken erforderlich**. Öffne in **VS Code Desktop → Erweiterungen → … → Install from VSIX…** und wähle die heruntergeladene `navi-copilot-companion-0.6.2.vsix`.

[Installationsanleitung (Deutsch)](docs/INSTALLATION.md) · [Automatische Build-Ergebnisse](https://github.com/noahmagic77/navi-copilot-companion/actions/workflows/ci.yml?query=branch%3Amain)

Dies ist die **v0.6.2-Vorschau**, zur Veröffentlichung auf GitHub vorbereitet. Der Diagnoseflug ist im isolierten echten VS Code geprüft; weitere Bildschirmkonfigurationen und menschliche Sichtabnahme bleiben separat. Kein Marketplace-Eintrag. [SHA-256-Prüfsumme](downloads/navi-copilot-companion-0.6.2.vsix.sha256).

TypeScript VS Code companion with an animated fairy guide, editor-aware behavior and explicit problem navigation.

**Status:** v0.6.2 is prepared as a GitHub preview with a VSIX and checksum. Publication status is shown on [GitHub Releases](https://github.com/noahmagic77/navi-copilot-companion/releases). Full diagnostic flight passes in an isolated actual VS Code host; additional display configurations and human visual acceptance remain separate. No Marketplace release.

**v0.6.2-Vorschau:** Rechtsklick auf NAVI oder **Was kannst du tun?** öffnet Programmieraktionen: Diagnosen durchgehen, bekannte Projektprobleme auswählen, VS-Code-Korrekturvorschläge öffnen und markierten Code mit `@navi` besprechen. Die Sprechblase hängt am tatsächlich dargestellten Feenkern. [Bedienung](docs/ACTIVE-COMPANION.md) · [Status und Test-VSIX](docs/STATUS.md). Die VSIX enthält diese Funktionen; den aktuellen Veröffentlichungsstand zeigt die Release-Seite.

## Die Fee im Vordergrund (Windows x64)

NAVI v0.6.2 enthält einen kleinen nativen Windows-Helfer. Die weiße Fee kann vor Editor, Terminal und Seitenleisten des aktiven VS-Code-Fensters fliegen. Außerhalb der Trefferfläche lässt ihr transparentes Fenster Mausklicks durch; es übernimmt keinen Tastaturfokus. Beim Wechsel zu einem anderen Fenster oder beim Minimieren wird sie ausgeblendet und ihre Animationsuhr angehalten. Der Helfer ist im VSIX enthalten; ein separater Download oder eine zusätzliche Browser-Laufzeit sind nicht erforderlich.

Die v0.6.2-Vorschau ergänzt drei Mausspiele über **NAVI: Mauspiel starten**: NAVI anklicken, NAVI den Mauszeiger fangen lassen oder NAVI im VS-Code-Fenster suchen. Treffer auf NAVI erlauben Spielinteraktionen und Klick-Glitzer; Rechtsklick öffnet das Aktionsmenü. Die vollständige Spielabnahme im normalen VS-Code-Profil bleibt offen.

**Öffnen:** `Strg + Umschalt + P` → **NAVI: Show Foreground Fairy / Vordergrund-Fee anzeigen**. **NAVI: Hide Foreground Fairy / Vordergrund-Fee ausblenden** beendet den Helfer. **NAVI: Open Companion / Ansicht öffnen** zeigt Einstellungen und die Vorschau der 110 Bewegungen. Die Erweiterung startet den aktivierten Helfer nach dem VS-Code-Start; `navi.overlay.enabled` steuert dies pro Benutzer. Auf anderen Plattformen bleibt die eingebettete NAVI-Ansicht verfügbar.

Im normalen Modus sind die Bildraten auf 30 FPS beim Fliegen, 15 FPS beim Schweben und 10 FPS beim Ausruhen begrenzt. Kurze Zustandswechsel verwenden zunächst die aktive Bildrate, damit das Absenken keine Sprünge verursacht. Der Sparmodus reduziert Bildrate und Glitzer zusätzlich. Ausgeblendet oder bei deaktivierter Animation werden keine Animationsbilder berechnet. Die Win32-Darstellung verwendet vorbereitete Grafikobjekte; die reine Bewegungsberechnung erzeugt pro Bild keine neuen Speicherobjekte.

[Overlay, Parameter und Messgrenzen](docs/OVERLAY.md)

## Die 110 Bewegungen und ihre Vorschau

![NAVI: weiße Fee mit Flügelschlag und kreisendem Glitzer](docs/navi-fairy.gif)

Der aktuelle Entwicklungsstand bietet **110 auswählbare Bewegungen**: zwölf Grundzustände und zehn weitere Begrüßungen sowie 88 prozedurale Varianten aus Gleiten, Bögen, Hüpfen, Kreisen, Spuren, Spiralen, Leuchten und Gesten. Körper, Flügel, Licht und Glitzer bewegen sich nach einer gemeinsamen Uhr. Gedämpfte Übergänge erhalten Schwung und Flügelphase, statt Bewegungen bei jedem Wechsel neu zu starten. Die gemeinsame Animationsuhr verwendet explizite Bildratenlimits, unabhängig von der Bildwiederholrate des Bildschirms. Der oben verlinkte Download enthält diesen Stand.

NAVI reagiert auf Eingaben in ihrer Ansicht, variiert ihre Bewegungen im Leerlauf und ruht nach 90 Sekunden ohne Interaktion in der Webview. Unter **110 Bewegungen entdecken** kannst du jede nach Familie auswählen oder mit **Alle ansehen** eine vollständige Vorschau starten. Anschließend kehrt NAVI selbstständig zum natürlichen Verhalten zurück.

[Alle 110 Bewegungen im Video ansehen](docs/navi-12-motions.mp4) · [Bewegungen und Auslöser](docs/FAIRY-ANIMATIONS.md)

Der Schalter **Animation an/aus** speichert deine Einstellung in den VS-Code-Benutzereinstellungen. `navi.fairy.respectReducedMotion` entscheidet, ob NAVI die Systempräferenz für reduzierte Bewegung berücksichtigt; standardmäßig bleibt die Fee animiert. Ausgeblendete Ansichten pausieren einschließlich der Vorschau. Alle Grafik- und Animationsbestandteile sind enthalten, ohne externe Ressourcen.

**Vorschau öffnen:** `Strg + Umschalt + P` → **NAVI: Open Companion / Ansicht öffnen**, oder auf das NAVI-Symbol in der Activity Bar klicken. Die Companion-Ansicht lässt sich mit den VS-Code-Ansichtsfunktionen neben Copilot verschieben.

Die Animation wurde in Chromium mit derselben Webview und strikter CSP geprüft, einschließlich aller 110 Bewegungen in Folge, stetiger Übergänge, Eingabereaktionen, Ruhemodus, Pausieren, Wiederaufnahme, reduzierter Bewegung, schmaler Ansichten sowie heller und dunkler Darstellung. Der native Windows-Helfer wurde zusätzlich mit echten Fenstern auf einem Windows-Runner geprüft: Fokus, Fensterbewegung, Ausblenden, Minimieren/Wiederherstellen, Pipes und Shutdown. Ein vollständiger Live-Test im VS-Code-Extension-Host auf dem Zielrechner ist weiterhin separat erforderlich.

## Sprechblasen und Feenklänge

Die helle Sprechblase zeigt kurze Reaktionen und Auszüge aus NAVIs eigenen Chat-Antworten. Unter **Feenklänge** kannst du mit **Anhören** die zwölf eigenen Klänge testen. Automatische Klänge sind zunächst ausgeschaltet; aktiviere sie bei Bedarf und stelle die Lautstärke über null. [Sprechblasen](docs/SPEECH.md) · [Audio und Fehlerbehebung](docs/SOUND.md).

## Key features

- `@navi`, `/explain`, and `/summarize` using the model chosen by the user in VS Code Chat.
- NAVI Activity Bar view with an original white vector fairy, 110 selectable procedural animations with spring-smoothed transitions, orbiting sparkles, a motion toggle and accessible speech bubble. The selected NAVI logo remains the bundled extension icon.
- Editor-aware companion decisions, explicit problem navigation, opt-in confirmed memories and a live brain inspector. Prompt scoring and topic-change suggestions have been removed.
- Optional own-chat history and explicitly confirmed companion memories, with deletion controls.
- No local prompt scoring, analysis journal, SQLite index or OTel metric import.
- Independent deterministic tests and GitHub CI on pull requests.

## Installation über GitHub

**[Installierbare VSIX v0.6.2](https://raw.githubusercontent.com/noahmagic77/navi-copilot-companion/main/downloads/navi-copilot-companion-0.6.2.vsix)** · [Ausführliche Anleitung](docs/INSTALLATION.md)

1. VSIX über den Link herunterladen (keine ZIP-Datei).
2. VS Code Desktop öffnen und **Erweiterungen → … → Install from VSIX…** auswählen.
3. Datei `navi-copilot-companion-0.6.2.vsix` auswählen und VS Code bei Bedarf neu laden.

Die Datei ist im Repository unter `downloads/` versioniert. Bei einer neuen Version muss dieser Download explizit erneuert werden; [GitHub Actions](https://github.com/noahmagic77/navi-copilot-companion/actions/workflows/ci.yml?query=branch%3Amain) stellt weiterhin temporäre Build-Artefakte bereit. Noch kein VS Code Marketplace Release.

## Installation for development

[Entwicklungsumgebung einrichten (Deutsch)](docs/DEVELOPMENT.md) — Installationen, erster Start, Vordergrund-Fee und VSIX-Build.

VS Code Desktop >= 1.100, Node.js >= 22 and npm.

```bash
npm install
npm run check
npm test
```

Press F5 to run the Extension Development Host. Run **NAVI: Show Foreground Fairy / Vordergrund-Fee anzeigen** on Windows x64 or **NAVI: Open Companion / Ansicht öffnen** for the embedded preview. Open **NAVI: Live Brain**, choose **NAVI: Show Problems**, or address `@navi` in VS Code Chat.

## Privacy and storage

Optional own-chat history uses `ExtensionContext.globalStorageUri`; confirmed companion memories use VS Code's profile/workspace state. NAVI has **no central backend**. New installations default to `navi.history.enabled=false` and `navi.memory.enabled=false`. Enabling own-chat history saves prompts and responses unencrypted locally. Local analysis, metric import, session journals and SQLite indexing have been removed. Older journal files are left untouched and are no longer loaded. The selected chat model processes requests under its provider's terms; companion decisions add no model calls.

NAVI **does not** access GitHub Copilot's private conversations, intercept its prompt input or record its token usage. See [Integration limitations](docs/INTEGRATION.md).

## Source tree

- `src/core/` — shared companion utilities
- `src/ui/naviView.ts` — Webview lifecycle, local messages and motion preferences
- `src/ui/fairyMarkup.ts`, `src/ui/webviewContent.ts`, `media/fairy.*` — original white vector fairy, animation and Webview UI
- `media/fairy-motion.js` — shared motion catalogue, pose sampling and deterministic spring model
- `src/overlay/` — verified child-process lifecycle and VS Code overlay controls
- `native/overlay/` — native Go/Win32 renderer, window event hooks, bounded flight and tests
- `bin/win32-x64/` — tested Windows helper and SHA-256
- `media/logo.png` — selected extension icon
- `src/chat/participant.ts` — VS Code Chat Participant and request activity callbacks
- `src/storage/localHistoryStore.ts` — backwards-compatible, opt-in own-chat history
- `docs/` — architecture/ADR and integration notes
- `prototypes/v0.3.0/` — earlier reference-only JavaScript implementation on separate import branch (see PR #1)

## Scope and next milestones

NAVI provides an editor-aware companion and a general `@navi` chat participant. A future optional learning mode may offer graduated help on request; prompt scoring is no longer included. See [Roadmap](docs/roadmap.md), [Statusbericht](docs/STATUS.md), [Architecture](docs/architecture.md) and [Integration](docs/INTEGRATION.md).

SQLite analysis has been removed. Isolated VS Code tests cover diagnostic navigation, Quick Fixes and undo; native window and IPC tests pass separately. Full VS Code-to-overlay diagnostic flight now passes in an isolated host. Human visual acceptance and further physical display configurations remain separate. See [Statusbericht](docs/STATUS.md).

NAVI ist Open Source unter der [MIT-Lizenz](LICENSE.md). Quellcode, Dokumentation und projekteigene Assets dürfen unter den Lizenzbedingungen genutzt, verändert und weitergegeben werden, auch kommerziell. Lizenzen von Drittkomponenten bleiben bestehen: [Hinweise](THIRD_PARTY_NOTICES.md). [Mitmachen](CONTRIBUTING.md). Die Veröffentlichung im VS Code Marketplace ist davon unabhängig.

## Vorhandene KI-Zugänge verbinden (lokale v0.6.2-Entwicklungsvorschau)

NAVI reagiert auf ihre eigenen Anfragen an das ausgewählte VS-Code-Modell. Für gezielte Codex-Meldungen ist eine gebündelte MCP-Brücke vorhanden: **NAVI: Configure Codex Connection / Codex-Verbindung einrichten** erzeugt die Konfiguration für den verwendeten Codex-Client. Kein zusätzliches KI-Modell erforderlich. Einrichtung und noch offene Live-Prüfungen: [KI-Verbindung](docs/AI-CONNECTION.md).

Das [Fee-Gehirn-Konzept](docs/FAIRY-BRAIN.md) beschreibt lokale Entscheidungssteuerung mit mathematischen Formeln, Gedächtnisregeln und nachvollziehbaren Reaktionen. Der lokale Stand ergänzt den Zustandskern um begrenzte Begleiterentscheidungen, ausdrückliche Problemnavigation, bestätigte Erinnerungen und eine echte Live-Ansicht. [Aktuelle Bedienung und Grenzen](docs/ACTIVE-COMPANION.md).

[Das Fee-Gehirn bildlich erkunden](docs/fairy-brain.html): interaktive Offline-Konzeptgrafik mit Selbstmodell und sechs Reaktionsszenarien. Die HTML-Datei lokal im Browser öffnen; sie zeigt simulierte Zustände.

Technischer Einstieg: [Spezifikation](docs/FAIRY-BRAIN-TECHNICAL.md) · [Umsetzungsplan](docs/FAIRY-BRAIN-PLAN.md). In der lokalen v0.6.2-Entwicklungsvorschau öffnet **NAVI: About My State / Eigenen Zustand erklären** eine regelbasierte Momentaufnahme ohne zusätzlichen Modellaufruf.

## Gehirnzustände sichtbar machen (lokale v0.6.2)

NAVI zeigt Empfang, Warten, Bearbeitung, lokale Hinweise, Antwortabschluss, Abbruch und Fehler durch zusammengehörige Bewegungen, Flügelschlag und Licht. Browser- und Windows-Fee verwenden gemeinsame Ausdrucksprofile; die Maus-Ausweichbewegung bleibt unabhängig. [Verhalten, Architektur und Prüfungen](docs/BRAIN-EXPRESSION.md). Eine fertige Antwort ist noch kein verifiziertes Programmergebnis.
