/** Read-only MCP audit: no tools/call, no bearer logging. Node 20+. */
import { pathToFileURL } from 'node:url';
export const DEFAULT_URL = 'https://hailee-aerodynamic-vanesa.ngrok-free.dev/mcp';

function unpack(s,id) {
  const msgs=s.trimStart().startsWith('{')
    ? [JSON.parse(s)]
    : s.split(/\r?\n\r?\n/).flatMap(event => {
      const data=event.split(/\r?\n/).filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trim()).join('\n');
      try {return data && data!=='[DONE]' ? [JSON.parse(data)] : [];} catch {return [];}
    });
  const msg=msgs.find(x=>x?.id===id);
  if(!msg) throw new Error('Missing matching JSON-RPC response');
  if(msg.error) throw new Error('MCP error '+String(msg.error.code));
  return msg.result;
}
export async function probeMcp({url=DEFAULT_URL,token,fetchImpl=fetch,timeoutMs=8000}={}) {
  if(typeof token!=='string'||!token.trim()) throw new Error('MINIS_MCP_BEARER_TOKEN missing; no request made');
  const target=new URL(url);
  if(target.protocol!=='https:'||target.username||target.password||target.search||target.hash) throw new Error('Clean HTTPS URL required');
  if(/[\r\n]/.test(token)) throw new Error('Malformed bearer token');
  let session;
  const headers={Authorization:'Bearer '+token,Accept:'application/json, text/event-stream','Content-Type':'application/json','ngrok-skip-browser-warning':'1'};
  async function post(method,params,id) {
    const h={...headers};
    if(session) h['mcp-session-id']=session;
    if(method!=='initialize') h['mcp-protocol-version']='2025-03-26';
    const rpc={jsonrpc:'2.0',method};
    if(id!==undefined) rpc.id=id;
    if(params!==undefined) rpc.params=params;
    const r=await fetchImpl(target.toString(),{method:'POST',headers:h,body:JSON.stringify(rpc),redirect:'manual',signal:AbortSignal.timeout(timeoutMs)});
    if(r.status>=300&&r.status<400) throw new Error('Redirect refused (HTTP '+r.status+')');
    if(r.status===401||r.status===403) throw new Error('Authentication refused (HTTP '+r.status+')');
    if(![200,202,204].includes(r.status)) throw new Error('Unexpected HTTP '+r.status);
    if(!session) session=r.headers.get('mcp-session-id')||undefined;
    if(id===undefined) return null;
    if(r.status!==200) throw new Error('No synchronous RPC reply (HTTP '+r.status+')');
    return unpack(await r.text(),id);
  }
  const init=await post('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'grok-minis-readonly-audit',version:'0.1.0'}},1);
  if(!init||typeof init!=='object') throw new Error('Invalid initialize result');
  await post('notifications/initialized',{},undefined);
  const names=[];
  let cursor;
  for(let i=0;i<20;i++){
    const result=await post('tools/list',cursor?{cursor}:{},i+2);
    if(!Array.isArray(result?.tools)) throw new Error('tools/list missing tools array');
    names.push(...result.tools.map(t=>String(t.name??'<unnamed>')));
    cursor=result.nextCursor;
    if(!cursor) return {reachable:true,protocolVersion:String(init.protocolVersion??''),toolCount:names.length,toolNames:names,expected29:names.length===29};
  }
  throw new Error('tools/list pagination limit exceeded');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  probeMcp({url:process.env.MINIS_MCP_URL||DEFAULT_URL,token:process.env.MINIS_MCP_BEARER_TOKEN})
    .then(data=>console.log(JSON.stringify(data,null,2)))
    .catch(err=>{console.error('MCP audit failed: '+err.message);process.exitCode=1;});
}