import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';
import { emptyHistory, appendEntry, parseHistory, HistoryEntry, HistoryDocument } from './history';

const FILE_NAME = 'navi-history.v1.json';

export class LocalHistoryStore {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly context: vscode.ExtensionContext) {}

  get folder(): vscode.Uri { return this.context.globalStorageUri; }
  private get file(): vscode.Uri { return vscode.Uri.joinPath(this.folder, FILE_NAME); }
  private get tempFile(): vscode.Uri { return vscode.Uri.joinPath(this.folder, FILE_NAME + '.tmp'); }

  async read(): Promise<HistoryDocument> {
    try {
      const bytes = await vscode.workspace.fs.readFile(this.file);
      return parseHistory(JSON.parse(new TextDecoder().decode(bytes)) as unknown);
    } catch (error) {
      if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
        return emptyHistory();
      }
      throw error; // Never overwrite corrupt or unsupported user data silently.
    }
  }

  async add(prompt: string, response: string, command: string | undefined, maxEntries: number): Promise<void> {
    const entry: HistoryEntry = {
      id: randomUUID(), timestamp: new Date().toISOString(), command,
      prompt: prompt.slice(0, 32000), response: response.slice(0, 64000)
    };
    return this.enqueue(async () => {
      const next = appendEntry(await this.read(), entry, maxEntries);
      await this.write(next);
    });
  }

  async clear(): Promise<void> {
    return this.enqueue(async () => {
      try {
        await vscode.workspace.fs.delete(this.file);
      } catch (error) {
        if (!(error instanceof vscode.FileSystemError && error.code === 'FileNotFound')) { throw error; }
      }
    });
  }

  private enqueue(job: () => Promise<void>): Promise<void> {
    const result = this.queue.then(job);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async write(data: HistoryDocument): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.folder);
    await vscode.workspace.fs.writeFile(this.tempFile, new TextEncoder().encode(JSON.stringify(data, null, 2) + '\n'));
    await vscode.workspace.fs.rename(this.tempFile, this.file, { overwrite: true });
  }
}
