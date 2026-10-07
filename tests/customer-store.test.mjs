import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const script=path.resolve('skills/customer-data/scripts/customer-store.mjs');
async function scenario(fn){const dir=await mkdtemp(path.join(os.tmpdir(),'w3-customer-'));try{const db=path.join(dir,'store.json');await writeFile(db,JSON.stringify({schema:'dev.woia.customer-store/v1',revision:1,customers:[{id:'customer:1',name:'Synthetic',private_note:'restricted'}]}));await fn(db);}finally{await rm(dir,{recursive:true,force:true});}}
function run(db,...args){const r=spawnSync(process.execPath,[script,...args,'--db',db],{encoding:'utf8'});return {...r,data:r.stdout.trim()?JSON.parse(r.stdout):null};}
test('read/search projection returns stable ID and minimum requested fields',()=>scenario(async db=>{const r=run(db,'search','--fields','name');assert.equal(r.status,0);assert.deepEqual(r.data.customers,[{id:'customer:1',name:'Synthetic'}]);assert.equal(run(db,'read','--id','customer:1','--fields','name').data.customer.private_note,undefined);}));
test('missing customer remains NOT_FOUND without creating identity',()=>scenario(async db=>{const before=await readFile(db,'utf8');const r=run(db,'read','--id','missing');assert.equal(r.status,3);assert.equal(r.data.result,'NOT_FOUND');assert.equal(await readFile(db,'utf8'),before);}));
test('stale revision refuses mutation',()=>scenario(async db=>{const before=await readFile(db,'utf8');const r=run(db,'update','--id','customer:1','--expected-revision','2','--patch-json','{"name":"wrong"}');assert.equal(r.status,4);assert.equal(r.data.result,'CONFLICT');assert.equal(await readFile(db,'utf8'),before);}));
test('bounded update retains ID and increments revision',()=>scenario(async db=>{const r=run(db,'update','--id','customer:1','--expected-revision','1','--patch-json','{"name":"Corrected"}');assert.equal(r.status,0);assert.equal(r.data.after.id,'customer:1');assert.equal(r.data.revision,2);}));
for(const key of ['id','__proto__','constructor','prototype'])test(`forbidden patch ${key} does not mutate`,()=>scenario(async db=>{const before=await readFile(db,'utf8');const r=run(db,'update','--id','customer:1','--expected-revision','1','--patch-json',`{"${key}":"forbidden"}`);assert.notEqual(r.status,0);assert.match(r.stderr,/forbidden/);assert.equal(await readFile(db,'utf8'),before);}));
test('held writer lock refuses second writer',()=>scenario(async db=>{await writeFile(db+'.lock','synthetic holder');const before=await readFile(db,'utf8');const r=run(db,'update','--id','customer:1','--expected-revision','1','--patch-json','{"name":"wrong"}');assert.notEqual(r.status,0);assert.match(r.stderr,/locked/);assert.equal(await readFile(db,'utf8'),before);}));
test('unsupported delete/create command remains unavailable',()=>scenario(async db=>{for(const action of ['delete','create','merge'])assert.notEqual(run(db,action).status,0);}));
