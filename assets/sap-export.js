/* One loader for the SAP warehouse task export, shared by every tool that uses it.
   A page calls SapExport.loadAll(...) with the file. The file is read once and every tool's data is saved from it:
     Warehouse transactions   wtdays/{YYYY-MM-DD} (one summary per confirmation date), wt/open (+chunks) for open tasks
     Inventory differences    invdays/{YYYY-MM-DD} (the task lines with a difference, added to what is already there)
     Putaway audit            putdays/{YYYY-MM-DD} (the putaways out of the goods receipt zone, added to what is already there)
     Picking audit            pickdays/{YYYY-MM-DD} (the picks out of a storage bin, added to what is already there)
   So loading the export on any page, or on the Data upload page, updates all of them.
   To feed a new tool from the export, add its parse and save step here and one entry to loadAll's result.
   Needs SheetJS (window.XLSX) loaded first. */
(function(){
const CAT={"stock removal":"Pick","putaway":"Putaway","internal warehouse movement":"Internal move","posting change":"Posting change","goods issue posting":"Goods issue","goods receipt posting":"Goods receipt"};
const TMAP={PICK:"Pick",PTWY:"Putaway",INTL:"Internal move"};
const CHUNK=600000,MAXEXC=300;
const p2=n=>String(n).padStart(2,"0"),nf=n=>Math.round(n).toLocaleString("en-US");
const str=(v,n)=>typeof v==="string"?v.trim().slice(0,n||200):"";
const typ=r=>r.t||(r.t=CAT[String(r[18]||"").toLowerCase().replace(/\s+/g," ").trim()]||TMAP[r[2]]||"Other");
const wallNow=()=>Math.floor(Date.now()/1000)-new Date().getTimezoneOffset()*60;
const mdy=s=>s.replace(/(\d+)-(\d+)-(\d+)/,"$2/$3/$1");
const iso=d=>new Date(d*86400000).toISOString().slice(0,10);
const mdyDay=d=>{if(d==null||d<0||!isFinite(d))return "";return mdy(iso(d))};
const keyOf=r=>[r.t,r.p,r.b].join("|");
const fileName=name=>str(String(name||"").replace(/\.[^.]+$/,""),80);

/* ---------- reading the file ---------- */
function toSec(v){if(v==null||v==="")return -1;if(typeof v==="number")return Math.round((v%1)*86400);const m=String(v).match(/(\d+):(\d+)(?::(\d+))?/);return m?+m[1]*3600+ +m[2]*60+ +(m[3]||0):-1}
function toDay(v){if(v==null||v==="")return -1;if(typeof v==="number")return Math.floor(v-25569)*86400;const d=new Date(v);return isNaN(d)?-1:Math.floor((d.getTime()/1000-d.getTimezoneOffset()*60)/86400)*86400}
function dts(d,t){const a=toDay(d);if(a<0)return -1;return a+Math.max(0,toSec(t))}
function toDayNum(v){if(v==null||v==="")return -1;if(typeof v==="number")return v>20000&&v<80000?Math.floor(v-25569):-1;
  const d=new Date(v);return isNaN(d)?-1:Math.floor((d.getTime()/1000-d.getTimezoneOffset()*60)/86400)}
/* Every tab of the workbook as rows of cells, read once. */
function readSheets(buf){const wb=XLSX.read(buf,{type:"array"});return wb.SheetNames.map(n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:""}))}
const heads=a=>(a[0]||[]).map(x=>String(x).trim());

/* ---------- Warehouse transactions ---------- */
function parseTasks(sheets,name){
  const a=sheets.find(x=>heads(x).includes("Warehouse Task"))||sheets[0]||[];
  const h=heads(a),col=(...n)=>n.find(x=>h.includes(x))||"";
  const qC=col("Act. Qty Dest. BUoM","Act Dest Qty Alt UoM"),sC=col("Src Trgt Qty BUoM","Src Trgt Qty AUoM"),dC=col("Diff. Qty in Alt.Un","Diff. Qty in BUoM"),eC=col("Exception Code");
  const miss=["Warehouse Task","Warehouse Task Status","Confirmed By","Confirmation Date","Confirmation Time","Created On","Created At","Whse Process Type"].filter(n=>!h.includes(n));
  if(!qC)miss.push("Act. Qty Dest. BUoM or Act Dest Qty Alt UoM");if(!col("Activity","Whse Process Category Desc."))miss.push("Activity or Whse Process Category Desc.");
  if(miss.length)throw new Error("This file is missing these columns: "+miss.join(", ")+". Load the SAP warehouse task export.");
  const c=n=>h.indexOf(n),v=(r,n)=>c(n)<0?"":r[c(n)],g=(r,n)=>String(v(r,n)??"").trim();let last=-1,same=0;const rows=[],seen=new Set();
  for(let i=1;i<a.length;i++){const r=a[i];if(g(r,"Warehouse Task")==="")continue;
    const whole=JSON.stringify(r);if(seen.has(whole)){same++;continue}seen.add(whole);const st=g(r,"Warehouse Task Status").toUpperCase(),done=st==="C";
    const cr=dts(v(r,"Created On"),v(r,"Created At")),cf=done?dts(v(r,"Confirmation Date"),v(r,"Confirmation Time")):-1;
    last=Math.max(last,cr,cf);const df=+v(r,dC)||0;
    rows.push([done?toSec(v(r,"Confirmation Time")):-1,g(r,"Confirmed By")||"(blank)",g(r,"Activity"),g(r,"Whse Process Type"),+v(r,qC)||0,eC?g(r,eC):df?(df>0?"+":"")+df:"",
      g(r,"Product"),g(r,"Product Short Description"),g(r,"Source Storage Bin"),g(r,"Destination Bin"),g(r,"Warehouse Order"),g(r,"Warehouse Task"),
      st,cr,g(r,"Queue"),g(r,"Created By"),+v(r,sC)||0,cf,g(r,"Whse Process Category Desc."),g(r,"Wave"),g(r,"Pull header ID")]);
    const one=(x,y)=>x&&!y?"from":y&&!x?"to":"";
    rows[rows.length-1].side=one(g(r,"Source Storage Bin"),g(r,"Destination Bin"))||(g(r,"Source Storage Bin")?"":one(g(r,"Source Handling Unit"),g(r,"Dest. Handling Unit")))}
  if(!rows.length)throw new Error("No warehouse task lines were found in this file.");
  const legs=joinLegs(rows);
  return {file:fileName(name),asOf:last>0?last:wallNow(),excKind:eC?"code":"diff",rows:rows.filter(r=>!r.drop),dup:{same,legs}}}
/* SAP can list one task as two lines, one holding only the source side (bin, handling unit) and one holding only the destination side.
   Lines that match on everything else are joined into one line, so the task is counted once. Returns how many lines were joined away. */
function joinLegs(rows){
  const groups=new Map();let n=0;
  for(const r of rows){const from=r.side==="from";if(!r.side)continue;
    const k=JSON.stringify([r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[10],r[11],r[12],r[13],r[14],r[15],r[16],r[18],r[19],r[20]]);
    let o=groups.get(k);if(!o){o={from:[],to:[]};groups.set(k,o)}(from?o.from:o.to).push(r)}
  for(const o of groups.values())for(const f of o.from){
    const near=t=>!t.drop&&(f[17]<0||t[17]<0?f[17]===t[17]:Math.abs(f[17]-t[17])<=60);
    const t=o.to.find(t=>near(t)&&t[9]===f[8])||o.to.find(near);if(!t)continue;
    if(t[9])f[9]=t[9];if(t[17]>f[17]){f[17]=t[17];f[0]=t[0]}t.drop=true;n++}
  return n}
/* A day keeps a "cube" of counts, one entry per associate, type, process type and hour: [user, type, processType, hour, lines, units].
   The task lines themselves are not stored. */
function buildDays(d){
  const m=new Map();
  for(const r of d.rows){if(r[12]!=="C"||r[17]<0)continue;
    const date=new Date(Math.floor(r[17]/86400)*86400000).toISOString().slice(0,10),sec=Math.max(0,r[0]),t=typ(r),pt=r[3]||"(blank)";
    let o=m.get(date);if(!o){o={cube:new Map(),spans:{},exc:[],n:0,units:0};m.set(date,o)}
    const k=[r[1],t,pt,Math.floor(sec/3600)].join("\t"),c=o.cube.get(k)||[0,0];c[0]++;c[1]+=r[4];o.cube.set(k,c);o.n++;o.units+=r[4];
    const s=o.spans[r[1]]||(o.spans[r[1]]=[sec,sec]);if(sec<s[0])s[0]=sec;if(sec>s[1])s[1]=sec;
    if(r[5]&&o.exc.length<MAXEXC)o.exc.push([sec,r[1],r[5],t,pt,r[6],d.excKind==="diff"?r[16]:r[7],r[4],r[8],r[9],r[11]])}
  return m}
const round3=x=>Math.round(x*1000)/1000;
function dayDoc(date,o,d,ctx){
  const cube=JSON.stringify([...o.cube].map(([k,v])=>{const p=k.split("\t");return [p[0],p[1],p[2],+p[3],v[0],round3(v[1])]}));
  if(cube.length>900000)throw new Error("too-big");
  return {date,n:o.n,units:round3(o.units),cube,spans:JSON.stringify(o.spans),exc:JSON.stringify(o.exc),excKind:d.excKind,file:d.file,by:ctx.uid,byName:ctx.byName,at:Date.now()}}
function chunkRows(rows){const out=[];let cur=[],len=0;for(const r of rows){const s=JSON.stringify(r);if(len+s.length>CHUNK&&cur.length){out.push("["+cur.join(",")+"]");cur=[];len=0}cur.push(s);len+=s.length+1}
  if(cur.length)out.push("["+cur.join(",")+"]");return out}
async function saveTasks(ctx,d,say){
  const {Fs,fs}=ctx,list=[...buildDays(d)].sort((a,b)=>a[0]<b[0]?-1:1),docs=list.map(([date,o])=>dayDoc(date,o,d,ctx));
  for(let i=0;i<docs.length;i+=8){await Promise.all(docs.slice(i,i+8).map(x=>Fs.setDoc(Fs.doc(fs,"wtdays",x.date),x)));if(docs.length>8)say("Saving day "+Math.min(docs.length,i+8)+" of "+docs.length+"…")}
  const ps=await Fs.getDoc(Fs.doc(fs,"wt","open")),prev=ps.exists()?ps.data():null,open=d.rows.filter(r=>r[12]===""||r[12]==="B");let openSaved=false;
  if(!prev||d.asOf>=(+prev.asOf||0)){
    const ver=Date.now().toString(36),parts=chunkRows(open);
    for(let i=0;i<parts.length;i++)await Fs.setDoc(Fs.doc(fs,"wt","open","chunks",ver+"_"+i),{ver,i,rows:parts[i]});
    await Fs.setDoc(Fs.doc(fs,"wt","open"),{ver,chunks:parts.length,count:open.length,asOf:d.asOf,file:d.file,by:ctx.uid,byName:ctx.byName,at:Date.now()});
    if(prev&&prev.ver&&prev.ver!==ver)for(let i=0;i<(prev.chunks||0);i++)Fs.deleteDoc(Fs.doc(fs,"wt","open","chunks",prev.ver+"_"+i)).catch(()=>{});
    openSaved=true}
  return {lines:d.rows.length,dates:docs.map(x=>x.date),openSaved,open:open.length,dup:d.dup}}

/* ---------- Inventory differences ----------
   A difference is a task line whose difference quantity is not zero: positive when less was confirmed than the task asked for
   (short pick), negative when more was confirmed (over pick). */
function parseDiffs(sheets,name){
  const pick=(hh,...n)=>n.find(x=>hh.includes(x))||"";let a=null,h=null;
  for(const x of sheets){const hh=heads(x);if(hh.includes("Warehouse Task")&&pick(hh,"Diff. Qty in Alt.Un","Diff. Qty in BUoM")){a=x;h=hh;break}}
  if(!a){h=heads(sheets[0]||[]);
    const miss=["Warehouse Task","Product","Source Storage Bin","Confirmation Date"].filter(n=>!h.includes(n));if(!pick(h,"Diff. Qty in Alt.Un","Diff. Qty in BUoM"))miss.push("Diff. Qty in Alt.Un");
    throw new Error("This file is missing these columns: "+miss.join(", ")+". Load the SAP warehouse task export.")}
  const dC=pick(h,"Diff. Qty in Alt.Un","Diff. Qty in BUoM"),tC=pick(h,"Src Trgt Qty AUoM","Src Trgt Qty BUoM"),qC=pick(h,"Act Dest Qty Alt UoM","Act. Qty Dest. BUoM");
  const miss=["Product","Source Storage Bin","Confirmation Date"].filter(n=>!h.includes(n));
  if(miss.length)throw new Error("This file is missing these columns: "+miss.join(", ")+". Load the SAP warehouse task export.");
  const c=n=>h.indexOf(n),v=(r,n)=>n&&c(n)>=0?r[c(n)]:"",g=(r,n)=>String(v(r,n)??"").trim();
  const by=new Map();let lines=0,minDay=Infinity,maxDay=-1;
  for(let i=1;i<a.length;i++){const r=a[i];if(g(r,"Warehouse Task")==="")continue;lines++;
    let dt=toDayNum(v(r,"Confirmation Date"));const conf=dt>=0;if(!conf)dt=toDayNum(v(r,"Created On"));
    if(dt>=0){if(dt<minDay)minDay=dt;if(dt>maxDay)maxDay=dt}
    const df=+v(r,dC)||0;if(!df||dt<0)continue;
    const row={t:g(r,"Warehouse Task"),p:g(r,"Product"),b:g(r,"Source Storage Bin")||g(r,"Destination Bin"),tg:+v(r,tC)||0,ac:+v(r,qC)||0,df:Math.round(df*1000)/1000,
      by:g(r,"Confirmed By")||g(r,"Created By"),dt,tm:toSec(v(r,conf?"Confirmation Time":"Created At")),pt:g(r,"Whse Process Type"),cat:g(r,"Whse Process Category Desc.")||g(r,"Activity"),
      aa:g(r,"Activity Area"),wo:g(r,"Warehouse Order"),doc:g(r,"Document"),wv:g(r,"Wave"),ph:g(r,"Pull header ID")};
    const k=keyOf(row);if(!by.has(k))by.set(k,row)}
  if(!lines)throw new Error("No warehouse task lines were found in this file.");
  return {file:fileName(name),rows:[...by.values()],lines,minDay,maxDay}}
/* Loading adds to a day. It never removes a difference that is already there, so the list builds up over time. */
async function saveDiffs(ctx,d,say){
  const {Fs,fs}=ctx,m=new Map();for(const r of d.rows){const k=iso(r.dt);(m.get(k)||m.set(k,[]).get(k)).push(r)}
  const dates=[...m.keys()].sort();let added=0,i=0;
  for(const date of dates){
    const snap=await Fs.getDoc(Fs.doc(fs,"invdays",date));let old=[];if(snap.exists()){try{old=JSON.parse(snap.data().rows||"[]")}catch(_){}}
    const all=new Map(old.map(r=>[keyOf(r),r]));for(const r of m.get(date)){const k=keyOf(r);if(!all.has(k))added++;all.set(k,r)}
    const rows=JSON.stringify([...all.values()]);if(rows.length>900000)throw new Error("too-big");
    await Fs.setDoc(Fs.doc(fs,"invdays",date),{date,n:all.size,rows,file:d.file,by:ctx.uid,byName:ctx.byName,at:Date.now()});
    if(dates.length>3)say("Saving differences, day "+(++i)+" of "+dates.length+"…")}
  return {lines:d.lines,found:d.rows.length,added,days:dates.length,minDay:d.minDay,maxDay:d.maxDay}}

/* ---------- Putaway audit ----------
   A putaway is confirmed stock that left the goods receipt zone (source bin ending in GR-ZONE, such as 9010-GR-ZONE) for another bin.
   SAP often splits one putaway into two tasks in the same warehouse order: a pick-up from the zone with no destination, and a drop into
   the bin with no source. The two are joined so each putaway is one line with its final bin and the associate who confirmed the drop.
   Moves that stay inside the zone, posting changes and open tasks are left out. Takes the result of parseTasks. */
const isGR=b=>/(^|[-_ ])GR-ZONE$/i.test(String(b||"").trim());
const putKey=r=>r.t+"|"+r.p;
function parsePutaways(d){
  const byWO=new Map(),used=new Set(),out=new Map();let minDay=Infinity,maxDay=-1,zone=0;
  for(const r of d.rows)if(r[10]&&!r[8]&&r[9]&&r[12]==="C")(byWO.get(r[10])||byWO.set(r[10],[]).get(r[10])).push(r);
  for(const r of d.rows){
    if(r[12]!=="C"||!isGR(r[8])||typ(r)==="Posting change")continue;zone++;
    let drop=null;
    if(!r[9]&&r[10]){const c=(byWO.get(r[10])||[]).filter(x=>!used.has(x)&&x[6]===r[6]&&x[4]===r[4]);
      drop=c.filter(x=>x[17]>=r[17]).sort((a,b)=>a[17]-b[17])[0]||c[0]||null;if(drop)used.add(drop)}
    const dest=drop?drop[9]:r[9];if(dest&&isGR(dest))continue;
    const e=drop||r,cf=e[17]>=0?e[17]:r[17];if(cf<0)continue;const dt=Math.floor(cf/86400);
    const row={t:r[11],p:r[6],d:r[7]||"",q:Math.round((e[4]||r[4])*1000)/1000,s:r[8],b:dest||"",by:e[1],dt,tm:cf-dt*86400,pt:e[3]||r[3],cat:typ(r),wo:r[10]||""};
    if(drop){row.t2=drop[11];if(r[1]!==e[1])row.by0=r[1]}
    if(dt<minDay)minDay=dt;if(dt>maxDay)maxDay=dt;
    out.set(putKey(row),row)}
  return {file:d.file,rows:[...out.values()],zone,minDay,maxDay}}
/* Loading adds to a day and refreshes the putaways it already holds. Nothing is removed, so audit results keep their line. */
async function savePutaways(ctx,d,say){
  const {Fs,fs}=ctx,m=new Map();for(const r of d.rows){const k=iso(r.dt);(m.get(k)||m.set(k,[]).get(k)).push(r)}
  const dates=[...m.keys()].sort();let added=0,i=0;
  for(const date of dates){
    const snap=await Fs.getDoc(Fs.doc(fs,"putdays",date));let old=[];if(snap.exists()){try{old=JSON.parse(snap.data().rows||"[]")}catch(_){}}
    const all=new Map(old.map(r=>[putKey(r),r]));for(const r of m.get(date)){const k=putKey(r);if(!all.has(k))added++;all.set(k,r)}
    const rows=JSON.stringify([...all.values()]);if(rows.length>900000)throw new Error("too-big");
    await Fs.setDoc(Fs.doc(fs,"putdays",date),{date,n:all.size,rows,file:d.file,by:ctx.uid,byName:ctx.byName,at:Date.now()});
    if(dates.length>3)say("Saving putaways, day "+(++i)+" of "+dates.length+"…")}
  return {found:d.rows.length,added,days:dates.length,minDay:d.minDay,maxDay:d.maxDay}}

/* ---------- Picking audit ----------
   A pick is a confirmed stock removal task out of a storage bin: the line that holds the bin the stock was picked from. SAP lists the
   drop into the goods issue zone as a second task in the same warehouse order with no source bin, and the goods issue posting as a
   third; neither is a pick location, so they are left out. A pick that confirmed a different quantity than the task asked for keeps the
   quantity asked (tg), so short and over picks stand out. Takes the result of parseTasks. */
const isGI=b=>/(^|[-_ ])GI-ZONE$/i.test(String(b||"").trim());
const pickKey=r=>r.t+"|"+r.s;
function parsePicks(d){
  const out=new Map();let minDay=Infinity,maxDay=-1;
  for(const r of d.rows){
    if(r[12]!=="C"||typ(r)!=="Pick"||!r[8]||isGI(r[8])||isGR(r[8])||r[17]<0)continue;
    const dt=Math.floor(r[17]/86400),q=Math.round(r[4]*1000)/1000,tg=Math.round((r[16]||0)*1000)/1000;
    const row={t:r[11],p:r[6],d:r[7]||"",q,s:r[8],b:r[9]||"",by:r[1],dt,tm:r[17]-dt*86400,pt:r[3],wo:r[10]||""};
    if(tg&&tg!==q)row.tg=tg;if(r[19])row.wv=r[19];
    if(dt<minDay)minDay=dt;if(dt>maxDay)maxDay=dt;
    out.set(pickKey(row),row)}
  return {file:d.file,rows:[...out.values()],minDay,maxDay}}
/* Loading adds to a day and refreshes the picks it already holds. Nothing is removed, so audit results keep their line. */
async function savePicks(ctx,d,say){
  const {Fs,fs}=ctx,m=new Map();for(const r of d.rows){const k=iso(r.dt);(m.get(k)||m.set(k,[]).get(k)).push(r)}
  const dates=[...m.keys()].sort();let added=0,i=0;
  for(const date of dates){
    const snap=await Fs.getDoc(Fs.doc(fs,"pickdays",date));let old=[];if(snap.exists()){try{old=JSON.parse(snap.data().rows||"[]")}catch(_){}}
    const all=new Map(old.map(r=>[pickKey(r),r]));for(const r of m.get(date)){const k=pickKey(r);if(!all.has(k))added++;all.set(k,r)}
    const rows=JSON.stringify([...all.values()]);if(rows.length>900000)throw new Error("too-big");
    await Fs.setDoc(Fs.doc(fs,"pickdays",date),{date,n:all.size,rows,file:d.file,by:ctx.uid,byName:ctx.byName,at:Date.now()});
    if(dates.length>3)say("Saving picks, day "+(++i)+" of "+dates.length+"…")}
  return {found:d.rows.length,added,days:dates.length,minDay:d.minDay,maxDay:d.maxDay}}

/* ---------- one load for every tool ----------
   ctx: {Fs, fs, uid, byName}. buf: the file as a Uint8Array. say: called with short progress text.
   Throws when the file is not a warehouse task export. Otherwise returns
     {file, tasks, diffs, putaways, picks}  each one the saved result, {skipped:"why"} or {error:"what went wrong"}. */
function failText(e,what){
  if(e&&e.message==="too-big")return what==="tasks"?"One day in this file has too many task lines to save. Split the export into smaller date ranges and load them one at a time."
    :what==="putaways"?"One day in this file has too many putaways to save. Tell the tool owner."
    :what==="picks"?"One day in this file has too many picks to save. Tell the tool owner."
    :"One day in this file has too many differences to save. Tell the tool owner.";
  return "The file could not be saved"+(e&&e.code==="permission-denied"?" because Firebase refused it. Either your account is not a supervisor or admin, or the latest security rules have not been published yet.":". Check the connection and load it again.")}
async function loadAll(ctx,buf,name,say){
  say=say||(()=>{});const sheets=readSheets(buf),d=parseTasks(sheets,name),out={file:d.file,tasks:null,diffs:null,putaways:null,picks:null};let x=null;
  try{x=parseDiffs(sheets,name)}catch(_){out.diffs={skipped:"This layout of the export has no difference quantity column, so no differences were read from it."}}
  say("Saving "+nf(d.rows.length)+" task lines…");
  try{out.tasks=await saveTasks(ctx,d,say)}catch(e){out.tasks={error:failText(e,"tasks")}}
  if(x){
    if(!x.rows.length)out.diffs={lines:x.lines,found:0,added:0,days:0,minDay:x.minDay,maxDay:x.maxDay};
    else{say("Saving "+nf(x.rows.length)+" differences…");try{out.diffs=await saveDiffs(ctx,x,say)}catch(e){out.diffs={error:failText(e,"diffs")}}}}
  const pw=parsePutaways(d);
  if(!pw.rows.length)out.putaways={found:0,added:0,days:0};
  else{say("Saving "+nf(pw.rows.length)+" putaways…");try{out.putaways=await savePutaways(ctx,pw,say)}catch(e){out.putaways={error:failText(e,"putaways")}}}
  const pk=parsePicks(d);
  if(!pk.rows.length)out.picks={found:0,added:0,days:0};
  else{say("Saving "+nf(pk.rows.length)+" picks…");try{out.picks=await savePicks(ctx,pk,say)}catch(e){out.picks={error:failText(e,"picks")}}}
  return out}
/* What happened, in words, one entry per tool: [{tool, ok, text}]. */
function describe(r){
  const out=[],t=r.tasks,x=r.diffs,w=r.putaways,k=r.picks;
  if(t.error)out.push({tool:"Warehouse transactions",ok:false,text:t.error});
  else{const dup=t.dup.same+t.dup.legs;
    out.push({tool:"Warehouse transactions",ok:true,text:(t.dates.length?"Loaded "+(t.dates.length===1?mdy(t.dates[0]):t.dates.length+" days, "+mdy(t.dates[0])+" to "+mdy(t.dates[t.dates.length-1]))
        +(t.openSaved?", with "+nf(t.open)+" open tasks.":". Open tasks were left as they are because a newer export is already loaded.")
      :"This file has no confirmed task lines."+(t.openSaved?" Open tasks were updated ("+nf(t.open)+").":""))
      +(dup?" "+nf(dup)+" duplicate "+(dup===1?"line was":"lines were")+" removed ("+nf(t.dup.same)+" repeated, "+nf(t.dup.legs)+" second lines of a two-line task).":"")})}
  if(x.error)out.push({tool:"Inventory differences",ok:false,text:x.error});
  else if(x.skipped)out.push({tool:"Inventory differences",ok:true,skipped:true,text:x.skipped});
  else out.push({tool:"Inventory differences",ok:true,text:x.found?"Found "+nf(x.found)+" task "+(x.found===1?"line":"lines")+" with a difference. "+(x.added?nf(x.added)+(x.added===1?" is":" are")+" new to the list.":"All of them were already on the list.")
      :"None of the "+nf(x.lines)+" task lines has a difference, so nothing was added."});
  if(w){if(w.error)out.push({tool:"Putaway audit",ok:false,text:w.error});
    else out.push({tool:"Putaway audit",ok:true,text:w.found?"Found "+nf(w.found)+" "+(w.found===1?"putaway":"putaways")+" out of the GR-ZONE. "+(w.added?nf(w.added)+(w.added===1?" is":" are")+" new to the list.":"All of them were already on the list.")
      :"This file has no confirmed putaways out of the GR-ZONE, so nothing was added."})}
  if(k){if(k.error)out.push({tool:"Picking audit",ok:false,text:k.error});
    else out.push({tool:"Picking audit",ok:true,text:k.found?"Found "+nf(k.found)+" "+(k.found===1?"pick":"picks")+" out of storage bins. "+(k.added?nf(k.added)+(k.added===1?" is":" are")+" new to the list.":"All of them were already on the list.")
      :"This file has no confirmed picks out of a storage bin, so nothing was added."})}
  return out}
const summary=r=>describe(r).map(x=>x.tool+": "+x.text).join(" ");

window.SapExport={loadAll,describe,summary,typ,readSheets,parseTasks,parseDiffs,parsePutaways,parsePicks,mdyDay};
})();
