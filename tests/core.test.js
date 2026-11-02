import test from 'node:test';
import assert from 'node:assert/strict';
import { PhotonImage } from '@cf-wasm/photon';
import { normalize, normalizeQuery, searchAll, detail } from '../src/museums.js';
import { geometry, options, format, jpegDimensions } from '../worker/image.js';
import { authorized, sameOrigin } from '../worker/auth.js';
import { able, upload, playlistBody } from '../worker/ablesign.js';
import worker, { TVController } from '../worker/index.js';
const response = data => Response.json({data});
test('search query normalizes unicode and whitespace and bounds length', () => { assert.equal(normalizeQuery('  Claude\n Monet  '), 'Claude Monet'); assert.equal(normalizeQuery('Ｍonet'), 'Monet'); assert.equal(normalizeQuery('x'.repeat(200)).length,120); });
test('normalizers reject copyrighted artwork, nonpaintings, and absent images', () => {
  assert.equal(normalize('met',{isPublicDomain:false}),null);
  assert.equal(normalize('artic',{is_public_domain:true,image_id:'x',artwork_type_title:'Sculpture'}),null);
  assert.equal(normalize('cleveland',{share_license_status:'CC0',type:'Painting'}),null);
  assert.equal(normalize('artic',{id:1,is_public_domain:true,image_id:'x',artwork_type_title:'Painting',title:'Test'}).artist,'Unknown artist');
});
test('one failing museum does not suppress other results', async()=>{
  const fetcher=async u=> { if(u.includes('metmuseum')) throw new Error('Offline'); if(u.includes('artic')) return response([{id:1,is_public_domain:true,image_id:'x',artwork_type_title:'Painting'}]); return response([]); };
  const r=await searchAll('Monet',1,fetcher);assert.equal(r.artworks.length,1);assert.equal(r.warnings.length,1);
});
test('artwork detail rejects path injection and unknown museums',async()=>{await assert.rejects(detail('met','../secret'));await assert.rejects(detail('other','1'));});
test('fit preserves composition and fill preserves proportions',()=>{assert.deepEqual(geometry(1000,1000,'fit'),{width:1080,height:1080});assert.deepEqual(geometry(1000,1000,'fill'),{width:1920,height:1920});assert.deepEqual(geometry(2000,1000,'fit'),{width:1920,height:960});});
test('settings reject invalid brightness, modes and backgrounds',()=>{for(const x of [{brightness:0},{brightness:200},{brightness:NaN},{mode:'stretch'},{background:'url(https://bad)'}])assert.throws(()=>options(x));});
test('actual JPEG output has TV dimensions, black bars, dimming and no stretch',()=>{
  const input=new PhotonImage(new Uint8Array([200,100,50,255,200,100,50,255,200,100,50,255,200,100,50,255]),2,2);
  const bytes=input.get_bytes_jpeg(100);input.free();
  const output=format(bytes,{mode:'fit',brightness:50,background:'#000000'});assert.deepEqual(jpegDimensions(output),{width:1920,height:1080});
  const image=PhotonImage.new_from_byteslice(output),p=image.get_raw_pixels();
  assert.ok(p[0]<5);const center=(540*1920+960)*4;assert.ok(Math.abs(p[center]-100)<5);assert.ok(Math.abs(p[center+1]-50)<5);image.free();
  assert.throws(()=>format(new Uint8Array([1,2,3]),{}));
});
const env={ACCESS_TEAM_DOMAIN:'test.cloudflareaccess.com',ACCESS_AUD:'aud',OWNER_EMAIL:'owner@example.com'};
test('authorization fails closed for absent, forged, expired or wrong owner credentials',async()=>{
  assert.equal(await authorized(new Request('https://a'),env),false);
  const req=new Request('https://a',{headers:{'Cf-Access-Jwt-Assertion':'test'}});
  assert.equal(await authorized(req,env,async()=>{throw new Error('invalid signature')}),false);
  assert.equal(await authorized(req,env,async()=>({payload:{email:'other@example.com'}})),false);
  assert.equal(await authorized(req,env,async(t,k,o)=>{assert.equal(o.audience,'aud');return {payload:{email:'owner@example.com'}};}),true);
});
test('unconfigured worker cannot reach control or assets',async()=>{let touched=false;const r=await worker.fetch(new Request('https://a/api/display',{method:'POST'}),{ASSETS:{fetch(){touched=true;}}});assert.equal(r.status,401);assert.equal(touched,false);});
test('CSRF requires same origin and JSON',()=>{assert.equal(sameOrigin(new Request('https://a/api/display',{headers:{Origin:'https://evil','Content-Type':'application/json'}})),false);assert.ok(sameOrigin(new Request('https://a/api/display',{headers:{Origin:'https://a','Content-Type':'application/json'}})));});
test('AbleSign errors do not leak upstream secrets and preserve retry interval',async()=>{await assert.rejects(able({ABLESIGN_API_KEY:'private'},'/screens','GET',null,async()=>new Response('secret',{status:429,headers:{'Retry-After':'60'}})),e=>e.status===429&&e.retryAfter==='60'&&!e.message.includes('secret'));});
test('three-step upload never sends credential to storage',async()=>{
 const calls=[];const fetcher=async(u,o)=>{calls.push({u,o});if(u.endsWith('init_upload'))return response({url:'https://bucket.s3.eu-west-2.amazonaws.com/file',uploadId:7});if(u.endsWith('finish_upload'))return response({id:9});return new Response('',{status:200});};
 assert.equal((await upload({ABLESIGN_API_KEY:'private'},new Uint8Array([1,2]),'test.jpg',fetcher)).id,9);
 assert.equal(calls.length,3);assert.equal(calls[1].o.headers.Authorization,undefined);assert.deepEqual(JSON.parse(calls[2].o.body),{uploadId:7});
});
test('playlist has only one artwork, no shuffle or transitions',()=>{const p=playlistBody(12);assert.equal(p.items.length,1);assert.equal(p.items[0].mediafileId,12);assert.equal(p.shufflePlay,false);assert.equal(p.enableImageTransitions,false);});
test('identical selection rechecks remote playlist without reupload',async()=>{
 const real=globalThis.fetch;const data=new Map([['last',{fingerprint:'artic-1-fit-70-#000000',mediaId:9}]]);let calls=0;
 globalThis.fetch=async()=>{calls++;return response({items:[{mediafileId:9}]});};
 try{const c=new TVController({storage:{get:async k=>data.get(k)}},{ABLESIGN_API_KEY:'x',ABLESIGN_SCREEN_ID:'1'});const r=await c.fetch(new Request('https://a/api/display',{method:'POST',body:JSON.stringify({source:'artic',id:'1'})}));assert.equal(r.status,200);assert.equal(calls,1);}finally{globalThis.fetch=real;}
});
