/* ═══ Play ══════════════════════════════════════════════════════════════ */
let SKY=null, SKYL=null, SKY_DIRTY=true;
const RAIN=[];
let VM=null, COMP=null, SHOP_KEYS=[];

/* ── input ──────────────────────────────────────────────────────────────── */
/* Bindings, the gamepad and the Controls page live in 45_input.js; this only
   turns browser events into codes. */
const locked=()=>document.pointerLockElement===over;
addEventListener('keydown',e=>{
  /* Tab, Space, arrows and F1 are swallowed: left alone they move browser
     focus, scroll the page, or open help out from under the game. */
  const inField=e.target&&e.target.tagName==='INPUT'&&!CTRL.capture;
  if(inField&&e.code!=='Escape') return;           // let sliders take their arrow keys
  if(['Space','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','F1'].includes(e.code)) e.preventDefault();
  S.lastInput='kb';
  if(e.repeat&&!CTRL.capture){ keys[e.code]=true; return; }
  inputDown(e.code,e);
});
addEventListener('keyup',e=>inputUp(e.code));
over.addEventListener('contextmenu',e=>e.preventDefault());
document.getElementById('vp').addEventListener('contextmenu',e=>e.preventDefault());
document.getElementById('vp').addEventListener('mousedown',e=>{
  if(CTRL.open) return;
  if(!S.running||S.cut||dlg.open||S.menu||S.mapOpen||S.caseOpen||S.phoneOpen) return;
  if(!locked()&&!CTRL.opts.cursorLook){ over.requestPointerLock?.(); return; }
  S.lastInput='kb'; inputDown('Mouse'+e.button,null);
});
addEventListener('mouseup',e=>{ if(!CTRL.capture) inputUp('Mouse'+e.button); });
addEventListener('mousemove',e=>{
  /* where the cursor is, for edge-turning when the camera follows it */
  const r=document.getElementById('vp').getBoundingClientRect();
  mouse.nx=(e.clientX-r.left)/r.width; mouse.ny=(e.clientY-r.top)/r.height; mouse.inside=mouse.nx>=0&&mouse.nx<=1&&mouse.ny>=0&&mouse.ny<=1;
  if(S.wheel){ S.wheel.ax+=e.movementX||0; S.wheel.ay+=e.movementY||0; wheelAim(); return; }
  const free=CTRL.opts.cursorLook&&!locked()&&mouse.inside&&!S.phoneOpen;
  if((!locked()&&!free)||!S.running||S.cut||dlg.open||S.menu||CTRL.open) return;
  const k=CTRL.opts.mouseSens;
  if(S.driving){ S.angle+=e.movementX*.0008*k; return; }
  S.angle+=e.movementX*.0022*k;
  if(MODE.pitch==='shear') S.pitch=clamp(S.pitch-e.movementY*.5*(IH/270)*k*(CTRL.opts.invertMouse?-1:1),-IH*.28,IH*.28); else S.pitch=0;
});
addEventListener('wheel',e=>{
  const code=e.deltaY>0?'WheelDown':'WheelUp';
  if(CTRL.capture){ e.preventDefault?.(); captureCode(code,e); return; }
  if(CTRL.open||!locked()||!S.running||S.cut) return;
  inputDown(code,null); inputUp(code);
},{passive:false});

/* ── physics ────────────────────────────────────────────────────────────── */
const PR=.26;
function solidAt(s,x,y){ return (x<0||y<0||x>=s.W||y>=s.H)?1:s.solid[y*s.W+x]; }
function hits(s,x,y,r){
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
    const cx=(x|0)+dx, cy=(y|0)+dy; if(!solidAt(s,cx,cy)) continue;
    const nx=Math.max(cx,Math.min(x,cx+1)), ny=Math.max(cy,Math.min(y,cy+1));
    if((x-nx)**2+(y-ny)**2<r*r) return true;
  } return false;
}
function move(s,x,y,nx,ny,r){ let ox=x,oy=y; if(!hits(s,nx,oy,r)) ox=nx; if(!hits(s,ox,ny,r)) oy=ny; return [ox,oy]; }
function stepTo(s,e,tx,ty,sp,dt){
  const dx=tx-e.x, dy=ty-e.y, d=Math.hypot(dx,dy)||1;
  const [mx,my]=move(s,e.x,e.y,e.x+dx/d*sp*dt,e.y+dy/d*sp*dt,e.r||.3);
  if(mx===e.x&&my===e.y) e.tx=undefined;
  e.x=mx; e.y=my;
}
function castWall(s,px,py,dx,dy){
  let mx=px|0,my=py|0; dx=dx||1e-9; dy=dy||1e-9;
  const ddx=Math.abs(1/dx), ddy=Math.abs(1/dy);
  let sx,sy,stx,sty;
  if(dx<0){stx=-1;sx=(px-mx)*ddx;} else {stx=1;sx=(mx+1-px)*ddx;}
  if(dy<0){sty=-1;sy=(py-my)*ddy;} else {sty=1;sy=(my+1-py)*ddy;}
  for(let g=0;g<200;g++){
    if(sx<sy){ sx+=ddx; mx+=stx; if(solidAt(s,mx,my)) return sx-ddx; }
    else     { sy+=ddy; my+=sty; if(solidAt(s,mx,my)) return sy-ddy; }
  }
  return 60;
}
const SOLID_KINDS=new Set(['prop','npc','vehicle','car','enemy','walker','brother']);
function pushOut(){
  for(const e of S.sector.entities){
    if(e.dead||e.hidden||!SOLID_KINDS.has(e.kind)||e.state==='dormant') continue;
    const dx=S.px-e.x, dy=S.py-e.y, d=Math.hypot(dx,dy), m=(e.r||.3)+PR;
    if(e.movable&&d<m&&d>1e-4){ const sp=Math.hypot(S.vx,S.vy); e.kx=(e.kx||0)-dx/d*Math.max(.6,sp*1.1); e.ky=(e.ky||0)-dy/d*Math.max(.6,sp*1.1); }
    if(d<m&&d>1e-4){ const nx=S.px+dx/d*(m-d), ny=S.py+dy/d*(m-d);
      if(!hits(S.sector,nx,ny,PR)){ S.px=nx; S.py=ny; } }
  }
}

/* ── sectors and the companion ─────────────────────────────────────────── */
function enterSector(id,x,y,a){
  const prev=S.sector;
  S.sector=SECTORS[id]; S.px=x; S.py=y; S.angle=a; S.vx=S.vy=0; S.pitch=0;
  PARTS.length=0;
  if(COMP){
    if(prev) prev.entities=prev.entities.filter(e=>e!==COMP);
    S.sector.entities.push(COMP);
    COMP.x=x-Math.cos(a)*1.3; COMP.y=y-Math.sin(a)*1.3;
    if(hits(S.sector,COMP.x,COMP.y,COMP.r)){ COMP.x=x+Math.sin(a)*.8; COMP.y=y-Math.cos(a)*.8; }
    if(hits(S.sector,COMP.x,COMP.y,COMP.r)){ COMP.x=x; COMP.y=y; }
    COMP.face=a;
  }
  const el=document.querySelector('#gLoc span'); if(el) el.textContent=S.sector.name;
  if(prev&&prev!==S.sector) requestAutosave();
  if(id==='mill'&&!S.flags.millEntered){ S.flags.millEntered=true; bark('mill',true); }
}
function makeCompanion(){
  const b=HEROES[S.hero].brother;
  COMP={kind:'brother', look:COSTUMES[b][HEROES[b].defaultCostume].look, name:HEROES[b].name,
        x:0,y:0,r:.3,h:HEROES[b].h,face:0,animT:0,cool:1,speed:2.7};
}
/* The brother follows a little behind and to the side, fires at what he can
   see, and comments on it. He is deliberately weak — company, not a turret. */
function updateCompanion(dt){
  const c=COMP; if(!c||c.hidden||S.driving) return;
  const s=S.sector;
  c.atkT=Math.max(0,(c.atkT||0)-dt); c.cool-=dt;
  let target=null, td=7.5;
  for(const e of s.entities){
    if(e.kind!=='enemy'||e.dead||e.hidden||e.state==='dormant') continue;
    const d=Math.hypot(e.x-c.x,e.y-c.y);
    if(d<td&&los(s,c.x,c.y,e.x,e.y)){ td=d; target=e; }
  }
  if(target){
    c.face=Math.atan2(target.y-c.y,target.x-c.x);
    if(!c.saw){ c.saw=true; compBark('see'); }
    if(c.cool<=0){ c.cool=1.5; c.atkT=.3; sfx('revolver');
      spawnParts(c.x+Math.cos(c.face)*.5,c.y+Math.sin(c.face)*.5,.95,4,PCOL.spark);
      damageEnt(target,target.etype==='ghost'?6:9,'companion'); }
  } else c.saw=false;
  const tx=S.px-S.dirX*1.5+S.dirY*.9, ty=S.py-S.dirY*1.5-S.dirX*.9, d=Math.hypot(tx-c.x,ty-c.y);
  if(d>12){ c.x=tx; c.y=ty; if(hits(s,c.x,c.y,c.r)){ c.x=S.px; c.y=S.py; } c.moving=false; }
  else if(d>.7){
    const ox=c.x, oy=c.y; stepTo(s,c,tx,ty,Math.min(c.speed*(d>4?1.6:1),d*2.2),dt);
    const mv=Math.hypot(c.x-ox,c.y-oy); c.moving=mv>.002; c.animT+=mv*2.4;
    if(!target&&c.moving) c.face=Math.atan2(c.y-oy,c.x-ox);
  } else c.moving=false;
}

/* ── player movement ────────────────────────────────────────────────────── */
function jump(){
  if(!S.ground||S.driving||S.crouch||S.stamina<10||S.channel>0) return;
  S.vz=2.7; S.ground=false; S.stamina-=12; S.staminaT=.9; sfx('jump');
}
function updatePlayer(dt){
  const s=S.sector;
  if(S.driving) return updateDriving(dt,s);
  const P=perks();
  let ix=0,iy=0;
  if(held('forward')) iy++; if(held('back')) iy--;
  if(held('right')) ix++; if(held('left')) ix--;
  if(held('turnLeft')) S.angle-=2*dt; if(held('turnRight')) S.angle+=2*dt;
  /* the left stick is analog: partial tilt walks slower */
  if(PAD.mx||PAD.my){ ix+=PAD.mx; iy-=PAD.my; }
  const tilt=Math.min(1,Math.hypot(ix,iy));
  const moving=tilt>.05, l=Math.hypot(ix,iy)||1; ix=ix/l*tilt; iy=iy/l*tilt;
  S.crouch=held('crouch')&&S.ground;
  const run=held('run')&&moving&&!S.crouch&&iy>=0&&S.stamina>1;
  if(run){ S.stamina=Math.max(0,S.stamina-24/P.stamina*dt); S.staminaT=.9; }
  else { S.staminaT-=dt; if(S.staminaT<=0) S.stamina=Math.min(100,S.stamina+16*P.stamina*dt); }
  if(moving&&S.channel>0) breakRite('moved');

  if(S.dash>0){
    /* Iron Charge: a committed shoulder-first lunge that hits everything in
       the path once, hard. */
    S.dash-=dt; S.vx=S.dirX*11; S.vy=S.dirY*11;
    for(const e of s.entities){
      if(e.kind!=='enemy'||e.dead||e.hidden||e.state==='dormant'||S.dashHit.has(e)) continue;
      if(Math.hypot(e.x-S.px,e.y-S.py)<1.15){ S.dashHit.add(e);
        damageEnt(e,e.etype==='ghost'?90:e.etype==='demon'?45:20,'charge',S.angle);
        e.kx=(e.kx||0)+S.dirX*8; e.ky=(e.ky||0)+S.dirY*8; e.stun=Math.max(e.stun||0,1); S.shake=.45; }
    }
  } else {
    const maxV=S.cfg.walk*(run?1.7:1)*(S.crouch?.5:1), acc=run?28:18;
    const ctl=S.ground?1:.25;
    S.vx+=(S.dirX*iy-S.dirY*ix)*acc*ctl*dt; S.vy+=(S.dirY*iy+S.dirX*ix)*acc*ctl*dt;
    const damp=Math.pow(S.ground?.0016:.5,dt); S.vx*=damp; S.vy*=damp;
    const sp=Math.hypot(S.vx,S.vy); if(sp>maxV){ S.vx=S.vx/sp*maxV; S.vy=S.vy/sp*maxV; }
  }
  const [nx,ny]=move(s,S.px,S.py,S.px+S.vx*dt,S.py+S.vy*dt,PR);
  if(nx===S.px) S.vx=0; if(ny===S.py) S.vy=0;
  S.px=nx; S.py=ny; pushOut();

  /* vertical: jump arc, crouch, landing dip */
  const floorZ=S.crouch?-.2:0;
  if(!S.ground){
    S.vz-=9.8*dt; S.z+=S.vz*dt;
    if(S.z<=floorZ){ if(S.vz<-1.5){ S.landDip=Math.min(.08,-S.vz*.024); sfx('land'); }
      S.z=floorZ; S.vz=0; S.ground=true; }
  } else S.z+=(floorZ-S.z)*Math.min(1,dt*12);
  S.landDip*=Math.pow(.003,dt);

  /* head bob, footsteps, strafe sway */
  const sp=Math.hypot(S.vx,S.vy);
  if(S.ground&&S.dash<=0){ const prev=S.bob; S.bob+=sp*dt*(run?6.6:5.8);
    if(Math.floor(prev/Math.PI)!==Math.floor(S.bob/Math.PI)&&sp>.6) sfx('step'); }
  S.bobAmp+=(Math.min(1.3,sp/S.cfg.walk)-S.bobAmp)*Math.min(1,dt*8);
  S.sway+=(-ix*.7-S.sway)*Math.min(1,dt*6);
  const bobZ=S.ground?(Math.abs(Math.sin(S.bob))-.5)*.028*S.bobAmp*(run?1.4:1):0;
  S.posZ=(S.z+bobZ-S.landDip)*IH;
}
function enterCar(car){
  S.driving=car; car.speed=0; S.angle=car.face; breakRite('released'); sfx('engine'); bark('car',true);
  toast(`${keyName('forward')}/${keyName('back')} throttle · ${keyName('left')}/${keyName('right')} steer · ${keyName('highBeam')} high beams · ${keyName('interact')} to get out`);
  if(COMP) COMP.hidden=true;
}
function exitCar(){
  const c=S.driving; if(Math.abs(c.speed)>1.2){ toast('Slow down first'); return; }
  S.driving=null; S.highBeam=false;
  const tryAt=(a)=>{ const x=c.x+Math.cos(c.face+a)*1.45, y=c.y+Math.sin(c.face+a)*1.45; return hits(S.sector,x,y,PR)?null:[x,y]; };
  const p=tryAt(-Math.PI/2)||tryAt(Math.PI/2)||tryAt(Math.PI)||[c.x,c.y];
  S.px=p[0]; S.py=p[1]; S.posZ=0;
  if(COMP){ COMP.hidden=false; const q=tryAt(Math.PI/2)||p; COMP.x=q[0]; COMP.y=q[1]; }
  toast('Out of the car');
}
function updateDriving(dt,s){
  const car=S.driving;
  const th=clamp((held('forward')?1:0)-(held('back')?1:0)-PAD.my+PAD.rt-PAD.lt,-1,1),
        st=clamp((held('right')?1:0)-(held('left')?1:0)+PAD.mx,-1,1);
  /* The Impala has weight: it carries momentum, and above about 25 mph a
     hard turn breaks the rear loose. Grip pulls the slide back in line. */
  if(car.vx===undefined){ car.vx=0; car.vy=0; }
  const fx=Math.cos(car.face), fy=Math.sin(car.face);
  let fwd=car.vx*fx+car.vy*fy, lat=-car.vx*fy+car.vy*fx;
  fwd+=th*7*dt; fwd*=Math.pow(th===0?.5:.62,dt); fwd=clamp(fwd,-3.5,11.5);
  const sp=Math.abs(fwd), steer=st*dt*1.55*Math.min(1,sp/3)*Math.sign(fwd||1)*(sp>8?.85:1);
  car.face+=steer;
  const slip=Math.abs(st)>.5&&sp>6.5;
  lat+=-steer*fwd*(slip?.55:.15);                       // the back end wants to keep going straight
  lat*=Math.pow(slip?.18:.0008,dt);                      // and the tyres pull it back
  const nfx=Math.cos(car.face), nfy=Math.sin(car.face);
  car.vx=nfx*fwd-nfy*lat; car.vy=nfy*fwd+nfx*lat; car.speed=fwd;
  if(Math.abs(lat)>1.1){ car.skidT=(car.skidT||0)-dt; if(car.skidT<=0){ car.skidT=.12; sfx('step');
      spawnParts(car.x-nfx*.7,car.y-nfy*.7,.05,2,PCOL.smoke,{up:.6}); } }
  const [mx,my]=move(s,car.x,car.y,car.x+car.vx*dt,car.y+car.vy*dt,car.r);
  if((mx===car.x&&Math.abs(car.vx)>2)||(my===car.y&&Math.abs(car.vy)>2)){ toast('Into a wall'); S.shake=.5; sfx('hit');
    if(mx===car.x) car.vx*=-.3; if(my===car.y) car.vy*=-.3; }
  car.x=mx; car.y=my; S.angle=car.face+Math.atan2(lat,Math.max(2,Math.abs(fwd)))*.35;
  S.px=car.x; S.py=car.y; S.posZ=-.035*IH; S.bobAmp=0; S.sway=0;
  for(const e of s.entities) if(e.movable&&!e.dead&&Math.hypot(e.x-car.x,e.y-car.y)<car.r+(e.r||.3)) shove(e,car.x,car.y,Math.max(3,Math.hypot(car.vx,car.vy)*1.2));
  for(const e of s.entities){
    if(e===car||e.dead||e.hidden||!['walker','enemy'].includes(e.kind)) continue;
    if(Math.hypot(e.x-car.x,e.y-car.y)<car.r+(e.r||.3)&&Math.abs(car.speed)>4){
      if(e.kind==='enemy') damageEnt(e,999,'car');
      else { e.dead=true; spawnParts(e.x,e.y,.5,18,PCOL.blood); S.cash=Math.max(0,S.cash-20);
        say('narr','You feel it go under the wheels. You keep driving. You will think about it later.'); }
    }
  }
}

/* ── the rest of the town ───────────────────────────────────────────────── */
function updateEntities(dt){
  const s=S.sector;
  for(const e of s.entities){
    if(e.dead) continue;
    e.flash=Math.max(0,(e.flash||0)-dt); e.hurtT=Math.max(0,(e.hurtT||0)-dt); e.atkT=Math.max(0,(e.atkT||0)-dt);
    if(e.kx||e.ky){
      const ox=e.x, oy=e.y, [mx,my]=move(s,e.x,e.y,e.x+e.kx*dt,e.y+e.ky*dt,e.r||.3); e.x=mx; e.y=my;
      if(e.movable){ if(mx===ox&&Math.abs(e.kx)>.4){ e.kx*=-.45; if(Math.abs(e.kx)>2) sfx('hit'); } if(my===oy&&Math.abs(e.ky)>.4){ e.ky*=-.45; if(Math.abs(e.ky)>2) sfx('hit'); }
        for(const o of s.entities){ if(o===e||o.dead||!o.movable) continue; const d=Math.hypot(o.x-e.x,o.y-e.y), m=(o.r||.3)+(e.r||.3);
          if(d<m&&d>1e-4){ const k=Math.hypot(e.kx,e.ky)*.5; o.kx=(o.kx||0)+(o.x-e.x)/d*k; o.ky=(o.ky||0)+(o.y-e.y)/d*k; e.kx*=.5; e.ky*=.5; } } }
      const fr=e.movable?.12:.02; e.kx*=Math.pow(fr,dt); e.ky*=Math.pow(fr,dt);
      if(Math.abs(e.kx)+Math.abs(e.ky)<.05){ e.kx=0; e.ky=0; }
    }
    switch(e.kind){
      case 'car': updateCar(e,dt); break;
      case 'walker': updateWalker(e,dt,s); break;
      case 'enemy': updateEnemy(e,dt,s); break;
      case 'npc': if(e.look&&Math.hypot(S.px-e.x,S.py-e.y)<5) e.face=Math.atan2(S.py-e.y,S.px-e.x); break;
      case 'proj': updateProj(e,dt,s); break;
      case 'trap': updateTrap(e,dt,s); break;
      case 'flarestuck': e.t-=dt; if(e.t<=0) e.dead=true; else if(Math.random()<dt*14) spawnParts(e.x,e.y,e.z,1,PCOL.flame); break;
    }
  }
  if(s.entities.length>90) s.entities=s.entities.filter(e=>!e.dead||e.kind==='enemy');
}
function updateCar(e,dt){
  const [tx,ty]=e.route[e.node], dx=tx-e.x, dy=ty-e.y, d=Math.hypot(dx,dy);
  if(d<.35){ e.node=(e.node+1)%e.route.length; return; }
  e.face=Math.atan2(dy,dx); e.x+=dx/d*e.speed*dt; e.y+=dy/d*e.speed*dt;
  if(!S.driving&&!S.cut&&Math.hypot(e.x-S.px,e.y-S.py)<e.r+PR){
    const k=6/Math.max(.3,Math.hypot(e.x-S.px,e.y-S.py));
    S.vx+=(S.px-e.x)*k; S.vy+=(S.py-e.y)*k; hurtPlayer(6,null); toast('Clipped by the fender');
  }
}
function updateWalker(e,dt,s){
  if(e.waitT>0){ e.waitT-=dt; e.moving=false; return; }
  if(e.tx===undefined||Math.hypot(e.tx-e.x,e.ty-e.y)<.4){ e.tx=e.x+(Math.random()-.5)*12; e.ty=e.y+(Math.random()-.5)*12; }
  const ox=e.x, oy=e.y; stepTo(s,e,e.tx,e.ty,e.speed,dt);
  const mv=Math.hypot(e.x-ox,e.y-oy); e.moving=mv>.0008; e.animT=(e.animT||0)+mv*2.4;
  if(e.moving) e.face=Math.atan2(e.y-oy,e.x-ox);
}
function updateEnemy(e,dt,s){
  if(e.state==='dormant') return;
  if(e.burn>0){ e.burn-=dt; e.hp-=9*dt; if(Math.random()<dt*20) spawnParts(e.x,e.y,.8,1,PCOL.flame); if(e.hp<=0){ killEnt(e,'flare'); return; } }
  const dx=S.px-e.x, dy=S.py-e.y, d=Math.hypot(dx,dy);
  if(e.trapped>0){ e.trapped-=dt; e.hp-=dt*7; e.moving=false;
    if(Math.random()<dt*10) spawnParts(e.x,e.y,.2,1,PCOL.sigil); if(e.hp<=0) killEnt(e,'trap'); return; }
  if(e.stun>0){ e.stun-=dt; e.moving=false; return; }
  if(e.etype==='eldritch'&&updateHusk(e,dt,s,d)) return;
  const sees=!S.driving&&!S.cut&&d<e.sense&&los(s,e.x,e.y,S.px,S.py);
  if(e.state==='idle'&&sees){ e.state='hunt'; sfx(e.etype==='ghost'?'ghost':'demon'); bark('see'); }
  if(e.state==='hunt'){
    e.face=Math.atan2(dy,dx);
    if(d>e.reach*.9){
      const slow=s.entities.some(t=>t.kind==='trap'&&!t.dead&&Math.hypot(t.x-e.x,t.y-e.y)<t.r)?.35:1;
      const ox=e.x, oy=e.y; stepTo(s,e,S.px,S.py,e.speed*slow,dt);
      const mv=Math.hypot(e.x-ox,e.y-oy); e.moving=mv>.001; e.animT=(e.animT||0)+mv*2.4;
    } else e.moving=false;
    e.cd=(e.cd||0)-dt;
    meleeAttack(e,d,dt,e.etype==='ghost'?1.2:1.0);
  } else {
    e.wt=(e.wt||0)-dt;
    if(e.wt<=0){ e.wt=2+Math.random()*3; e.tx=e.x+(Math.random()-.5)*4; e.ty=e.y+(Math.random()-.5)*4; }
    if(e.tx!==undefined){ const ox=e.x, oy=e.y; stepTo(s,e,e.tx,e.ty,e.speed*.35,dt);
      const mv=Math.hypot(e.x-ox,e.y-oy); e.moving=mv>.001; e.animT=(e.animT||0)+mv*2.4;
      if(e.moving) e.face=Math.atan2(e.y-oy,e.x-ox); }
  }
}
/* Every melee attack is telegraphed: the enemy stops, rears back with a red
   rim and a sound, and only lands if you're still in reach when it finishes.
   Step back and it whiffs. */
function meleeAttack(e,d,dt,cd){
  if(e.wind>0){ e.wind-=dt; e.atkT=.3; e.moving=false; e.tele=1;
    if(e.wind<=0){ e.tele=0; e.cd=cd;
      if(d<e.reach*1.18&&!S.driving&&!S.cut) hurtPlayer(e.dmg,e);
      else { sfx('swing'); if(Math.random()<.4&&!S.whiffSaid){ S.whiffSaid=true; bark('see'); } } }
    return true; }
  if(d<e.reach&&(e.cd||0)<=0&&!S.driving&&!S.cut){
    e.wind=e.stationary?.5:e.etype==='ghost'?.48:e.etype==='eldritch'?.42:.36; e.tele=1; e.atkT=.3;
    sfxAt(e.etype==='ghost'?'teleG':e.etype==='eldritch'?'teleE':'teleD',e.x,e.y); return true; }
  return false;
}
function hurtPlayer(n,src){
  if(S.cut||S.dead||S.dash>0) return;
  rumble(Math.min(1,.3+n/40),180);
  let d=n*perks().armour; if(S.ward>0) d*=.3;
  const ab=Math.min(S.armor,d*.5); S.armor-=ab; d-=ab;
  S.hp-=d; S.hurt=Math.min(1,S.hurt+.35+d/30); S.shake=Math.max(S.shake,.25); sfx('hurt');
  if(src){ const dx=S.px-src.x, dy=S.py-src.y, l=Math.hypot(dx,dy)||1; S.vx+=dx/l*3; S.vy+=dy/l*3; S.hurtDir=Math.atan2(src.y-S.py,src.x-S.px); S.hurtDirT=1.1; }
  if(S.channel>0&&S.ward<=0){ if(S.hero==='sam'&&!(S.chantStag>0)){ S.chantStag=2.5; S.channel=Math.max(.02,S.channel-.22); toast('The chant staggers — keep going'); } else breakRite('hit'); }
  if(S.hp<35) bark('low_hp'); else if(Math.random()<.3) bark('hurt');
  if(Math.random()<.2) compBark('hurt_player');
  if(S.hp<=0) die();
}
function die(){ S.hp=0; S.dead=true; S.channel=0; clearHeld(); playCutscene('death'); }

/* ── combat ─────────────────────────────────────────────────────────────── */
function aimedEnemy(maxD,minDot,etype){
  let best=null, bd=1e9;
  for(const e of S.sector.entities){
    if(e.kind!=='enemy'||e.dead||e.hidden||e.state==='dormant') continue;
    if(etype&&e.etype!==etype) continue;
    const dx=e.x-S.px, dy=e.y-S.py, d=Math.hypot(dx,dy);
    if(d>maxD||(dx/d)*S.dirX+(dy/d)*S.dirY<minDot) continue;
    if(d>1.2&&!los(S.sector,S.px,S.py,e.x,e.y)) continue;
    if(d<bd){ bd=d; best=e; }
  }
  return best;
}
function hitscan(ang,range){
  const dx=Math.cos(ang), dy=Math.sin(ang), wd=Math.min(range,castWall(S.sector,S.px,S.py,dx,dy));
  let best=null, bt=wd;
  for(const e of S.sector.entities){
    if(e.kind!=='enemy'||e.dead||e.hidden||e.state==='dormant') continue;
    const ex=e.x-S.px, ey=e.y-S.py, t=ex*dx+ey*dy;
    if(t<=0||t>=bt) continue;
    if(Math.abs(ex*dy-ey*dx)<(e.r||.3)*1.3){ best=e; bt=t; }
  }
  return {e:best,t:bt,x:S.px+dx*bt,y:S.py+dy*bt};
}
function dmgFor(id,e){
  let d=WEAPONS[id].dmg[e.etype]||0;
  if(id==='revolver'&&S.enchant.blessed&&e.etype==='demon') d*=1.6;
  if(id==='shotgun'&&S.enchant.iron&&e.etype==='ghost') d*=1.5;
  if(id==='crowbar'&&S.enchant.etched&&e.etype==='demon') d*=1.8;
  return d;
}
function fire(){
  const W=WEAPONS[S.weapon];
  if(S.cool>0||S.switchT>0||S.driving||W.kind==='rite') return;
  if(W.ammo&&S.ammo[W.ammo]<=0){ S.cool=.35; sfx('dry'); bark('dry'); toast('Out of ammunition'); autoSwitch(); return; }
  S.cool=W.rate;
  if(W.kind==='melee'){
    S.swing=W.swingT; sfx(W.sfx);
    const t=aimedEnemy(W.range,.6);
    if(t){ damageEnt(t,dmgFor(S.weapon,t),S.weapon,S.angle); S.shake=Math.max(S.shake,.15); }
    return;
  }
  S.ammo[W.ammo]--;
  if(W.kind==='hitscan'){
    rumble(.25+.25*W.kick,90); S.muzzle=.22; S.recoil=W.kick; S.shake=Math.max(S.shake,.12*W.kick); sfx(W.sfx);
    for(let i=0;i<W.pellets;i++){
      const a=S.angle+(Math.random()*2-1)*W.spread, h=hitscan(a,W.range);
      if(h.e){ damageEnt(h.e,dmgFor(S.weapon,h.e),S.weapon,a);
        if(W.stun&&h.e.etype==='demon') h.e.stun=Math.max(h.e.stun||0,W.stun); }
      else spawnParts(h.x-Math.cos(a)*.06,h.y-Math.sin(a)*.06,.42+(Math.random()-.5)*.3,2,S.weapon==='shotgun'?PCOL.salt:PCOL.spark);
    }
    return;
  }
  if(W.kind==='throw'){ sfx(W.sfx); S.swing=.25; spawnProj('flask'); return; }
  if(W.kind==='projectile'){ S.muzzle=.3; S.recoil=W.kick; sfx(W.sfx); spawnProj('flare'); }
}
function damageEnt(e,amount,src,ang){
  if(e.dead) return;
  if(amount<=0){
    if(e.etype==='ghost'&&src==='holywater'&&(barkCd.hw||0)<S.time){ barkCd.hw=S.time+20;
      say('narr','Holy water does nothing to the dead. They were never damned — only stuck.'); }
    return;
  }
  if(e.etype==='eldritch') huskHit(e,src);
  e.hp-=amount; e.flash=.1; e.hurtT=.22; if(src!=='companion'){ S.hitMark=.22; if(e.hp<=0) S.hitKill=.4; }
  if(e.state==='idle') e.state='hunt';
  const a=ang??Math.atan2(e.y-S.py,e.x-S.px), kb=src==='crowbar'?4:src==='shotgun'?1.4:.8;
  e.kx=(e.kx||0)+Math.cos(a)*kb; e.ky=(e.ky||0)+Math.sin(a)*kb;
  spawnParts(e.x,e.y,.9,e.etype==='ghost'?6:5,e.etype==='ghost'?PCOL.ecto:PCOL.blood);
  sfx('hit');
  if(e.hp<=0) killEnt(e,src);
}
function killEnt(e,how){
  if(e.dead) return;
  if(e.etype==='demon'&&how==='exorcism'){
    /* the rite doesn't kill — it evicts, and the person underneath lives */
    Object.assign(e,{kind:'walker',etype:null,look:e.freeLook||'worker',hp:1,state:null,speed:.6,stun:0,trapped:0,burn:0});
    spawnParts(e.x,e.y,1.1,30,PCOL.smoke,{up:2.4});
    S.freed++; (S.freedNames=S.freedNames||[]).push(FREE_NAMES[e.freeLook]||'someone from town'); S.cash+=15; S.special=Math.min(100,S.special+20); bark('exorcise',true); addAlign('h',1);
    say('narr','Black smoke goes out through the asphalt. The person it leaves behind is breathing — and presses a crumpled bill into your hand.',4);
    return;
  }
  e.dead=true;
  if(e.etype==='ghost'){ spawnParts(e.x,e.y,.9,30,PCOL.ecto,{up:1.6}); sfx('ghost'); S.kills.ghost++; bark('kill_ghost'); }
  else if(e.etype==='eldritch'){ huskDied(e,how); return; }
  else { spawnParts(e.x,e.y,.9,22,PCOL.blood); spawnParts(e.x,e.y,1.2,14,PCOL.smoke,{up:2}); sfx('demon'); S.kills.demon++; bark('kill_demon'); addAlign('n',1); }
  if(Math.random()<.5) compBark('kill');
  S.special=Math.min(100,S.special+18);
  if(Math.random()<.5) S.sector.entities.push(pick_(Math.random()<.5?'cash':(e.etype==='ghost'?'shells':'rounds'),e.x,e.y));
}
function selectWeapon(id){
  if(!id||!S.owned.has(id)||id===S.weapon||S.driving) return;
  breakRite('released'); S.lastWeapon=S.weapon; S.weapon=id; S.switchT=.3; S.swing=0; sfx('switch'); toast(WEAPONS[id].name);
}
function cycleWeapon(dir){
  const owned=WEAPON_ORDER.filter(w=>S.owned.has(w)), i=owned.indexOf(S.weapon);
  selectWeapon(owned[(i+dir+owned.length)%owned.length]);
}
function autoSwitch(){
  for(const w of ['shotgun','revolver','flare','holywater','knife','crowbar']){
    const W=WEAPONS[w]; if(S.owned.has(w)&&w!==S.weapon&&(!W.ammo||S.ammo[W.ammo]>0)){ selectWeapon(w); return; } }
}
function kick(){
  if(S.kickT>0||S.driving) return;
  S.kickT=.8; S.recoil=.9; sfx('kick');
  for(const e of S.sector.entities){ if(!e.movable||e.dead) continue;
    const dx=e.x-S.px, dy=e.y-S.py, d=Math.hypot(dx,dy); if(d<1.7&&(dx/d)*S.dirX+(dy/d)*S.dirY>.5) shove(e,S.px,S.py,6.5); }
  const t=aimedEnemy(1.55,.55);
  if(t){ damageEnt(t,12,'kick',S.angle); t.kx=(t.kx||0)+Math.cos(S.angle)*5; t.ky=(t.ky||0)+Math.sin(S.angle)*5;
    t.stun=Math.max(t.stun||0,.6); S.shake=.2; }
}
function altFire(){ if(S.weapon==='journal') cycleRite(); else kick(); }
function special(){
  if(S.driving||S.cut) return;
  if(S.special<100){ toast(`${S.cfg.special.name} — ${Math.floor(S.special)}%`); sfx('deny'); return; }
  S.special=0; sfx('special'); bark('special',true);
  if(S.cfg.special.id==='charge'){ S.dash=.32; S.dashHit=new Set(); S.shake=.4; return; }
  say('latin','Recedite, spiritus immundi!',2.2,{latin:true,now:true});
  S.luxT=.45;
  for(let i=0;i<40;i++){ const a=i/40*Math.PI*2; PARTS.push({x:S.px+Math.cos(a)*.6,y:S.py+Math.sin(a)*.6,z:.5,
    vx:Math.cos(a)*5,vy:Math.sin(a)*5,vz:0,life:.6,grav:0,size:.07,col:PCOL.holy.c,glow:true}); }
  for(const e of S.sector.entities){
    if(e.kind!=='enemy'||e.dead||e.state==='dormant') continue;
    const dx=e.x-S.px, dy=e.y-S.py, d=Math.hypot(dx,dy); if(d>6.5) continue;
    const k=(6.5-d)/6.5; e.kx=(e.kx||0)+dx/(d||1)*9*k; e.ky=(e.ky||0)+dy/(d||1)*9*k; e.stun=Math.max(e.stun||0,3);
    damageEnt(e,e.etype==='ghost'?70*k+20:10,'banish');
  }
}

/* ── incantations ───────────────────────────────────────────────────────── */
function updateRite(dt){
  const holding=held('fire')&&S.weapon==='journal'&&!S.driving;
  const pressed=pressedOnce('fire');
  /* A broken rite has to be begun again with a fresh press. Without the lock,
     holding the button while walking restarted and broke it every frame. */
  if(!holding){ S.riteLock=false; if(S.channel>0) breakRite('released'); return; }
  if(S.riteLock) return;
  if(!S.rites.has(S.rite)){ if(pressed){ toast('You don’t know that rite yet — find or buy the page'); sfx('deny'); } return; }
  const R=RITES[S.rite];
  if((S.riteCool[S.rite]||0)>S.time){ if(pressed) toast(`${R.name} — gathering itself`); return; }
  if(S.channel===0){
    if(R.needs==='demon'){ const t=aimedEnemy(8,.9,'demon');
      if(!t){ if(pressed){ toast('Look at someone possessed to begin'); sfx('deny'); } return; } S.chTarget=t; }
    S.chLine=-1; sfx('rite');
  }
  if(R.needs==='demon'){ const t=aimedEnemy(8,.8,'demon'); if(!t||t!==S.chTarget){ breakRite('lost'); return; } }
  const dur=R.time*S.cfg.riteMul*perks().rite;
  S.channel+=dt/dur;
  const li=Math.min(R.lines.length-1,(S.channel*R.lines.length)|0);
  if(li!==S.chLine){ S.chLine=li; say('latin',R.lines[li],Math.max(1.6,dur/R.lines.length+.4),{latin:true,now:li===0}); if(li>0) sfx('rite'); }
  if(Math.random()<dt*22) spawnParts(S.px+S.dirX*.6,S.py+S.dirY*.6,.5,1,PCOL.sigil,{spd:.4});
  if(S.channel>=1){ S.channel=0; S.riteCool[S.rite]=S.time+R.cool; completeRite(S.rite); }
}
function breakRite(why){
  if(S.channel<=0) return;
  const was=S.channel; S.channel=0; S.chTarget=null; S.chLine=-1;
  if(why!=='released') S.riteLock=true;
  if(why==='released'&&was<.15) return;
  sfx('riteFail');
  say('narr',why==='moved'?'The words come apart. You moved.':why==='hit'?'Something gets a hand on you, and the Latin dies in your throat.':'The rite falters.',2.2,{now:true});
  if(why!=='released') bark('rite_fail');
}
function completeRite(id){
  sfx('riteEnd');
  if(id==='exorcism'){ const t=S.chTarget; S.chTarget=null; if(t&&!t.dead) killEnt(t,'exorcism'); }
  if(id==='lux'){ S.luxT=.5;
    for(const e of S.sector.entities){ if(e.kind!=='enemy'||e.dead||e.state==='dormant') continue;
      const d=Math.hypot(e.x-S.px,e.y-S.py); if(d>8.5) continue;
      if(e.etype==='ghost') damageEnt(e,65,'lux'); else if(e.etype==='eldritch') damageEnt(e,80,'lux'); else e.stun=Math.max(e.stun||0,1.6); }
    say('narr','Light without a source fills the room for one long breath.',2.6); }
  if(id==='ward'){ S.ward=10; say('narr','The air around you hardens like cold iron.',2.4); }
  if(id==='sigil'){
    const x=S.px+S.dirX*2, y=S.py+S.dirY*2, ok=!hits(S.sector,x,y,.3);
    const tx=ok?x:S.px, ty=ok?y:S.py;
    S.sector.entities.push({kind:'trap',x:tx,y:ty,r:1.35,h:.24,m:'sigil',lit:1,t:14});
    spawnParts(tx,ty,.05,30,PCOL.sigil,{spd:2}); say('narr','The circle burns itself into the floor.',2.2); }
}
function cycleRite(){
  const known=RITE_ORDER.filter(r=>S.rites.has(r));
  if(!known.length){ toast('No rites known'); return; }
  breakRite('released'); S.rite=known[(known.indexOf(S.rite)+1)%known.length]; toast(RITES[S.rite].name);
}
function learnRite(r){ S.rites.add(r); if(!S.rites.has(S.rite)) S.rite=r; }

/* ── projectiles, traps, particles ─────────────────────────────────────── */
function spawnProj(type){
  const a=S.angle, tilt=S.pitch/IH, e={kind:'proj',ptype:type,x:S.px+Math.cos(a)*.4,y:S.py+Math.sin(a)*.4,
    z:.55+S.z,r:.12,h:type==='flask'?.3:.2,m:type==='flask'?'flask':'flareShot',life:4};
  if(type==='flask'){ e.vx=Math.cos(a)*7; e.vy=Math.sin(a)*7; e.vz=2.2+tilt*4; }
  else { e.vx=Math.cos(a)*14; e.vy=Math.sin(a)*14; e.vz=tilt*6; e.lit=1; }
  S.sector.entities.push(e);
}
function updateProj(e,dt,s){
  e.life-=dt; if(e.life<=0){ e.dead=true; return; }
  if(e.ptype==='flask') e.vz-=9.8*dt;
  const nx=e.x+e.vx*dt, ny=e.y+e.vy*dt; e.z+=e.vz*dt;
  if(e.ptype==='flare'&&Math.random()<dt*30) spawnParts(e.x,e.y,e.z,1,PCOL.flame);
  for(const t of s.entities){
    if(t.kind!=='enemy'||t.dead||t.hidden||t.state==='dormant') continue;
    if(Math.hypot(t.x-nx,t.y-ny)<(t.r||.3)+.25&&e.z<2.2){ projHit(e,s,nx,ny,t); return; }
  }
  if(solidAt(s,nx|0,ny|0)||e.z<=0){ projHit(e,s,e.x,e.y,null); return; }
  e.x=nx; e.y=ny;
}
function projHit(e,s,x,y,t){
  e.dead=true;
  if(e.ptype==='flask'){
    sfx('splash'); spawnParts(x,y,Math.max(.1,e.z),26,PCOL.holy,{up:1.2});
    for(const o of s.entities){ if(o.kind!=='enemy'||o.dead||o.state==='dormant') continue;
      const d=Math.hypot(o.x-x,o.y-y); if(d<1.7){ damageEnt(o,(WEAPONS.holywater.dmg[o.etype]||0)*(1-d/2.4),'holywater');
        if(o.etype==='demon') o.stun=Math.max(o.stun||0,1.2); } }
  } else {
    if(t){ damageEnt(t,WEAPONS.flare.dmg[t.etype]||0,'flare'); t.burn=3; }
    s.entities.push({kind:'flarestuck',x:x-e.vx*.012,y:y-e.vy*.012,z:clamp(e.z,.05,.9),r:.1,h:.2,m:'flareShot',lit:1,t:7});
    spawnParts(x,y,e.z,10,PCOL.flame);
  }
}
function updateTrap(e,dt,s){
  e.t-=dt; if(e.t<=0){ e.dead=true; return; }
  for(const o of s.entities){ if(o.kind!=='enemy'||o.dead||o.etype!=='demon') continue;
    if(Math.hypot(o.x-e.x,o.y-e.y)<e.r){ if(!(o.trapped>0)&&(barkCd.trap||0)<S.time){ barkCd.trap=S.time+8;
        say('narr','It reaches the edge of the circle and stops, as if the air had turned to glass.'); }
      o.trapped=.35; } }
}
const PARTS=[];
const PCOL = {
  blood:{c:[120,14,18],grav:-6}, ecto:{c:[130,220,240],glow:true,grav:-1}, smoke:{c:[34,32,38],grav:.9},
  spark:{c:[255,200,120],glow:true,grav:-6}, salt:{c:[230,230,224],grav:-6}, holy:{c:[120,170,255],glow:true,grav:-3},
  flame:{c:[255,150,60],glow:true,grav:1.6}, sigil:{c:[255,80,50],glow:true,grav:.6}, gold:{c:[240,214,120],glow:true,grav:-2},
};
function spawnParts(x,y,z,n,P,o={}){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, sp=(o.spd||1.6)*Math.random();
    PARTS.push({x,y,z,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,vz:(o.up||1)*Math.random()*1.5,life:.5+Math.random()*(o.life||.8),
      grav:P.grav,size:(o.size||.05)*(.6+Math.random()*.8),col:P.c,glow:!!P.glow}); }
  if(PARTS.length>700) PARTS.splice(0,PARTS.length-700);
}
function updateParts(dt){
  for(const p of PARTS){ p.life-=dt; p.vz+=p.grav*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt;
    if(p.z<0){ p.z=0; p.vz*=-.3; p.vx*=.6; p.vy*=.6; } const k=Math.pow(.3,dt); p.vx*=k; p.vy*=k; }
  for(let i=PARTS.length-1;i>=0;i--) if(PARTS[i].life<=0) PARTS.splice(i,1);
}

/* ── pickups and healing ────────────────────────────────────────────────── */
function updatePickups(){
  if(S.driving||S.z>.25) return;
  for(const e of S.sector.entities){
    if(e.kind!=='pickup'||e.dead) continue;
    if(Math.hypot(e.x-S.px,e.y-S.py)<=.8) collect(e);
  }
}
function collect(e){
  const P=PICKUPS[e.pick]; let msg=null;
  switch(e.pick){
    case 'medkit':  if(S.meds>=4) return; S.meds++; msg='+1 med kit — B to use'; break;
    case 'bandage': if(S.hp>=100) return; heal(15); msg='+15 health'; bark('med'); break;
    case 'battery': if(S.battery>=100) return; S.battery=100; msg='Torch battery'; break;
    case 'cash':    { const n=5+((Math.random()*16)|0); S.cash+=n; msg=`+$${n}`; bark('cash'); break; }
    case 'armor':   if(S.armor>=100) return; S.armor=Math.min(100,S.armor+50); msg='+50 armour'; break;
    case 'page': {
      const want=['lux','ward','sigil','exorcism'].find(r=>!S.rites.has(r));
      if(want){ learnRite(want); msg='Rite learned: '+RITES[want].name;
        say('narr','The page is in Ray Hollis’s hand. Under the Latin he wrote, pressing hard: IT WORKS. IT SHOULDN’T.',3.6); }
      else { S.cash+=20; msg='+$20 — Earl buys pages'; }
      break; }
    default:
      if(P.ammo){ S.ammo[P.ammo]+=P.amt; msg=`+${P.amt} ${P.label.toLowerCase()}`; if(P.ammo==='holywater') own('holywater'); }
      if(P.weapon){ own(P.weapon); msg=P.label; selectWeapon(P.weapon); }
  }
  e.dead=true; sfx('pickup'); toast(msg||P.label); spawnParts(e.x,e.y,.2,8,PCOL.gold,{spd:.8,up:1.5});
}
function useMedkit(){
  if(S.meds<=0){ toast('No med kits'); sfx('deny'); return; }
  if(S.hp>=100){ toast('Already patched up'); return; }
  S.meds--; S.healT=1.2; sfx('heal'); bark('med',true);
}
function toggleTorch(){
  if(S.battery<=0){ toast('Torch is dead'); return; }
  S.torchOn=!S.torchOn; toast(S.torchOn?'Torch on':'Torch off');
}

/* ── interaction ────────────────────────────────────────────────────────── */
/* Whatever is under the crosshair and in reach, with a label — this is what
   the on-screen prompt shows, so the player always knows what E will do. */
function lookTarget(){
  if(S.driving) return {label:'Get out', act:exitCar};
  let best=null, bd=2.5;
  for(const e of S.sector.entities){
    if(e.dead||e.hidden||!(e.dialogue||e.kind==='vehicle'||e.talk||e.talkOnly||e.read||e.use)) continue;
    const dx=e.x-S.px, dy=e.y-S.py, d=Math.hypot(dx,dy);
    if(d>bd||(dx/d)*S.dirX+(dy/d)*S.dirY<.55) continue;
    bd=d; best=e;
  }
  if(best){
    if(best.kind==='vehicle') return {label:`${best.name} — drive, trunk, wardrobe`, act:()=>carMenu(best)};
    if(best.use) return {label:best.useName||'Look closer', act:()=>USES[best.use]&&USES[best.use](best)};
    if(best.read) return {label:best.readName||'Look closer', act:()=>readThing(best)};
    if(best.dialogue) return {label:`Talk to ${best.name}`, act:()=>openDlg(best.dialogue,best)};
    return {label:`Talk to ${best.name}`, act:()=>townTalk(best)};
  }
  for(let t=.2;t<2.4;t+=.1){
    const cx=(S.px+S.dirX*t)|0, cy=(S.py+S.dirY*t)|0, tile=S.sector.grid[cy]?.[cx];
    if(tile==='+'){ const d=doorRedirect(S.sector.doors[`${cx},${cy}`]);
      if(d&&d.need&&!S.flags[d.need]) return {label:'Locked', act:()=>say('narr',d.locked||'Locked.',3.4,{now:true})};
      return d?{label:`Enter — ${SECTORS[d.to].name}`, act:()=>{ S.transition=.7; S.pending=d; sfx('door'); }}:null; }
    if(tile==='T') return {label:'Read the terminal', act:readTerminal};
    if(SOLID.includes(tile||'#')) return null;
  }
  return null;
}
function interact(){ const t=lookTarget(); if(t) t.act(); }
const TERMINALS = {
  street:`> cat /oakhaven/tick.py

  for soul in town.residents:
      soul.despair = clamp(soul.despair + AMBIENT, 0, 1)
      if soul.despair > 0.94:
          veil.thin(soul.position)
          log("harvest", soul.id)`,
  mill:`> tail -f render.log

  WARN  entity 'whisperer' clipping through collision mesh
  WARN  asset 'human/hollis_r' deallocated mid-frame
  INFO  admin session active: c.shurley
  INFO  harvest yield this cycle: 6 units`,
  pawn:`> whoami
  c.shurley
> whoami --verify
  ERROR: 'c.shurley' is not root
  ERROR: root has not logged in for 4,004,001 cycles`,
};
function readTerminal(){
  const k=S.sector.id;
  if(!S.flags['term_'+k]){ S.flags['term_'+k]=true; if(k==='mill') S.flags.term=true; S.special=Math.min(100,S.special+10); }
  openMenu('Terminal — still drawing power', TERMINALS[k]||'> _', [{text:'Step back'}]);
}

/* ── dialogue and menus share one panel ─────────────────────────────────── */
const dlg={open:false,tree:null,avail:null,actor:null,after:[]};
const elDlg=document.getElementById('dlg'), elSpk=document.getElementById('spk'),
      elLine=document.getElementById('line'), elCh=document.getElementById('ch');
function openDlg(id,actor){
  const tree=DIALOGUE[id]; if(!tree) return;
  dlg.open=true; dlg.tree=tree; dlg.actor=actor; dlg.after=[];
  document.exitPointerLock?.(); breakRite('released'); clearHeld();
  elDlg.classList.add('on');
  showNode(typeof tree.start==='function'?tree.start():tree.start);
}
function showNode(n){
  if(!n){ closeDlg(); return; }
  const nd=dlg.tree.nodes[n]; dlg.node=n;
  elSpk.textContent=nd.speaker; elLine.textContent=typeof nd.text==='function'?nd.text():nd.text;
  setPortrait(nd.port!==undefined?nd.port:(dlg.tree.port||dlg.actor?.look||null));
  renderChoices(nd.choices.filter(c=>!c.req||c.req()));
}
function renderChoices(list){
  elCh.innerHTML=''; dlg.avail=list;
  list.forEach((c,i)=>{ const b=document.createElement('button'); b.className='c'; b.dataset.k=`${i+1}.`;
    b.textContent=c.text; if(c.note){ const s=document.createElement('small'); s.textContent=c.note; b.appendChild(s); }
    b.onclick=()=>pickChoice(c); elCh.appendChild(b); });
  elCh.firstChild?.focus();
}
function pickChoice(c){
  if(c.fx) applyFx(c.fx);
  if(c.act!==undefined||!dlg.tree){ const a=c.act; closeDlg(); if(a) a(); return; }
  showNode(c.next);
}
function closeDlg(){ dlg.open=false; elDlg.classList.remove('on'); const after=dlg.after; dlg.after=[]; for(const f of after) f(); }
function dlgKey(e){ dlgCode(e.code,e); }
function applyFx(fx){
  if(fx.battery) S.battery=Math.min(100,S.battery+fx.battery);
  if(fx.flag) S.flags[fx.flag]=true;
  if(fx.cash) S.cash+=fx.cash;
  if(fx.shop) dlg.after.push(openShop);
  if(fx.cutscene) dlg.after.push(()=>playCutscene(fx.cutscene));
  if(fx.align) addAlign(fx.align[0],fx.align[1]||1);
  if(fx.note) addNote(fx.note);
  if(fx.heal) heal(fx.heal);
  if(fx.now) fx.now();
  if(fx.then) dlg.after.push(fx.then);
}
function openMenu(title,text,items){
  dlg.open=true; dlg.tree=null; dlg.after=[]; document.exitPointerLock?.(); clearHeld();
  elDlg.classList.add('on'); elSpk.textContent=title; elLine.textContent=text; setPortrait(null);
  renderChoices(items.map(it=>({text:it.text,note:it.note,act:it.act||null})));
}

const isDean=()=>S.hero==='dean', isSam=()=>S.hero==='sam';
const DIALOGUE = {
  marla:{ start:()=>S.flags.marla?'m9':'m0', nodes:{
    m0:{speaker:'Marla — night clerk',
      text:"You're not from the bank and you're not from the state, so I'll guess press. Third lot this month.\n\nCheckout's eleven. Ice machine's been broke since the mill closed, which tells you about how long that's been.",
      choices:[{text:"We're looking into the deaths. Six men in five weeks.",next:'m1'},
               {text:"What happened to this town, Marla?",next:'m2'},
               {text:"Just a room. And whatever you've got under the counter.",next:'mD',req:isDean}]},
    mD:{speaker:'Marla — night clerk',
      text:"Rye. Older than you. It'll take the edge off tonight and put two more on tomorrow.\n\nYou look like a man who already knows that.",
      choices:[{text:"I do. Tell me about the mill instead.",next:'m1'}]},
    m1:{speaker:'Marla — night clerk',
      text:"Deaths. That's a polite word for it.\n\nThey were mill men, every one. Got told the plant was losing money and believed it, because what else do you do. Then the severance ran out.\n\nRay Hollis bought a boat in March. By April he wouldn't cross the lot after dark — said the streetlights were watching him wrong.",
      choices:[{text:"Who bought the mill?",next:'m3'},
               {text:"Watching him how?",next:'m1b',req:isSam}]},
    m1b:{speaker:'Marla — night clerk',
      text:"Said they hummed when he was low and went dark when he wasn't. Said the whole town got heavier around three, like something leaned on it.\n\nI laughed at him. He's in the ground, and I still hear the hum some nights.",
      choices:[{text:"Who bought the mill?",next:'m3'}]},
    m2:{speaker:'Marla — night clerk',
      text:"Same as every town like this one. Somebody in a building I'll never see decided we cost more than we made.\n\nThe rest is just weather.",
      choices:[{text:"That's not weather. That's a decision somebody signed.",next:'m1'}]},
    m3:{speaker:'Marla — night clerk',
      text:"Crossroads Holdings. Delaware address, and the address is a mailbox. Bought it profitable, ran it into the dirt in eleven months, took the machines, left the asbestos.\n\nTake the flashlight. It's dark out there in a way it didn't used to be.\n\nAnd if you're the kind of press I think you are — Earl, across the street. Tell him I sent you.",
      choices:[{text:"Thank you, Marla.",next:null,fx:{battery:40,flag:'marla'}}]},
    m9:{speaker:'Marla — night clerk',
      text:"Still here? Earl's across the street. The mill's past the cross street, east end.\n\nDon't go at three.",
      choices:[{text:"[Leave.]",next:null}]},
  }},
  earl:{ start:()=>S.flags.earl?'e2':'e0', nodes:{
    e0:{speaker:'Earl — pawnbroker',
      text:"Store's closed. Sign says so. I can see you can read.",
      choices:[{text:"Marla sent us.",next:'e1'},{text:"We're not here for a toaster.",next:'e1'}]},
    e1:{speaker:'Earl — pawnbroker',
      text:"Marla. Hm. Then you're the other kind of customer.\n\nHe lifts a section of the counter. Underneath: rock salt by the sack, iron in every shape, a shelf of things that are not legal in Oregon.\n\n\"Cash only. I don't take cheques and I don't take souls, whatever you heard about the last owner.\"",
      choices:[{text:"Let's see it.",next:null,fx:{flag:'earl',shop:true}},{text:"Later.",next:null,fx:{flag:'earl'}}]},
    e2:{speaker:'Earl — pawnbroker',
      text:()=>["Back again. Still alive. Good for business.","You're bleeding on my floor. Buy something for it.","Whatever's in that mill — I sold Ray Hollis the same salt I'm selling you. Bear that in mind."][(S.time|0)%3],
      choices:[{text:"Show me what you've got.",next:null,fx:{shop:true}},{text:"Just looking.",next:null}]},
  }},
  phantom:{ start:'p0', nodes:{
    p0:{speaker:'The shape on the green chain',
      text:"A man made of sawdust and standing oil, a hard hat still on his head. Where his lungs were, the air will not hold still.\n\n\"QUOTA,\" he says, and the word arrives inside your teeth instead of through the air. \"QUOTA. THE VENT WAS ON THE FORM.\"",
      choices:[{text:"Which vent? Say the number.",next:'p1'},
               {text:"[Iron up.] I'm not here to listen, pal.",next:'p2',req:isDean},
               {text:"Easy. Nobody here is going to hurt you.",next:'p1',req:isSam}]},
    p1:{speaker:'The shape on the green chain',
      text:"He stops. The oil on him goes still.\n\n\"FOURTEEN. VENT FOURTEEN. I FILED IT IN MARCH. THEY SAID IT WAS CAPITAL EXPENDITURE.\"\n\nHe checks his own hands, as if making sure they're still on the form.",
      choices:[{text:"They killed you with a spreadsheet. I know. Go.",next:null,fx:{flag:'phantom',cutscene:'tear'}}]},
    p2:{speaker:'—',
      text:"Iron goes through him like a hand through cold water. He doesn't fight it.\n\n\"THANK—\" he starts.",
      choices:[{text:"[Watch.]",next:null,fx:{flag:'phantom',cutscene:'tear'}}]},
  }},
};

/* ── the store ──────────────────────────────────────────────────────────── */
const elShop=document.getElementById('shop'), elShopList=document.getElementById('shopList'),
      elShopCash=document.getElementById('shopCash');
function openShop(){ S.menu='shop'; document.exitPointerLock?.(); elShop.classList.add('on'); renderShop(); sfx('door'); }
function closeShop(){
  S.menu=null; elShop.classList.remove('on');
  say('earl',["Don't die in my parking lot.","Come back alive. Repeat customers are the whole business plan.","Mind the salt. It gets everywhere."][(Math.random()*3)|0]);
}
const shopPrice=it=>Math.round(it.price*perks().price);
function shopVisible(it){
  if(it.weapon&&S.owned.has(it.weapon)) return false;
  if(it.ench&&S.enchant[it.ench]) return false;
  if(it.rite&&S.rites.has(it.rite)) return false;
  return true;
}
function renderShop(){
  elShopCash.textContent='$'+S.cash; elShopList.innerHTML=''; SHOP_KEYS=[];
  let k=0;
  for(const it of SHOP){
    if(it.group){ const h=document.createElement('div'); h.className='item head2'; h.textContent=it.group; elShopList.appendChild(h); continue; }
    if(!shopVisible(it)) continue;
    const key='123456789abcdefghijklmnop'[k++]; SHOP_KEYS.push([key,it]);
    const price=shopPrice(it), can=!it.can||it.can(), ok=S.cash>=price&&can;
    const b=document.createElement('button'); b.className='item'+(ok?'':' no');
    const ks=document.createElement('span'); ks.className='k'; ks.textContent=key;
    const nm=document.createElement('span'); nm.textContent=it.name;
    const pr=document.createElement('span'); pr.className='p'; pr.textContent='$'+price;
    b.append(ks,nm,pr);
    if(it.desc||!can){ const d=document.createElement('span'); d.className='d'; d.textContent=!can?'Not needed right now':it.desc; b.appendChild(d); }
    b.onclick=()=>buy(it); elShopList.appendChild(b);
  }
}
function buy(it){
  const price=shopPrice(it);
  if(S.cash<price||(it.can&&!it.can())){ sfx('deny'); return false; }
  S.cash-=price;
  if(it.apply) it.apply();
  if(it.ench){ S.enchant[it.ench]=true; rebuildVM(); }
  if(it.rite) learnRite(it.rite);
  sfx('buy'); toast(it.name); renderShop(); return true;
}
function shopKey(e){
  if(e.code==='Escape'){ closeShop(); return; }
  const hit=SHOP_KEYS.find(([k])=>k===(e.key||'').toLowerCase()); if(hit) buy(hit[1]);
}

/* ── the car: trunk and wardrobe ────────────────────────────────────────── */
function carMenu(car){
  if(typeof hubMenu==='function') return hubMenu(car);
  openMenu('The Impala','A black 1967 four-door, older than both of you, with a trunk that holds more than it should.',[
    {text:'Drive', act:()=>enterCar(car)},
    {text:'Open the trunk', note:S.trunk>0?`resupply ×${S.trunk}`:'empty for now', act:openTrunk},
    {text:'Change clothes', act:openWardrobe},
    {text:'Leave it'},
  ]);
}
function openTrunk(){
  if(S.trunk<=0){ say(S.hero,isDean()?'Jumper cables and regret. That’s it.':'Empty. We’ll restock at Earl’s.'); return; }
  S.trunk--; S.ammo.rounds+=8; if(S.owned.has('shotgun')) S.ammo.shells+=6; S.ammo.holywater+=1; own('holywater'); heal(20);
  sfx('pickup'); toast('Resupplied from the trunk');
}
function openWardrobe(){
  const list=Object.entries(COSTUMES[S.hero]).map(([k,c])=>({text:(k===S.costume?'● ':'')+c.name, note:c.perk, act:()=>setCostume(k,true)}));
  list.push({text:'Never mind'});
  openMenu('Change clothes','Everything you own fits in the back of a car.',list);
}
function setCostume(k,announce){
  S.costume=k; rebuildVM(); buildPortrait();
  if(announce){ toast(COSTUMES[S.hero][k].name+' — '+COSTUMES[S.hero][k].perk); sfx('switch'); }
}
function rebuildVM(){ VM=buildViewmodels(costumeLook(),S.enchant); }

/* ── objectives ─────────────────────────────────────────────────────────── */
const OBJECTIVES = [
  {id:'ask', title:'Find someone who was here', sector:'motel', x:9.5, y:4, reward:15,
   detail:'The motel is the only lit window on the street. Somebody has been signing names in a ledger all year.',
   done:()=>S.flags.marla},
  {id:'earl', title:'See Earl at the pawnshop', sector:'pawn', x:7.5, y:4.5, reward:0,
   detail:'Marla says Earl sells to the other kind of customer. Salt, iron, things that aren’t legal in Oregon.',
   done:()=>S.flags.earl},
  {id:'mill', title:'Search the mill floor', sector:'mill', x:15.5, y:8, reward:20,
   detail:'East end, past the cross street. The chain on the door has been cut since February.',
   done:()=>S.flags.phantom},
  {id:'survive', title:'Put down what woke up in the mill', sector:'mill', x:15.5, y:13, reward:30,
   detail:'Three of them, out of the dark between the chain lines. Salt and iron scatter them. Bullets barely do.',
   done:()=>S.flags.shadesAwake&&!SECTORS.mill.entities.some(e=>e.kind==='enemy'&&e.etype==='ghost'&&!e.dead),
   onDone:()=>spawnStreetDemons()},
  {id:'term', title:'Read what is on the mill terminal', sector:'mill', x:23, y:7.5, reward:10,
   detail:'The mill office terminal is still drawing power. It shouldn’t be.',
   done:()=>S.flags.term},
  {id:'car', title:'Get back to the Impala', sector:'street', x:29, y:41.3, reward:0,
   detail:'Something followed you out. Two of the townspeople have black eyes now. The rite can still save them.',
   done:()=>!!S.driving},
];
function objective(){ return OBJECTIVES[S.obj]||null; }
function checkObjective(){
  const o=objective(); if(!o||!o.done()) return;
  S.obj++; S.cash+=o.reward||0; S.trunk++; if(o.onDone) o.onDone(); requestAutosave();
  const nx=objective();
  if(nx){ toast('Objective — '+nx.title); say('narr',nx.detail,4.2); }
  else if(S.act<4) toast('No open objectives — the town is yours to walk');
}
function spawnStreetDemons(){
  const st=SECTORS.street;
  const demon=(look,free,x,y)=>char_(look,x,y,{kind:'enemy',etype:'demon',hp:90,maxHp:90,speed:1.55,dmg:11,reach:.95,
    sense:10,state:'idle',freeLook:free,claws:true});
  st.entities.push(demon('possessed_mechanic','mechanic',27.5,23), demon('possessed_rain','rainwoman',40,22.5));
  for(const e of st.entities) if(e.kind==='walker'&&e.name==='Hank Ruiz'){ e.dead=true; break; }
}
function routeDoor(from,to){
  if(from===to) return null;
  const prev={}; prev[from]=null; const q=[from];
  while(q.length){ const cur=q.shift();
    for(const k in SECTORS[cur].doors){ const d=SECTORS[cur].doors[k]; if(d.to in prev) continue; prev[d.to]={from:cur,key:k}; q.push(d.to); } }
  if(!(to in prev)) return null;
  let node=to; while(prev[node]&&prev[node].from!==from) node=prev[node].from;
  return prev[node]?prev[node].key:null;
}
function markerHere(){
  const o=objective(); if(!o) return null;
  if(o.sector===S.sector.id) return {x:o.x,y:o.y,direct:true};
  const key=routeDoor(S.sector.id,o.sector); if(!key) return null;
  const [dx,dy]=key.split(',').map(Number); return {x:dx+.5,y:dy+.5,direct:false};
}
function markSeen(){
  const s=S.sector; if(!s.seen) s.seen=new Uint8Array(s.W*s.H);
  const R=7, px=S.px|0, py=S.py|0;
  for(let y=Math.max(0,py-R);y<=Math.min(s.H-1,py+R);y++) for(let x=Math.max(0,px-R);x<=Math.min(s.W-1,px+R);x++){
    if((x-px)**2+(y-py)**2>R*R) continue;
    if(Math.abs(x-px)+Math.abs(y-py)<=2||los(s,S.px,S.py,x+.5,y+.5)) s.seen[y*s.W+x]=1;
  }
}

/* ═══ Cutscenes ═════════════════════════════════════════════════════════
   Staged in the engine, not pre-rendered. A cutscene is a camera path, actor
   paths, timed subtitles and events — so the town you walk through is the
   set, and your costume is in the shot. */
const ang=(x0,y0,x1,y1)=>Math.atan2(y1-y0,x1-x0);
function lerpAng(a,b,t){ let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*t; }
function sampleCam(keys,t){
  if(t<=keys[0].t) return keys[0];
  for(let i=0;i<keys.length-1;i++){ const a=keys[i], b=keys[i+1];
    if(t<b.t){ const u=(t-a.t)/(b.t-a.t), s=u*u*(3-2*u);
      return {x:lerp(a.x,b.x,s),y:lerp(a.y,b.y,s),a:lerpAng(a.a,b.a,s),z:lerp(a.z||0,b.z||0,s)}; } }
  return keys[keys.length-1];
}
function sampleScalar(keys,t){
  if(t<=keys[0].t) return keys[0].v;
  for(let i=0;i<keys.length-1;i++){ const a=keys[i], b=keys[i+1]; if(t<b.t) return lerp(a.v,b.v,(t-a.t)/(b.t-a.t)); }
  return keys[keys.length-1].v;
}
function samplePath(path,t){
  if(t<path[0].t) return {x:path[0].x,y:path[0].y,hidden:!!path[0].show,moving:false};
  for(let i=0;i<path.length-1;i++){ const a=path[i], b=path[i+1];
    if(t<b.t){ const u=(t-a.t)/(b.t-a.t), moving=a.x!==b.x||a.y!==b.y;
      return {x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u),hidden:false,moving,face:moving?ang(a.x,a.y,b.x,b.y):undefined}; } }
  const l=path[path.length-1]; return {x:l.x,y:l.y,hidden:!!l.hide,moving:false};
}
function playCutscene(id){
  const def=CUTSCENES[id](); S.cut={id,def,t:0,fired:new Set()};
  document.exitPointerLock?.(); clearHeld(); breakRite('released');
  if(def.setup) def.setup();
}
function updateCutscene(dt){
  const c=S.cut, d=c.def; c.t+=dt;
  const k=sampleCam(d.cam,c.t);
  S.px=k.x; S.py=k.y; S.angle=k.a; S.posZ=(k.z||0)*IH; S.pitch=0;
  for(const a of d.actors||[]){
    const p=samplePath(a.path,c.t); a.ent.x=p.x; a.ent.y=p.y; a.ent.hidden=p.hidden;
    a.ent.moving=p.moving; if(p.moving){ a.ent.animT=(a.ent.animT||0)+dt*2.6; a.ent.face=p.face; }
  }
  (d.subs||[]).forEach((s,i)=>{ if(c.t>=s.t&&!c.fired.has('s'+i)){ c.fired.add('s'+i); say(s.who,s.text,s.dur,{now:true}); } });
  (d.events||[]).forEach((ev,i)=>{ if(c.t>=ev.t&&!c.fired.has('e'+i)){ c.fired.add('e'+i); ev.fn(); } });
  if(d.tick) d.tick(c.t,dt);
  S.cutAscii=d.ascii?sampleScalar(d.ascii,c.t):0;
  S.fade=d.fade?sampleScalar(d.fade,c.t):0;
  if(c.t>=d.dur) endCutscene();
}
function skipCutscene(){
  const c=S.cut; if(!c) return;
  (c.def.events||[]).forEach((ev,i)=>{ if(!c.fired.has('e'+i)){ c.fired.add('e'+i); ev.fn(); } });
  endCutscene();
}
function endCutscene(){
  const d=S.cut.def; S.cut=null; S.cutAscii=0; S.fade=0; SUBQ.length=0;
  if(d.end) d.end();
}
const HERO_LINES = {
  intro:{
    dean:  ['Town looks like somebody unplugged it and forgot to tell the people.',
           'Six names, Dean. Not six cases. Let’s remember that this time.',
           'I remember everything. That’s the whole problem. Motel first.'],
    sam:['Every window on this street is dark except one. Hospitality, or bait.',
           'In my experience it’s both, and the coffee’s terrible.',
           'Motel first, then. Somebody here has been signing names in a ledger all year.']},
  tear:{
    dean:  ['Something ate our ghost. That’s new. I hate new.','Then we find out what’s at the other end of the straw.'],
    sam:['Something is eating the dead here. Salt was never going to be enough.','It’s feeding — on him, on all of this. Stay close.']},
};
const CUTSCENES = {
  intro(){
    const st=SECTORS.street, car=st.entities.find(e=>e.name==='Impala'), b=HEROES[S.hero].brother;
    const heroAv={kind:'actor',look:costumeLook(),x:0,y:0,r:.3,h:S.cfg.h,face:-Math.PI/2,animT:0,hidden:true};
    const broAv ={kind:'actor',look:COMP.look,x:0,y:0,r:.3,h:COMP.h,face:-Math.PI/2,animT:0,hidden:true};
    const L=HERO_LINES.intro[S.hero], speak=[S.hero,b,S.hero];
    return {
      dur:16.2, letterbox:true,
      setup(){ st.entities.push(heroAv,broAv); COMP.hidden=true; car.headOn=true; },
      cam:[{t:0,   x:27.6,y:30.6,a:ang(27.6,30.6,29,44),  z:.02},
           {t:4.4, x:27.9,y:32.6,a:ang(27.9,32.6,29,40.5),z:0},
           {t:7.6, x:33.6,y:36.2,a:ang(33.6,36.2,29.2,38.6),z:-.02},
           {t:11.6,x:29.1,y:33.4,a:Math.PI/2, z:0},
           {t:13.6,x:29.1,y:34.3,a:Math.PI/2, z:0},
           {t:15.6,x:28.2,y:37.6,a:-Math.PI/2,z:0},
           {t:16.2,x:28.2,y:37.6,a:-Math.PI/2,z:0}],
      actors:[{ent:car,   path:[{t:0,x:29,y:44.3},{t:4.2,x:29,y:40}]},
              {ent:heroAv,path:[{t:4.7,x:28,y:40.75,show:true},{t:7.6,x:28.2,y:37.6},{t:15.2,x:28.2,y:37.6,hide:true}]},
              {ent:broAv, path:[{t:5.0,x:30.1,y:40.75,show:true},{t:7.9,x:30,y:37.8},{t:16.2,x:30,y:37.8}]}],
      subs:[{t:.6,who:'narr',text:'Oakhaven, Oregon. Twenty to three in the morning.'},
            {t:3.6,who:'narr',text:'Six men in five weeks. All of them off the same mill floor.'},
            {t:8.2,who:speak[0],text:L[0]},{t:10.8,who:speak[1],text:L[1]},{t:13.3,who:speak[2],text:L[2]}],
      events:[{t:0,fn:()=>sfx('engine')},{t:4.3,fn:()=>sfx('door')}],
      end(){
        st.entities=st.entities.filter(e=>e.kind!=='actor');
        car.x=29; car.y=40; car.face=-Math.PI/2; car.headOn=false;
        S.px=28.2; S.py=37.6; S.angle=-Math.PI/2; S.posZ=0; S.z=0;
        COMP.hidden=false; COMP.x=30; COMP.y=37.8; COMP.face=-Math.PI/2;
        const o=objective(); toast('Objective — '+o.title);
        say('narr',keyName('map')+' opens the map. The pulsing marker is always somewhere you can reach.',4);
      },
    };
  },
  tear(){
    const sec=SECTORS.mill, ph=sec.entities.find(e=>e.look==='phantom'), b=HEROES[S.hero].brother;
    const save={x:S.px,y:S.py,a:S.angle}, L=HERO_LINES.tear[S.hero];
    return {
      dur:10, letterbox:true,
      cam:[{t:0,x:15.5,y:12.6,a:-Math.PI/2,z:0},{t:3.4,x:15.5,y:11,a:-Math.PI/2,z:-.04},
           {t:6.5,x:15.3,y:10,a:ang(15.3,10,15.5,8),z:-.08},{t:8.6,x:15.5,y:10.4,a:-Math.PI/2,z:-.02},
           {t:10,x:save.x,y:save.y,a:save.a,z:0}],
      ascii:[{t:0,v:0},{t:3.3,v:0},{t:4.1,v:.8},{t:5.4,v:.35},{t:6.6,v:0},{t:10,v:0}],
      subs:[{t:.3,who:'narr',text:'He lets go. No violence in it at all.'},
            {t:3.9,who:'narr',text:'Then the air where he stood opens like a paper cut — and drinks what is left of him.'},
            {t:6.6,who:b,text:L[0]},{t:8.3,who:S.hero,text:L[1]}],
      events:[{t:3.6,fn:()=>{ if(ph&&!ph.dead){ ph.dead=true; spawnParts(ph.x,ph.y,.9,60,PCOL.ecto,{up:2.5,spd:2.4}); }
                                sfx('tear'); S.shake=.7; }},
              {t:9.4,fn:wakeShades}],
      end(){ S.px=save.x; S.py=save.y; S.angle=save.a; S.posZ=0; wakeShades(); },
    };
  },
  death(){
    const x=S.px, y=S.py, a=S.angle;
    return {
      dur:3.4, letterbox:false,
      cam:[{t:0,x,y,a,z:0},{t:1.3,x,y,a:a+.3,z:-.42},{t:3.4,x,y,a:a+.32,z:-.44}],
      fade:[{t:0,v:0},{t:1.8,v:.7},{t:3.4,v:1}],
      subs:[{t:.3,who:S.hero,text:isDean()?'Not like this. Not in Oregon.':'Dean— I’m sorry—'}],
      end:respawn,
    };
  },
};
function wakeShades(){
  if(S.flags.shadesAwake) return;
  S.flags.shadesAwake=true; sfx('ghost');
  for(const e of SECTORS.mill.entities) if(e.kind==='enemy'&&e.state==='dormant'){
    e.state='idle'; e.hidden=false; spawnParts(e.x,e.y,.9,20,PCOL.ecto,{up:2}); }
  toast('The mill wakes up');
}
function respawn(){
  const sec=S.sector, sp=sec.spawn;
  enterSector(sec.id,sp.x,sp.y,sp.a);
  S.hp=60; S.armor=0; S.dead=false; S.hurt=0; S.z=0; S.vz=0; S.ground=true; S.dash=0;
  const lost=Math.floor(S.cash*.25); S.cash-=lost;
  for(const e of sec.entities) if(e.kind==='enemy'&&!e.dead&&e.state==='hunt'){ e.state='idle'; e.cd=2; }
  toast(lost?`You come to — $${lost} lighter`:'You come to');
  say(HEROES[S.hero].brother,isDean()?'Easy. I dragged you out. You’re heavier than you look.':'Hey. Hey. You’re okay. I’ve got you.');
}

/* ── weather ────────────────────────────────────────────────────────────── */
function updateWeather(dt){
  const s=S.sector, p=S.light;
  if(s.outdoor&&p.storm>0){ S.lightningT-=dt*p.storm;
    if(S.lightningT<=0){ S.flash=.3+.7*S.settings.intensity; S.flash2=.16; S.thunderT=.6+Math.random()*1.6; S.lightningT=9+Math.random()*16; } }
  if(S.flash2>0){ S.flash2-=dt; if(S.flash2<=0&&S.flash<.3) S.flash=.75; }
  S.flash=Math.max(0,S.flash-dt*3.2);
  if(S.thunderT>0){ S.thunderT-=dt; if(S.thunderT<=0) sfx('thunder'); }
  if(AU.rainG) AU.rainG.gain.setTargetAtTime(S.settings.sound?(s.outdoor?p.rain*.3:.035):0, AU.ctx.currentTime, .4);
}

/* ── renderers and time of day ──────────────────────────────────────────── */
const RENDERERS = [
  {key:'doom',  label:'Doom 320×200',  mode:'doom',  ascii:0, note:'320×200 at a 1.2 pixel aspect, 256 colours, no vertical look — what a 1993 monitor showed.'},
  {key:'build', label:'Build 320×240', mode:'build', ascii:0, note:'The Duke and Blood trick: the same chunky pixels, but you can look up and down by shearing the horizon.'},
  {key:'modern',label:'Modern 480×270',mode:'modern',ascii:0, note:'Square pixels, full colour. The best balance of legibility and atmosphere.'},
  {key:'crisp', label:'Crisp 640×400', mode:'crisp', ascii:0, note:'Highest resolution. Characters and costumes at their most readable.'},
  {key:'ascii', label:'ASCII',         mode:'crisp', ascii:1, note:'The whole frame resolved into characters — a post-process over the same renderer.'},
];
function setRenderer(key){
  const r=RENDERERS.find(x=>x.key===key); if(!r) return null;
  S.renderer=key; S.ascii=r.ascii; setPixelMode(r.mode); return r;
}
function cycleRenderer(){ const i=RENDERERS.findIndex(r=>r.key===S.renderer); toast(setRenderer(RENDERERS[(i+1)%RENDERERS.length].key).label); }
function setPixelMode(key){
  const m=PIXEL_MODES[key], requant=m.quantise!==MODE.quantise;
  MODE=m; IW=m.w; IH=m.h; world.width=IW; world.height=IH;
  img=wctx.createImageData(IW,IH); fb=new Uint32Array(img.data.buffer);
  zbuf=new Float32Array(IW); coneLut=new Float32Array(IW); colAng=new Float32Array(IW); colU=new Int32Array(IW);
  dsArr=new Int32Array(IW); deArr=new Int32Array(IW); computeColAng();
  if(m.pitch!=='shear') S.pitch=0;
  const aspect=IW*m.par/IH;
  document.getElementById('vp').style.aspectRatio=`${IW*m.par} / ${IH}`;
  document.getElementById('cab').style.width=`min(97vw, calc((100vh - 60px) * ${aspect.toFixed(3)}), 1320px)`;
  if(requant) rebuildTables();
  SKY_DIRTY=true; resetRain(); resize();
}
function applyPreset(k){
  const p=LIGHTING[k]; S.preset=k; S.light=p;
  for(const id in SECTORS){ const s=SECTORS[id]; s._presetAmb=p.amb;
    s.ambient=(s.outdoor?p.amb:Math.max(s.ambBase*p.indoor*1.6,p.amb*p.indoor))*(s.ambMul||1); pack(s); }
  SKY_DIRTY=true; resetRain();
}
function cyclePreset(){ const o=['night','dusk','day']; applyPreset(o[(o.indexOf(S.preset)+1)%3]); toast(S.light.name); }
function resize(){
  const r=document.getElementById('vp').getBoundingClientRect(), d=Math.min(2,window.devicePixelRatio||1);
  over.width=Math.max(1,Math.round(r.width*d)); over.height=Math.max(1,Math.round(r.height*d));
}
addEventListener('resize',resize);

/* ── start ──────────────────────────────────────────────────────────────── */
const BOOT={costume:{dean:'leather',sam:'canvas'}};
function begin(hero){
  audioInit();
  S.hero=hero; S.cfg=HEROES[hero]; const st=S.cfg.start;
  S.costume=BOOT.costume[hero];
  S.owned=new Set(st.owned); S.ammo={...st.ammo}; S.rites=new Set(st.rites); S.rite=st.rites[0]; S.meds=st.meds;
  S.weapon=st.owned.includes('shotgun')?'shotgun':'revolver'; S.lastWeapon='crowbar';
  S.hp=100; S.armor=0; S.cash=40; S.trunk=1; S.special=40;
  rebuildVM(); buildPortrait(); makeCompanion();
  document.getElementById('boot').classList.add('off'); resize();
  const s=SECTORS.street; enterSector('street',s.spawn.x,s.spawn.y,s.spawn.a);
  S.running=true;
  playCutscene('intro');
  showCard('Act I · The Wages of Sin','Prologue','Twenty to three in the morning',{during:true});
  addNote('arrive');
  if(BOOT.startAct>1) startAt(BOOT.startAct);
}
