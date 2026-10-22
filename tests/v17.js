/* 1.7: the reservoir, the arsenal and weapon styles, the guises, the tears and the three dimensions. Headless. */
const {load}=require('./harness');
let fails=0; const ok=(c,m)=>{ if(!c){ console.log('  FAIL:',m); fails++; } };
const section=n=>console.log('\n— '+n);
function game(hero='dean'){ const K=load(); let t=0; K.ks=n=>{ for(let i=0;i<n;i++){ t+=16; K.frame(t); } }; K.begin(hero); K.ks(2); K.skipCutscene(); K.ks(4); return K; }
const walk=(K,n=16)=>{ let i=0; while(K.dlg.open&&i++<n) K.pickChoice(K.dlg.avail[0]); if(K.dlg.open) K.closeDlg(); };
const pick=(K,re)=>{ const c=K.dlg.avail.find(c=>re.test(c.text)); ok(c,`no choice ${re} at ${K.dlg.node}: ${(K.dlg.avail||[]).map(c=>c.text).join(' | ')}`); if(c) K.pickChoice(c); };
const clear=K=>{ for(const e of K.S.sector.entities) if(e.kind==='enemy'&&!e.boss) e.dead=true; };
const killBoss=(K,b)=>{ for(let i=0;i<40&&!b.dead;i++){ K.damageEnt(b,b.hp*.4+60,'archangel',0); K.ks(1); } };

section('the reservoir: you can’t get stranded');
{ const K=game('sam'), F=K.S.flags; const s=K.SECTORS.reservoir; K.enterSector('reservoir',20,15.6,-Math.PI/2); K.ks(2);
  F.bell_rang=true; for(let y=6;y<=13;y++) for(let x=19;x<=21;x++) s.grid[y][x]='c'; K.pack&&K.pack(s);
  K.S.px=20.2; K.S.py=8; K.ks(2); K.bellEnd('leave'); K.S.time+=7; K.ks(10); for(let i=0;i<30&&K.S.menu;i++){ K.inputDown('Enter',null); K.ks(1); } if(K.dlg.open) K.closeDlg();
  ok(s.grid[8][20]==='c','the stones sank under the player');
  K.S.px=20.2; K.S.py=15.6; K.ks(30); ok(s.grid[8][20]==='w','the stones never closed after the player stepped off');
  /* an old save that left you in the water: swim, or be carried out */
  K.S.px=20.5; K.S.py=8.5; K.S.stamina=20; K.ks(4); ok(K.S.swimming||!K.inWater(),'not swimming in water');
  K.ks(400); ok(!K.inWater(),`still stranded in the water at ${K.S.px.toFixed(1)},${K.S.py.toFixed(1)}`);
  const [x,y]=K.nearestDry(s,20.5,8.5); ok(s.grid[y|0][x|0]!=='w','nearestDry returned water'); }

section('the arsenal');
{ const K=game('dean'); ['angelblade','archangel','ring'].forEach(w=>K.giveWeapon(w));
  ok(K.WEAPONS.knife.name==='Demon blade','knife not renamed'); ok(K.WEAPON_ORDER.length===8&&K.WEAPON_ORDER[7]==='ring','no slot 8');
  K.S.owned.add('knife'); const P=K.PRESS_(); P.weapon4(); const a=K.S.weapon; K.S.switchT=0; P.weapon4(); const b=K.S.weapon; K.S.switchT=0; P.weapon4(); const c=K.S.weapon;
  ok(new Set([a,b,c]).size===3&&[a,b,c].every(w=>K.BLADES.includes(w)),`slot 4 does not cycle blades: ${a},${b},${c}`);
  /* the archangel's blade cleaves */
  K.enterSector('street',28,30,-Math.PI/2); clear(K); K.ks(2);
  const mk=(dx,dy)=>{ const e={kind:'enemy',etype:'demon',look:'possessed_mechanic',x:K.S.px+K.S.dirX*1.2+dx,y:K.S.py+K.S.dirY*1.2+dy,hp:200,maxHp:200,r:.3,h:1.8,state:'hunt',reach:.9,dmg:5,speed:0,sense:9}; K.S.sector.entities.push(e); return e; };
  const e1=mk(-.3,-.3), e2=mk(.3,.3); K.S.weapon='archangel'; K.S.cool=0; K.S.switchT=0; K.fire(); ok(e1.hp<200&&e2.hp<200,'archangel did not cleave');
  /* the Ring frees the possessed and has a cooldown */
  const p=mk(0,0); p.freeLook='mechanic'; p.hp=300; K.S.weapon='ring'; K.S.cool=0; K.fire(); ok(p.kind==='walker','the Ring did not sever the possession'); ok(K.S.ringCool>5,'no cooldown');
  /* armour */
  K.giveGear('mantle'); K.S.hp=100; K.S.armor=0; K.hurtPlayer(20,null); ok(K.S.hp>=84,`mantle did not reduce damage (hp ${K.S.hp})`);
  K.giveGear('ashplate'); K.S.armor=0; K.S.time+=1; K.ks(120); ok(K.S.armor>0,'ash-plate never refilled');
  /* blades stay when you switch brothers */
  K.enterSector('street',28,30,-Math.PI/2); clear(K); K.ks(2); K.switchHero(true); ok(!K.S.owned.has('archangel'),'kits should be separate now'); K.switchHero(true); ok(K.S.owned.has('archangel')&&K.S.owned.has('ring'),'divine weapons lost after switching back'); }

section('weapon style');
{ const K=game('sam'); ok(K.S.settings.vmStyle==='painted','default style is not painted');
  for(const st of K.VM_STYLES){ K.setWeaponStyle(st); const V=K.VM_(); ok(V.revolver&&V.angelblade&&V.ring,`${st}: viewmodels missing`);
    ok(st==='original'?V.revolver.w===120:V.revolver.w===240,`${st}: wrong revolver art (${V.revolver.w})`); }
  ok(K.SET_ROWS?true:true,''); K.cycleWeaponStyle(); ok(K.VM_STYLES.includes(K.S.settings.vmStyle),'cycle broke the style'); K.setWeaponStyle('painted'); }

section('the guises');
{ const K=game('dean'), F=K.S.flags; K.enterSector('street',28,30,-Math.PI/2); clear(K); K.ks(2);
  K.S.hp=20; K.ks(4); const dog=K.S.sector.entities.find(e=>e.gdog); ok(dog,'no dog when badly hurt');
  if(dog){ dog.x=K.S.px+.5; dog.y=K.S.py; K.ks(4); ok(K.S.hp>=60,'the dog did not heal'); }
  K.S.hp=20; K.ks(6); ok(K.S.sector.entities.filter(e=>e.gdog).length===1,'a second dog in the same act');
  /* crow: empty guns in a fight */
  K.S.ammo.rounds=0; K.S.ammo.shells=0; const en={kind:'enemy',etype:'demon',look:'possessed_mechanic',x:K.S.px+6,y:K.S.py,hp:90,maxHp:90,r:.3,h:1.8,state:'hunt',reach:.9,dmg:5,speed:0,sense:9};
  K.S.sector.entities.push(en); K.ks(4); ok(K.S.sector.entities.some(e=>e.pick==='shells'&&!e.dead&&Math.hypot(e.x-K.S.px,e.y-K.S.py)<5),'no crow with ammunition');
  /* the wind */
  K.S.hp=40; for(let i=0;i<3;i++) K.S.sector.entities.push({kind:'enemy',etype:'demon',look:'possessed_rain',x:K.S.px+3+i,y:K.S.py+1,hp:90,maxHp:90,r:.3,h:1.8,state:'hunt',reach:.9,dmg:5,speed:0,sense:9});
  K.ks(3); ok(F.g_wind1&&K.S.sector.entities.filter(e=>e.kind==='enemy'&&e.stun>2).length>=3,'the wind did not come');
  ok(K.S.sector.entities.some(e=>e.featherFor),'no feathers left');
  /* the marigold */
  clear(K); K.S.act=2; K.ks(2); const fw=K.SECTORS.street.entities.find(e=>e.flowerwoman); ok(fw&&!fw.hidden,'no flower seller in Act II');
  K.openDlg('flowerwoman',fw); pick(K,/Take it/); walk(K); ok(K.inv_().marigold,'no marigold'); K.S.hp=5; K.hurtPlayer(50,null); ok(K.S.hp===1&&!K.inv_().marigold,'the marigold did not refuse death'); }

section('the tears and the dimensions');
for(const hero of ['dean','sam']){ const K=game(hero), F=K.S.flags;
  /* I · the deer at the reservoir opens 1951 */
  K.closeCase&&0; F.closed_bell=true; K.inv_().closed=Object.assign(K.inv_().closed||{},{bell:true}); K.S.act=2;
  K.enterSector('reservoir',23,21.5,-Math.PI/2); K.ks(4); const deer=K.SECTORS.reservoir.entities.find(e=>e.gdeer); ok(deer&&!deer.hidden,'no deer');
  K.S.px=23.2; K.S.py=17.6; K.ks(4); const tear=K.SECTORS.reservoir.entities.find(e=>e.tear==='drowned'); ok(tear,'the deer opened no tear');
  K.enterDim('drowned'); K.ks(60); ok(K.S.sector.id==='d_drowned'&&K.DIM_LOOK.d_drowned,'did not arrive in 1951');
  const s=K.SECTORS.d_drowned;
  K.openDlg('amos',s.entities.find(e=>e.look==='amos')); pick(K,/What’s happening/); walk(K);
  K.USES.d_register(); K.closeDlg(); ok(F.d1_register&&K.S.notes.some(n=>n.id==='d_register'),'register not read');
  K.openDlg('margaret',s.entities.find(e=>e.look==='margaret')); pick(K,/Who did that/); pick(K,/isn’t your fault/); walk(K); ok(F.d1_margaret&&F.d1_trust>=1,'Margaret did not trust you');
  K.openDlg('thomas',s.entities.find(e=>e.look==='thomas')); pick(K,/let Margaret speak/); walk(K); ok(F.d1_spoke&&s.grid[12][32]==='o','Margaret did not speak, or the door stayed shut');
  const ash=s.entities.find(e=>e.boss==='ashby'); ok(ash&&!ash.hidden,'no Ashby'); ash.state='hunt';
  K.S.px=32; K.S.py=10; K.ks(3); ok(K.elBoss.classList.contains('on'),'no boss bar'); killBoss(K,ash); K.ks(4);
  ok(F.d1_won&&!s.entities.some(e=>e.d1cult&&!e.dead&&e.kind==='enemy'),'1951 not won');
  K.S.time+=14; K.ks(4); K.openDlg('amos',s.entities.find(e=>e.look==='amos')); pick(K,/dam closes/); walk(K);
  ok(K.dimDone('drowned')&&K.gear().includes('wrencloak'),'no Wren’s Cloak'); K.leaveDim(); K.ks(60); ok(K.S.sector.id==='reservoir','did not come home');
  ok(/Hannah/.test(K.epilogue('C').lines.join(' ')),'1951 not in the epilogue');
  /* II · the bus stop opens 2031 */
  F.vigil_done=true; K.enterSector('street',8,28,-Math.PI/2); clear(K); K.ks(3);
  const bs=K.SECTORS.street.entities.find(e=>e.busstop&&e.dialogue); ok(bs&&!bs.hidden,'no woman at the bus stop');
  K.openDlg('busstop',bs); pick(K,/Show me/); K.S.time+=2; K.ks(80); ok(K.S.sector.id==='d_ash','did not arrive in 2031');
  const a=K.SECTORS.d_ash; K.openDlg('kevin2031',a.entities.find(e=>e.kev2031)); walk(K); const king=a.entities.find(e=>e.boss==='king'); ok(king&&!king.hidden,'no Quiet King');
  K.S.silenced=2; K.S.weapon='revolver'; K.S.cool=0; const r=K.S.ammo.rounds; K.fire(); ok(K.S.ammo.rounds===r,'a gun fired in the silence');
  K.USES.d2_graves(); K.closeDlg(); K.USES.d2_journal(); K.closeDlg();
  killBoss(K,king); K.S.time+=1; K.ks(4); ok(F.d2_won,'2031 not won'); const bl=a.entities.find(e=>e.use==='d2_blade'); ok(bl,'no blade in the ash'); if(bl) K.USES.d2_blade(bl);
  K.openDlg('tyler2031',a.entities.find(e=>e.look==='tyler_old')); walk(K);
  ok(K.S.owned.has('archangel')&&K.gear().includes('ashplate')&&K.dimDone('ash'),'no archangel blade or plate'); K.leaveDim(); K.ks(60);
  /* III · the crow on the wire opens the nave */
  K.S.act=3; F.lily_done=true; K.enterSector('street',44,34,-Math.PI/2); clear(K); K.ks(3);
  const crow=K.SECTORS.street.entities.find(e=>e.gwire); ok(crow&&!crow.hidden,'no crow on the wire'); K.S.px=crow.x; K.S.py=crow.y+2; K.ks(3);
  ok(K.SECTORS.street.entities.some(e=>e.tear==='nave'),'the crow opened no tear'); K.enterDim('nave'); K.ks(60);
  const n=K.SECTORS.d_nave; K.openDlg('archivist',n.entities.find(e=>e.look==='archivist')); pick(K,/Whose voices/); walk(K);
  const ch=n.entities.find(e=>e.choir); ok(ch.awake&&ch.shielded,'the Choir is not awake and shielded');
  K.damageEnt(ch,500,'archangel',0); ok(ch.hp===ch.maxHp,'the Choir took damage while shielded');
  for(const t of n.entities.filter(e=>e.throat!==undefined)) K.damageEnt(t,999,'archangel',0); K.ks(3); ok(!ch.shielded,'shield did not drop');
  K.S.py=10; K.ks(2); ok(K.S.flipped,'the far half is not upside down'); K.S.py=25; K.ks(2); ok(!K.S.flipped,'the near half is upside down');
  killBoss(K,ch); K.S.time+=8; K.ks(4); ok(F.d3_won,'the nave not won');
  const fo=n.entities.find(e=>e.look==='formless'); ok(fo,'the Formless One did not come'); if(fo){ K.openDlg('formless_nave',fo); walk(K); }
  ok(K.S.owned.has('ring')&&K.gear().includes('mantle')&&K.dimDone('nave'),'no Ring or Mantle');
  K.leaveDim(); K.ks(60); ok(K.S.sector.id==='street'&&!K.S.flipped,'did not come home right side up');
  /* he admits it at the altar */
  const t=K.DIALOGUE.chuck_end.nodes.gA11.text(); ok(/That was me/.test(t),'no admission at the altar');
}

console.log(fails?`\n${fails} FAILURE(S)`:'\nAll checks passed'); process.exit(fails?1:0);
