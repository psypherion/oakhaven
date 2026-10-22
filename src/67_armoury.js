/* ═══ The armoury: what you carry, what's in the trunk, what you share ═════
   Weapons and ammunition are physical now.

   CARRYING. Each brother carries six weapons (the journal doesn't count; it
   lives in a pocket) and a limited amount of each kind of ammunition. What
   doesn't fit goes in the Impala's trunk: Earl loads anything over the limit
   into the trunk when you buy it, gifts left for you are left there, and
   anything you pick up past the limit stays where it is.

   THE TRUNK. At the car: stow a weapon, take one out, top up ammunition, or
   open one of the hunter's crates you've earned. The trunk is shared by both
   brothers in single-player; in a two-player campaign each of you has your
   own car, and anything can be handed across.

   YOUR BROTHER. Ammunition and weapons can be handed to your brother (at the
   car, or from the quick wheel when he's standing with you). In single-player
   his kit is real: he shoots with his own rounds, runs dry, and says so. Play
   as him (U) and you have what you gave him.

   EARNED, NOT BOUGHT. The special weapons come from the story:
     demon blade         Crowley, Act II, for the deal at the car
     angel blade         Castiel, when he first finds you
     archangel's blade   the Quiet King, in 2031
     Ring of Severance   the Formless One, in the Inverted Nave
     pitch torch         the mill's boiler room, when the Green Chain is closed
     silvered crossbow   Walter Pike's father's, left in your trunk when the
                         bell case is closed
     deer rifle          Earl, for the inventory case; or Sheriff Ames, Act IV
     Wren's lantern      Amos Wren, in 1951, when the valley is at peace
   Only ordinary guns, ammunition and supplies are for sale. */

Object.assign(WEAPONS,{
  torch:   {name:'Pitch torch', slot:1, kind:'melee', rate:.55, range:1.7, swingT:.3, dmg:{ghost:26, demon:18, eldritch:46}, sfx:'swing', burn:true, light:2.2},
  rifle:   {name:'Deer rifle · scoped', slot:2, kind:'hitscan', rate:1.25, range:40, spread:.0012, pellets:1, ammo:'rifle', dmg:{ghost:12, demon:90, eldritch:24}, sfx:'revolver', kick:2.2, muzzle:null},
  crossbow:{name:'Silvered crossbow', slot:3, kind:'bolt', rate:1.0, range:26, ammo:'bolts', dmg:{ghost:62, demon:46, eldritch:30}, sfx:'throw', kick:.5, pierce:3},
  lantern: {name:'Wren’s lantern', slot:5, kind:'lantern', rate:3.5, range:8, dmg:{ghost:70, demon:8, eldritch:64}, sfx:'riteEnd', light:3.4},
});
const AMMO_NAMES={rounds:'.45 rounds',shells:'Rock-salt shells',flares:'Flares',holywater:'Holy water',bolts:'Silver bolts',rifle:'.30-06 rounds'};
const AMMO_ICON={rounds:'revolver',shells:'shotgun',flares:'flare',holywater:'holywater',bolts:'crossbow',rifle:'rifle'};
const CARRY={weapons:6, ammo:{rounds:48,shells:32,flares:8,holywater:6,bolts:18,rifle:20}};
const NO_CARRY=new Set(['journal']);
const SLOT_GROUPS={1:['crowbar','torch'],2:['revolver','rifle'],3:['shotgun','crossbow'],4:BLADES,5:['holywater','lantern'],6:['flare'],7:['journal'],8:['ring']};
CYCLE_ORDER.splice(0,CYCLE_ORDER.length,'crowbar','torch','revolver','rifle','shotgun','crossbow','knife','angelblade','archangel','holywater','lantern','flare','journal','ring');
for(const [n,g] of Object.entries(SLOT_GROUPS)) PRESS['weapon'+n]=()=>{ const own=g.filter(w=>S.owned.has(w)); if(!own.length) return; const i=own.indexOf(S.weapon); selectWeapon(i<0?own[0]:own[(i+1)%own.length]); };
/* the shop sells ordinary things */
{ const i=SHOP.findIndex(x=>x.id==='knife'); if(i>=0) SHOP.splice(i,1);
  const j=SHOP.findIndex(x=>x.group==='Weapons');
  SHOP.splice(j,0,{id:'bolts',name:'Silver bolts ×6',price:22,desc:'For a crossbow, if you have one',apply:()=>addAmmo('bolts',6,'shop')},
    {id:'rifleRounds',name:'.30-06 rounds ×5',price:26,desc:'For a deer rifle, if you have one',apply:()=>addAmmo('rifle',5,'shop')}); }
/* every kind of ammunition exists from the start */
function ensureAmmo(a){ a=a||S.ammo; for(const k of Object.keys(CARRY.ammo)) if(typeof a[k]!=='number'||!isFinite(a[k])) a[k]=0; return a; }
{ const was=begin; begin=function(h){ const r=was(h); ensureAmmo(); return r; }; }
{ const was=restore; restore=function(d){ const r=was(d); try{ ensureAmmo(); }catch(e){} return r; }; }

/* ── carrying ──────────────────────────────────────────────────────────── */
function stash(){ const I=inv_(); I.stash=I.stash||{weapons:[],ammo:{},crates:0}; ensureAmmo(I.stash.ammo); return I.stash; }
const carriedWeapons=()=>[...S.owned].filter(w=>!NO_CARRY.has(w));
const capOf=a=>CARRY.ammo[a]??999;
function addAmmo(a,n,src){ ensureAmmo(); const room=Math.max(0,capOf(a)-S.ammo[a]), keep=Math.min(room,n), rest=n-keep;
  S.ammo[a]+=keep; if(rest>0){ stash().ammo[a]+=rest; if(src) toast(src==='shop'?`Earl loads ${rest} ${AMMO_NAMES[a].toLowerCase()} into your trunk`:`${rest} ${AMMO_NAMES[a].toLowerCase()} went in the trunk`); }
  return {keep,rest}; }
function addWeapon(w,why){ if(S.owned.has(w)) return 'had';
  if(!NO_CARRY.has(w)&&carriedWeapons().length>=CARRY.weapons){ const st=stash(); if(!st.weapons.includes(w)) st.weapons.push(w);
    toast(`${WEAPONS[w].name}${why?' · '+why:''} — your hands are full, it’s in the trunk`); sfx('pickup'); return 'trunk'; }
  S.owned.add(w); return 'carried'; }
own=function(w){ if(S.owned.has(w)) return; addWeapon(w); };
giveWeapon=function(id,why){ if(S.owned.has(id)||stash().weapons.includes(id)) return; const r=addWeapon(id,why); if(r!=='carried') return;
  sfx('pickup'); toast(`${WEAPONS[id].name}${why?' · '+why:''}`); const g=Object.entries(SLOT_GROUPS).find(([,v])=>v.includes(id));
  if(g&&g[1].length>1) say('narr',`Press ${keyName('weapon'+g[0])} again to change between ${g[1].filter(x=>WEAPONS[x]).map(x=>WEAPONS[x].name.split(' ·')[0].toLowerCase()).join(' and ')}.`,3.6);
  if(id==='ring') say('narr',`${keyName('weapon8')} for the Ring. It cuts every hold in sight, then has to turn a while.`,4); };
/* anything over the limit, from anywhere, ends up in the trunk */
INV_UPDATES.push(()=>{ ensureAmmo(); const st=stash(); let moved=[];
  for(const a of Object.keys(CARRY.ammo)){ const over=S.ammo[a]-capOf(a); if(over>0){ S.ammo[a]-=over; st.ammo[a]+=over; moved.push(`${over} ${AMMO_NAMES[a].toLowerCase()}`); } }
  if(moved.length) toast(`Pockets full — ${moved.join(', ')} to the trunk`); });
/* on the ground: if you can't carry it, it stays there */
{ const was=collect; collect=function(e){ const P=e&&PICKUPS&&PICKUPS[e.pick];
    if(P&&P.ammo){ ensureAmmo(); if(S.ammo[P.ammo]>=capOf(P.ammo)){ if((S.fullT||0)<S.time){ S.fullT=S.time+3; toast(`Can’t carry more ${AMMO_NAMES[P.ammo]?.toLowerCase()||'of that'} — stow some in the trunk`); } return; } }
    if(P&&P.weapon&&!S.owned.has(P.weapon)&&!NO_CARRY.has(P.weapon)&&carriedWeapons().length>=CARRY.weapons){ if((S.fullT||0)<S.time){ S.fullT=S.time+3; toast('Your hands are full — stow a weapon in the trunk first'); } return; }
    return was(e); }; }
/* dry guns pick the next weapon that has ammunition */
autoSwitch=function(){ for(const w of ['shotgun','crossbow','revolver','rifle','flare','holywater','archangel','angelblade','knife','torch','crowbar']){
    const W=WEAPONS[w]; if(S.owned.has(w)&&w!==S.weapon&&(!W.ammo||S.ammo[W.ammo]>0)){ selectWeapon(w); return; } } };

/* ── the new weapons in the hand ───────────────────────────────────────── */
{ const was=fire; fire=function(){ const W=WEAPONS[S.weapon];
    if(!W||S.cool>0||S.switchT>0||S.driving) return was();
    if(W.kind==='bolt'){ ensureAmmo(); if(S.ammo[W.ammo]<=0){ S.cool=.35; sfx('dry'); toast('Out of bolts'); autoSwitch(); return; }
      S.ammo[W.ammo]--; S.cool=W.rate; S.recoil=W.kick; sfx('throw'); S.swing=.12;
      /* a silver bolt goes through what it hits, up to three */
      const hits=[]; for(const e of S.sector.entities){ if(e.kind!=='enemy'||e.dead||e.hidden) continue; const dx=e.x-S.px, dy=e.y-S.py, along=dx*S.dirX+dy*S.dirY;
        if(along<=0||along>W.range) continue; const off=Math.abs(-dx*S.dirY+dy*S.dirX); if(off>(e.r||.3)+.12) continue; if(!los(S.sector,S.px,S.py,e.x,e.y)) continue; hits.push([along,e]); }
      hits.sort((a,b)=>a[0]-b[0]); hits.slice(0,W.pierce).forEach(([,e],i)=>damageEnt(e,dmgFor('crossbow',e)*(i?0.8:1),'crossbow',S.angle));
      if(!hits.length){ const h=hitscan(S.angle,W.range); spawnParts(h.x-S.dirX*.06,h.y-S.dirY*.06,.45,3,PCOL.spark); }
      return; }
    if(W.kind==='lantern'){ S.cool=W.rate; S.swing=.35; S.flash=Math.max(S.flash||0,.55); sfx('riteEnd'); let n=0;
      for(const e of S.sector.entities){ if(e.kind!=='enemy'||e.dead||e.hidden||e.etype==='demon'&&!e.boss&&false) continue; const dx=e.x-S.px, dy=e.y-S.py, d=Math.hypot(dx,dy);
        if(d>W.range||(dx/d)*S.dirX+(dy/d)*S.dirY<.15||!los(S.sector,S.px,S.py,e.x,e.y)) continue;
        damageEnt(e,(W.dmg[e.etype]||10)*(1-d/W.range*.5),'lantern',Math.atan2(dy,dx)); e.stun=Math.max(e.stun||0,e.etype==='demon'?.6:2); n++; }
      if(!n&&(S.lanternSaid||0)<S.time){ S.lanternSaid=S.time+30; say(S.hero,'Nothing in the light. Good.',2.2); }
      return; }
    return was(); }; }
/* fire spreads: the torch sets things burning, husks most of all */
{ const was=damageEnt; damageEnt=function(e,amount,src,ang){ was(e,amount,src,ang); if(src==='torch'&&!e.dead) e.burnT=Math.max(e.burnT||0,e.etype==='eldritch'?4:2.5); }; }
INV_UPDATES.push(dt=>{ for(const e of S.sector.entities){ if(!(e.burnT>0)||e.dead){ continue; } e.burnT-=dt; e.hp-=(e.etype==='eldritch'?10:5)*dt; e.flash=.05;
    if(Math.random()<dt*14) spawnParts(e.x,e.y,.8+Math.random()*.7,1,PCOL.gold||PCOL.spark,{up:1.6}); if(e.hp<=0) killEnt(e,'torch'); }
  /* the lantern keeps the near dark off you */
  if(S.weapon==='lantern') for(const e of S.sector.entities){ if(e.kind!=='enemy'||e.dead||e.hidden) continue; if(e.etype==='ghost'||e.etype==='eldritch'){ const d=Math.hypot(e.x-S.px,e.y-S.py); if(d<3.2){ e.hp-=6*dt; e.stun=Math.max(e.stun||0,.2); if(e.hp<=0) killEnt(e,'lantern'); } } } });
/* held fire is a light */
{ const was=bakeDyn; bakeDyn=function(){ const W=WEAPONS[S.weapon]; if(W&&W.light&&!S.driving&&!S.cut&&DYN.length<8) DYN.push({x:S.px+S.dirX*.4,y:S.py+S.dirY*.4,p:W.light*(.92+Math.random()*.08),f:.22}); return was(); }; }

/* ── the poses: idle, attack (firing, swinging), alt (reloading, running) ─ */
{ const was=drawViewmodel; drawViewmodel=function(){ if(!VM||S.driving||S.cut) return was();
    const id=S.weapon, W=WEAPONS[id]; if(!W) return was();
    let pose=null;
    if(id==='journal'){ if(S.channel>0&&VM['journal@attack']) pose='journal@attack'; }
    else if(S.muzzle>.04||S.swing>0||(W.kind!=='melee'&&W.kind!=='rite'&&S.cool>W.rate-.18)) pose=id+'@attack';
    else if(id==='shotgun'&&S.cool>0&&S.cool<W.rate*.8) pose=id+'@alt';
    else if(held('run')&&S.bobAmp>.55&&!S.crouch) pose=id+'@alt';
    if(!pose||!VM[pose]){ return was(); }
    const key=id==='journal'?(S.channel>0?'journalLit':'journal'):id, keep=VM[key]; VM[key]=VM[pose];
    const m=S.muzzle; if(VM[pose]&&VM_IMG.ready&&S.settings.vmStyle==='painted'&&pose.endsWith('@attack')&&id!=='rifle') S.muzzle=0;
    try{ was(); } finally{ VM[key]=keep; S.muzzle=m; } }; }
/* the rifle's muzzle, found on its own art */
{ const was=buildViewmodels; buildViewmodels=function(l,e){ const V=was(l,e); const f=VM_IMG.ready&&VM_IMG.frames.rifle;
    if(f&&S.settings.vmStyle==='painted'){ let mx=0,my=0; outer: for(let x=0;x<f.w;x++) for(let y=0;y<f.h*.5;y++) if(f.px[y*f.w+x]){ mx=x; my=y; break outer; }
      WEAPONS.rifle.muzzle=[mx*f.scale,my*f.scale]; } else WEAPONS.rifle.muzzle=null;
    for(const k of ['torch','lantern','rifle','crossbow']) if(!V[k]) V[k]=V.crowbar||V.revolver;   /* classic/original fallbacks */
    return V; }; }

/* ── your brother's kit ─────────────────────────────────────────────── */
function brotherKit(){ const I=inv_(); I.kits=I.kits||{}; const b=HEROES[S.hero].brother;
  if(!I.kits[b]){ const st=HEROES[b].start; I.kits[b]={owned:[...st.owned],ammo:{...st.ammo},rites:[...st.rites],rite:st.rites[0],meds:st.meds,
    weapon:st.owned.includes('shotgun')?'shotgun':'revolver',lastWeapon:'crowbar',costume:HEROES[b].defaultCostume,hp:100,armor:0,special:40,stamina:100}; }
  ensureAmmo(I.kits[b].ammo); return I.kits[b]; }
const brotherHere=()=>!!(COMP&&!COMP.hidden&&!S.driving&&Math.hypot(COMP.x-S.px,COMP.y-S.py)<4.5);
/* he shoots with his own rounds, and runs dry */
{ const was=updateCompanion; updateCompanion=function(dt){ if(typeof COOP!=='undefined'&&COOP.on) return was(dt);
    const c=COMP; if(!c||c.hidden) return was(dt); const k=brotherKit();
    if((k.ammo.rounds||0)<=0){ c.cool=Math.max(c.cool,.4); if(c.saw&&!(c.drySaid>S.time)){ c.drySaid=S.time+40; say(HEROES[S.hero].brother,S.hero==='dean'?'I’m dry, Dean. Rounds. Any time you like.':'I’m out. I need rounds. Trunk, or yours.',3); } }
    const before=c.atkT||0; was(dt); if((c.atkT||0)>before+.2) k.ammo.rounds=Math.max(0,(k.ammo.rounds||0)-1); }; }
/* switching brothers swaps kits; nothing travels unless you hand it over */
{ const ix=INV_UPDATES; /* (the 1.7 rule that blades followed you between brothers is gone: hand them over instead) */ }

/* ── the trunk ─────────────────────────────────────────────────────────── */
const elTrunk=(()=>{ const vp=document.getElementById('vp'), d=document.createElement('div'); d.id='trunk'; vp&&vp.appendChild&&vp.appendChild(d); return d; })();
const TK={open:false,atCar:false,msg:''};
function openArmoury(atCar){ if(!S.running||S.cut) return; if(dlg.open) closeDlg(); TK.open=true; TK.atCar=!!atCar; TK.msg='';
  S.menu='trunk'; document.exitPointerLock?.(); clearHeld(); elTrunk.classList.add('on'); sfx('door'); renderArmoury(); }
function closeArmoury(){ TK.open=false; elTrunk.classList.remove('on'); if(S.menu==='trunk') S.menu=null; }
openTrunk=function(){ openArmoury(true); };
const icon=k=>{ const u=VM_IMG.itemURL&&VM_IMG.itemURL[k]; return u?`<img src="${u}" alt="">`:'<i class="noimg"></i>'; };
const coopPartner=()=>typeof COOP!=='undefined'&&COOP.on&&partnerJoined();
function renderArmoury(){ if(!TK.open) return; ensureAmmo(); const st=stash(), car=TK.atCar, bro=!coopPartner()&&(car||brotherHere()), bk=bro?brotherKit():null, coop=coopPartner();
  const bname=coop?partnerName():heroLabel(HEROES[S.hero].brother);
  let h=`<div class="tk-box"><div class="tk-top"><h2>${car?'The trunk':'Your brother'}</h2><small>${car?'Everything you own fits in the back of a car.':'Hand him what he needs.'}</small><button class="opt" data-tkx>Close · Esc</button></div>`;
  if(TK.msg) h+=`<div class="tk-msg">${esc_(TK.msg)}</div>`;
  /* weapons */
  h+=`<h3>Weapons <span>${carriedWeapons().length} of ${CARRY.weapons} carried</span></h3><div class="tk-cols"><div class="tk-col"><h4>On you</h4>`;
  for(const w of CYCLE_ORDER.filter(w=>S.owned.has(w)&&!NO_CARRY.has(w))) h+=`<div class="tk-w">${icon(w)}<b>${esc_(WEAPONS[w].name)}</b>${car?`<button data-stow="${w}">Stow</button>`:''}${bro||coop?`<button data-givew="${w}">Give to ${esc_(bname)}</button>`:''}</div>`;
  h+='</div>';
  if(car){ h+='<div class="tk-col"><h4>In the trunk</h4>'; if(!st.weapons.length) h+='<p class="tk-e">Nothing but jumper cables.</p>';
    for(const w of st.weapons) h+=`<div class="tk-w">${icon(w)}<b>${esc_(WEAPONS[w].name)}</b><button data-take="${w}"${carriedWeapons().length>=CARRY.weapons?' disabled':''}>Take</button></div>`; h+='</div>'; }
  if(bro){ h+=`<div class="tk-col"><h4>${esc_(bname)} carries</h4>`; for(const w of CYCLE_ORDER.filter(w=>bk.owned.includes(w)&&!NO_CARRY.has(w))) h+=`<div class="tk-w">${icon(w)}<b>${esc_(WEAPONS[w].name)}</b><button data-askw="${w}">Ask for it</button></div>`; h+='</div>'; }
  h+='</div>';
  /* ammunition */
  h+=`<h3>Ammunition</h3><div class="tk-ammo"><div class="tk-ar head"><span></span><span>On you</span>${car?'<span>Trunk</span>':''}${bro?`<span>${esc_(bname)}</span>`:coop?`<span>${esc_(bname)}</span>`:''}</div>`;
  for(const a of Object.keys(CARRY.ammo)){ const me=S.ammo[a], tr=st.ammo[a], b=bk?bk.ammo[a]:0; if(!me&&!tr&&!b&&!['rounds','shells'].includes(a)) continue;
    h+=`<div class="tk-ar">${icon(AMMO_ICON[a])}<b>${esc_(AMMO_NAMES[a])}</b><span class="n">${me} <small>/ ${capOf(a)}</small>${car?` <button data-am="stow|${a}"${me?'':' disabled'}>stow</button>`:''}</span>`
      +(car?`<span class="n">${tr} <button data-am="take|${a}"${tr&&me<capOf(a)?'':' disabled'}>take</button></span>`:'')
      +(bro?`<span class="n">${b} <button data-am="give|${a}"${me?'':' disabled'}>give 6</button><button data-am="ask|${a}"${b?'':' disabled'}>ask 6</button></span>`:coop?`<span class="n"><button data-am="cgive|${a}"${me?'':' disabled'}>hand over 6</button></span>`:'')+'</div>'; }
  h+='</div>';
  if(car&&S.trunk>0) h+=`<div class="tk-crate"><b>Hunter’s crate ×${S.trunk}</b><span>Earned for every objective. Rounds, shells, holy water and a field dressing.</span><button data-crate>Open one</button></div>`;
  h+=`<p class="tk-note">You carry up to ${CARRY.weapons} weapons and a limited amount of each ammunition; the journal rides in your pocket. ${car?'The trunk holds everything else.':'Stowing and taking out needs the car.'}</p></div>`;
  elTrunk.innerHTML=h;
  const on=(sel,f)=>(elTrunk.querySelectorAll(sel)||[]).forEach(b=>b.onclick=ev=>{ ev&&ev.stopPropagation&&ev.stopPropagation(); f(b); renderArmoury(); });
  on('[data-tkx]',()=>closeArmoury());
  on('[data-stow]',b=>{ const w=b.dataset.stow; if(!S.owned.has(w)) return; S.owned.delete(w); st.weapons.push(w); if(S.weapon===w){ S.weapon=null; autoSwitch(); if(!S.weapon||!S.owned.has(S.weapon)) S.weapon=[...S.owned][0]; rebuildVM&&rebuildVM(); } sfx('switch'); TK.msg=`${WEAPONS[w].name} is in the trunk.`; });
  on('[data-take]',b=>{ const w=b.dataset.take, i=st.weapons.indexOf(w); if(i<0||carriedWeapons().length>=CARRY.weapons) return; st.weapons.splice(i,1); S.owned.add(w); selectWeapon(w); sfx('pickup'); TK.msg=`You take the ${WEAPONS[w].name.toLowerCase()}.`; });
  on('[data-givew]',b=>{ const w=b.dataset.givew; if(!S.owned.has(w)) return;
    if(coop){ cop({op:'push',path:'shared.gifts',val:{to:partnerSeat(),weapon:w}}); }
    else { if(bk.owned.filter(x=>!NO_CARRY.has(x)).length>=CARRY.weapons){ TK.msg=`${bname}’s hands are full.`; return; } bk.owned.push(w); }
    S.owned.delete(w); if(S.weapon===w){ autoSwitch(); if(!S.owned.has(S.weapon)) S.weapon=[...S.owned][0]; }
    sfx('switch'); TK.msg=`You hand ${bname} the ${WEAPONS[w].name.toLowerCase()}.`; brotherLine('thanks'); });
  on('[data-askw]',b=>{ const w=b.dataset.askw, i=bk.owned.indexOf(w); if(i<0) return; if(carriedWeapons().length>=CARRY.weapons){ TK.msg='Your hands are full. Stow something first.'; return; }
    bk.owned.splice(i,1); S.owned.add(w); if(bk.weapon===w) bk.weapon=bk.owned.find(x=>x!=='journal')||'crowbar'; sfx('pickup'); TK.msg=`${bname} hands you the ${WEAPONS[w].name.toLowerCase()}.`; brotherLine('give'); });
  on('[data-am]',b=>{ const [op,a]=b.dataset.am.split('|');
    if(op==='stow'){ const n=S.ammo[a]; S.ammo[a]=0; st.ammo[a]+=n; TK.msg=`${n} ${AMMO_NAMES[a].toLowerCase()} in the trunk.`; }
    if(op==='take'){ const n=Math.min(st.ammo[a],capOf(a)-S.ammo[a]); st.ammo[a]-=n; S.ammo[a]+=n; TK.msg=`You take ${n} ${AMMO_NAMES[a].toLowerCase()}.`; }
    if(op==='give'){ const n=Math.min(6,S.ammo[a],capOf(a)-bk.ammo[a]); if(n<=0){ TK.msg=`${bname} can’t carry more.`; return; } S.ammo[a]-=n; bk.ammo[a]+=n; TK.msg=`You hand ${bname} ${n} ${AMMO_NAMES[a].toLowerCase()}.`; brotherLine('thanks'); }
    if(op==='ask'){ const n=Math.min(6,bk.ammo[a],capOf(a)-S.ammo[a]); if(n<=0){ TK.msg='You can’t carry more.'; return; } bk.ammo[a]-=n; S.ammo[a]+=n; TK.msg=`${bname} hands you ${n} ${AMMO_NAMES[a].toLowerCase()}.`; brotherLine('give'); }
    if(op==='cgive'){ const n=Math.min(6,S.ammo[a]); if(n<=0) return; S.ammo[a]-=n; cop({op:'push',path:'shared.gifts',val:{to:partnerSeat(),ammo:{[a]:n}}}); TK.msg=`You hand ${bname} ${n} ${AMMO_NAMES[a].toLowerCase()}.`; }
    sfx('switch'); });
  on('[data-crate]',()=>{ if(S.trunk<=0) return; S.trunk--; st.ammo.rounds+=8; st.ammo.shells+=6; st.ammo.holywater+=1; heal(20); sfx('pickup'); TK.msg='Rounds, shells and holy water into the trunk; you put the field dressing to use.'; });
}
function brotherLine(k){ if((TK.said||0)>S.time) return; TK.said=S.time+6; const b=HEROES[S.hero].brother, D=b==='dean';
  const L={thanks:D?['Look at you, sharing.','Thanks. I’ll try not to waste it.']:['Thanks. I’ll make them count.','You sure? Okay. Thanks.'],give:D?['Take it. Bring it back.','Don’t scratch it.']:['Here. Be careful with it.','Take them. I’ll manage.']}[k];
  if(L&&!(typeof COOP!=='undefined'&&COOP.on)) say(b,L[(Math.random()*L.length)|0],2.6); }
{ const was=inputDown; inputDown=function(code,e){ if(TK.open){ if(code==='Escape'||code==='Pad1') closeArmoury(); return; } return was(code,e); }; }
/* the quick wheel: share with your brother when he's with you */
WHEEL_ITEMS.splice(WHEEL_ITEMS.length-1,0,{id:'share',label:'Share with brother',hint:()=>typeof COOP!=='undefined'&&COOP.on?(partnerJoined()?`Hand things to ${partnerName()}`:'No partner yet'):brotherHere()?'He’s right here':'He needs to be next to you',
  act:()=>{ if(typeof COOP!=='undefined'&&COOP.on){ if(partnerJoined()) openArmoury(false); return; } if(brotherHere()) openArmoury(false); else toast('Your brother needs to be next to you'); }});

/* two players: what one hands over, the other receives */
if(typeof LIST_CAP==='object') LIST_CAP['shared.gifts']=400;
if(typeof COOP_SYNC==='object') COOP_SYNC.push(C=>{ const G=(C.shared&&C.shared.gifts)||[], got=myPriv().gifts||{};
  for(const g of G){ if(g.to!==COOP.seat||got['g'+g.v]) continue; cop({op:'set',path:`priv.${COOP.seat}.gifts.g${g.v}`,val:true});
    if(g.weapon&&WEAPONS[g.weapon]){ const r=addWeapon(g.weapon); feedPush({who:nameOfSeat(g.by),text:`handed you the ${WEAPONS[g.weapon].name.toLowerCase()}${r==='trunk'?' (it’s in your trunk)':''}`,kind:'find'}); }
    if(g.ammo) for(const [a,n] of Object.entries(g.ammo)) if(CARRY.ammo[a]&&n>0&&n<=100){ addAmmo(a,n); feedPush({who:nameOfSeat(g.by),text:`handed you ${n} ${AMMO_NAMES[a].toLowerCase()}`,kind:'find'}); } } });

/* ── earned in the story ───────────────────────────────────────────────── */
{ const was=closeCase; closeCase=function(cid,o){ const fresh=!caseClosed(cid); was(cid,o); if(!fresh) return;
    if(cid==='mill') later(4,()=>{ if(S.owned.has('torch')||stash().weapons.includes('torch')) return; say('narr','On the way out, the boiler-room fire is still burning, the way it has since spring. You wrap a rag round a length of pine and take some of it with you.',5,{now:true}); giveWeapon('torch','from the mill boiler room'); });
    if(cid==='bell') later(6,()=>{ const st=stash(); if(S.owned.has('crossbow')||st.weapons.includes('crossbow')) return; st.weapons.push('crossbow'); st.ammo.bolts+=12;
      toast('Walter Pike left something in your trunk'); say('narr','A crossbow wrapped in oilcloth is in the Impala’s trunk, and a note in pencil: “My father’s. He hunted the valley before they flooded it. Silver tips. — W.P.”',6); addNoteRaw('crossbow','Walter Pike’s crossbow','His father’s. Silver-tipped bolts. Left in the trunk after the bell.'); });
    if(cid==='inventory') later(6,()=>{ const st=stash(); if(S.owned.has('rifle')||st.weapons.includes('rifle')) return; st.weapons.push('rifle'); st.ammo.rifle+=10;
      toast('Earl put something in your trunk'); say('narr','Earl’s rifle is in your trunk, with a price tag on the trigger guard that says NOT FOR SALE, crossed out, and under it: FOR YOU.',5); }); }; }
INV_UPDATES.push(()=>{ const F=S.flags, I=inv_();
  if(F.got_sheriff&&!I.gotRifle){ I.gotRifle=true; if(!S.owned.has('rifle')&&!stash().weapons.includes('rifle')){ giveWeapon('rifle','Sheriff Ames’s deer rifle'); addAmmo('rifle',12,'gift'); } }
  if(F.d1_amos_end&&!I.gotLantern){ I.gotLantern=true; later(2,()=>{ say('amos','Take the lantern. It kept the dark off this valley thirty years. It will know what to do with yours.',4.6); giveWeapon('lantern','from Amos Wren'); }); } });

/* ── the HUD: slots are groups ─────────────────────────────────────────── */
function slotInfo(i){ const g=SLOT_GROUPS[i+1]||[WEAPON_ORDER[i]]; return {own:g.some(w=>S.owned.has(w)),sel:g.includes(S.weapon)}; }
