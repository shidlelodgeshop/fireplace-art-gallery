import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { fileURLToPath } from 'node:url';
test('real Workers runtime completes signed upload without forwarding credentials', async () => {
  const compiled = await build({ stdin: { contents: `import {upload} from './worker/ablesign.js'; export default {async fetch(){try{return Response.json(await upload({ABLESIGN_API_KEY:'test-only'},new Uint8Array([1,2,3]),'test.jpg'));}catch(e){return Response.json({error:e.message},{status:500});}}};`, resolveDir: fileURLToPath(new URL('..', import.meta.url)) }, bundle: true, write: false, format: 'esm', platform: 'browser' });
  const requests = [];
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: compiled.outputFiles[0].text, compatibilityDate: '2026-10-01', outboundService: async request => {
    requests.push(new URL(request.url).pathname);
    if (request.url.endsWith('/init_upload')) return Response.json({data:{url:'https://test.s3.eu-west-2.amazonaws.com/image',uploadId:7}});
    if (request.url.endsWith('/finish_upload')) return Response.json({data:{id:9}});
    assert.equal(request.headers.get('authorization'), null);
    assert.equal((await request.arrayBuffer()).byteLength, 3);
    return new Response(null, {status:200});
  } }));
  try { const r=await mf.dispatchFetch('https://test.local/');assert.equal(r.status,200);assert.equal((await r.json()).id,9);assert.equal(requests.length,3); }
  finally { await mf.dispose(); }
});
