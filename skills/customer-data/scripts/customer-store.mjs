import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

function fail(message){throw new Error(message)}
function parse(argv){
  const command=argv.shift();
  if(!["search","read","update"].includes(command)) fail("command must be search|read|update");
  const values=new Map();
  for(let i=0;i<argv.length;i++){
    const token=argv[i];
    if(!token.startsWith("--")) fail("unexpected argument: "+token);
    const value=argv[++i]; if(value===undefined) fail("missing value for "+token);
    values.set(token,value);
  }
  const db=values.get("--db"); if(!db) fail("--db is required");
  return {command,db:path.resolve(db),values};
}
function validateStore(doc){
  if(!doc||doc.schema!=="dev.woia.customer-store/v1") fail("unsupported customer store schema");
  if(!Number.isSafeInteger(doc.revision)||doc.revision<1) fail("store revision must be a positive integer");
  if(!Array.isArray(doc.customers)) fail("customers must be an array");
  const ids=new Set();
  for(const c of doc.customers){
    if(!c||typeof c!=="object"||Array.isArray(c)||typeof c.id!=="string"||!c.id) fail("each customer requires string id");
    if(ids.has(c.id)) fail("duplicate customer id: "+c.id); ids.add(c.id);
  }
  return doc;
}
async function load(file){return validateStore(JSON.parse(await readFile(file,"utf8")))}
function fields(value){
  if(!value) return null;
  const list=value.split(",").map(x=>x.trim()).filter(Boolean);
  if(!list.includes("id")) list.unshift("id");
  return [...new Set(list)];
}
function project(record,selected){
  if(!selected) return record;
  return Object.fromEntries(selected.filter(k=>k in record).map(k=>[k,record[k]]));
}
function safePatch(raw){
  const patch=JSON.parse(raw);
  if(!patch||typeof patch!=="object"||Array.isArray(patch)) fail("--patch-json must be a JSON object");
  for(const k of Object.keys(patch)){
    if(["id","__proto__","prototype","constructor"].includes(k)) fail("patch field is forbidden: "+k);
  }
  return patch;
}
async function acquireLock(db){
  const lock=db+".lock";
  let handle;
  try{handle=await open(lock,"wx")}catch(e){if(e.code==="EEXIST") fail("customer store is locked by another writer");throw e}
  return async()=>{await handle.close();await rm(lock,{force:true})};
}

const {command,db,values}=parse(process.argv.slice(2));
if(command==="search"){
  const doc=await load(db);
  const q=(values.get("--query")??"").toLocaleLowerCase();
  const selected=fields(values.get("--fields"));
  const limitRaw=Number(values.get("--limit")??50);
  if(!Number.isSafeInteger(limitRaw)||limitRaw<1||limitRaw>500) fail("--limit must be 1..500");
  const results=doc.customers.filter(c=>!q||JSON.stringify(c).toLocaleLowerCase().includes(q)).slice(0,limitRaw).map(c=>project(c,selected));
  console.log(JSON.stringify({result:"PASS",revision:doc.revision,count:results.length,customers:results},null,2));
}
if(command==="read"){
  const doc=await load(db); const id=values.get("--id"); if(!id) fail("--id is required");
  const record=doc.customers.find(c=>c.id===id);
  if(!record){console.log(JSON.stringify({result:"NOT_FOUND",revision:doc.revision,id},null,2));process.exitCode=3}
  else console.log(JSON.stringify({result:"PASS",revision:doc.revision,customer:project(record,fields(values.get("--fields")))},null,2));
}
if(command==="update"){
  const id=values.get("--id"); if(!id) fail("--id is required");
  const expected=Number(values.get("--expected-revision")); if(!Number.isSafeInteger(expected)||expected<1) fail("--expected-revision must be a positive integer");
  const rawPatch=values.get("--patch-json"); if(!rawPatch) fail("--patch-json is required");
  const patch=safePatch(rawPatch);
  await mkdir(path.dirname(db),{recursive:true});
  const release=await acquireLock(db);
  try{
    const doc=await load(db);
    if(doc.revision!==expected){console.log(JSON.stringify({result:"CONFLICT",expected_revision:expected,actual_revision:doc.revision},null,2));process.exitCode=4}
    else{
      const index=doc.customers.findIndex(c=>c.id===id);
      if(index<0){console.log(JSON.stringify({result:"NOT_FOUND",revision:doc.revision,id},null,2));process.exitCode=3}
      else{
        const before=doc.customers[index];
        const after={...before,...patch,id:before.id};
        doc.customers[index]=after; doc.revision+=1;
        const temp=db+".tmp-"+process.pid+"-"+Date.now();
        await writeFile(temp,JSON.stringify(doc,null,2)+"\n","utf8");
        await rename(temp,db);
        console.log(JSON.stringify({result:"UPDATED",id,previous_revision:expected,revision:doc.revision,changed_fields:Object.keys(patch),before,after},null,2));
      }
    }
  }finally{await release()}
}
