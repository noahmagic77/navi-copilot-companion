> **Archivierter Stand v0.2.** Speicherimplementierung in v0.3 siehe [storage-architecture-v03.md](storage-architecture-v03.md).

# NAVI — Implementierungsleitfaden und API-Verträge

## 1. Repository-Layout (Implementierungsstand v0.2)

```text
NAVI-Professional-PoC/
├─ package.json                     # VS Code extension manifest / commands
├─ README.md                        # Setup, Nutzung, Architekturübersicht
├─ LICENSE                          # MIT
├─ media/
│  ├─ index.html                    # Fee, Hinweisliste, Prompt Check, Metriken
│  ├─ style.css                     # Dark UI, animierte Fee, Accessibility
│  ├─ ui.js                         # VS Code Webview messaging
│  └─ icon.svg                      # Original-Icon (kein Nintendo-Asset)
├─ src/
│  ├─ extension.js                  # Composition root / NaviController
│  ├─ analyze.cjs                   # Kopierbare Heuristiken für Hook subprocess
│  ├─ observer.cjs                  # Standalone Copilot hook entry point
│  ├─ core/
│  │  ├─ AnalysisEngine.cjs
│  │  ├─ PromptChecker.cjs
│  │  ├─ SessionManager.cjs
│  │  ├─ RecommendationEngine.cjs
│  │  └─ TokenMetricsParser.cjs
│  ├─ integrations/
│  │  ├─ CopilotHookManager.cjs
│  │  ├─ IncrementalJsonlReader.cjs
│  │  └─ TelemetrySettingsManager.cjs
│  ├─ storage/
│  │  └─ JsonEventStore.cjs
│  ├─ ui/
│  │  └─ NaviViewProvider.cjs
│  └─ types/
│     └─ contracts.d.ts            # Dokumentierte TS-Interfaces
├─ docs/
│  ├─ architecture.md               # C4-style, Klassen, Sequenzen, Datenfluss
│  ├─ implementation.md             # Dieses Dokument
│  ├─ data-and-migrations.md        # VSIX, JSON, künftige SQLite-Migration
│  ├─ security-and-privacy.md       # Trust boundaries, Bedrohungsmodell
│  ├─ test-and-acceptance.md        # Prüfstrategie und E2E-Testplan
│  ├─ roadmap.md                    # Release-Plan / Backlog
│  ├─ diagrams/*.mmd                # Editierbare Mermaid-Diagramme
│  ├─ schema/*.json                 # JSON Schema für Datenverträge
│  ├─ schema/sqlite-v1.sql          # Künftiges relationales Modell
│  └─ adr/*.md                      # Architecture Decision Records
├─ examples/
│  ├─ sanitized-event.json
│  └─ otel-chat-span.jsonl
├─ test/
│  ├─ analyze.test.cjs
│  ├─ architecture.test.cjs
│  └─ otel.test.cjs
└─ scripts/
   ├─ build_vsix.py                # Offline ZIP-basierter VSIX-Build
   └─ check.cjs                    # JS syntax checks
```

Weitere unverpackte Referenzdateien können als Designbeispiel enthalten sein; nur `FILES` aus `scripts/build_vsix.py` werden ins Runtime-Paket aufgenommen.

## 2. Module und öffentliche Funktionen

| Modul / Klasse | Eingabe | Rückgabe | Seiteneffekte |
|---|---|---|---|
| `PromptChecker.analyze(prompt)` | `string` | `PromptAnalysis` | keine |
| `PromptChecker.proposeTemplate(prompt)` | `string` | `string` | keine |
| `SessionManager.registerPrompt(hash, topic)` | Pseudonym, Kategorie | `{topicChanged, prior?, category?}` | in-memory Thema |
| `RecommendationEngine.recommend(flags)` | `RuleId[]` | `Recommendation[]` | keine |
| `AnalysisEngine.fromHook(event)` | sanitisiertes Event | Empfehlungsliste | in-memory Session |
| `TokenMetricsParser.parse(otelJson)` | OTLP JSON Object | `TokenTotals` | Seen-set zur Deduplizierung |
| `IncrementalJsonlReader.poll()` | Dateipfad (Konstruktor) | `void` | liest neue Zeilen, Callback |
| `JsonEventStore.load()` | — | `AnalysisEvent[]` | FS-Read |
| `JsonEventStore.save(events)` | `AnalysisEvent[]` | `void` | atomarer FS-Write |
| `CopilotHookManager.install(root, output)` | vertrauenswürdiger Workspace, lokal | `void` | legt Hook-Dateien und Manifest an |
| `CopilotHookManager.remove(root)` | Workspace | `void` | löscht nur unveränderte eigene Dateien |
| `TelemetrySettingsManager.enable()` | — | `Promise<void>` | Settings-Backup und -Update |
| `NaviViewProvider.post(message)` | erlaubter State | `void` | VS Code Webview Event |

## 3. Funktionsabläufe (implementierte Use Cases)

### UC-01: Manuelle Promptprüfung

1. Anwender gibt Prompt in NAVI-Promptfeld ein.
2. Webview sendet `{type:'check',prompt}` an Extension Host.
3. Host prüft Nachrichtentyp und Größenlimit.
4. `AnalysisEngine.analyzeManual()` liefert Wordcount, Topic und Regel-IDs.
5. `RecommendationEngine` liefert statische Texte, z. B. „Ziel konkretisieren“.
6. UI rendert per `textContent`. Der Originalprompt wird nicht gespeichert.

### UC-02: Automatische Copilot-Hinweise

1. Opt-in installiert `navi-observer.json`, `navi-observer.cjs` und `analyze.cjs` in `.github/hooks`.
2. Unterstützter **Copilot-Harness** löst z. B. `userPromptSubmitted` aus.
3. Externer Node-Prozess liest Hook-Payload von `stdin` und berechnet lokale Regel-IDs.
4. Nur sanitisiertes Event wird an lokales `hook-events.jsonl` angehängt.
5. `IncrementalJsonlReader` meldet neue Einträge an den `NaviController`.
6. `AnalysisEngine` vergleicht Topic-Kategorien für dieselbe pseudonyme Session.
7. Neue Empfehlungen werden zeitlich gedrosselt; `JsonEventStore` speichert den Hinweis-Snapshot.
8. Webview aktualisiert Fee-Sprechblase und Hinweis-Liste.

**Kein Reverse Engineering interner Copilot-Datenbanken** und kein direkter Schreibzugriff auf den ursprünglichen Copilot-Chat.

### UC-03: Token-Erfassung

1. Nutzer aktiviert lokalen OTel-Export nach Einwilligung.
2. NAVI sichert aktuelle globale OTel-Werte.
3. Copilot schreibt JSONL-Spans an den NAVI-Pfad (nur falls unterstützt).
4. `TokenMetricsParser` extrahiert `gen_ai.usage.input_tokens` und `output_tokens` aus `chat`-Spans.
5. Der Controller akkumuliert die Zahlen für das aktuelle Beobachtungsfenster.
6. UI zeigt Messwerte plus Einschränkungen. Beim Abschalten versucht NAVI die zuvor gesetzten globalen Werte wiederherzustellen, sofern unverändert.

## 4. Konkrete Core-Nutzung

```js
const { AnalysisEngine } = require('./src/core/AnalysisEngine.cjs');
const { TokenMetricsParser } = require('./src/core/TokenMetricsParser.cjs');

const engine = new AnalysisEngine();
const { result, advice } = engine.analyzeManual('Mach alles besser');
console.log(result.category, result.flags, advice.map(a => a.id));

const metrics = new TokenMetricsParser();
console.log(metrics.parse({
  name: 'chat',
  attributes: {
    'gen_ai.usage.input_tokens': 1200,
    'gen_ai.usage.output_tokens': 200
  }
}));
```

Core-Module sind ohne VS Code ausführbar und deshalb per `node --test` isoliert prüfbar.

## 5. Webview-Nachrichtenvertrag

**Von Webview zum Extension Host:**

```ts
type NaviUIRequest =
  | { type: 'ready' }
  | { type: 'check'; prompt: string }
  | { type: 'copyTemplate'; prompt: string }
  | { type: 'command'; command:
      'navi.installHooks' | 'navi.removeHooks' |
      'navi.enableTelemetry' | 'navi.disableTelemetry' |
      'navi.demo' | 'navi.showDataFolder' | 'navi.clearData' };
```

**Vom Host zur Webview:**

```ts
type NaviUIResponse =
  | { type: 'state'; events: AnalysisEvent[]; tokens: TokenTotals;
      hookCount: number; toolCount: number; hookStatus: boolean;
      telemetryStatus: boolean; animated: boolean; notifications: boolean }
  | { type: 'manualResult'; result: PromptAnalysis; advice: Recommendation[] }
  | { type: 'copied' };
```

Browser-Code nutzt `acquireVsCodeApi().postMessage`. Der Extension Host validiert Commands anhand einer Allowliste; die Webview erhält **keinen direkten Zugriff auf Node.js, FS oder Tokens**. Vorbereitete `contracts.d.ts` liefert den zukünftigen TypeScript-Vertrag.

## 6. Regeln: aktuelles heuristisches Verfahren

- **clarify:** sehr kurzer, unspezifischer Arbeitsauftrag.
- **scope:** Wörter wie „alles“ oder „gesamte Codebasis“ deuten auf übergroßen Suchraum.
- **relevant-files:** fehlende Datei-/Modulreferenzen (nur schwaches Signal).
- **define-acceptance:** fehlende überprüfbare Fertigstellungskriterien.
- **structure:** ungewöhnlich langer unstrukturierter Prompt.
- **fresh-chat:** Themenklassifikation wechselt innerhalb einer pseudonymen Session.

Diese Hinweise sind **Vorschläge, keine Faktenbehauptungen**. Für gutes Context Engineering können längere Prompts, Codekontext und fortgesetzte Chats ausdrücklich sinnvoll sein. Weder Themawechsel noch Promptlänge allein beweisen Verschwendung.

## 7. Laufzeit- und Build-Umgebung

- VS Code Desktop: `engines.vscode` mindestens `1.100.0` (API-Mindestwert, keine Garantie für alle Harnesses).
- Programm: Node-basierter VS Code Extension Host, Runtime ohne zusätzliche npm-Abhängigkeiten.
- Externer Hook: Node.js ≥18 im `PATH` des Hook-Prozesses.
- Build: Python 3 und Node.js, `npm run check`, `npm run vsix`.
- Test: Node integrierter Test-Runner, daher ohne Jest.
- Produktbildsprache: eigene, nicht markenrechtlich kopierte leuchtende Fee.
- Runtime gespeichert über `globalStorageUri` und VS Code Settings.

## 8. Der nächste Refactoring-Schritt

Für v0.3 werden bei steigender Komplexität die `NaviController`-Abläufe in separate Use-Case-Services (`PromptReceivedUseCase`, `TokensObservedUseCase`) aufgeteilt. Eine echte TypeScript-Typprüfung mit `@types/vscode`, `@types/node`, `tsc --noEmit` und CI wird dann vorgeschrieben. Das sollte **nicht** als bereits implementiert betrachtet werden.
