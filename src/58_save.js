/* ═══ Saving and resuming ═══════════════════════════════════════════════════
   One autosave and three manual slots, in this browser's localStorage.

   A save is a snapshot of everything that changes: the hunter (health, kit,
   rites, money, costume), the story (flags, objective, act, notes, choices,
   who was freed, dread), and every sector as it now stands: its grid (the
   fold rewrites walls into flesh), lights, doors, entities and what you've
   seen on the map. The world's code is not saved; it is rebuilt on load and
   the snapshot is laid over it.

   Loading during play goes through a page reload, so the world starts clean
   and nothing from the abandoned run leaks into the restored one. */

const SAVE_V=1, SAVE_KEYS=['auto','quick','1','2','3'];
const saveKey=k=>'oakhaven.save.'+k;
const SKIP_KINDS=new Set(['brother','proj','actor','wrong','flarestuck']);

function canSave(){ return S.running&&!S.cut&&!S.dead&&!S.driving&&S.transition<=0&&!S.pending&&
  S.menu!=='end'&&S.menu!=='term'&&!S.flags.ending; }
function chapterLabel(){ const c=S.chapter; return c?`${c.kicker.split(' · ')[0]}, ${c.title}`:'Act I, Prologue'; }

function seenStr(s){ if(!s.seen) return ''; let o=''; for(let i=0;i<s.seen.length;i++) o+=s.seen[i]?'1':'0'; return o; }
function snapshot(){
  const sectors={};
  for(const [id,s] of Object.entries(SECTORS)){
    sectors[id]={grid:s.grid.map(r=>r.join('')), lights:s.lights, doors:s.doors, name:s.name,
      ambBase:s.ambBase, ambMul:s.ambMul||1, shurleys:!!s.shurleys, seen:seenStr(s),
      entities:s.entities.filter(e=>!SKIP_KINDS.has(e.kind)&&!(e.dead&&e.kind!=='enemy'&&e.kind!=='npc'))};
  }
  return {
    v:SAVE_V, build:BUILD, when:Date.now(), hero:S.hero, chapter:chapterLabel(), place:S.sector.name, playTime:S.playTime||0,
    player:{sector:S.sector.id, x:S.px, y:S.py, a:S.angle},
    comp:COMP?{hidden:!!COMP.hidden}:null,
    S:{costume:S.costume, owned:[...S.owned], ammo:S.ammo, rites:[...S.rites], rite:S.rite, meds:S.meds,
       weapon:S.weapon, lastWeapon:S.lastWeapon, hp:S.hp, armor:S.armor, cash:S.cash, trunk:S.trunk, special:S.special,
       battery:S.battery, torchOn:S.torchOn, enchant:S.enchant, obj:S.obj, flags:S.flags, act:S.act, align:S.align,
       notes:S.notes, caseSeen:S.caseSeen, convoDone:[...S.convoDone], kills:S.kills, freed:S.freed,
       freedNames:S.freedNames||[], girlN:S.girlN||0, girlT:S.girlT, dread:S.dread||0, skyOver:S.skyOver||null,
       chapter:S.chapter||null, stamina:S.stamina, phone:phoneSaveState()},
    sectors,
  };
}
function writeSave(slot){
  if(!canSave()) return false;
  if(slot==='auto'&&saveDamaged('auto')) return false;
  try{ localStorage.setItem(saveKey(slot),JSON.stringify(snapshot())); return true; }
  catch(e){ console.error('save failed',e); return false; }
}
/* Saves are versioned. Older versions are migrated forward; anything that
   can't be read is reported as damaged, never silently dropped, and is never
   overwritten by an autosave. */
const BUILD='1.11.0';
const MIGRATIONS={ /* v0 → v1: nothing needed, the shape is the same */ 0:d=>{ d.v=1; return d; } };
const SAVE_ERR={};
function validSave(d){ return d&&typeof d==='object'&&d.S&&d.sectors&&d.player&&HEROES[d.hero]&&SECTORS[d.player.sector]&&typeof d.S.flags==='object'; }
function readSave(slot){
  let raw=null; try{ raw=localStorage.getItem(saveKey(slot)); }catch(e){ return null; }
  if(!raw){ delete SAVE_ERR[slot]; return null; }
  let d; try{ d=JSON.parse(raw); }catch(e){ SAVE_ERR[slot]='the file is corrupted'; return null; }
  if(typeof d.v!=='number'){ SAVE_ERR[slot]='unknown format'; return null; }
  if(d.v>SAVE_V){ SAVE_ERR[slot]='made by a newer version of the game'; return null; }
  try{ while(d.v<SAVE_V){ const m=MIGRATIONS[d.v]; if(!m) throw 0; d=m(d); } }catch(e){ SAVE_ERR[slot]='too old to upgrade'; return null; }
  if(!validSave(d)){ SAVE_ERR[slot]='parts of it are missing'; return null; }
  delete SAVE_ERR[slot]; return d;
}
function saveDamaged(slot){ readSave(slot); return SAVE_ERR[slot]||null; }
function allSaves(){ return SAVE_KEYS.map(k=>({slot:k,data:readSave(k)})); }
function latestSave(){ return allSaves().filter(s=>s.data).sort((a,b)=>b.data.when-a.data.when)[0]||null; }
function wipeSaves(){ for(const k of SAVE_KEYS) try{ localStorage.removeItem(saveKey(k)); }catch(e){} }

/* ── restoring ─────────────────────────────────────────────────────────── */
function restore(d){
  try{ restoreInner(d); }catch(e){ console.error('restore failed',e); try{ sessionStorage.setItem('oakhaven.loadfail',String(e&&e.message||e)); }catch(_){} location.reload(); }
}
function restoreInner(d){
  audioInit();
  S.hero=d.hero; S.cfg=HEROES[d.hero];
  const s=d.S;
  Object.assign(S,{costume:s.costume, owned:new Set(s.owned), ammo:s.ammo, rites:new Set(s.rites), rite:s.rite, meds:s.meds,
    weapon:s.weapon, lastWeapon:s.lastWeapon, hp:s.hp, armor:s.armor, cash:s.cash, trunk:s.trunk, special:s.special,
    battery:s.battery, torchOn:s.torchOn, enchant:s.enchant, obj:s.obj, flags:s.flags, act:s.act, align:s.align,
    notes:s.notes, caseSeen:s.caseSeen, convoDone:new Set(s.convoDone), kills:s.kills, freed:s.freed,
    freedNames:s.freedNames, girlN:s.girlN, girlT:s.girlT, dread:s.dread, skyOver:s.skyOver, chapter:s.chapter,
    stamina:s.stamina??100, playTime:d.playTime||0, playStart:S.time, actStart:S.time, cardQ:[], card:null, laterQ:[]});
  for(const [id,ss] of Object.entries(d.sectors)){
    const sec=SECTORS[id]; if(!sec) continue;
    sec.grid=ss.grid.map(r=>r.split('')); sec.lights=ss.lights; sec.doors=ss.doors; sec.name=ss.name;
    sec.ambBase=ss.ambBase; sec.ambMul=ss.ambMul; sec.shurleys=ss.shurleys; sec.entities=ss.entities;
    pack(sec);
    if(ss.seen){ sec.seen=new Uint8Array(sec.W*sec.H); for(let i=0;i<ss.seen.length&&i<sec.seen.length;i++) sec.seen[i]=ss.seen.charCodeAt(i)===49?1:0; }
  }
  phoneLoadState(s.phone); reattachHooks();
  rebuildVM(); buildPortrait(); makeCompanion();
  document.getElementById('boot').classList.add('off'); resize();
  applyPreset(S.preset); SKY_DIRTY=true;
  const p=d.player; enterSector(p.sector,p.x,p.y,p.a);
  if(COMP&&d.comp) COMP.hidden=!!d.comp.hidden;
  S.running=true; S.lastSave=S.time;
  toast(`Resumed — ${d.chapter}`);
  say('narr',`${d.chapter}. ${d.place}.`,3.2);
}
/* functions don't survive JSON; put the few that live on entities back */
function reattachHooks(){
  for(const e of SECTORS.hollis.entities) if(e.read) e.onRead=hollisRead;
  reattachEchoes();
}

/* ── autosave ──────────────────────────────────────────────────────────── */
/* Asked for at chapter cards, objectives and doors; written at the next
   quiet moment, never mid-fight, mid-cutscene or while driving. */
function requestAutosave(){ S.autoWanted=true; }
function updateAutosave(dt){
  S.playTime=(S.playTime||0)+dt;
  if(!S.autoWanted||!canSave()||dlg.open||S.menu) return;
  if(S.time-(S.lastAuto??-99)<8) return;
  for(const e of S.sector.entities) if(e.kind==='enemy'&&!e.dead&&e.state==='hunt'&&Math.hypot(e.x-S.px,e.y-S.py)<10) return;
  S.autoWanted=false; S.lastAuto=S.time;
  if(writeSave('auto')) showSaveIcon();
}
function showSaveIcon(){ S.saveIconT=2.2; }
function drawSaveIcon(dt){
  if(!(S.saveIconT>0)) return; S.saveIconT-=dt;
  const W=over.width, H=over.height, u=H/200, a=Math.min(1,S.saveIconT/.6);
  octx.save(); octx.globalAlpha=a;
  txt('saving…',W-8*u,H-56*u,4.6*u,'#d9a441','right');
  octx.restore();
}

/* ── the pause menu ────────────────────────────────────────────────────── */
function ago(t){ const m=Math.round((Date.now()-t)/60000); return m<1?'just now':m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:`${Math.round(m/1440)} d ago`; }
function playClock(sec){ const m=Math.floor(sec/60); return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`; }
function slotLine(slot,d){
  const name=slot==='auto'?'Autosave':slot==='quick'?'Quicksave':`Slot ${slot}`;
  if(!d){ const er=SAVE_ERR[slot]; return er?{text:`${name} — damaged`,note:`Can’t be loaded: ${er}. It won’t be overwritten by autosave.`}:{text:`${name} — empty`,note:''}; }
  return {text:`${name} — ${d.chapter}`, note:`${HEROES[d.hero].name} · ${d.place} · played ${playClock(d.playTime)} · saved ${ago(d.when)}`};
}
function openPause(){
  if(!S.running||S.cut||dlg.open||S.menu) return;
  openMenu('Paused',`${chapterLabel()} · ${S.sector.name} · played ${playClock(S.playTime||0)}`,[
    {text:'Resume'},
    {text:'Save game', note:canSave()?'':'Not right now', act:()=>canSave()?openSaveMenu():(toast('You can’t save right now'),openPause())},
    {text:'Load game', act:()=>openLoadMenu(true)},
    {text:'Controls', act:()=>openControls()},
    {text:'Quit to title', act:()=>confirmBox('Quit to the title?','Anything since your last save will be lost. Your autosave is from '+(readSave('auto')?ago(readSave('auto').when):'never')+'.',()=>location.reload(),openPause)},
  ]);
}
function confirmBox(title,text,yes,no){ openMenu(title,text,[{text:'Yes',act:yes},{text:'No',act:no||null}]); }
function openSaveMenu(){
  openMenu('Save game','Choose a slot. Saving over a slot replaces it.',
    ['1','2','3'].map(k=>{ const d=readSave(k), L=slotLine(k,d);
      return {text:L.text, note:L.note, act:()=>{ const go=()=>{ if(writeSave(k)){ toast(`Saved to slot ${k}`); showSaveIcon(); } else toast('Could not save'); };
        if(d) confirmBox(`Overwrite slot ${k}?`,`${d.chapter} · ${d.place} · saved ${ago(d.when)}`,go,openSaveMenu); else go(); }}; })
    .concat([{text:'Back',act:openPause}]));
}
function openLoadMenu(inGame){
  const list=allSaves();
  openMenu('Load game',list.some(s=>s.data)?'Loading restarts the page and puts you back exactly where the save was made.':'No saves yet. The game autosaves at every chapter and doorway.',
    list.map(({slot,data})=>{ const L=slotLine(slot,data);
      return {text:L.text, note:L.note, act:data?()=>confirmBox('Load this save?',inGame?'Anything since your last save will be lost.':L.note,()=>resumeVia(slot),()=>openLoadMenu(inGame)):()=>openLoadMenu(inGame)}; })
    .concat([{text:'Back',act:inGame?openPause:null}]));
}
/* in play: hand the slot to the next page load, then reload */
function resumeVia(slot){
  try{ sessionStorage.setItem('oakhaven.resume',slot); }catch(e){}
  location.reload();
}
/* lose the mouse mid-play (Esc, alt-tab) and the game pauses itself */
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement) return;
  if(S.running&&!S.cut&&!dlg.open&&!S.menu&&!S.mapOpen&&!S.caseOpen&&!CTRL.open&&!S.dead&&!S.phoneOpen&&!S.camMode&&!S.wheel) openPause();
});

/* ── title screen: Continue and Load ───────────────────────────────────── */
function buildResumeUI(){
  const pk=document.getElementById('pk'); if(!pk||!pk.parentNode) return;
  const saves=allSaves().filter(s=>s.data); if(!saves.length) return;
  const box=document.createElement('div'); box.id='resume';
  const L=latestSave(), d=L.data;
  const c=document.createElement('button'); c.className='cont';
  c.innerHTML=`<b>Continue</b><span>${HEROES[d.hero].name} · ${d.chapter} · ${d.place} · saved ${ago(d.when)}</span>`;
  c.onclick=()=>restore(d); box.appendChild(c);
  const row=document.createElement('div'); row.className='slots';
  for(const {slot,data} of saves){ const b=document.createElement('button'); b.className='slot';
    b.innerHTML=`<b>${slot==='auto'?'Autosave':slot==='quick'?'Quicksave':'Slot '+slot}</b><span>${HEROES[data.hero].name} · ${data.chapter}</span><span>${data.place} · ${ago(data.when)}</span>`;
    b.onclick=()=>restore(data); row.appendChild(b); }
  box.appendChild(row);
  const note=document.createElement('div'); note.className='rnote'; note.textContent='Or start a new game below.'; box.appendChild(note);
  pk.parentNode.insertBefore(box,pk);
}
/* resume a load requested from inside the game */
function bootResume(){
  let slot=null; try{ slot=sessionStorage.getItem('oakhaven.resume'); sessionStorage.removeItem('oakhaven.resume'); }catch(e){}
  if(!slot) return false; const d=readSave(slot); if(!d) return false;
  restore(d); return true;
}
buildResumeUI();
