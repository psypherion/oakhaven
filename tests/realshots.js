/* Screenshots with the real overlay: world buffer + HUD/cards/case file. */
const vm=require('vm'), fs=require('fs');
const {createCanvas}=require('/tmp/claude-0/nc/node_modules/@napi-rs/canvas');
const VW=1152, VH=600;
function el(id){ const e={id,style:{},dataset:{},innerHTML:'',textContent:'',children:[],
  classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},contains(c){return this._s.has(c)},toggle(){}},
  addEventListener(){},appendChild(c){this.children.push(c);this.firstChild=this.children[0];},append(...c){c.forEach(x=>this.appendChild(x));},
  setAttribute(){},focus(){},requestPointerLock(){},getBoundingClientRect:()=>({width:VW,height:VH}),
  querySelector:()=>el('q'),querySelectorAll:()=>[],firstChild:null};
  let cv=null; Object.defineProperty(e,'width',{get(){return cv?cv.width:300},set(v){ if(!cv) cv=createCanvas(v,150); else cv.width=v; }});
  Object.defineProperty(e,'height',{get(){return cv?cv.height:150},set(v){ if(!cv) cv=createCanvas(300,v); else cv.height=v; }});
  e.getContext=()=>{ if(!cv) cv=createCanvas(300,150); return cv.getContext('2d'); }; e._cv=()=>cv; e.parentElement=e; return e; }
const ELS={};
const g={console,Math,Date,JSON,Set,Map,Array,Object,Number,String,Uint8Array,Uint32Array,Int32Array,Float32Array,Uint8ClampedArray,Infinity,NaN,isFinite,parseInt,parseFloat,Error};
g.window=g; g.devicePixelRatio=1;
g.document={addEventListener(){},getElementById:id=>ELS[id]||(ELS[id]=el(id)),createElement:(tag)=>tag==='canvas'?createCanvas(300,150):el('new'),querySelector:()=>el('q'),querySelectorAll:()=>[],body:{},pointerLockElement:null,exitPointerLock(){}};
g.getComputedStyle=()=>({fontFamily:'DejaVu Sans Mono, monospace'}); g.addEventListener=()=>{}; g.performance={now:()=>0}; g.requestAnimationFrame=()=>{};
vm.createContext(g);
const js=fs.readFileSync(__dirname+'/../oakhaven.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1];
vm.runInContext(js+`;Object.assign(globalThis,{S,SECTORS,begin,frame,skipCutscene,enterSector,setRenderer,applyPreset,showCard,addNote,startLockdown,
  playCutscene,openDlg,dlg,closeDlg,pickChoice,kevinEnt,deliaEnt,MODE_:()=>MODE});`,g);
const out=process.argv[2]||'/tmp/claude-0/shots'; fs.mkdirSync(out,{recursive:true});
let t=0; const step=n=>{ for(let i=0;i<n;i++){ t+=16; g.frame(t); } };
function snap(name){
  const W=ELS.over._cv(), WD=ELS.world._cv(), m=g.MODE_();
  const c=createCanvas(W.width,W.height), x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  x.drawImage(WD,0,0,W.width,W.height); x.drawImage(W,0,0);
  fs.writeFileSync(`${out}/${name}.png`,c.toBuffer('image/png'));
}
module.exports={g,step,snap};
if(require.main===module){
  g.setRenderer(process.env.R||'modern'); g.applyPreset('dusk'); g.begin('dean'); step(90); snap('r01_intro_card');
  g.skipCutscene(); step(12); snap('r02_hud_street');
  g.S.flags.marla=true; g.S.flags.earl=true; g.S.flags.phantom=true; ['arrive','marla','earl','ray','tear','mill_term'].forEach(g.addNote);
  g.S.flags.ray_named=true; g.S.align={h:5,n:3}; g.S.caseOpen=true; step(2); snap('r03_case_file'); g.S.caseOpen=false;
  g.startLockdown(); step(60*7); snap('r04_lockdown_fog'); g.skipCutscene(); step(60*1.2); snap('r05_act2_card');
  step(60*6); g.enterSector('street',16.6,29.2,-Math.PI/2); step(4); snap('r06_delia');
  g.enterSector('lounge',8,8.4,-Math.PI/2); step(4); snap('r07_lounge');
  g.enterSector('trap',9,12.4,-Math.PI/2-.35); step(4); snap('r08_trap');
  g.S.flags.delia_done=true; g.enterSector('trap',6,7,-Math.PI/2-.9); step(4); snap('r09_kevin');
  g.applyPreset('night'); g.S.torchOn=true; g.enterSector('street',28,34,-Math.PI/2); step(6); snap('r10_act2_night_street');
  console.log('done');
}
