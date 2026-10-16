'use strict';
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
/** Isolates UI/Webview from domain services; all inbound messages are allowlisted. */
class NaviViewProvider {
  constructor(context, controller) { this.context = context; this.controller = controller; }
  resolveWebviewView(view) {
    this.view = view;
    const webview = view.webview;
    webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')] };
    const nonce = crypto.randomBytes(16).toString('base64');
    const style = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'style.css'));
    const script = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'ui.js'));
    webview.html = fs.readFileSync(path.join(this.context.extensionPath, 'media', 'index.html'), 'utf8')
      .replaceAll('{{cspSource}}', webview.cspSource)
      .replaceAll('{{nonce}}', nonce)
      .replaceAll('{{styleUri}}', String(style))
      .replaceAll('{{scriptUri}}', String(script));
    webview.onDidReceiveMessage(async message => {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'check' && typeof message.prompt === 'string' && message.prompt.length <= 100000) {
        const { result, advice } = this.controller.engine.analyzeManual(message.prompt);
        this.post({ type: 'manualResult', result, advice });
      } else if (message.type === 'copyTemplate' && typeof message.prompt === 'string' && message.prompt.length <= 100000) {
        await vscode.env.clipboard.writeText(this.controller.engine.promptChecker.proposeTemplate(message.prompt));
        this.post({ type: 'copied' });
      } else if (message.type === 'command' && typeof message.command === 'string') {
        const commands = new Set(['navi.installHooks', 'navi.removeHooks', 'navi.enableTelemetry', 'navi.disableTelemetry', 'navi.demo', 'navi.showDataFolder', 'navi.clearData', 'navi.reindex', 'navi.exportData']);
        if (commands.has(message.command)) await vscode.commands.executeCommand(message.command);
      } else if (message.type === 'ready') {
        this.controller.refreshUI();
      }
    });
    this.controller.refreshUI();
  }
  post(message) { if (this.view) this.view.webview.postMessage(message); }
}
module.exports = { NaviViewProvider };
