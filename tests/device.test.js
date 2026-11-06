import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {fileURLToPath} from 'node:url';

test('TV credential reads painting metadata but cannot authorize any controller write',async()=>{
 const result=await build({stdin:{contents:`import worker,{deviceState} from './worker/index.js';export default {fetch(request,env,ctx){env.TV={idFromName:()=>'',get:()=>({fetch:async()=>Response.json(deviceState({artwork:{source:'met',id:1,title:'Painting',image:'https://images.metmuseum.org/test.jpg',secret:'hidden'},settings:{mode:'fit',brightness:70,background:'#77716a'},submittedAt:'2026-11-06',mediaId:999,token:'hidden'}))})};return worker.fetch(request,env,ctx)}};`,resolveDir:fileURLToPath(new URL('..',import.meta.url))},bundle:true,write:false,format:'esm',platform:'browser'});
 const token='a'.repeat(64);
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:result.outputFiles[0].text,compatibilityDate:'2026-10-01',bindings:{TV_VIEW_TOKEN:token,CONTROLLER_PASSWORD:'b'.repeat(40)}}));
 try{
  assert.equal((await mf.dispatchFetch('https://test.local/device/state')).status,401);
  assert.equal((await mf.dispatchFetch('https://test.local/device/state',{headers:{Authorization:'Bearer '+'c'.repeat(64)}})).status,401);
  const good=await mf.dispatchFetch('https://test.local/device/state',{headers:{Authorization:'Bearer '+token}});
  assert.equal(good.status,200);const state=await good.json();assert.equal(state.artwork.title,'Painting');assert.equal(state.mediaId,undefined);assert.equal(state.token,undefined);assert.equal(state.artwork.secret,undefined);

  assert.equal((await mf.dispatchFetch('https://test.local/device/state',{method:'POST',headers:{Authorization:'Bearer '+token}})).status,405);
  assert.equal((await mf.dispatchFetch('https://test.local/api/display',{method:'POST',headers:{Authorization:'Bearer '+token}})).status,401);
  assert.equal((await mf.dispatchFetch('https://test.local/api/status',{headers:{Authorization:'Bearer '+token}})).status,401);
 }finally{await mf.dispose()}
});
