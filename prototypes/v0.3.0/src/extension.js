'use strict';
/** NAVI v0.2 - composition root. Pure domain logic is separate from VS Code adapters. */
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const { AnalysisEngine } = require('./core/AnalysisEngine.cjs');
const { TokenMetricsParser } = require('./core/TokenMetricsParser.cjs');
const { IncrementalJsonlReader } = require('./integrations/IncrementalJsonlReader.cjs');
const { CopilotHookManager } = require('./integrations/CopilotHookManager.cjs');
const { TelemetrySettingsManager } = require('./integrations/TelemetrySettingsManager.cjs');
const { JsonEventStore } = require('./storage/JsonEventStore.cjs');
const { CopilotStyleStore } = require('./storage/CopilotStyleStore.cjs');
const { NaviViewProvider } = require('./ui/NaviViewProvider.cjs');
const VIEW_ID = 'navi.assistant';
const POLL_MS = 1600;
class NaviController {
  constructor(context) {
    this.context = context;
    this.dataDir = context.globalStorageUri.fsPath;
    this.hookFile = path.join(this.dataDir, 'hook-events.jsonl');
    this.otelFile = path.join(this.dataDir, 'copilot-otel.jsonl');
    this.engine = new AnalysisEngine();
    this.metricsParser = new TokenMetricsParser();
    this.eventStore = new CopilotStyleStore(this.dataDir, { retentionDays: 30 });
    this.migrateV02();
    this.eventStore.prune();
    this.events = this.eventStore.recentAdvice();
    this.metrics = this.eventStore.summary().tokens;
    this.currentSession = 'unknown';
    this.hookCount = 0; this.toolCount = 0;
    this.cooldowns = new Map(); this.disposables = [];
    this.hooks = new CopilotHookManager(context.extensionPath, this.dataDir);
    this.telemetry = new TelemetrySettingsManager(vscode, context.globalState, this.otelFile);
    this.provider = new NaviViewProvider(context, this);
    this.hookReader = new IncrementalJsonlReader(this.hookFile, value => this.consumeHook(value));
    this.otelReader = new IncrementalJsonlReader(this.otelFile, value => this.consumeOtel(value));
  }
  workspaceKey() {
    const list = vscode.workspace.workspaceFolders || [];
    return list.length ? list.map(f => f.uri.toString()).sort().join('|') : 'global';
  }
  migrateV02() {
    const marker = path.join(this.dataDir, '.navi-v03-migration-complete');
    if (fs.existsSync(marker)) return;
    const old = new JsonEventStore(this.dataDir, { limit: 150, retentionDays: 365 });
    const legacyEvents = old.load().reverse();
    for (const event of legacyEvents) {
      this.eventStore.append({ kind: 'advice', at: event.at, workspace: 'legacy', session: 'legacy', source: 'NAVI', advice: event.advice });
    }
    fs.writeFileSync(marker, `${new Date().toISOString()}\n`, { encoding: 'utf8', mode: 0o600 });
    if (legacyEvents.length) old.clear();
  }
  start() {
    fs.mkdirSync(this.dataDir, { recursive: true, mode: 0o700 });
    this.hookReader.poll(); this.otelReader.poll();
    this.timer = setInterval(() => { this.hookReader.poll(); this.otelReader.poll(); }, POLL_MS);
    this.disposables.push(vscode.window.registerWebviewViewProvider(VIEW_ID, this.provider, { webviewOptions: { retainContextWhenHidden: true } }));
    const add = (name, fn) => this.disposables.push(vscode.commands.registerCommand(name, fn));
    add('navi.open', () => vscode.commands.executeCommand('workbench.view.extension.navi-companion'));
    add('navi.demo', () => this.demo());
    add('navi.installHooks', () => this.installHooks());
    add('navi.removeHooks', () => this.removeHooks());
    add('navi.enableTelemetry', () => this.enableTelemetry());
    add('navi.disableTelemetry', () => this.disableTelemetry());
    add('navi.clearData', () => this.clearData());
    add('navi.reindex', () => this.reindex());
    add('navi.exportData', () => this.exportData());
    add('navi.showDataFolder', () => vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(this.dataDir)));
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 30);
    status.text = '$(sparkle) NAVI'; status.command = 'navi.open'; status.tooltip = 'NAVI Companion öffnen'; status.show();
    this.disposables.push(status);
    this.disposables.push(vscode.workspace.onDidChangeConfiguration(e => { if (e.affectsConfiguration('navi') || e.affectsConfiguration('github.copilot.chat.otel')) this.refreshUI(); }));
  }
  currentRoot({ warn = false } = {}) {
    const folders = vscode.workspace.workspaceFolders;
    const folder = folders?.length === 1 ? folders[0] : undefined;
    if (!folder || folder.uri.scheme !== 'file' || !vscode.workspace.isTrusted) {
      if (warn) vscode.window.showWarningMessage('NAVI: Ein einzelner vertrauenswürdiger lokaler Projektordner ist für Hooks erforderlich. Multi-Root/Remote-Hooks werden in v0.2 noch nicht unterstützt.');
      return undefined;
    }
    return folder.uri.fsPath;
  }
  hookStatus() { const root = this.currentRoot(); return root ? this.hooks.status(root) : false; }
  refreshUI() {
    const cfg = vscode.workspace.getConfiguration('navi');
    this.provider.post({
      type: 'state', storage: this.eventStore.summary(), events: this.events.slice(0, 12), hookCount: this.hookCount, toolCount: this.toolCount,
      tokens: this.metrics, animated: cfg.get('animatedFairy', true), notifications: cfg.get('enableNotifications', true),
      hookStatus: this.hookStatus(), telemetryStatus: this.telemetry.status()
    });
  }
  pushAdvice(advice, source = 'NAVI') {
    if (!advice.length || !vscode.workspace.getConfiguration('navi').get('enableNotifications', true)) return;
    const now = Date.now();
    const recent = advice.filter(a => {
      const key = `${source}:${a.id}`;
      const last = this.cooldowns.get(key) || 0;
      if (now - last < 120000) return false;
      this.cooldowns.set(key, now); return true;
    });
    if (!recent.length) return;
    this.events.unshift({ at: new Date(now).toISOString(), source, advice: recent });
    this.events = this.events.slice(0, 150);
    try { this.eventStore.append({ kind: 'advice', at: new Date(now).toISOString(), source, advice: recent, session: this.currentSession, workspace: this.workspaceKey() }); }
    catch (e) { vscode.window.showWarningMessage(`NAVI konnte einen Hinweis nicht speichern: ${e.message}`); }
    this.refreshUI();
  }
  consumeHook(event) {
    if (!event || typeof event !== 'object' || !['start', 'prompt', 'tool'].includes(event.kind)) return;
    if (event.session && event.session !== 'unknown') this.currentSession = event.session;
    if (event.kind === 'start') {
      this.hookCount++;
      try { this.eventStore.append({ kind: 'session', source: 'Copilot Hook', session: this.currentSession, workspace: this.workspaceKey() }); } catch {}
      this.refreshUI(); return;
    }
    if (event.kind === 'tool') { this.toolCount++; if (this.toolCount % 5 === 0) this.refreshUI(); return; }
    this.hookCount++;
    const advice = this.engine.fromHook(event);
    this.pushAdvice(advice, 'Copilot Hook');
    this.refreshUI();
  }
  consumeOtel(raw) {
    const metric = this.metricsParser.parse(raw);
    if (metric.calls === 0) return;
    for (const k of ['input', 'output', 'cached', 'calls']) this.metrics[k] += metric[k];
    try { this.eventStore.append({ kind:'metric', workspace:this.workspaceKey(), session:this.currentSession, ...metric }); }
    catch (e) { vscode.window.showWarningMessage(`NAVI konnte Tokenmetriken nicht speichern: ${e.message}`); }
    this.refreshUI();
  }
  demo() {
    const id = `demo-${Date.now()}`;
    this.consumeHook({ kind: 'prompt', session: id, category: 'auth', flags: ['clarify', 'define-acceptance'] });
    this.consumeHook({ kind: 'prompt', session: id, category: 'database', flags: ['scope'] });
    vscode.window.showInformationMessage('NAVI: Demo-Hinweise erzeugt. Öffne das NAVI-Fenster.');
  }
  async installHooks() {
    const root = this.currentRoot({ warn: true }); if (!root) return;
    const confirmation = await vscode.window.showWarningMessage(
      'NAVI legt drei ausführbare Hook-Dateien in .github/hooks an. Node.js >=18 muss lokal verfügbar sein. Der Copilot-Harness muss Hooks unterstützen. Die Inhalte werden bei Git-Commits mitversioniert – vorher prüfen. Fortfahren?',
      { modal: true }, 'Hooks installieren');
    if (confirmation !== 'Hooks installieren') return;
    try { this.hooks.install(root, this.hookFile); this.refreshUI(); vscode.window.showInformationMessage('NAVI-Hooks installiert. Eine neue Copilot-Harness-Sitzung starten und die Hook-Konfiguration prüfen.'); }
    catch (e) { vscode.window.showErrorMessage(`NAVI: ${e.message}`); }
  }
  async removeHooks() {
    const root = this.currentRoot({ warn: true }); if (!root) return;
    const yes = await vscode.window.showWarningMessage('NAVI-Hooks aus diesem Projekt entfernen? Veränderte Dateien werden nicht gelöscht.', { modal: true }, 'Entfernen');
    if (yes !== 'Entfernen') return;
    try { this.hooks.remove(root); this.refreshUI(); vscode.window.showInformationMessage('NAVI-Hooks entfernt.'); }
    catch (e) { vscode.window.showErrorMessage(`NAVI: ${e.message}`); }
  }
  async enableTelemetry() {
    const yes = await vscode.window.showWarningMessage(
      'Lokale OTel-Tokenmetriken aktivieren? NAVI sichert zuvor deine globalen OTel-Einstellungen und setzt captureContent=false. Organisationsrichtlinien und Umgebungsvariablen können abweichen.',
      { modal: true }, 'OTel aktivieren');
    if (yes !== 'OTel aktivieren') return;
    try { await this.telemetry.enable(); this.refreshUI(); vscode.window.showInformationMessage('NAVI: OTel für unterstützte Sessions aktiviert.'); }
    catch (e) { vscode.window.showErrorMessage(`NAVI: ${e.message}`); }
  }
  async disableTelemetry() {
    try { await this.telemetry.disable(); this.refreshUI(); vscode.window.showInformationMessage('NAVI: OTel-Einstellungen nach Möglichkeit wiederhergestellt.'); }
    catch (e) { vscode.window.showErrorMessage(`NAVI: ${e.message}`); }
  }
  async reindex() {
    try {
      const result = this.eventStore.rebuildIndex();
      this.refreshUI();
      if (result.sqlite) vscode.window.showInformationMessage(`NAVI: SQLite-Index aus ${result.indexed} JSONL-Ereignissen rekonstruiert.`);
      else vscode.window.showWarningMessage('NAVI: Kein SQLite-Treiber verfügbar. Die JSONL-Sitzungsdaten bleiben lesbar.');
    } catch (e) { vscode.window.showErrorMessage(`NAVI: Reindex fehlgeschlagen: ${e.message}`); }
  }
  async exportData() {
    const uri = await vscode.window.showSaveDialog({ saveLabel: 'NAVI-Daten exportieren', filters: { 'JSON': ['json'] }, defaultUri: vscode.Uri.file(path.join(require('node:os').homedir(), 'navi-export.json')) });
    if (!uri) return;
    try {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(this.eventStore.exportJSON(), 'utf8'));
      vscode.window.showInformationMessage('NAVI: Export abgeschlossen (nur anonymisierte Hinweise und Tokenmetriken).');
    } catch (e) { vscode.window.showErrorMessage(`NAVI: Export fehlgeschlagen: ${e.message}`); }
  }
  async clearData() {
    const yes = await vscode.window.showWarningMessage('Alle NAVI-Sitzungsdateien (JSONL), den SQLite-Index, Hinweise und lokale Hook-/OTel-Logs dauerhaft löschen? Installierte Hooks bleiben bestehen.', { modal: true }, 'Daten löschen');
    if (yes !== 'Daten löschen') return;
    try {
      this.eventStore.clear();
      this.eventStore = new CopilotStyleStore(this.dataDir, { retentionDays: 30 });
      for (const file of [this.hookFile, this.otelFile]) { try { fs.unlinkSync(file); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
      this.events = []; this.metrics = { input: 0, output: 0, cached: 0, calls: 0 };
      this.metricsParser.reset(); this.engine.sessions.reset(); this.cooldowns.clear(); this.hookCount = 0; this.toolCount = 0;
      this.hookReader = new IncrementalJsonlReader(this.hookFile, value => this.consumeHook(value));
      this.otelReader = new IncrementalJsonlReader(this.otelFile, value => this.consumeOtel(value));
      this.hookReader.poll(); this.otelReader.poll();
      this.refreshUI(); vscode.window.showInformationMessage('NAVI-Laufzeitdaten gelöscht.');
    } catch (e) { vscode.window.showErrorMessage(`NAVI: Daten konnten nicht vollständig gelöscht werden: ${e.message}`); }
  }
  dispose() { clearInterval(this.timer); this.eventStore?.dispose(); for (const d of this.disposables) d.dispose(); }
}
let controller;
function activate(context) { controller = new NaviController(context); controller.start(); context.subscriptions.push({ dispose: () => controller?.dispose() }); }
function deactivate() { controller?.dispose(); controller = undefined; }
module.exports = { activate, deactivate, NaviController };
