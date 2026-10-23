import test from 'node:test';
import assert from 'node:assert/strict';
import {probeMcp} from './probe.mjs';

function mock(mode='json',toolCount=29){
  const calls=[];
  const fetchImpl=async (_url,opts)=>{
    calls.push(opts);
    const rpc=JSON.parse(opts.body);
    if(rpc.method==='notifications/initialized') return new Response(null,{status:204});
    if(mode==='unauthorized') return new Response('{"error":"unauthorized"}',{status:401});
    if(mode==='redirect') return new Response(null,{status:302,headers:{location:'https://wrong.example/'}});
    const data=JSON.stringify({jsonrpc:'2.0',id:rpc.id,result:rpc.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{}}:{tools:Array.from({length:toolCount},(_,i)=>({name:'tool_'+i}))}});
    return new Response(mode==='sse'?'event: message\ndata: '+data+'\n\n':data,{status:200,headers:{'content-type':mode==='sse'?'text/event-stream':'application/json','mcp-session-id':'mock-session'}});
  };
  return {calls,fetchImpl};
}

test('missing token: fail closed with zero requests',async()=>{
  let calls=0;
  await assert.rejects(probeMcp({token:'',fetchImpl:()=>{calls++;}}),/missing/);
  assert.equal(calls,0);
});
test('reject insecure origin and token CRLF',async()=>{
  await assert.rejects(probeMcp({url:'http://example.com/mcp',token:'test'}),/HTTPS/);
  await assert.rejects(probeMcp({token:'bad\nkey'}),/Malformed/);
});
test('JSON initialization, session tracking, and tools/list',async()=>{
  const m=mock();
  const r=await probeMcp({token:'mock-token',fetchImpl:m.fetchImpl});
  assert.equal(r.toolCount,29);
  assert.equal(r.expected29,true);
  assert.deepEqual(m.calls.map(x=>JSON.parse(x.body).method),['initialize','notifications/initialized','tools/list']);
  assert.equal(m.calls[2].headers['mcp-session-id'],'mock-session');
  assert.equal(m.calls[0].headers['ngrok-skip-browser-warning'],'1');
  assert.equal(m.calls[0].redirect,'manual');
  assert.ok(m.calls.every(x=>x.headers.Authorization==='Bearer mock-token'));
});
test('SSE responses supported',async()=>{
  const m=mock('sse',3);
  const r=await probeMcp({token:'t',fetchImpl:m.fetchImpl});
  assert.equal(r.toolCount,3);
  assert.equal(r.expected29,false);
});
test('401 rejection does not echo bearer',async()=>{
  const m=mock('unauthorized');
  await assert.rejects(probeMcp({token:'private-example-value',fetchImpl:m.fetchImpl}),e=>e.message==='Authentication refused (HTTP 401)'&&!e.message.includes('private-example-value'));
});
test('redirect refused',async()=>{
  const m=mock('redirect');
  await assert.rejects(probeMcp({token:'t',fetchImpl:m.fetchImpl}),/Redirect refused/);
});