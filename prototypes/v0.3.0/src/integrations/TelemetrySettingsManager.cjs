'use strict';
/** Snapshot and restore user-level OTel settings. Does not override policy or env precedence. */
const KEYS = ['enabled', 'exporterType', 'outfile', 'captureContent', 'captureIdentity'];
class TelemetrySettingsManager {
  constructor(vscode, globalState, otelFile) { this.vscode = vscode; this.globalState = globalState; this.otelFile = otelFile; }
  configuration() { return this.vscode.workspace.getConfiguration('github.copilot.chat.otel'); }
  status() {
    const c = this.configuration();
    return c.get('enabled', false) && c.get('exporterType') === 'file' && c.get('outfile') === this.otelFile && c.get('captureContent', false) === false;
  }
  async enable() {
    const c = this.configuration();
    if (this.globalState.get('navi.otel.backup')) throw new Error('NAVI verwaltet bereits eine OTel-Konfiguration.');
    // Only inspect explicit global values; inherited values may be workspace/policy settings.
    const backup = {};
    for (const k of KEYS) backup[k] = c.inspect(k)?.globalValue ?? null;
    await this.globalState.update('navi.otel.backup', backup);
    const desired = { enabled: true, exporterType: 'file', outfile: this.otelFile, captureContent: false, captureIdentity: false };
    try { for (const k of KEYS) await c.update(k, desired[k], this.vscode.ConfigurationTarget.Global); }
    catch (e) {
      for (const k of KEYS) try { await c.update(k, backup[k] === null ? undefined : backup[k], this.vscode.ConfigurationTarget.Global); } catch {}
      await this.globalState.update('navi.otel.backup', undefined); throw e;
    }
  }
  async disable() {
    const backup = this.globalState.get('navi.otel.backup');
    if (!backup) throw new Error('Keine von NAVI gesicherte OTel-Konfiguration gefunden.');
    const c = this.configuration();
    const desired = { enabled: true, exporterType: 'file', outfile: this.otelFile, captureContent: false, captureIdentity: false };
    // Do not overwrite user changes made since NAVI activation.
    for (const k of KEYS) {
      const actual = c.inspect(k)?.globalValue;
      if (actual === desired[k]) await c.update(k, backup[k] === null ? undefined : backup[k], this.vscode.ConfigurationTarget.Global);
    }
    await this.globalState.update('navi.otel.backup', undefined);
  }
}
module.exports = { TelemetrySettingsManager, KEYS };
