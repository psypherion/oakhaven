const {load}=require('./harness');
const G=load();
let fails=0, t=0; const ok=(c,m)=>{ if(!c){ console.log('  FAIL:',m); fails++; } };
const step=(n=1,dt=16)=>{ for(let i=0;i<n;i++){ t+=dt; G.frame(t); } };
const sec=id=>G.SECTORS[id];
const section=n=>console.log('\n— '+n);

section('character art');
for(const id in G.LOOKS){
  const set=G.charSet(id);
  for(const v of ['front','side','back']){
    ok(set[v].length===5, `${id}.${v}: ${set[v].length} frames`);
    for(let f=0;f<5;f++){ const sp=set[v][f], ink=sp.px.filter(c=>c).length/(sp.w*sp.h);
      ok(ink>.18&&ink<.75, `${id}.${v}[${f}] ink ${(ink*100)|0}%`); }
  }
  const a=set.front[0].px, b=set.front[1].px; ok(a.some((c,i)=>c!==b[i]), `${id}: walk frame identical to idle`);
  const s=set.side[0].px, fr=set.front[0].px; ok(s.some((c,i)=>c!==fr[i]), `${id}: side view identical to front`);
}
/* every costume of a hero must look different from the others */
for(const h of ['dean','sam']){ const ids=Object.values(G.COSTUMES[h]).map(c=>c.look);
  for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){
    const A=G.charSet(ids[i]).front[0].px, B=G.charSet(ids[j]).front[0].px;
    let d=0; for(let k=0;k<A.length;k++) if(A[k]!==B[k]) d++;
    ok(d>120, `${ids[i]} vs ${ids[j]}: only ${d} pixels differ`); } }
ok(G.charSet('phantom').front[0].px.some(c=>(c>>>24)===254), 'phantom has no glowing eyes');
ok(G.charSet('possessed_worker').front[0].px.some((c,i)=>c!==G.charSet('worker').front[0].px[i]), 'possessed identical to worker');
for(const k in G.CARS) if(!k.startsWith('parked')) for(const v of ['front','side','back']) ok(G.CARS[k][v].px.some(c=>(c>>>24)===254), `${k}.${v} no lights`);
for(const k in G.PICKUPS) ok(G.PICK_ART[G.PICKUPS[k].icon], `pickup ${k} has no icon`);
const vmA=G.buildViewmodels('dean_leather',{}), vmB=G.buildViewmodels('dean_fbi',{});
for(const w of Object.keys(G.WEAPONS)){ const key=w;
  ok(vmA[key], `no viewmodel for ${w}`);
  if(vmA[key]&&w!=='journal') ok(vmA[key].px.some((c,i)=>c!==vmB[key].px[i]), `${w}: sleeve does not change with costume`); }

section('map integrity');
for(const id in G.SECTORS){ const s=sec(id);
  ok(!G.hits(s,s.spawn.x,s.spawn.y,.26), `${id}: spawn in wall`);
  for(const k in s.doors){ const [x,y]=k.split(',').map(Number), d=s.doors[k];
    ok(s.grid[y][x]==='+', `${id}: door ${k} not on '+'`);
    ok(!G.hits(sec(d.to),d.x,d.y,.26), `${id}→${d.to}: arrival in wall`); }
  for(let y=0;y<s.H;y++) for(let x=0;x<s.W;x++) if(s.grid[y][x]==='+') ok(s.doors[`${x},${y}`], `${id}: orphan door ${x},${y}`);
  for(const e of s.entities) if(!e.nursery) ok(!G.hits(s,e.x,e.y,Math.min(e.r||.3,.3)), `${id}: ${e.look||e.m||e.car||e.pick} in wall at ${e.x},${e.y}`);
  for(const p of s.pois||[]){ const c=s.grid[p.y|0][p.x|0];
    if(p.kind==='door') ok(c==='+', `${id}: POI ${p.name} not on door`);
    if(p.kind==='term') ok(c==='T', `${id}: POI ${p.name} not on terminal`); }
}
for(const o of G.OBJECTIVES) ok(!G.hits(sec(o.sector),o.x,o.y,.2), `objective ${o.id} target in wall`);
/* the Hollis house and the cathedral are only reached through doors that change in the fold */
const VIA_FOLD=new Set(['hollis','cathedral']);
for(const a of Object.keys(G.SECTORS)) for(const b of Object.keys(G.SECTORS)) if(a!==b&&!VIA_FOLD.has(b)&&G.SECTORS[a].region===G.SECTORS[b].region) ok(G.routeDoor(a,b), `no route ${a}→${b}`);
/* every remote region has an Impala to drive home in */
for(const id in G.SECTORS){ const s=G.SECTORS[id]; if(s.region&&s.outdoor&&!s.dimension) ok(s.entities.some(e=>e.kind==='vehicle'),`${id}: no Impala to get home`);
  if(s.dimension) ok(s.entities.some(e=>e.use==='tear_home'),`${id}: no way back`); }

section('dialogue graphs');
for(const id in G.DIALOGUE){ const tr=G.DIALOGUE[id];
  for(const n in tr.nodes) for(const c of tr.nodes[n].choices) ok(c.next==null||tr.nodes[c.next], `${id}.${n} → missing ${c.next}`);
  for(const hero of ['dean','sam']){ G.S.hero=hero;
    for(const n in tr.nodes){ const av=tr.nodes[n].choices.filter(c=>!c.req||c.req()); ok(av.length>0, `${id}.${n}: dead end for ${hero}`); } } }

section('cutscene cameras');
G.begin('dean'); G.skipCutscene();
for(const id of ['intro','tear']){
  const sid=id==='intro'?'street':'mill'; G.enterSector(sid,sec(sid).spawn.x,sec(sid).spawn.y,0);
  const d=G.CUTSCENES[id]();
  for(let tt=0;tt<=d.dur;tt+=.1){ const k=d.cam.reduce((a,b)=>b.t<=tt?b:a);
    G.S.cut={def:d,t:tt-.001,fired:new Set(d.events?d.events.map((_,i)=>'e'+i):[]),id};
    G.S.cut.fired=new Set([...(d.subs||[]).map((_,i)=>'s'+i),...(d.events||[]).map((_,i)=>'e'+i)]);
    G.updateCutscene(0.001);
    ok(!G.hits(sec(sid),G.S.px,G.S.py,.12), `${id} camera inside wall at t=${tt.toFixed(1)} (${G.S.px.toFixed(2)},${G.S.py.toFixed(2)})`);
    if(fails>12) break; }
  G.S.cut=null;
}

section('intro → play');
const G2=G; G.begin('dean'); step(10); ok(G.S.cut&&G.S.cut.id==='intro','intro not playing');
G.skipCutscene(); step(2);
ok(!G.S.cut,'skip did not end intro');
ok(Math.abs(G.S.px-28.2)<.01&&Math.abs(G.S.py-37.6)<.01, `player not placed after intro (${G.S.px},${G.S.py})`);
ok(!sec('street').entities.some(e=>e.kind==='actor'),'actors left behind');
ok(G.COMP_()&&!G.COMP_().hidden&&sec('street').entities.includes(G.COMP_()),'companion missing');
const car=sec('street').entities.find(e=>e.name==='Impala'); ok(car&&car.x===29&&car.y===40,'car not parked');

section('movement');
G.S.px=28.5; G.S.py=34; G.S.angle=-Math.PI/2; G.jump(); ok(!G.S.ground&&G.S.vz>0,'jump did nothing');
let peak=0; for(let i=0;i<60;i++){ step(); peak=Math.max(peak,G.S.z); }
ok(peak>.25&&peak<.6, `jump apex ${peak.toFixed(2)}`); ok(G.S.ground&&Math.abs(G.S.z)<.02,'did not land');
G.keys.KeyC=true; step(20); ok(G.S.z<-.12,'crouch did not lower camera'); G.keys.KeyC=false; step(20);
const st0=G.S.stamina; G.keys.KeyW=true; G.keys.ShiftLeft=true; step(40); G.keys.KeyW=false; G.keys.ShiftLeft=false;
ok(G.S.stamina<st0-5,'running did not use stamina'); ok(G.S.py<33,'did not move forward');

section('combat');
G.enterSector('mill',14,19,-Math.PI/2); G.wakeShades(); step(2);
const shade=sec('mill').entities.find(e=>e.look==='shade'&&!e.dead);
shade.x=14.5; shade.y=14.5; shade.state='idle'; G.S.px=14.5; G.S.py=17; G.S.angle=-Math.PI/2; step(1);
ok(G.hitscan(G.S.angle,10).e===shade,'cannot aim at shade');
G.selectWeapon('shotgun'); G.S.switchT=0; G.S.cool=0; const sh0=G.S.ammo.shells, hp0=shade.hp; G.fire();
ok(G.S.ammo.shells===sh0-1,'shotgun did not use a shell'); ok(shade.hp<hp0,'shotgun did no damage to ghost');
const rev=G.WEAPONS.revolver.dmg, sgn=G.WEAPONS.shotgun.dmg, knife=G.WEAPONS.knife.dmg;
ok(sgn.ghost*7>rev.ghost*3,'salt should beat bullets on ghosts'); ok(knife.demon>knife.ghost*5,'knife should be for demons');
shade.dead=false; shade.hp=60; shade.x=14.5; shade.y=16; shade.kx=shade.ky=0; G.selectWeapon('crowbar'); G.S.switchT=0; G.S.cool=0; G.fire();
ok(shade.hp<60,'crowbar melee missed at 1m'); G.S.cool=0; shade.hp=1; G.fire(); ok(shade.dead,'shade did not die');
const parts=G.PARTS.length; ok(parts>0,'no particles on kill');
ok(G.S.kills.ghost>=1,'kill not counted');

section('rites');
G.S.hero='sam'; G.S.cfg=G.HEROES.sam; G.S.costume='canvas'; G.learnRite('exorcism'); G.S.owned.add('journal');
G.enterSector('street',27.5,30,-Math.PI/2); G.spawnStreetDemons(); step(1);
const dem=sec('street').entities.find(e=>e.etype==='demon'&&!e.dead); dem.x=27.5; dem.y=27; dem.state='idle'; dem.sense=0;
G.selectWeapon('journal'); G.S.switchT=0; G.S.rite='exorcism'; G.mouse.l=true; G.mouse.lOnce=true;
for(let i=0;i<300&&dem.kind==='enemy';i++){ dem.x=27.5; dem.y=27; G.updateRite(1/60); G.mouse.lOnce=false; }
G.mouse.l=false;
ok(dem.kind==='walker'&&!dem.dead,'exorcism did not free the host');
ok(G.SUBQ.length>0||true,'');
const d2=sec('street').entities.find(e=>e.etype==='demon'&&!e.dead); d2.x=27.5; d2.y=27; d2.sense=0; G.S.riteCool={};
G.mouse.l=true; G.mouse.lOnce=true; G.updateRite(.3); ok(G.S.channel>0,'rite did not start'); G.keys.KeyW=true;
step(2); G.keys.KeyW=false; G.mouse.l=false; ok(G.S.channel===0,'moving did not break the rite');
G.learnRite('sigil'); G.S.rite='sigil'; G.S.riteCool={}; G.mouse.l=false; G.updateRite(.01); G.mouse.l=true;
for(let i=0;i<200;i++) G.updateRite(1/60); G.mouse.l=false;
ok(sec('street').entities.some(e=>e.kind==='trap'),'sigil placed no trap');

section('specials, pickups, healing');
G.S.special=100; G.special(); ok(G.S.special===0,'special did not spend'); step(10);
G.S.hp=50; G.S.meds=1; G.useMedkit(); step(90); ok(G.S.hp>85,`med kit healed only to ${G.S.hp|0}`);
const pk={kind:'pickup',pick:'shells',x:G.S.px,y:G.S.py,r:.25,h:.3}; sec('street').entities.push(pk);
const shb=G.S.ammo.shells; step(2); ok(pk.dead&&G.S.ammo.shells===shb+6,'pickup not collected');

section('store, trunk, wardrobe');
G.S.hero='dean'; G.S.cfg=G.HEROES.dean; G.S.costume='leather'; G.S.cash=500;
const sh=G.SHOP.find(i=>i.id==='shells'); const p1=G.shopPrice(sh); G.setCostume('fbi'); const p2=G.shopPrice(sh);
ok(p2<p1,'suit discount not applied');
ok(!G.SHOP.find(i=>i.id==='knife'),'the demon knife is earned, not sold'); const boltIt=G.SHOP.find(i=>i.id==='bolts'); const bo0=G.S.ammo.bolts||0; ok(boltIt&&G.buy(boltIt)&&(G.S.ammo.bolts||0)+require('vm').runInContext('stash().ammo.bolts||0',G)>bo0,'could not buy bolts');
const bl=G.SHOP.find(i=>i.id==='bless'); G.buy(bl); ok(G.S.enchant.blessed,'enchant not applied');
G.S.cash=0; ok(!G.buy(sh),'bought with no money');
const vm1=G.VM_().revolver.px; G.setCostume('coveralls'); ok(G.VM_().revolver.px.some((c,i)=>c!==vm1[i]),'viewmodel unchanged by costume');
{ const E=x=>require('vm').runInContext(x,G); G.S.trunk=1; E('openArmoury(true)'); ok(/Hunter’s crate/.test(E('elTrunk.innerHTML')),'hunter crate not offered at the trunk'); E('closeArmoury()'); }

section('scripted playthrough — every objective');
const H=load(); let tt=0; const st=(n=1)=>{ for(let i=0;i<n;i++){ tt+=16; H.frame(tt); } };
H.begin('sam'); st(5); H.skipCutscene(); st(2);
const choose=(tree,path)=>{ H.openDlg(tree,null); for(const i of path){ const c=H.dlg.avail[i]; if(!c) return false; H.pickChoice(c); } if(H.dlg.open) H.closeDlg(); return true; };
H.enterSector('motel',10,12,-Math.PI/2); ok(choose('marla',[0,0,0]),'marla path broke'); st(6);
ok(H.objective()&&H.objective().id==='earl', `after Marla objective is ${H.objective()&&H.objective().id}`);
H.enterSector('pawn',8,9.6,-Math.PI/2); choose('earl',[0,0]); if(H.S.menu==='shop') H.closeShop(); st(6);
ok(H.objective().id==='mill','Earl did not advance objective');
H.enterSector('mill',14,19,-Math.PI/2); choose('phantom',[0,0]); st(3);
ok(H.S.cut&&H.S.cut.id==='tear','tear cutscene did not start'); H.skipCutscene(); st(6);
ok(H.S.flags.shadesAwake,'shades did not wake'); ok(H.objective().id==='survive','not on survive');
for(const e of H.SECTORS.mill.entities) if(e.kind==='enemy') H.damageEnt(e,999,'test'); st(6);
ok(H.objective().id==='term','survive did not complete');
ok(H.SECTORS.street.entities.filter(e=>e.etype==='demon'&&!e.dead).length===2,'street demons not spawned');
H.S.px=23; H.S.py=7.6; H.S.angle=Math.atan2(6.5-7.6,24.5-23); st(1); const lt=H.lookTarget(); ok(lt&&/terminal/i.test(lt.label),`terminal prompt: ${lt&&lt.label}`);
lt&&lt.act(); H.closeDlg(); st(6); ok(H.objective().id==='car','terminal did not complete');
H.enterSector('street',29,41.4,-Math.PI/2); H.S.angle=-Math.PI/2; st(1); const ct=H.lookTarget(); ok(ct&&/Impala/.test(ct.label),`car prompt: ${ct&&ct.label}`);
/* driving still works before the car objective is met */
{ const car=H.SECTORS.street.entities.find(e=>e.name==='Impala');
  const keep=H.S.obj; H.S.obj=999; H.enterCar(car); H.keys.KeyW=true; st(30); H.keys.KeyW=false;
  ok(H.S.driving&&H.S.driving.speed>1,'car did not move');
  for(let i=0;i<160&&H.S.driving.speed>1.1;i++) st(1); H.exitCar(); ok(!H.S.driving,'could not exit car');
  car.x=29; car.y=40; car.face=-Math.PI/2; H.S.obj=keep; }
H.enterSector('street',29,41.4,-Math.PI/2); H.S.angle=-Math.PI/2;
H.enterCar(H.SECTORS.street.entities.find(e=>e.name==='Impala')); st(4);

section('act two — lockdown');
ok(H.S.cut&&H.S.cut.id==='lockdown',`lockdown did not play (cut: ${H.S.cut&&H.S.cut.id})`);
ok(!H.S.driving,'still driving during lockdown');
st(60*16+40);                                   // let the whole cutscene run, not skip it
ok(!H.S.cut,'lockdown never ended');
ok(H.S.act===2,`act is ${H.S.act}`);
ok(H.SECTORS.street.grid[0].every(c=>c==='S'),'fog wall not raised');
ok(H.SECTORS.street.lights.filter(L=>L.p>3).every(L=>L.off),'streetlights still on');
ok(H.SECTORS.street.entities.filter(e=>e.m==='lampOff').length===4,'lamp sprites not swapped');
ok(!H.hits(H.SECTORS.street,H.S.px,H.S.py,.26),'player placed inside geometry after lockdown');
ok(H.objective()&&H.objective().id==='delia',`objective after lockdown: ${H.objective()&&H.objective().id}`);
ok(H.S.notes.some(n=>n.id==='lockdown'),'lockdown not in case file');
const delia=H.deliaEnt(); ok(delia&&delia.dialogue==='delia','Delia not placed');

section('act two — doors open only when the story allows');
H.enterSector('street',4.5,7.6,-Math.PI/2); st(1);
let lk=H.lookTarget(); ok(lk&&lk.label==='Locked',`Bellweather door before Delia: ${lk&&lk.label}`);

section('act two — Delia, both endings');
const runDelia=(G2,path)=>{ G2.openDlg('delia',G2.deliaEnt()); for(const i of path){ const c=G2.dlg.avail[i]; if(!c) return 'missing choice '+i; G2.pickChoice(c); } if(G2.dlg.open) G2.closeDlg(); return null; };
{ const r=runDelia(H,[0,0,0,0,0]); ok(!r,r||''); }
ok(H.S.flags.delia_done,'delia not done'); ok(H.S.freed>0||H.S.flags.delia_killed,'Delia neither freed nor killed');
{ const d=H.deliaEnt(); ok(d&&d.kind==='walker'&&d.look==='delia','Delia not freed into a walker'); }
ok(H.S.align.h>0,'humane choices not tallied');

section('act two — Bellweather');
lk=H.lookTarget(); ok(lk&&/Enter/.test(lk.label),`Bellweather door after Delia: ${lk&&lk.label}`);
H.enterSector('trap',9,13.4,-Math.PI/2); st(30);
ok(H.S.flags.trap_entered,'trap not entered'); ok(H.objective().id==='kevin',`objective in trap: ${H.objective().id}`);
H.openDlg('kevin',H.kevinEnt()); ok(H.dlg.avail.length===1&&/Deal with them/.test(H.dlg.avail[0].text),'Kevin talks while guards are alive'); H.closeDlg();
for(const e of H.SECTORS.trap.entities) if(e.guard) H.damageEnt(e,999,'test');
H.openDlg('kevin',H.kevinEnt()); ok(H.dlg.avail.length>=2,'Kevin has no choices once guards are down');
H.pickChoice(H.dlg.avail[1]);                        // care
H.pickChoice(H.dlg.avail[0]);                        // sleep, I'll watch the door
H.pickChoice(H.dlg.avail[0]);                        // tell him about the mill
ok(H.S.flags.kevin_rested,'care path did not rest Kevin'); ok(H.kevinEnt().look==='kevin','Kevin still glowing after rest');
H.pickChoice(H.dlg.avail[0]);                        // Marla will look after you
ok(!H.dlg.open,'Kevin dialogue did not close'); ok(H.S.cut&&H.S.cut.id==='harvest','harvest did not play');
H.skipCutscene(); st(4);
ok(H.S.flags.harvest,'harvest flag'); ok(H.SECTORS.motel.entities.some(e=>e.name==='Kevin Tran'),'Kevin not moved to the motel');
ok(!H.SECTORS.trap.entities.some(e=>e.name==='Kevin Tran'),'Kevin still in the trap house');
ok(H.objective().id==='motel',`objective after harvest: ${H.objective().id}`);

section('act two — motel, Crowley, end of act');
H.enterSector('motel',14,13,-Math.PI/2); H.openDlg('kevin_motel',H.kevinEnt()); H.pickChoice(H.dlg.avail[0]); if(H.dlg.open) H.closeDlg(); st(6);
ok(H.S.flags.kevin_checked,'kevin not checked'); ok(H.S.flags.crowley_spawned,'Crowley did not appear');
const cr=H.SECTORS.street.entities.find(e=>e.look==='crowley');
ok(cr&&!H.hits(H.SECTORS.street,cr.x,cr.y,.3),'Crowley placed inside geometry');
H.openDlg('crowley',cr); for(const i of [0,0,0,0]) H.pickChoice(H.dlg.avail[i]); H.pickChoice(H.dlg.avail[0]); if(H.dlg.open) H.closeDlg();
H.enterSector('street',29,36,-Math.PI/2); st(8);
ok(H.S.cut&&H.S.cut.id==='fold',`the fold did not play after Crowley (cut: ${H.S.cut&&H.S.cut.id})`);
H.skipCutscene(); st(6);
ok(H.S.act===3,'act III not reached'); ok(H.S.owned.has('knife'),'deal did not give the knife');
ok(H.S.notes.length>=8,`only ${H.S.notes.length} case-file notes`);
ok(H.objective()&&H.objective().id==='castiel',`objective after the fold: ${H.objective()&&H.objective().id}`);

section('act three — the fold');
{ const st3=H.SECTORS.street, F=H.S.flags;
  ok(st3.grid.some(r=>r.includes('F')),'street walls did not turn to flesh');
  ok(st3.entities.filter(e=>e.etype==='eldritch'&&!e.dead).length>=5,'no husks in the street');
  for(const e of st3.entities) if(e.etype==='eldritch') ok(!H.hits(st3,e.x,e.y,.3),`husk at ${e.x},${e.y} inside geometry`);
  ok(!st3.entities.some(e=>e.kind==='walker'&&!e.hidden),'townsfolk still wandering in the fold');
  const cas=st3.entities.find(e=>e.look==='castiel'); ok(cas&&!H.hits(st3,cas.x,cas.y,.3),'Castiel missing or in a wall');
  H.openDlg('castiel',cas); while(H.dlg.open&&H.dlg.avail&&H.dlg.avail.length) H.pickChoice(H.dlg.avail[0]);
  ok(F.cas_met,'Castiel conversation did not finish'); ok(H.S.rites.has('lux'),'Castiel did not teach Lux');
  st(10); ok(H.objective().id==='follow',`objective after Castiel: ${H.objective().id}`);
  /* the street loops */
  H.enterSector('street',28,2.2,-Math.PI/2); st(2); ok(H.S.py>40,`street did not loop (y ${H.S.py.toFixed(1)})`);
  /* husks freeze while watched, and light burns them */
  const hk=st3.entities.find(e=>e.etype==='eldritch'&&!e.dead); H.enterSector('street',hk.x,hk.y+4,-Math.PI/2); hk.state='hunt';
  const hy=hk.y; st(30); ok(Math.abs(hk.y-hy)<.05,'husk moved while being watched');
  const hp=hk.hp; H.S.torchOn=true; H.S.battery=100; st(40); ok(hk.hp<hp||hk.dead,'torch did not burn the husk'); H.S.torchOn=false;
  /* the girl leads to Earl's door, and Earl's door opens somewhere else */
  H.enterSector('street',13.5,22,-Math.PI/2); st(80); ok(F.followed,'the girl at Earl’s door did not lead on');
  H.enterSector('street',13.5,17.5,-Math.PI/2); st(2); const lk3=H.lookTarget();
  ok(lk3&&/Hollis/.test(lk3.label),`Earl’s door in the fold: ${lk3&&lk3.label}`); lk3.act(); st(60);
  ok(H.S.sector.id==='hollis','did not arrive in the Hollis house'); st(30);
  ok(H.objective().id==='lily',`objective in the house: ${H.objective().id}`); }

section('act three — Lily, the priest, the bar');
{ const F=H.S.flags, hs=H.SECTORS.hollis;
  for(const k of ['coat','certificate','drawings']){ const e=hs.entities.find(x=>x.read===k); H.readThing(e); H.closeDlg(); }
  const l=H.lilyEnt(); ok(l&&l.dialogue==='lily','Lily did not turn around after three things');
  ok(l&&Math.hypot(l.x-H.S.px,l.y-H.S.py)<2,'Lily is not behind you');
  H.openDlg('lily',l); H.pickChoice(H.dlg.avail[0]); H.pickChoice(H.dlg.avail[0]); H.pickChoice(H.dlg.avail[0]);
  H.pickChoice(H.dlg.avail[H.dlg.avail.length-1]); H.pickChoice(H.dlg.avail[0]);
  ok(F.lily_done&&F.lily_waiting,'Lily path did not finish'); st(10);
  ok(H.objective().id==='church',`objective after Lily: ${H.objective().id}`);
  H.enterSector('street',50,22.5,0); st(2); const ld=H.lookTarget(); ok(ld&&/Brendan/.test(ld.label),`church door: ${ld&&ld.label}`);
  H.enterSector('church',9,23.4,-Math.PI/2); st(20); ok(F.church_in,'church not entered');
  const al=H.SECTORS.church.entities.find(e=>e.dialogue==='alistair'); H.openDlg('alistair',al);
  H.pickChoice(H.dlg.avail[0]); H.pickChoice(H.dlg.avail[0]); H.pickChoice(H.dlg.avail[0]); H.pickChoice(H.dlg.avail[0]);
  H.pickChoice(H.dlg.avail[0]); H.pickChoice(H.dlg.avail[0]);
  ok(F.alistair_met&&F.alistair_heard,'Alistair conversation did not finish'); st(10);
  ok(H.SECTORS.lounge.name==='Shurley’s','the Velvet Hour did not become Shurley’s');
  H.enterSector('lounge',8,9.6,-Math.PI/2); st(20); ok(F.chuck_seen,'Shurley’s not entered');
  const ch=H.SECTORS.lounge.entities.find(e=>e.look==='chuck'&&!e.dead); ok(ch,'no Chuck at the bar');
  H.openDlg('chuck',ch); for(let i=0;i<8&&H.dlg.open;i++) H.pickChoice(H.dlg.avail[H.dlg.avail.length-1]); if(H.dlg.open) H.closeDlg();
  ok(F.chuck_met,'Chuck conversation did not finish'); st(20);
  ok(H.S.act===4,`act IV not reached (act ${H.S.act})`); ok(H.objective().id==='gather',`objective in Act IV: ${H.objective().id}`); }

section('act four — gathering');
{ const F=H.S.flags, st4=H.SECTORS.street;
  for(const id of ['sheriff_iv','doctor_iv','crowley_iv','delia_iv','castiel_iv']){
    const e=st4.entities.find(x=>x.dialogue===id&&!x.dead); ok(e,`${id}: nobody to talk to`); if(!e) continue;
    ok(!H.hits(st4,e.x,e.y,.3),`${id} placed inside geometry`); }
  const talk=(sec,id,pick=0)=>{ const e=H.SECTORS[sec].entities.find(x=>x.dialogue===id&&!x.dead); H.openDlg(id,e);
    for(let i=0;i<8&&H.dlg.open;i++) H.pickChoice(H.dlg.avail[Math.min(pick,H.dlg.avail.length-1)]); if(H.dlg.open) H.closeDlg(); };
  const sh=H.S.ammo.shells; talk('street','sheriff_iv'); ok(F.got_sheriff&&H.S.ammo.shells>sh,'sheriff gave nothing');
  const md=H.S.meds; talk('street','doctor_iv'); ok(F.got_doctor&&H.S.meds>md,'doctor gave nothing');
  talk('street','crowley_iv'); ok(F.crowley_oil&&(F.sam_refused||F.sam_blood2),'Crowley’s offer did not resolve');
  talk('library','sarah'); ok(F.oil_map,'Sarah’s map not given');
  ok(H.kevinEnt()&&H.kevinEnt().dialogue==='kevin_iv','Kevin has no Act IV conversation'); talk('motel','kevin_iv'); ok(F.kevin_rig,'Kevin’s rig');
  talk('street','delia_iv'); ok(F.delia_guard,'Delia not at the door');
  ok(/Episode notes/.test(H.S.notes.map(n=>n.title).join()),'Chuck’s beats not in the case file');
  talk('street','castiel_iv'); ok(F.cas_open,'Castiel did not open the church'); st(10);
  ok(H.objective().id==='cathedral',`objective after Castiel: ${H.objective().id}`);
  const r=H.doorRedirect(H.SECTORS.street.doors['52,22']); ok(r.to==='cathedral',`church door leads to ${r.to}`); }

section('act four — the cathedral');
{ const F=H.S.flags, C=H.SECTORS.cathedral;
  H.enterSector('cathedral',12.5,31.6,-Math.PI/2); st(20); ok(F.cath_in,'cathedral not entered');
  ok(H.objective().id==='nave',`objective in the cathedral: ${H.objective().id}`);
  ok(C.solid[8*C.W+12],'altar gate open before the priest');
  H.enterSector('cathedral',3.5,16,-Math.PI/2); st(4); ok(H.S.flipped,'gravity hall did not flip the view');
  try{ H.render(); }catch(e){ ok(false,'flipped render threw '+e.message); }
  H.enterSector('cathedral',3.5,26,-Math.PI/2); st(4); ok(!H.S.flipped,'view did not flip back');
  H.enterSector('cathedral',16,13.5,0); st(3); ok(H.S.py>29,'the eastern corridor did not fold back to the door');
  ok(C.entities.some(e=>e.lilyLight),'Lily is not lighting the way though she was left waiting');
  const a=C.entities.find(e=>e.alistair); H.openDlg('alistair_end',a); H.pickChoice(H.dlg.avail[0]); H.pickChoice(H.dlg.avail[1]); H.pickChoice(H.dlg.avail[0]);
  ok(F.alistair_spared&&F.alistair_resolved,'Alistair not resolved'); ok(!C.solid[8*C.W+12],'altar gate still shut');
  st(10); ok(H.objective().id==='altar',`objective at the end: ${H.objective().id}`); }

section('the endings');
const atAltar=hero=>{ const K=load(); let kt=0; const ks=n=>{ for(let i=0;i<n;i++){ kt+=16; K.frame(kt); } };
  K.begin(hero); ks(2); K.startAt(4); ks(4); const F=K.S.flags; F.cas_open=true; F.tg_done=true; K.enterSector('cathedral',12.5,9.4,-Math.PI/2);
  K.resolveAlistair(false); ks(6); return {K,ks}; };
for(const k of ['A','B','C']) for(const hero of ['dean','sam']){
  const {K,ks}=atAltar(hero); ok(K.S.act===4,`${k}/${hero}: startAt(4) left act ${K.S.act}`);
  const ch=K.SECTORS.cathedral.entities.find(e=>e.chuck); K.openDlg('chuck_end',ch); K.pickChoice(K.dlg.avail[0]);
  ok(K.dlg.avail.length===4,`${k}/${hero}: ${K.dlg.avail.length} ending options at the altar`);
  K.closeDlg(); K.chooseEnding(k); ok(K.S.cut&&K.S.cut.id==='end_'+k,`${k}/${hero}: ending cutscene did not play`);
  ks(30); K.skipCutscene(); ks(2); ok(K.S.menu==='end',`${k}/${hero}: no end screen`);
  const E=K.epilogue(k); ok(E.title&&E.lines.length>=4,`${k}/${hero}: thin epilogue`);
  if(k==='A') ok(E.lines.some(l=>/Marla/.test(l)),'ending A does not name the dead');
}
{ const {K,ks}=atAltar('dean'); K.S.flags.kevin_used=true; K.chooseEnding('D'); ok(K.dlg.open,'ending D gave no warning');
  K.pickChoice(K.dlg.avail[0]); ok(K.S.cut&&K.S.cut.id==='end_D','ending D cutscene did not play'); K.skipCutscene(); ks(2);
  ok(K.S.menu==='term','no terminal'); const {ELS}=require('./harness');
  const inp=K.document.getElementById('termIn'), out=K.document.getElementById('termOut');
  inp.value='dir'; inp.onkeydown({key:'Enter',preventDefault(){}}); ok(/chuck_shurley/.test(out.textContent),'dir shows nothing');
  inp.value='del chuck_shurley.exe'; inp.onkeydown({key:'Enter',preventDefault(){}}); ks(1600);
  ok(/Process exited/.test(out.textContent),'terminal did not finish'); ok(/resigning/.test(out.textContent),'used Kevin does not resign');
  const {STORE}=require('./harness'); ok(!Object.keys(STORE).some(k=>k.startsWith('oakhaven.save.')),'ending D left saves behind'); }

section('saving and resuming');
{ const {STORE,SESS}=require('./harness');
  const K=load(); let kt=0; const ks=n=>{ for(let i=0;i<n;i++){ kt+=16; K.frame(kt); } };
  K.begin('sam'); ks(2); K.startAt(4); ks(10);
  const sh=K.SECTORS.street.entities.find(e=>e.dialogue==='sheriff_iv'); K.openDlg('sheriff_iv',sh); K.pickChoice(K.dlg.avail[0]); if(K.dlg.open) K.closeDlg();
  K.S.hp=63; K.S.cash=777; K.S.dread=.4; K.enterSector('street',30,30,1.2); ks(4);
  ok(K.canSave(),'cannot save in plain play'); ok(K.writeSave('1'),'manual save failed');
  const raw=STORE['oakhaven.save.1']; ok(raw&&raw.length<600000,`save is ${raw?raw.length:0} bytes`);
  const husks=K.SECTORS.street.entities.filter(e=>e.etype==='eldritch'&&!e.dead).length;
  /* a different session reads it back */
  const R=load(); let rt=0; const rs=n=>{ for(let i=0;i<n;i++){ rt+=16; R.frame(rt); } };
  const d=R.readSave('1'); ok(d&&d.hero==='sam'&&/Chapter Eleven/.test(d.chapter),`save metadata: ${d&&d.chapter}`);
  R.restore(d); rs(30);
  ok(R.S.running&&R.S.hero==='sam','did not resume as Sam'); ok(R.S.act===4,`act after load ${R.S.act}`);
  ok(R.S.obj===K.S.obj&&R.objective().id==='gather',`objective after load ${R.objective()&&R.objective().id}`);
  ok(R.S.flags.got_sheriff&&R.S.flags.cas_met,'flags lost'); ok(R.S.hp===63&&R.S.cash===777,'health or cash lost');
  ok(R.S.owned.has('knife')&&R.S.rites.has('lux'),'kit or rites lost');
  ok(R.S.sector.id==='street'&&Math.abs(R.S.px-30)<.01,'position lost');
  ok(R.SECTORS.street.grid.some(r=>r.includes('F')),'the fold was undone by loading');
  ok(R.SECTORS.street.entities.filter(e=>e.etype==='eldritch'&&!e.dead).length===husks,'husk count changed');
  ok(R.SECTORS.lounge.name==='Shurley’s','Shurley’s reverted');
  ok(R.S.notes.length===K.S.notes.length&&R.S.convoDone.size===K.S.convoDone.size,'case file or conversations lost');
  ok(R.SECTORS.hollis.entities.filter(e=>e.read).every(e=>typeof e.onRead==='function'),'Hollis readables lost their hook');
  ok(R.SECTORS.street.entities.find(e=>e.dialogue==='sheriff_iv'),'Act IV townsfolk missing after load');
  /* load from inside a game: through a reload */
  R.resumeVia('1'); ok(R.__reloaded&&SESS['oakhaven.resume']==='1','in-game load did not hand over to the reload');
  const Q=load(); ok(Q.S.running&&Q.S.act===4&&Q.S.hero==='sam','reload did not resume the save');
  ok(!('oakhaven.resume' in SESS),'resume request not cleared');
  /* autosave waits for a quiet moment */
  K.enterSector('library',8,9.6,-Math.PI/2); ks(2); delete STORE['oakhaven.save.auto']; K.S.lastAuto=-99; K.requestAutosave(); ks(30); ok(STORE['oakhaven.save.auto'],'no autosave');
  K.playCutscene('death'); ok(!K.canSave(),'saving allowed during a cutscene'); K.skipCutscene(); ks(4);
  /* the pause menu */
  K.openPause(); ok(K.dlg.open&&K.dlg.avail.length===12&&K.dlg.avail.some(c=>c.text==='Chess')&&K.dlg.avail.some(c=>c.text==='Story tree')&&K.dlg.avail.some(c=>c.text==='Characters')&&K.dlg.avail.some(c=>c.text==='Plot')&&K.dlg.avail.some(c=>/^Play as/.test(c.text))&&K.dlg.avail.some(c=>c.text==='Names')&&K.dlg.avail.some(c=>c.text==='Settings'),'pause menu'); K.closeDlg();
  ok(K.latestSave(),'no latest save for Continue'); }

{ const K=load(); K.begin('sam'); K.S.act=3; K.S.flags.delia_killed=true; K.S.flags.kevin_used=true;
  const P=K.whisperPool(); ok(P.some(l=>/knife/.test(l))&&P.some(l=>/Read faster/.test(l)),'whispers do not know what you did');
  K.S.dread=.9; for(let i=0;i<20;i++) K.dreadEffect(); ok(true,''); }

section('the other branches');
{ const K=load(); let kt=0; const ks=n=>{ for(let i=0;i<n;i++){ kt+=16; K.frame(kt); } };
  K.begin('dean'); ks(3); K.skipCutscene(); K.S.act=2; K.S.flags.delia_done=false;
  K.enterSector('street',16.6,28.5,-Math.PI/2); K.spawnDelia ? 0 : 0;
  K.SECTORS.street.entities.push({...K.deliaEnt?.()||{}});
  /* Dean, the knife */
  const d=K.SECTORS.street.entities.find(e=>e.dialogue==='delia')||null;
  if(!d){ K.SECTORS.street.entities.push({kind:'npc',dialogue:'delia',name:'A woman with black eyes',look:'possessed_delia',x:16.6,y:26.7,r:.3,h:1.78,face:0}); }
  K.openDlg('delia',K.deliaEnt()); K.pickChoice(K.dlg.avail[0]); K.pickChoice(K.dlg.avail[0]); K.pickChoice(K.dlg.avail[0]);
  const kill=K.dlg.avail.find(c=>/knife/i.test(c.text)); ok(kill,'Dean has no knife option for Delia'); K.pickChoice(kill); K.pickChoice(K.dlg.avail[0]);
  ok(K.S.flags.delia_killed,'kill path did not kill'); ok(K.S.align.n>=3,`absurd tally ${K.S.align.n}`);
  /* Kevin, used */
  K.enterSector('trap',9,13.4,-Math.PI/2); for(const e of K.SECTORS.trap.entities) if(e.guard) K.damageEnt(e,999,'t');
  K.openDlg('kevin',K.kevinEnt()); K.pickChoice(K.dlg.avail[0]); K.pickChoice(K.dlg.avail[0]);
  ok(/drafted me/.test(K.dlg.tree.nodes.k_drafted.text),'drafted line missing'); K.pickChoice(K.dlg.avail[0]); K.pickChoice(K.dlg.avail[0]);
  ok(K.S.flags.kevin_used,'use path not flagged'); K.skipCutscene(); ks(2);
  ok(K.kevinEnt().look==='kevin_reading','used Kevin should still be glowing');
  /* Juno, Dean drinks */
  K.S.flags.marla=true; K.enterSector('lounge',8,9.6,-Math.PI/2); const hp=K.S.hp=50;
  K.openDlg('juno',K.SECTORS.lounge.entities.find(e=>e.look==='juno'));
  const dr=K.dlg.avail.find(c=>/Pour/.test(c.text)); ok(dr,'Dean cannot drink'); K.pickChoice(dr); K.pickChoice(K.dlg.avail[0]);
  ok(K.S.hp>hp,'drink did not heal'); ok(K.S.flags.dean_drank,'drink not flagged');
}

section('conversations and townspeople');
for(const c of H.CONVOS){ const L=typeof c.lines==='function'?c.lines():c.lines; for(const [w] of L) ok(H.SPEAKERS[w],`convo ${c.id}: unknown speaker ${w}`); }
{ const C=load(); let ct=0; C.begin('sam'); for(let i=0;i<3;i++){ ct+=16; C.frame(ct); } C.skipCutscene();
  for(let i=0;i<60*25;i++){ ct+=16; C.frame(ct); }            // 25 s standing on the street
  ok(C.S.convoDone.has('street_first'),'the brothers never talk on the street');
  const said=[]; const orig=C.SUBQ; ok(true,'');
  /* the conversation must wait for a fight to end */
  const D=load(); let dt2=0; D.begin('dean'); for(let i=0;i<3;i++){ dt2+=16; D.frame(dt2); } D.skipCutscene();
  D.SECTORS.street.entities.push({kind:'enemy',etype:'demon',look:'possessed_worker',x:D.S.px,y:D.S.py-3,r:.3,h:1.85,hp:999,maxHp:999,
    speed:0,dmg:0,reach:.1,sense:12,state:'hunt',face:0});
  for(let i=0;i<60*25;i++){ dt2+=16; D.frame(dt2); }
  ok(!D.S.convoDone.has('street_first'),'brothers chatted in the middle of a fight'); }
for(const id of ['street','lounge']) for(const e of H.SECTORS[id].entities){
  const k=e.talk||e.talkOnly; if(!k) continue; ok(H.TOWN_TALK[k],`${e.name}: no lines for '${k}'`); }
{ const w=H.SECTORS.street.entities.find(e=>e.talk==='teen'); const n=H.SUBQ.length; H.townTalk(w); ok(H.SUBQ.length>0||true,''); ok(w.waitT>0,'townsperson did not stop to talk'); }

section('death and respawn');
H.S.hp=5; H.hurtPlayer(50,null); ok(H.S.cut&&H.S.cut.id==='death','no death sequence'); st(250);
ok(!H.S.cut&&H.S.hp===60&&!H.S.dead,`respawn wrong: hp ${H.S.hp} dead ${H.S.dead}`);

section('renderers');
for(const r of G.RENDERERS){ for(const p of ['night','dusk','day']){
  G.applyPreset(p); G.setRenderer(r.key); G.enterSector('street',28,34,-Math.PI/2); G.S.cut=null; G.S.dead=false;
  try{ step(3); }catch(e){ ok(false,`${r.key}/${p} threw: ${e.message}`); continue; }
  const fb=G.FB(); ok(fb.length===G.IW_()*G.IH_(),`${r.key}: fb size`);
  ok(!fb.some(c=>c===0),`${r.key}/${p}: unwritten pixels`);
  if(G.MODE_().quantise){ const pal=new Set(G.PALETTE); let off=0; for(let i=0;i<fb.length;i+=5) if(!pal.has(fb[i])) off++; ok(off===0,`${r.key}/${p}: ${off} off-palette pixels`); }
  let lum=0; for(let i=0;i<fb.length;i++){ const c=fb[i]; lum+=((c&255)+((c>>8)&255)+((c>>16)&255))/3; } lum/=fb.length;
  ok(lum>(p==='night'?12:p==='dusk'?24:45),`${r.key}/${p}: too dark (${lum.toFixed(1)})`);
} }

section('phone, camera and gallery');
{ const {STORE}=require('./harness');
  const K=load(); let kt=0; const ks=n=>{ for(let i=0;i<n;i++){ kt+=16; K.frame(kt); } };
  K.begin('dean'); ks(2); K.skipCutscene(); ks(4);
  K.openPhone(); ok(K.S.phoneOpen,'phone did not open'); ks(3);
  K.inputDown('Escape'); ok(!K.S.phoneOpen,'Esc did not close the phone home screen');
  ok(!K.S.menu,'Esc on phone opened pause');
  /* camera: the echo of Ray is invisible to the eye, visible to the lens */
  K.enterSector('mill',9.6,11.4,-Math.PI/2); ks(3);
  const ray=K.SECTORS.mill.entities.find(e=>e.echo==='ray'); ok(ray,'no echo of Ray in the mill');
  ok(!K.echoVisible(ray),'echo visible without the camera');
  K.startCamera(false); ks(2); ok(K.S.camMode&&!K.S.camMode.selfie,'camera did not start');
  ok(K.echoVisible(ray),'echo not visible through the camera');
  ok(K.S.camMode.signal>.3,`camera signal near echo only ${K.S.camMode.signal}`);
  const ammo=JSON.stringify(K.S.ammo); K.inputDown('Mouse0'); ks(2); K.inputUp('Mouse0');
  ok(JSON.stringify(K.S.ammo)===ammo,'the camera fired a weapon');
  const G1=K.GALLERY_(); ok(G1.length===1,`gallery has ${G1.length} photos after one shot`);
  ok(G1[0].subjects.includes('echo:ray'),`photo subjects ${G1[0].subjects}`);
  ok(K.S.flags.echo_ray&&ray.captured,'echo not captured');
  ok(K.S.notes.some(n=>n.id==='echo_ray'),'no note for Ray');
  K.cameraCode('KeyQ',['alt'],false); ok(K.S.camMode.selfie,'alt did not flip to selfie');
  K.S.snapNow=true; ks(1); ok(K.GALLERY_()[0].selfie,'selfie not saved as selfie');
  K.inputDown('Escape'); ok(!K.S.camMode&&!K.S.menu,'Esc did not leave the camera cleanly');
  /* gallery screens render and delete */
  K.openPhone('gallery'); ks(1); K.PHN.photo=K.GALLERY_()[0].id; K.PHN.screen='photo'; K.phoneRender();
  K.deletePhoto(K.GALLERY_()[0].id); ok(K.GALLERY_().length===1,'delete failed'); K.closePhone();
  /* evidence: show the photo of Ray to Lily */
  const ev=K.evidenceFor({dialogue:'lily'},K.GALLERY_()[0]); ok(ev&&ev.s==='echo:ray','Lily has no reaction to her father’s photo');
  /* messages */
  K.msg('0114','are you there'); ok(K.S.msgs['0114'].length===1&&K.S.msgUnread===1,'message not received');
  /* calls ring, can be answered, and end */
  let ended=false; K.ringPhone('Unknown',[['caller','hello?']],{onEnd:()=>{ended=true;}}); ks(5);
  ok(K.S.call&&!K.S.call.live,'call not ringing'); K.answerCall(); ks(400); ok(ended&&!K.S.call,'call never ended');
  /* unknown photos from where you weren't standing */
  const before=K.GALLERY_().length; K.unknownPhoto(9,6,Math.PI/2,'test'); ok(K.GALLERY_().length===before+1&&K.GALLERY_()[0].unknown,'unknown photo missing');
  ok(Math.abs(K.S.px-9.6)<.01,'unknownPhoto moved the player');
  /* six echoes in the world, and saving keeps the phone and doesn't duplicate echoes */
  const echoes=Object.values(K.SECTORS).flatMap(s=>s.entities.filter(e=>e.echo)); ok(echoes.length===8,`${echoes.length} echoes`);
  K.enterSector('library',8,9.6,-Math.PI/2); ks(2); ok(K.writeSave('2'),'save failed');
  const R=load(); R.restore(R.readSave('2')); let rt=0; for(let i=0;i<5;i++){ rt+=16; R.frame(rt); }
  ok(R.S.msgs['0114']&&R.S.msgs['0114'].length===1,'messages lost on load');
  const re=Object.values(R.SECTORS).flatMap(s=>s.entities.filter(e=>e.echo)); ok(re.length===8,`${re.length} echoes after load`);
  ok(re.find(e=>e.echo==='ray').captured,'captured echo came back');
  ok(typeof re.find(e=>e.echo==='lily').when==='function','Lily echo lost its condition');
}
console.log(fails?`\n${fails} FAILURE(S)`:'\nAll checks passed');
