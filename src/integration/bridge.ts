import {randomBytes} from 'node:crypto';
import {createServer, createConnection, type Server, type Socket} from 'node:net';
import {mkdir, writeFile, readFile, unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {ActivityController, ActivityState} from './activity';

const MAX_BYTES = 8192;
export interface BridgeConnection {endpoint: string; token: string}
export interface BridgeReply {accepted: true; displayed: boolean}

export function dispatchBridge(activity: ActivityController, input: unknown): BridgeReply {
  if (!input || typeof input !== 'object') throw new Error('Invalid NAVI request.');
  const data = input as Record<string, unknown>;
  if (data.type === 'message' && typeof data.message === 'string' && data.message.trim() && data.message.length <= 4000) {
    return {accepted: true, displayed: activity.message('codex', data.message)};
  }
  if (data.type === 'status' && typeof data.requestId === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(data.requestId) &&
      typeof data.state === 'string' && ['received','waiting','busy','completed','cancelled','error'].includes(data.state) &&
      (data.message === undefined || typeof data.message === 'string' && data.message.length <= 4000)) {
    return {accepted: true, displayed: activity.update('codex', data.requestId, data.state as ActivityState, data.message as string | undefined)};
  }
  throw new Error('Invalid NAVI message or status.');
}

/** Per-window authenticated IPC. No listening TCP port or model API. */
export class NaviBridge {
  private server?: Server;
  private readonly clients = new Set<Socket>();
  private readonly id = randomBytes(16).toString('hex');
  private disposed = false;
  readonly connection: BridgeConnection = {
    endpoint: process.platform === 'win32' ? '\\\\.\\pipe\\navi-' + this.id : join(tmpdir(), 'navi-' + this.id + '.sock'),
    token: randomBytes(32).toString('hex')
  };
  readonly descriptor: string;
  constructor(folder: string, private readonly activity: ActivityController) { this.descriptor = join(folder, 'connections', this.id + '.json'); }

  async start(): Promise<void> {
    if (this.disposed) throw new Error('NAVI bridge is closed.');
    const server = createServer(socket => {
      if (this.clients.size >= 32) { socket.destroy(); return; }
      this.clients.add(socket);
      socket.on('close', () => this.clients.delete(socket));
      socket.on('error', () => socket.destroy());
      socket.setTimeout(3000, () => socket.destroy());
      let buffer = Buffer.alloc(0);
      socket.on('data', chunk => {
        buffer = Buffer.concat([buffer, chunk]);
        if (buffer.length > MAX_BYTES) { socket.destroy(); return; }
        const end = buffer.indexOf(10);
        if (end < 0) return;
        socket.removeAllListeners('data');
        try {
          const data = JSON.parse(buffer.subarray(0,end).toString('utf8'));
          if (data.token !== this.connection.token) throw new Error('Unauthorized NAVI connection.');
          socket.end(JSON.stringify(dispatchBridge(this.activity, data)) + '\n');
        } catch { socket.end(JSON.stringify({error: 'NAVI rejected the request.'}) + '\n'); }
      });
    });
    this.server = server;
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(this.connection.endpoint, resolve); });
    server.on('error', () => { /* Connection errors are reported to each caller. */ });
    try {
      await mkdir(join(this.descriptor, '..'), {recursive: true, mode: 0o700});
      await writeFile(this.descriptor, JSON.stringify(this.connection), {mode: 0o600, flag: 'wx'});
      if (this.disposed) { await this.dispose(); throw new Error('NAVI bridge is closed.'); }
    } catch (error) { await this.dispose(); throw error; }
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    for (const client of this.clients) client.destroy();
    if (this.server?.listening) await new Promise<void>(resolve => this.server!.close(() => resolve()));
    await unlink(this.descriptor).catch(() => {});
    if (process.platform !== 'win32') await unlink(this.connection.endpoint).catch(() => {});
  }
}

export async function sendToBridge(descriptor: string, payload: Record<string, unknown>): Promise<BridgeReply> {
  const data = JSON.parse(await readFile(descriptor, 'utf8')) as BridgeConnection;
  if (typeof data.endpoint !== 'string' || typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token) ||
      !(process.platform === 'win32' ? /^\\\\\.\\pipe\\navi-[a-f0-9]{32}$/.test(data.endpoint) : data.endpoint.startsWith(join(tmpdir(), 'navi-')) && data.endpoint.endsWith('.sock'))) throw new Error('Invalid NAVI connection file.');
  const wire = JSON.stringify({...payload, token: data.token}) + '\n';
  if (Buffer.byteLength(wire) > MAX_BYTES) throw new Error('NAVI request is too large.');
  return new Promise((resolve, reject) => {
    const socket = createConnection(data.endpoint);
    let response = '';
    let settled = false;
    const fail = (error: Error) => { if (!settled) { settled = true; reject(error); } socket.destroy(); };
    socket.setTimeout(3000, () => fail(new Error('NAVI connection timed out.')));
    socket.once('error', () => fail(new Error('NAVI is not connected. Open the configured VS Code window.')));
    socket.once('connect', () => socket.write(wire));
    socket.on('data', chunk => {
      response += chunk.toString('utf8');
      if (response.length > MAX_BYTES) { fail(new Error('Invalid NAVI response.')); return; }
      if (!response.includes('\n')) return;
      try {
        const result = JSON.parse(response.split('\n')[0]);
        if (result.accepted !== true || typeof result.displayed !== 'boolean') throw new Error('NAVI rejected the request.');
        settled = true; resolve(result); socket.destroy();
      } catch { fail(new Error('NAVI rejected the request.')); }
    });
    socket.once('close', () => { if (!settled) fail(new Error('NAVI connection closed before acknowledgement.')); });
  });
}
