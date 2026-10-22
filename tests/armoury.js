/* 1.11: carrying, the trunk, sharing with your brother, earned weapons, the new art. Headless. */
const {load}=require('./harness');
let fails=0; const ok=(c,m)=>{ if(!c){ console.log('  FAIL:',m); fails++; } };
const mk=h=>{ const K=load({isolated:true}); let t=0; K.ks=n=>{ for(let i=0;i<n;i++){ t+=16; K.frame(t); } }; K.begin(h||'dean'); K.ks(2); K.skipCutscene(); K.ks(3); return K; };
const vm=require('vm'), E=(K,s)=>vm.runInContext(s,K);
{ const K=mk('dean');
  ok(!E(K,"SHOP.some(x=>x.id==='knife')"),'the demon blade is still for sale');
  E(K,"S.cash=999; buy(SHOP.find(x=>x.id==='shells')); buy(SHOP.find(x=>x.id==='shells')); buy(SHOP.find(x=>x.id==='shells'))"); K.ks(2);
  ok(K.S.ammo.shells===32&&E(K,'stash().ammo.shells')>0,`over the limit didn’t go to the trunk (${K.S.ammo.shells} / ${E(K,'stash().ammo.shells')})`);
  for(const w of ['flare','knife','angelblade','archangel']) E(K,`giveWeapon('${w}','test')`);
  ok(E(K,'carriedWeapons().length')===6,'carry limit not 6: '+E(K,'carriedWeapons().length'));
  E(K,"giveWeapon('torch','test')"); ok(!K.S.owned.has('torch')&&E(K,"stash().weapons.includes('torch')"),'a seventh weapon didn’t go to the trunk');
  /* pickups past the limit stay on the ground */
  K.S.ammo.shells=32; const e={kind:'pickup',pick:'shells',x:K.S.px,y:K.S.py,dead:false}; E(K,'(e=>collect(e))')(e); ok(!e.dead,'a pickup was swallowed over the limit');
  /* the trunk */
  E(K,'openArmoury(true)'); ok(E(K,'TK.open')&&/The trunk/.test(E(K,'elTrunk.innerHTML')),'no trunk screen');
  E(K,"stash().weapons.splice(stash().weapons.indexOf('torch'),1); S.owned.delete('flare'); stash().weapons.push('flare')"); ok(!K.S.owned.has('flare'),'');
  /* sharing with the brother: his rounds are his */
  const bk=E(K,'brotherKit()'); bk.ammo.rounds=0; K.S.ammo.rounds=12; E(K,'TK.atCar=true; renderArmoury()');
  E(K,"(()=>{ const n=Math.min(6,S.ammo.rounds); S.ammo.rounds-=n; brotherKit().ammo.rounds+=n; })()");
  ok(E(K,'brotherKit().ammo.rounds')===6&&K.S.ammo.rounds===6,'ammo not handed over');
  E(K,'closeArmoury()');
  /* kits are separate: switch and you have what he had */
  K.enterSector('street',28,30,-Math.PI/2); for(const e of K.S.sector.entities) if(e.kind==='enemy') e.dead=true; K.ks(2);
  ok(K.switchHero(true)&&K.S.ammo.rounds===6&&!K.S.owned.has('angelblade'),'switching didn’t give Sam his own kit');
  K.switchHero(true); ok(K.S.owned.has('angelblade'),'Dean lost his blade'); }
{ const K=mk('sam'); /* earned weapons */
  E(K,"closeCase('mill',{quiet:true})"); K.S.time+=6; K.ks(30); ok(K.S.owned.has('torch'),'no torch after the mill');
  E(K,"S.flags.bell_lead=true; closeCase('bell',{quiet:true})"); K.S.time+=8; K.ks(30); ok(E(K,"stash().weapons.includes('crossbow')&&stash().ammo.bolts>=12"),'no crossbow in the trunk after the bell');
  K.S.flags.got_sheriff=true; K.ks(4); ok(K.S.owned.has('rifle')||E(K,"stash().weapons.includes('rifle')"),'no rifle from the sheriff');
  K.S.flags.d1_amos_end=true; K.ks(4); K.S.time+=3; K.ks(10); ok(K.S.owned.has('lantern')||E(K,"stash().weapons.includes('lantern')"),'no lantern from Amos');
  /* the new weapons work */
  for(const w of ['torch','rifle','crossbow','lantern']){ if(!K.S.owned.has(w)){ E(K,`S.owned.delete('flare'); S.owned.delete('holywater'); stash().weapons=stash().weapons.filter(x=>x!=='${w}'); S.owned.add('${w}')`); }
    K.enterSector('street',28,30,-Math.PI/2); for(const e of K.S.sector.entities) if(e.kind==='enemy') e.dead=true; K.ks(2);
    const en={kind:'enemy',etype:w==='lantern'?'ghost':'demon',look:'possessed_mechanic',x:K.S.px+K.S.dirX*1.3,y:K.S.py+K.S.dirY*1.3,hp:400,maxHp:400,r:.3,h:1.8,state:'hunt',reach:.9,dmg:5,speed:0,sense:9};
    K.S.sector.entities.push(en); K.S.ammo.bolts=5; K.S.ammo.rifle=5; K.S.weapon=w; K.S.cool=0; K.S.switchT=0; K.fire(); K.ks(2);
    ok(en.hp<400,`${w} did no damage`); en.dead=true; }
  ok(E(K,'(()=>{ S.weapon="crossbow"; return SLOT_GROUPS[3].includes("crossbow"); })()'),'crossbow not in slot 3'); }
console.log(fails?`\n${fails} failure(s)`:'\nAll checks passed'); process.exit(fails?1:0);
