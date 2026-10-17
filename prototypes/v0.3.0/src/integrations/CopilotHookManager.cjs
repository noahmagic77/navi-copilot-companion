'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
/** Installs opt-in Copilot-harness hooks and removes only pristine NAVI-managed files. */
const ITEMS = ['navi-observer.json', 'navi-observer.cjs', 'analyze.cjs'];
const digest = body => crypto.createHash('sha256').update(body).digest('hex');
class CopilotHookManager {
  constructor(extensionPath, dataDir) { this.extensionPath = extensionPath; this.dataDir = dataDir; }
  paths(root) { return ITEMS.map(name => path.join(root, '.github', 'hooks', name)); }
  manifestPath(root) {
    const key = digest(path.resolve(root)).slice(0, 24);
    return path.join(this.dataDir, `hook-install-${key}.json`);
  }
  prepareFiles(root, eventsFile) {
    const command = 'node .github/hooks/navi-observer.cjs';
    const h = kind => [{ type: 'command', command: `${command} ${kind}`, env: { NAVI_EVENTS_FILE: eventsFile }, timeoutSec: 5 }];
    const config = JSON.stringify({ version: 1, hooks: { sessionStart: h('start'), userPromptSubmitted: h('prompt'), postToolUse: h('tool') } }, null, 2) + '\n';
    return [
      config,
      fs.readFileSync(path.join(this.extensionPath, 'src', 'observer.cjs'), 'utf8'),
      fs.readFileSync(path.join(this.extensionPath, 'src', 'analyze.cjs'), 'utf8')
    ];
  }
  install(root, eventsFile) {
    const paths = this.paths(root); const bodies = this.prepareFiles(root, eventsFile);
    // Never clobber existing files (even if labeled NAVI) without explicit migration.
    if (paths.some(p => fs.existsSync(p))) throw new Error('Es gibt bereits NAVI-Dateien. Bitte zuerst manuell prüfen und entfernen.');
    fs.mkdirSync(path.dirname(paths[0]), { recursive: true });
    fs.mkdirSync(this.dataDir, { recursive: true, mode: 0o700 });
    const created = [];
    try {
      paths.forEach((p, i) => { fs.writeFileSync(p, bodies[i], { encoding: 'utf8', flag: 'wx' }); created.push(p); });
      const manifest = { version: 1, paths: paths.map((p, i) => ({ path: p, sha256: digest(bodies[i]) })) };
      fs.writeFileSync(this.manifestPath(root), JSON.stringify(manifest, null, 2), { encoding: 'utf8', mode: 0o600 });
    } catch (err) { for (const p of created) try { fs.unlinkSync(p); } catch {} throw err; }
  }
  status(root) {
    try {
      const m = JSON.parse(fs.readFileSync(this.manifestPath(root), 'utf8'));
      return m.version === 1 && m.paths.length === 3 && m.paths.every(({ path: p, sha256 }) => fs.existsSync(p) && digest(fs.readFileSync(p)) === sha256);
    } catch { return false; }
  }
  remove(root) {
    const file = this.manifestPath(root);
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (m.version !== 1 || !Array.isArray(m.paths) || m.paths.length !== 3) throw new Error('Ungültige NAVI-Installationsdaten.');
    const expected = this.paths(root);
    for (let i = 0; i < m.paths.length; i++) {
      const p = m.paths[i];
      if (path.resolve(p.path) !== path.resolve(expected[i]) || !fs.existsSync(p.path) || digest(fs.readFileSync(p.path)) !== p.sha256)
        throw new Error('Eine Hook-Datei wurde verändert. Entfernen aus Sicherheitsgründen abgebrochen.');
    }
    for (const p of expected) fs.unlinkSync(p);
    fs.unlinkSync(file);
  }
}
module.exports = { CopilotHookManager };
