/* Headless harness: stubs just enough DOM and canvas to run the real game code. */
const vm=require('vm'), fs=require('fs');
function ctx2d(){ return {
  createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
  putImageData(){},clearRect(){},fillRect(){},fillText(){},strokeRect(){},drawImage(){},scale(){},
  save(){},restore(){},beginPath(){},rect(){},clip(){},arc(){},stroke(){},fill(){},moveTo(){},lineTo(){},closePath(){},
  createRadialGradient:()=>({addColorStop(){}}), createLinearGradient:()=>({addColorStop(){}}), globalAlpha:1, measureText:t=>({width:String(t).length*6}),
  font:'',textBaseline:'',textAlign:'',fillStyle:'',strokeStyle:'',lineWidth:1,imageSmoothingEnabled:true }; }
function el(id){ const e={id,width:300,height:150,style:{},dataset:{},textContent:'',children:[],_ih:'',
  classList:{_s:new Set(),add(...c){c.forEach(x=>this._s.add(x))},remove(...c){c.forEach(x=>this._s.delete(x))},contains(c){return this._s.has(c)},toggle(c,on){ if(on===undefined) on=!this._s.has(c); on?this._s.add(c):this._s.delete(c); return on; }},
  addEventListener(){},appendChild(c){ if(c&&typeof c==='object') c.parentNode=this; this.children.push(c);this.firstChild=this.children[0];},append(...c){c.forEach(x=>this.appendChild(x));},
  insertBefore(c,ref){ if(c&&typeof c==='object') c.parentNode=this; const i=this.children.indexOf(ref); if(i<0) this.children.push(c); else this.children.splice(i,0,c); this.firstChild=this.children[0]; },
  remove(){ const p=this.parentNode; if(p){ const i=p.children.indexOf(this); if(i>=0) p.children.splice(i,1); p.firstChild=p.children[0]||null; this.parentNode=null; } },
  setAttribute(k,v){this['@'+k]=v;},focus(){},blur(){},requestPointerLock(){},getContext:()=>ctx2d(),
  getBoundingClientRect:()=>({width:1152,height:600}),querySelector:()=>el('q'),querySelectorAll:()=>[],firstChild:null};
  Object.defineProperty(e,'innerHTML',{get(){ return this._ih; },set(v){ this._ih=v; if(v===''){ this.children=[]; this.firstChild=null; } },enumerable:true});
  return e; }
const ELS={};
/* storage survives between load() calls, like a browser profile */
const STORE={}, SESS={};
const mkStore=o=>({getItem:k=>k in o?o[k]:null,setItem:(k,v)=>{o[k]=String(v);},removeItem:k=>{delete o[k];},clear:()=>{for(const k in o) delete o[k];}});
function load(){
  const g={console,Math,Date,JSON,Set,Map,Array,Object,Number,String,Uint8Array,Uint32Array,Int32Array,Float32Array,
    Uint8ClampedArray,Infinity,NaN,isFinite,parseInt,parseFloat,Error,setTimeout:(f)=>0,clearTimeout:()=>{},Proxy};
  g.window=g; g.devicePixelRatio=1; g.localStorage=mkStore(STORE); g.sessionStorage=mkStore(SESS); g.location={reload(){ g.__reloaded=true; }};
  g.document={addEventListener(){},getElementById:id=>ELS[id]||(ELS[id]=el(id)),createElement:()=>el('new'),
    querySelector:()=>el('q'),querySelectorAll:()=>[],body:{},pointerLockElement:null,exitPointerLock(){}};
  g.getComputedStyle=()=>({fontFamily:'monospace'});
  g.addEventListener=()=>{}; g.performance={now:()=>0}; g.requestAnimationFrame=()=>{};
  vm.createContext(g);
  const src=fs.readFileSync(__dirname+'/../index.html','utf8');
  const js=src.match(/<script>([\s\S]*)<\/script>/)[1];
  vm.runInContext(js+`\n;Object.assign(globalThis,{S,SECTORS,LOOKS,COSTUMES,CHAR,charSet,CARS,SPR,PICK_ART,PICKUPS,
    WEAPONS,RITES,SHOP,OBJECTIVES,HEROES,DIALOGUE,CUTSCENES,PIXEL_MODES,RENDERERS,PALETTE,quant,hits,los,lightAt,
    begin,frame,enterSector,setRenderer,applyPreset,playCutscene,skipCutscene,updateCutscene,fire,selectWeapon,
    damageEnt,killEnt,hurtPlayer,special,kick,jump,collect,useMedkit,buy,openShop,closeShop,renderShop,shopPrice,
    carMenu,openTrunk,setCostume,checkObjective,objective,routeDoor,markerHere,markSeen,wakeShades,spawnStreetDemons,
    lookTarget,openDlg,pickChoice,closeDlg,dlg,updateRite,breakRite,learnRite,cycleRite,render,drawHUD,drawFullMap,
    drawViewmodel,gatherDyn,PARTS,mouse,keys,VM_:()=>VM,COMP_:()=>COMP,FB:()=>fb,IW_:()=>IW,IH_:()=>IH,ZB:()=>zbuf,
    MODE_:()=>MODE,updateStory,townTalk,drawCaseFile,drawCard,CONVOS,NOTES,startLockdown,spawnCrowley,kevinEnt,deliaEnt,terminalsRead,SPEAKERS,TOWN_TALK,setPortrait,buildViewmodels,portraitOf,bustOf,hitscan,aimedEnemy,exitCar,enterCar,respawn,SUBQ,say,updateSubs,startAt,chooseEnding,epilogue,readThing,lilyEnt,resolveAlistair,doorRedirect,objIndex,BOOT,beatsText,whisperPool,dreadEffect,townRoll,writeSave,readSave,restore,snapshot,openPause,latestSave,allSaves,bootResume,resumeVia,wipeSaves,canSave,requestAutosave,GALLERY_:()=>GALLERY,PHN,ECHOES,elPhone,openPhone,inputDown,inputUp,CASES,USES,DESTS,startLockdown,wakeShades,carMenu,radio,epilogue,answerCall,ringPhone,saveSettings,saveDamaged,slotLine,openSettings,trustOf,noteView,invQuality,qualityLine,decide,impalaTalk,closeCase,commitTheory,damageEnt,arcOf,arc,together,pendingCar,CAR_:()=>CAR,BEATS,playCar,arcS,gatherers,vigilEnd,vigilCast,pendingReact,overhearPair,BULLETINS,CASE_TXT,TOWN_REACT,OVERHEAR,pendingBeat,inv_,caseDecision,msg,THREADS,INV_UPDATES,later,NAMES,NAME_DEFAULT,nm,applyNames,saveNames,openNames,switchHero,switchBlock,missionLock,hearts,heart,heartOf,trueLove,brotherReach,lures,ENTH,spellRun,startSpell,rescues,thrallCost,freedBy,tg,godRun,vishva,VIS,godEpilogue,proof,FW,fwTown,tzTown,fourthWall,fourthEnd,LFX,GSP,ACTIONS,PRESS,WHEEL_ITEMS,renderChoices,godEnter,showNode,godEnding,elCh_:()=>elCh,elLine_:()=>elLine,elSpk_:()=>elSpk,WEAPON_ORDER,VM_STYLES,setWeaponStyle,cycleWeaponStyle,BLADES,GEAR,gear,giveGear,giveWeapon,fireRing,DIMS,dimDone,enterDim,leaveDim,openTear,DIM_LOOK,BOSS_AI,freeSpot,nearestDry,bellEnd,bellRings,inWater,d1Open,d2Wake,d3Wake,dimFinish,elBoss,PRESS_:()=>PRESS,rebuildVM,SPR});`,g);
  return g;
}
module.exports={load,ELS,STORE,SESS};
