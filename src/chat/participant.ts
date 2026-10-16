import * as vscode from 'vscode';
import { LocalHistoryStore } from '../storage/localHistoryStore';

function config(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('navi');
}

export function registerNaviParticipant(context: vscode.ExtensionContext, store: LocalHistoryStore): vscode.Disposable {
  const handler: vscode.ChatRequestHandler = async (request, _chatContext, stream, token) => {
    const text = request.prompt.trim();
    if (!text) {
      stream.markdown('Please enter a question for NAVI.');
      return;
    }
    const prefix = request.command === 'explain'
      ? 'Explain the following clearly and accurately:\n\n'
      : request.command === 'summarize'
        ? 'Summarize the following concisely:\n\n'
        : 'Respond accurately to the following request:\n\n';
    const messages = [vscode.LanguageModelChatMessage.User(prefix + text)];
    let answer = '';
    try {
      const result = await request.model.sendRequest(messages, {}, token);
      for await (const fragment of result.text) {
        if (token.isCancellationRequested) { return; }
        answer += fragment;
        stream.markdown(fragment);
      }
      if (!token.isCancellationRequested && config().get<boolean>('history.enabled', true)) {
        try {
          await store.add(text, answer, request.command, config().get<number>('history.maxEntries', 200));
        } catch (error) {
          // Successful model output should not disappear because local persistence failed.
          console.error('NAVI local history write failed', error);
          void vscode.window.showWarningMessage('NAVI could not save local history. Check the local data folder.');
        }
      }
    } catch (error) {
      if (token.isCancellationRequested) { return; }
      console.error('NAVI model request failed', error);
      stream.markdown('NAVI could not complete this request. Verify that a chat model is available and try again.');
    }
  };
  const participant = vscode.chat.createChatParticipant('navi.chat', handler);
  participant.iconPath = new vscode.ThemeIcon('sparkle');
  context.subscriptions.push(participant);
  return participant;
}
