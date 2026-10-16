import * as vscode from 'vscode';
import { registerNaviParticipant } from './chat/participant';
import { LocalHistoryStore } from './storage/localHistoryStore';

export function activate(context: vscode.ExtensionContext): void {
  const store = new LocalHistoryStore(context);
  registerNaviParticipant(context, store);

  context.subscriptions.push(
    vscode.commands.registerCommand('navi.showStatus', async () => {
      const enabled = vscode.workspace.getConfiguration('navi').get<boolean>('history.enabled', true);
      await vscode.window.showInformationMessage(`NAVI 0.1.0 is running. Local history: ${enabled ? 'enabled' : 'disabled'}.`);
    }),
    vscode.commands.registerCommand('navi.openDataFolder', async () => {
      await vscode.workspace.fs.createDirectory(store.folder);
      await vscode.env.openExternal(store.folder);
    }),
    vscode.commands.registerCommand('navi.clearHistory', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Permanently delete locally stored NAVI chat history for this VS Code profile?',
        { modal: true }, 'Delete history'
      );
      if (confirm !== 'Delete history') { return; }
      try {
        await store.clear();
        await vscode.window.showInformationMessage('NAVI local history deleted.');
      } catch (error) {
        console.error('NAVI history deletion failed', error);
        await vscode.window.showErrorMessage('Unable to delete NAVI local history.');
      }
    })
  );
}

export function deactivate(): void {}
