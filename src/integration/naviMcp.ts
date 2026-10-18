import {sendToBridge} from './bridge';

export const naviTools = [
  {name: 'navi_show_message', description: 'Show an explicitly shared short message beside NAVI. Does not read chats or call a model. Acknowledgement does not guarantee visibility when NAVI is hidden or bubbles are disabled.', inputSchema: {type: 'object', properties: {message: {type:'string', minLength:1, maxLength:4000}}, required:['message'], additionalProperties:false}},
  {name: 'navi_set_status', description: 'Set NAVI activity for this requestId. Start with received or busy; waiting means awaiting a response. Finish with completed, cancelled or error using the same id. Renew an active state within 120 seconds for long tasks. Pass an optional final excerpt. Other active requests can delay or suppress display.', inputSchema: {type:'object', properties: {requestId:{type:'string',pattern:'^[a-zA-Z0-9_-]{1,80}$'}, state:{type:'string',enum:['received','waiting','busy','completed','cancelled','error']}, message:{type:'string',maxLength:4000}}, required:['requestId','state'],additionalProperties:false}}
];

/** MCP JSON-RPC over newline-delimited stdio. Uses only bundled code and Node built-ins. */
export async function handleMcp(message: Record<string, unknown>, descriptor: string): Promise<unknown> {
  const id = message.id;
  if (id === undefined) return; // Notifications never produce stdout responses.
  const result = (value: unknown) => ({jsonrpc:'2.0', id, result:value});
  const error = (code: number, text: string) => ({jsonrpc:'2.0',id,error:{code,message:text}});
  if (message.jsonrpc !== '2.0') return error(-32600, 'Invalid JSON-RPC request.');
  if (message.method === 'initialize') {
    const params = message.params as {protocolVersion?: string} | undefined;
    const supported = ['2024-11-05','2025-03-26','2025-06-18'];
    return result({protocolVersion: supported.includes(params?.protocolVersion ?? '') ? params!.protocolVersion : '2025-06-18', capabilities:{tools:{}}, serverInfo:{name:'navi-companion',version:'0.6.0'}, instructions:'Use NAVI only for explicitly requested short status or result handoffs. Do not forward private reasoning or unrelated chat history. Start status with busy and finish with the same requestId. This tool does not invoke another model.'});
  }
  if (message.method === 'ping') return result({});
  if (message.method === 'tools/list') return result({tools:naviTools});
  if (message.method !== 'tools/call') return error(-32601, 'Method not found.');
  const params = message.params as {name?: string; arguments?: Record<string, unknown>} | undefined;
  const args = params?.arguments;
  if (!args || typeof args !== 'object' || Array.isArray(args)) return error(-32602, 'Tool arguments are required.');
  let payload: Record<string, unknown>;
  if (params?.name === 'navi_show_message') payload = {...args,type:'message'};
  else if (params?.name === 'navi_set_status') payload = {...args,type:'status'};
  else return error(-32602, 'Unknown NAVI tool.');
  try {
    const reply = await sendToBridge(descriptor, payload);
    return result({content:[{type:'text',text:JSON.stringify({...reply,note:reply.displayed?'Delivered to NAVI; focus, visibility and bubble settings still apply.':'Not displayed: another request owns NAVI, or this request is no longer active.'})}]});
  } catch (cause) {
    return result({isError:true,content:[{type:'text',text:cause instanceof Error ? cause.message : 'NAVI connection failed.'}]});
  }
}

if (require.main === module) {
  const descriptor = process.env.NAVI_CONNECTION_FILE;
  if (!descriptor) { process.stderr.write('NAVI_CONNECTION_FILE is required. Use NAVI: Configure Codex Connection.\n'); process.exitCode=1; }
  else {
    let buffer = Buffer.alloc(0);
    let queue = Promise.resolve();
    process.stdin.on('data', chunk => {
      buffer = Buffer.concat([buffer,chunk]);
      if (buffer.length > 65_536) { process.stderr.write('MCP input too large.\n'); process.exit(1); }
      let end: number;
      while ((end=buffer.indexOf(10)) >= 0) {
        const line=buffer.subarray(0,end).toString('utf8'); buffer=buffer.subarray(end+1);
        if (!line.trim()) continue;
        queue=queue.then(async()=>{
          let request: unknown;
          try { request=JSON.parse(line); } catch { process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error.'}})+'\n'); return; }
          if (!request || typeof request !== 'object' || Array.isArray(request)) { process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid request.'}})+'\n'); return; }
          const response=await handleMcp(request as Record<string,unknown>,descriptor);
          if (response) process.stdout.write(JSON.stringify(response)+'\n');
        }).catch(()=>{process.stderr.write('NAVI MCP request failed.\n');});
      }
    });
  }
}
