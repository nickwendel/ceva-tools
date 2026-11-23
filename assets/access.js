/* CEVA tools — shared access by user group.

   Every account (roles/{uid}) is placed in one user group. A group (groups/{id}) sets a level for
   each tool: none, view, edit or full. The built-in Admin group has full access to everything and
   is the only group that can change people and groups.

     view  see the tool
     edit  also change things in it
     full  also delete, and change the tool's settings

   Loading a SAP export writes data for several tools at once, so it follows the level on the
   "data" entry (Data upload), not the level on each tool.

   Accounts that are not in a group yet keep working from their old role (viewer, user, supervisor,
   admin) until an admin places them in a group.

   Keep in step with firestore.rules, which enforces the same levels.

   A page calls CevaAccess.watch(Fs, fs, uid, toolKey, onSnap, onErr) where it used to listen to
   roles/{uid}. onSnap gets an object shaped like that document's snapshot, with `role` replaced by
   the role this person has in this tool (viewer, supervisor or admin; missing when the group has no
   access), plus level, canLoad, noAccess, isAdmin and groupName. */
(function(){
"use strict";
const TOOLS=[
  {key:"dock",name:"Receiving dock board",href:"dock-board/",view:"View the board",edit:"Update trucks and notices",full:"Update trucks and notices, change board settings"},
  {key:"inbound",name:"Inbound exceptions",href:"nci-inbound/",view:"Read issues and the board",edit:"Raise and work issues",full:"Work and delete issues, change settings"},
  {key:"transactions",name:"Warehouse transactions",href:"transactions/",view:"View the dashboard",edit:"View the dashboard",full:"View the dashboard, remove days"},
  {key:"differences",name:"Inventory differences",href:"inventory-differences/",view:"View the differences",edit:"Work the differences",full:"Work differences, remove days, set thresholds"},
  {key:"putaway",name:"Putaway audit",href:"putaway-audit/",view:"View putaways and errors",edit:"Print sheets, enter audit results and close out",full:"Enter audit results, remove days and results"},
  {key:"picking",name:"Picking audit",href:"picking-audit/",view:"View picks and variances",edit:"Print sheets, enter audit results and close out",full:"Enter audit results, remove days and results"},
  {key:"consolidation",name:"HU consolidation",href:"consolidation/",view:"View the locations to consolidate",edit:"Print sheets and set status",full:"Set status, remove the loaded data"},
  {key:"tracker",name:"Inventory action tracker",href:"action-tracker/",view:"View actions and export Excel",edit:"Add and update actions, import Excel",full:"Update, import, delete, set the site name"},
  {key:"training",name:"Training documents",href:"training-docs/",view:"Open and download documents",edit:"Add documents and upload new versions",full:"Add, update, archive, delete, set categories"},
  {key:"rewards",name:"Rewards board",href:"rewards/",view:"View the board",edit:"Log who took part in an activity",full:"Log and remove entries, set the activities, points and names"},
  {key:"data",name:"Data upload",href:"data/",view:"See what is loaded",edit:"Load SAP exports for every tool",full:"Load SAP exports for every tool"}
];
const LEVELS=["none","view","edit","full"];
const LEVEL_LABEL={none:"No access",view:"View",edit:"Edit",full:"Full"};
const ADMIN="admin",ADMIN_NAME="Admin";
const ROLE_LABEL={viewer:"Viewer",user:"User",supervisor:"Supervisor",admin:"Admin"};
const all=l=>{const o={};TOOLS.forEach(t=>o[t.key]=l);return o};
/* Starting groups, written the first time an admin opens the Access page. Admins change them there. */
const DEFAULT_GROUPS=[
  {id:"lenovo",name:"Lenovo",order:1,tools:Object.assign(all("none"),{dock:"view",transactions:"view"})},
  {id:"ceva-white",name:"CEVA White Collar",order:2,tools:all("edit")},
  {id:"ceva-blue",name:"CEVA Blue Collar",order:3,tools:Object.assign(all("none"),{dock:"view",consolidation:"view",training:"view",rewards:"view"})}
];
const NO_ACCESS="Your user group does not have access to this tool. Ask an admin if you need it.";

function legacyLevel(d,key){
  const r=d.role;
  if(key==="training"&&d.company==="partner")return "none";
  return r==="admin"?"full":r==="supervisor"?"edit":r==="user"?(key==="inbound"?"edit":"view"):r==="viewer"?"view":"none";
}
/* d: the roles document (or null). group: that person's groups document (or null). */
function levelOf(d,group,key){
  if(!d)return "none";
  if(d.group===ADMIN)return "full";
  if(d.group){const l=group&&group.tools&&group.tools[key];return LEVELS.includes(l)?l:"none"}
  return legacyLevel(d,key);
}
const hasAccount=d=>!!d&&(!!d.group||!!ROLE_LABEL[d.role]);
const isAdmin=d=>!!d&&(d.group===ADMIN||(!d.group&&d.role==="admin"));
const roleFor=l=>l==="full"?"admin":l==="edit"?"supervisor":l==="view"?"viewer":undefined;
const canDo=(l,need)=>LEVELS.indexOf(l)>=LEVELS.indexOf(need);
function groupLabel(d,group){
  if(!d)return "";
  if(d.group===ADMIN)return ADMIN_NAME;
  if(d.group)return group&&group.name?String(group.name).slice(0,40):"Unknown group";
  return ROLE_LABEL[d.role]?ROLE_LABEL[d.role]+" (no group yet)":"";
}

function watch(Fs,fs,uid,key,onSnap,onErr){
  let rSnap=null,gId="",gUn=null,gData=null,gReady=false,dead=false;
  const stopG=()=>{if(gUn){try{gUn()}catch(_){}}gUn=null;gData=null;gReady=false;gId=""};
  const emit=()=>{
    if(dead||!rSnap)return;
    const raw=rSnap.exists()?(rSnap.data()||{}):null;
    if(raw&&raw.group&&raw.group!==ADMIN&&!gReady)return; // wait for the group document
    const lvl=levelOf(raw,gData,key),dl=levelOf(raw,gData,"data");
    const d=raw?Object.assign({},raw,{role:roleFor(lvl),level:lvl,canLoad:canDo(dl,"edit"),noAccess:hasAccount(raw)&&lvl==="none",
      raw:raw,isAdmin:isAdmin(raw),groupName:groupLabel(raw,gData),group:raw.group||"",groupTools:gData&&gData.tools||null}):null;
    onSnap({exists:()=>!!raw,data:()=>d,metadata:rSnap.metadata||{fromCache:false}});
  };
  const rUn=Fs.onSnapshot(Fs.doc(fs,"roles",uid),{includeMetadataChanges:true},snap=>{
    rSnap=snap;
    const raw=snap.exists()?(snap.data()||{}):null,want=raw&&raw.group&&raw.group!==ADMIN?String(raw.group):"";
    if(want!==gId){
      stopG();gId=want;
      if(want)gUn=Fs.onSnapshot(Fs.doc(fs,"groups",want),g=>{gData=g.exists()?(g.data()||{}):null;gReady=true;emit()},()=>{gData=null;gReady=true;emit()});
    }
    emit();
  },e=>{if(!dead&&onErr)onErr(e)});
  return ()=>{dead=true;stopG();try{rUn()}catch(_){}};
}

window.CevaAccess={TOOLS,LEVELS,LEVEL_LABEL,ADMIN,ADMIN_NAME,ROLE_LABEL,DEFAULT_GROUPS,NO_ACCESS,levelOf,legacyLevel,hasAccount,isAdmin,roleFor,canDo,groupLabel,watch};
})();
