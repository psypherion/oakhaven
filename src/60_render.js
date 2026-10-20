/* ═══ Render ═════════════════════════════════════════════════════════════ */
const FONT = getComputedStyle(document.body).fontFamily;
const q = c => MODE.quantise ? quant(c) : c;

/* ── dynamic lights: flares, sigils, headlights, the Lux burst ─────────── */
const DYN=[];
function gatherDyn(){
  DYN.length=0;
  for(const e of S.sector.entities){
    if(e.dead||e.hidden) continue;
    if(e.kind==='flarestuck') DYN.push({x:e.x,y:e.y,p:2.6*(.85+Math.random()*.15),f:.32});
    else if(e.kind==='proj'&&e.ptype==='flare') DYN.push({x:e.x,y:e.y,p:2,f:.45});
    else if(e.kind==='trap') DYN.push({x:e.x,y:e.y,p:.9,f:.6});
    else if(e.headOn||(e.kind==='car'&&S.preset!=='day'))
      DYN.push({x:e.x+Math.cos(e.face)*2.6,y:e.y+Math.sin(e.face)*2.6,p:2.8,f:.2});
    if(DYN.length>=6) break;
  }
  if(S.luxT>0) DYN.push({x:S.px,y:S.py,p:8*S.luxT,f:.08});
  bakeDyn();
}
/* Dynamic light is splatted into a per-cell grid once per frame, then read
   exactly like the static lightmap. Evaluating every light at every floor
   pixel cost 18 ms a frame at 640×400; this costs a few hundred cell writes. */
let DL=null, DL_SEC=null; const DL_TOUCH=[];
function bakeDyn(){
  const s=S.sector;
  if(DL_SEC!==s||!DL||DL.length!==s.W*s.H){ DL=new Float32Array(s.W*s.H); DL_SEC=s; DL_TOUCH.length=0; }
  for(const i of DL_TOUCH) DL[i]=0; DL_TOUCH.length=0;
  for(const L of DYN){
    const reach=Math.min(9,Math.sqrt(L.p/.02/Math.max(L.f,.01)));
    for(let y=Math.max(0,(L.y-reach)|0);y<=Math.min(s.H-1,(L.y+reach)|0);y++)
    for(let x=Math.max(0,(L.x-reach)|0);x<=Math.min(s.W-1,(L.x+reach)|0);x++){
      const i=y*s.W+x; if(s.solid[i]) continue;
      const v=L.p/(1+((x+.5-L.x)**2+(y+.5-L.y)**2)*L.f); if(v<.015) continue;
      if(DL[i]===0) DL_TOUCH.push(i); DL[i]+=v;
    }
  }
}
function dynAt(x,y){ if(!DL||!DYN.length) return 0; const cx=x|0, cy=y|0, s=S.sector;
  return (cx<0||cy<0||cx>=s.W||cy>=s.H)?0:DL[cy*s.W+cx]; }

function beamSetup(){
  let power=0,width=.55,fall=.055;
  if(S.cut){}
  else if(S.driving){ power=S.highBeam?3.6:2.3; width=S.highBeam?.95:.7; fall=S.highBeam?.016:.03; }
  else if(S.torchOn&&S.battery>0){ power=3.2*S.flicker; width=.52; fall=.048; }
  power+=S.muzzle*5; if(S.muzzle>0) width=Math.max(width,1);
  for(let x=0;x<IW;x++){ const c=Math.abs(2*x/IW-1)/width; coneLut[x]=c>=1?0:(1-c*c)*power; }
  return fall;
}

/* ── sky ────────────────────────────────────────────────────────────────── */
/* One panorama per preset, wrapping the full horizon. Cloud cover is
   computed once and reused for the lightning-lit copy. */
let SKY_W=1040;
function buildSky(){
  SKY_DIRTY=false;
  const p=S.skyOver||S.light.sky, PW=SKY_W, PH=IH, cov=new Float32Array(PW*PH);
  for(let y=0;y<PH;y++){ const t=y/(PH-1), band=Math.max(0,1-Math.abs(t-.66)/.42);
    for(let x=0;x<PW;x++){ const n=vnoise(x/52,y/(PH*.07),20)*.62+vnoise(x/16,y/(PH*.03),65)*.38;
      cov[y*PW+x]=Math.min(1,Math.max(0,n-.46)*2.4*band*p.clouds); } }
  const mk=boost=>{
    const a=new Uint32Array(PW*PH);
    for(let y=0;y<PH;y++){ const t=y/(PH-1);
      const br=lerp(p.top[0],p.bot[0],t), bg=lerp(p.top[1],p.bot[1],t), bb=lerp(p.top[2],p.bot[2],t);
      for(let x=0;x<PW;x++){ const k=cov[y*PW+x];
        let r=lerp(br,p.cloud[0],k), g=lerp(bg,p.cloud[1],k), b=lerp(bb,p.cloud[2],k);
        if(p.stars&&t<.58&&k<.2&&hash(x,y)>.9966){ const v=170+hash(y,x)*85; r=g=b=v; }
        if(boost){ r=r*1.8+50; g=g*1.8+54; b=b*1.9+66; }
        const d=BAYER[(x&3)+((y&3)<<2)]*5;
        a[y*PW+x]=q(rgb(clamp255(r+d),clamp255(g+d),clamp255(b+d)));
      } }
    if(p.moon){ const mx=PW*.31, my=PH*.45, R=Math.max(5,PH*.04);
      for(let y=Math.floor(my-R*3);y<=my+R*3;y++){ if(y<0||y>=PH) continue;
        for(let x=Math.floor(mx-R*3);x<=mx+R*3;x++){ const d=Math.hypot(x-mx,y-my), i=y*PW+((x%PW)+PW)%PW;
          if(d<=R){ const v=clamp255(232*(hash(x>>1,y>>1)>.8?.86:1)); a[i]=q(rgb(v,v,clamp255(v*.96))); }
          else if(d<R*3){ const k=(1-(d-R)/(R*2))*.22, c0=a[i];
            a[i]=q(rgb(clamp255((c0&255)+k*120),clamp255(((c0>>8)&255)+k*124),clamp255(((c0>>16)&255)+k*134))); } } } }
    return a;
  };
  SKY=mk(false); SKYL=mk(true);
}
function drawSky(hz){
  const src=S.flash>.35?SKYL:SKY, PW=SKY_W, PH=IH, top=Math.min(hz,IH), k=PW/(Math.PI*2);
  for(let x=0;x<IW;x++){ let u=((S.angle+colAng[x])*k)|0; u%=PW; if(u<0) u+=PW; colU[x]=u; }
  for(let y=0;y<top;y++){
    let py=(PH-1-(hz-y)*1.3)|0; if(py<0) py=0; if(py>=PH) py=PH-1;
    const row=py*PW, base=y*IW; for(let x=0;x<IW;x++) fb[base+x]=src[row+colU[x]];
  }
}

/* ── world ──────────────────────────────────────────────────────────────── */
function render(){
  const s=S.sector, hz=(IH/2+S.pitch)|0;
  const beamFall=beamSetup(), exp=S.light.exp, flashAdd=S.flash*(s.outdoor?.9:.18);
  const SW=s.W, SH=s.H, lm=s.lm, solid=s.solid, cell=s.cell, floorMap=s.floor, nd=DYN.length;
  /* the dynamic grid is read inline: a function call per pixel was not
     inlined and cost 16 ms a frame at 640×400 */
  const dl=(nd&&DL&&DL_SEC===s)?DL:null;
  const FRB=FOG.rb, FGG=FOG.gg, FQ=FOG.q;   // fog, held in locals for the hot loops
  if(s.outdoor){ if(SKY_DIRTY||!SKY) buildSky(); drawSky(hz); }

  /* pass 1: walls, one ray per column */
  for(let x=0;x<IW;x++){
    const cam=2*x/IW-1, rdx=S.dirX+S.plX*cam||1e-9, rdy=S.dirY+S.plY*cam||1e-9;
    let mx=S.px|0, my=S.py|0;
    const ddx=rdx<0?-1/rdx:1/rdx, ddy=rdy<0?-1/rdy:1/rdy;
    let sdx,sdy,stx,sty;
    if(rdx<0){stx=-1;sdx=(S.px-mx)*ddx;} else {stx=1;sdx=(mx+1-S.px)*ddx;}
    if(rdy<0){sty=-1;sdy=(S.py-my)*ddy;} else {sty=1;sdy=(my+1-S.py)*ddy;}
    let side=0,ti='brick',open=(S.py|0)*SW+(S.px|0),emit=0,hit=-1;
    for(let g=0;g<220;g++){
      if(sdx<sdy){sdx+=ddx;mx+=stx;side=0;} else {sdy+=ddy;my+=sty;side=1;}
      if(mx<0||my<0||mx>=SW||my>=SH){ti='brick';break;}
      const i=my*SW+mx; if(solid[i]){ ti=cell[i]; hit=i; emit=EMIT[s.grid[my][mx]]||0; break; } open=i;
    }
    let dist=side===0?sdx-ddx:sdy-ddy; if(dist<.04) dist=.04;
    zbuf[x]=dist;
    let wx=side===0?S.py+dist*rdy:S.px+dist*rdx; wx-=Math.floor(wx);
    const tw=T[ti], texU=((wx*tw.w)|0)&(tw.w-1), lineHf=IH/dist, lineH=lineHf|0, zo=S.posZ/dist;
    let wh=hit>=0?s.wh[hit]:1; if(s.breathe&&hit>=0) wh*=1+.08*Math.sin(S.time*1.25+mx*.7+my*.45);
    const floorY=hz+zo+lineHf*.5;
    const dS=(floorY-lineHf*wh)|0, dE=floorY|0;
    dsArr[x]=dS; deArr[x]=dE;
    let ill=(lm[open]+coneLut[x]/(1+dist*dist*beamFall))*exp+flashAdd;
    if(dl) ill+=dl[open];
    if(side===1) ill*=.76;
    ill*=Math.max(.18,1-dist/VIEWD*MODE.dim);
    if(emit) ill=Math.max(ill,emit);
    const L=dlvl(ill,x,0), wl=tw.lit[L];
    /* above the ground floor: the building material, with a window on every
       other tile; a door or shop window keeps its own texture to 1.05 high */
    let upY=-1e9, ul=wl, uw=tw;
    if(hit>=0&&wh>1.2){
      const ab=s.above[hit], up=s.upper[hit], tall=ab?1.05:(s.outdoor?1.3:1.0);
      let name=ab||ti; if(up&&(!s.outdoor||((mx+my)&1)===0)) name=up;
      uw=T[name]; ul=uw.lit[L]; upY=floorY-lineHf*tall;
    }
    const y0=dS<0?0:dS, y1=dE>IH-1?IH-1:dE, inv=1/lineHf, th=tw.h, fk=emit?0:fogAt(dist);
    const ao=tw.lit[L>8?L-8:0], aoH=s.outdoor?.1:.14;    // contact darkening where wall meets floor
    let di=y0*IW+x;
    for(let y=y0;y<=y1;y++,di+=IW){
      const wy=(floorY-y)*inv;                       // height above the floor, in storeys
      const tv=(th-1)-(((wy*th)|0)&(th-1));
      let c= y<upY ? ul[tv*uw.w+texU] : (wy<aoH&&!emit ? ao : wl)[tv*tw.w+texU];
      if(fk){ const ik=256-fk; c=(0xFF000000|((((c&0xFF00FF)*ik+FRB*fk)>>>8)&0xFF00FF)|((((c&0xFF00)*ik+FGG*fk)>>>8)&0xFF00))>>>0; if(FQ) c=q(c); }
      fb[di]=c;
    }
  }

  /* passes 2 and 3: floor and ceiling, row-major with incremental stepping */
  const rdx0=S.dirX-S.plX, rdy0=S.dirY-S.plY, spanX=(S.dirX+S.plX)-rdx0, spanY=(S.dirY+S.plY)-rdy0, halfH=.5*IH;
  for(let y=hz+1;y<IH;y++){
    const rd=(halfH+S.posZ)/(y-hz); if(rd<=0) continue;
    let fx=S.px+rd*rdx0, fy=S.py+rd*rdy0;
    const sx=rd*spanX/IW, sy=rd*spanY/IW, rowLight=exp*Math.max(.18,1-rd/VIEWD*MODE.dim);
    const rowBeam=1/(1+rd*rd*beamFall), dRow=(y&3)<<2, base=y*IW, fk=fogAt(rd), ik=256-fk, frb=FRB*fk, fgg=FGG*fk;
    for(let x=0;x<IW;x++,fx+=sx,fy+=sy){
      if(y<=deArr[x]) continue;
      const cx=fx|0, cy=fy|0, inside=cx>=0&&cy>=0&&cx<SW&&cy<SH;
      const ft=T[inside?floorMap[cy*SW+cx]:(s.outdoor?'dirt':'boards')];
      let fi=((inside?lm[cy*SW+cx]:s.ambient)+coneLut[x]*rowBeam)*rowLight+flashAdd*.6;
      if(dl&&inside) fi+=dl[cy*SW+cx]*rowLight;
      let c=ft.lit[lvl(fi+DITH[(x&3)+dRow])][(((fy*ft.h)|0)&(ft.h-1))*ft.w+(((fx*ft.w)|0)&(ft.w-1))];
      if(fk){ c=(0xFF000000|((((c&0xFF00FF)*ik+frb)>>>8)&0xFF00FF)|((((c&0xFF00)*ik+fgg)>>>8)&0xFF00))>>>0; if(FQ) c=q(c); }
      fb[base+x]=c;
    }
  }
  if(!s.outdoor){
    const ct=T[s.ceilTex||'plaster'], cw=ct.w, chh=ct.h, ceilH=s.ceilH||1.45;
    for(let y=0;y<hz;y++){
      const rd=((ceilH-.5)*IH-S.posZ)/(hz-y); if(rd<=0) continue;
      let fx=S.px+rd*rdx0, fy=S.py+rd*rdy0;
      const sx=rd*spanX/IW, sy=rd*spanY/IW, rowLight=exp*Math.max(.18,1-rd/VIEWD*MODE.dim)*.82;
      const rowBeam=.55/(1+rd*rd*beamFall), dRow=(y&3)<<2, base=y*IW, fk=fogAt(rd), ik=256-fk, frb=FRB*fk, fgg=FGG*fk;
      for(let x=0;x<IW;x++,fx+=sx,fy+=sy){
        if(y>=dsArr[x]) continue;
        const cx=fx|0, cy=fy|0, inside=cx>=0&&cy>=0&&cx<SW&&cy<SH;
        let ci=((inside?lm[cy*SW+cx]:s.ambient)+coneLut[x]*rowBeam)*rowLight;
        if(dl&&inside) ci+=dl[cy*SW+cx]*rowLight*.7;
        let c=ct.lit[lvl(ci+DITH[(x&3)+dRow])][(((fy*chh)|0)&(chh-1))*cw+(((fx*cw)|0)&(cw-1))];
        if(fk){ c=(0xFF000000|((((c&0xFF00FF)*ik+frb)>>>8)&0xFF00FF)|((((c&0xFF00)*ik+fgg)>>>8)&0xFF00))>>>0; if(FQ) c=q(c); }
        fb[base+x]=c;
      }
    }
  }

  const ents=s.entities.filter(e=>!e.dead&&(e.echo?echoVisible(e):!e.hidden)&&e!==S.driving)
    .sort((a,b)=>((b.x-S.px)**2+(b.y-S.py)**2)-((a.x-S.px)**2+(a.y-S.py)**2));
  for(const e of ents) drawSprite(e,s,hz,beamFall);
  drawParticles(hz);
}

/* ── sprites ────────────────────────────────────────────────────────────── */
/* Which drawing of an entity to use, given where the camera is. Characters
   and cars have front, side and back views; the side view is mirrored when
   the entity faces screen-left. */
function pickView(e){
  const fx=Math.cos(e.face||0), fy=Math.sin(e.face||0), fd=fx*S.dirX+fy*S.dirY;
  if(fd<-.62) return ['front',false];
  if(fd>.62)  return ['back',false];
  return ['side',fx*S.plX+fy*S.plY<0];
}
function pickFrame(e){
  if(e.hurtT>0) return 4;
  if(e.pose!==undefined&&!e.moving) return e.pose;
  if(e.atkT>0||e.stun>0||e.trapped>0) return 3;
  if(e.moving) return 1+(((e.animT||0)*1.1|0)&1);
  return 0;
}
function spriteFor(e){
  if(e.look){ const [v,m]=pickView(e); return {sp:charSet(e.look)[v][pickFrame(e)],mirror:m}; }
  if(e.car){ const [v,m]=pickView(e); return {sp:CARS[e.car][v],mirror:m}; }
  if(e.pick) return {sp:PICK_ART[PICKUPS[e.pick].icon],mirror:false};
  if(e.m==='fire') return {sp:SPR.fire[((S.time*9)|0)%3],mirror:false};
  const sp=SPR[e.m];
  return {sp:Array.isArray(sp)?sp[(((S.time*5)|0)+((e.x*7)|0))%sp.length]:sp,mirror:!!e.mirror};
}
function drawSprite(e,s,hz,beamFall){
  const R=spriteFor(e), sp=R.sp; if(!sp) return;
  const dx=e.x-S.px, dy=e.y-S.py, inv=1/(S.plX*S.dirY-S.dirX*S.plY);
  const tx=inv*(S.dirY*dx-S.dirX*dy), ty=inv*(-S.plY*dx+S.plX*dy);
  if(ty<=.12) return;
  const scrX=((IW/2)*(1+tx/ty))|0, h=Math.abs((IH/ty)*(e.h||1.85)/1.85)|0;
  const w=Math.max(1,(h*(sp.w/sp.h)*MODE.par)|0);
  if(h<2||scrX+w<0||scrX-w>=IW) return;
  let lift=e.z||0;
  if(e.hover) lift+=.04+Math.sin(S.time*1.6+e.x)*.05;
  if(e.pick) lift+=.06+Math.sin(S.time*3+e.x*3)*.04;
  const ground=((hz+(IH/ty)/2+S.posZ/ty)-lift*IH/ty)|0, top=ground-h;
  const beam=coneLut[Math.max(0,Math.min(IW-1,scrX))];
  let ill=(lightAt(s,e.x,e.y)+beam/(1+ty*ty*beamFall))*S.light.exp+S.flash*(s.outdoor?.8:.15);
  if(DYN.length) ill+=dynAt(e.x,e.y);
  ill*=Math.max(.18,1-ty/VIEWD*MODE.dim);
  if(e.lit) ill=Math.max(ill,e.lit);
  const f=Math.pow(Math.min(1.6,Math.max(.1,ill)),.82);
  if(!e.hover&&!e.trans&&!e.pick&&e.m!=='fire'&&e.kind!=='echo'&&!(e.z>.2)&&(e.look||e.car||e.kind==='prop'))
    contactShadow(scrX,ground,w,ty,e.car?.55:.42);
  const px=sp.px, sw=sp.w, sh=sp.h, mir=R.mirror, trans=e.trans, flash=e.flash>0, tele=e.tele>0&&((S.time*14)|0)%2===0, fk=(e.lit||e.emit)?fogAt(ty)>>1:fogAt(ty);
  const white=q(rgb(242,240,236)), x0=Math.max(0,scrX-(w>>1)), x1=Math.min(IW-1,scrX-(w>>1)+w-1);
  const yS=Math.max(0,top), yE=Math.min(IH-1,ground-1), shim=(S.time*18)|0;
  for(let x=x0;x<=x1;x++){
    if(ty>=zbuf[x]) continue;
    let u=(((x-(scrX-(w>>1)))*sw/w)|0); if(u<0||u>=sw) continue; if(mir) u=sw-1-u;
    for(let y=yS;y<=yE;y++){
      if(trans&&((x+y+shim)&1)) continue;           // dithered translucency
      const v=(((y-top)*sh/h)|0); if(v<0||v>=sh) continue;
      const c=px[v*sw+u]; if(!c) continue;
      let o=flash?white:shadeOne(c,f);
      if(tele){ o=(0xFF000000|(((((o>>16)&255)*.45)|0)<<16)|(((((o>>8)&255)*.5)|0)<<8)|Math.min(255,(o&255)+110))>>>0; if(MODE.quantise) o=q(o); }
      fb[y*IW+x]=fk?fogMix(o,fk):o;
    }
  }
}
function drawParticles(hz){
  const inv=1/(S.plX*S.dirY-S.dirX*S.plY);
  for(const p of PARTS){
    const dx=p.x-S.px, dy=p.y-S.py, tx=inv*(S.dirY*dx-S.dirX*dy), ty=inv*(-S.plY*dx+S.plX*dy);
    if(ty<=.15) continue;
    const sx=((IW/2)*(1+tx/ty))|0, sy=((hz+(IH/ty)/2+S.posZ/ty)-p.z*IH/ty)|0, sz=Math.max(1,(p.size*IH/ty)|0);
    const fade=Math.min(1,p.life*2), c=q(rgb(p.col[0]*fade,p.col[1]*fade,p.col[2]*fade));
    for(let x=sx;x<sx+sz;x++){ if(x<0||x>=IW||ty>=zbuf[x]) continue;
      for(let y=sy;y<sy+sz;y++){ if(y>=0&&y<IH) fb[y*IW+x]=c; } }
  }
}
function resetRain(){
  RAIN.length=0; const n=Math.round(150*(S.light?S.light.rain:1)*(IW/320));
  for(let i=0;i<n;i++) RAIN.push({x:Math.random()*IW,y:Math.random()*IH,s:1.4+Math.random()*1.2,l:3+((Math.random()*5)|0)});
}
function drawRain(dt){
  if(!S.sector.outdoor||!RAIN.length) return;
  const c1=q(rgb(158,170,184)), c2=q(rgb(96,106,120)), drift=S.driving?Math.abs(S.driving.speed)*.05:0;
  for(const d of RAIN){
    d.y+=d.s*IH*dt; d.x-=(.1+drift)*IW*dt;
    if(d.y>IH){ d.y=-d.l; d.x=Math.random()*IW; } if(d.x<0) d.x+=IW;
    const x0=d.x|0, y0=d.y|0;
    for(let k=0;k<d.l;k++){ const y=y0+k, x=x0-((k*.35)|0); if(y<0||y>=IH||x<0||x>=IW) continue; fb[y*IW+x]=k>=d.l-2?c1:c2; }
  }
}

/* ── first-person viewmodel ─────────────────────────────────────────────── */
function drawViewmodel(){
  if(S.driving||S.cut||!VM) return;
  const W=WEAPONS[S.weapon], sp=VM[S.weapon==='journal'?(S.channel>0?'journalLit':'journal'):S.weapon]; if(!sp) return;
  const k=IH/200, sc=sp.scale||1, dw=(sp.w*sc*k*MODE.par)|0, dh=(sp.h*sc*k)|0;
  let ox=IW/2-dw/2+Math.sin(S.bob)*5*k*S.bobAmp+S.sway*7*k;
  let oy=IH-dh+Math.abs(Math.cos(S.bob))*4*k*S.bobAmp+S.recoil*9*k+S.switchT*dh*2.4+(S.ground?0:-S.vz*3*k)+S.landDip*120*k+(S.crouch?6*k:0);
  if(S.swing>0&&W.swingT){ const p=1-S.swing/W.swingT, a=Math.sin(p*Math.PI); ox-=a*46*k; oy-=a*12*k; }
  if(S.channel>0){ oy-=Math.sin(S.time*3)*2*k; }
  let ill=lightAt(S.sector,S.px,S.py)*S.light.exp+(S.torchOn&&S.battery>0?.35:0)+S.muzzle*2.2+S.flash*(S.sector.outdoor?.6:.1)+dynAt(S.px,S.py)*.8;
  const f=Math.pow(Math.min(1.5,Math.max(.12,ill)),.82), px=sp.px, sw=sp.w, sh=sp.h;
  for(let y=0;y<dh;y++){ const ty=(oy+y)|0; if(ty<0||ty>=IH) continue; const v=(y*sh/dh)|0;
    for(let x=0;x<dw;x++){ const tx=(ox+x)|0; if(tx<0||tx>=IW) continue;
      const c=px[v*sw+((x*sw/dw)|0)]; if(c) fb[ty*IW+tx]=shadeOne(c,f); } }
  if(S.muzzle>.04&&W.muzzle){
    const m=MUZZLE, sc=.8+S.muzzle*1.8, mw=(m.w*k*sc)|0, mh=(m.h*k*sc)|0;
    const cx=ox+W.muzzle[0]*k*MODE.par-mw/2, cy=oy+W.muzzle[1]*k-mh/2;
    for(let y=0;y<mh;y++){ const ty=(cy+y)|0; if(ty<0||ty>=IH) continue;
      for(let x=0;x<mw;x++){ const tx=(cx+x)|0; if(tx<0||tx>=IW) continue;
        const c=m.px[((y*m.h/mh)|0)*m.w+((x*m.w/mw)|0)]; if(c) fb[ty*IW+tx]=shadeOne(c,1); } }
  }
}

/* ── ASCII as a post-process ────────────────────────────────────────────── */
const RAMP=" .,:;-~=+*#%&@$";
function asciiPass(amount){
  const CW=6, CH=10, cols=(IW/CW)|0, rows=(IH/CH)|0, sw=over.width, sh=over.height, sx=sw/IW, sy=sh/IH;
  octx.clearRect(0,0,sw,sh);
  octx.font=`${Math.round(CH*sy)}px ${FONT}`; octx.textBaseline='top'; octx.textAlign='left';
  for(let cy=0;cy<rows;cy++) for(let cx=0;cx<cols;cx++){
    if(amount<1&&noise(cx,cy+((S.time*3)|0))>amount) continue;
    let r=0,g=0,b=0;
    for(let y=0;y<CH;y+=2) for(let x=0;x<CW;x+=2){ const c=fb[(cy*CH+y)*IW+cx*CW+x]; r+=c&255; g+=(c>>8)&255; b+=(c>>16)&255; }
    const n=(CH/2)*(CW/2); r/=n; g/=n; b/=n;
    const lum=(r*.3+g*.59+b*.11)/255;
    octx.fillStyle=`rgb(${r|0},${g|0},${b|0})`; octx.fillRect(cx*CW*sx,cy*CH*sy,CW*sx+1,CH*sy+1);
    const ch=RAMP[Math.min(RAMP.length-1,(lum*RAMP.length)|0)]; if(ch===' ') continue;
    octx.fillStyle=`rgb(${Math.min(255,r*1.9)|0},${Math.min(255,g*1.9)|0},${Math.min(255,b*1.9)|0})`;
    octx.fillText(ch,cx*CW*sx,cy*CH*sy);
  }
}

/* ── HUD ────────────────────────────────────────────────────────────────── */
const PCV=document.createElement('canvas'); PCV.width=21; PCV.height=24;
const PCTX=PCV.getContext('2d');
function buildPortrait(){
  const p=portraitOf(costumeLook()), id=PCTX.createImageData(21,24), o=new Uint32Array(id.data.buffer);
  for(let i=0;i<p.px.length;i++) o[i]=p.px[i]?(p.px[i]|0xFF000000)>>>0:0;
  PCTX.putImageData(id,0,0);
}
function txt(s,x,y,size,col,align='left',base='top'){
  octx.font=`${Math.round(size)}px ${FONT}`; octx.fillStyle=col; octx.textAlign=align; octx.textBaseline=base; octx.fillText(s,x,y);
}
function plate(x,y,w,h){ octx.fillStyle='rgba(6,8,10,.74)'; octx.fillRect(x,y,w,h);
  octx.strokeStyle='rgba(60,72,80,.6)'; octx.lineWidth=1; octx.strokeRect(x+.5,y+.5,w-1,h-1); }
function barH(x,y,w,h,v,col,bg='rgba(255,255,255,.08)'){ octx.fillStyle=bg; octx.fillRect(x,y,w,h); octx.fillStyle=col; octx.fillRect(x,y,w*clamp(v,0,1),h); }

function drawHUD(){
  const W=over.width, H=over.height, u=H/200;
  octx.save(); octx.imageSmoothingEnabled=false;
  /* damage, low health, ward */
  const hurtA=Math.max(S.hurt*.55, S.hp<35&&!S.cut?.16+.12*Math.sin(S.time*5):0);
  if(hurtA>.01){ const g=octx.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,H*.85);
    g.addColorStop(0,'rgba(120,0,0,0)'); g.addColorStop(1,`rgba(160,12,12,${hurtA.toFixed(3)})`); octx.fillStyle=g; octx.fillRect(0,0,W,H); }
  /* dread closes the edges of the frame in, in time with a heartbeat */
  if((S.dread||0)>.05&&!S.cut){ const beat=Math.pow(Math.max(0,Math.sin(S.time*(2.2+S.dread*2.6))),8)*.18*S.dread;
    const a=Math.min(.78,S.dread*.55+beat), g=octx.createRadialGradient(W/2,H/2,H*(.62-S.dread*.28),W/2,H/2,H*.95);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,`rgba(8,0,2,${a.toFixed(3)})`); octx.fillStyle=g; octx.fillRect(0,0,W,H); }
  if(S.ward>0){ const g=octx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.9);
    g.addColorStop(0,'rgba(80,120,200,0)'); g.addColorStop(1,`rgba(110,150,230,${(.22*Math.min(1,S.ward/2)).toFixed(3)})`); octx.fillStyle=g; octx.fillRect(0,0,W,H); }
  if(S.cut||S.fade>0){
    if(S.cut&&S.cut.def.letterbox){ const b=H*.11; octx.fillStyle='#000'; octx.fillRect(0,0,W,b); octx.fillRect(0,H-b,W,b);
      txt('Enter — skip',W-10*u,H-b/2,5*u,'rgba(150,160,168,.65)','right','middle'); }
    if(S.fade>0){ octx.fillStyle=`rgba(40,0,0,${S.fade.toFixed(3)})`; octx.fillRect(0,0,W,H); }
    octx.restore(); return;
  }
  /* crosshair */
  const cx=W/2, cy=H/2+S.pitch*(H/IH), Wn=WEAPONS[S.weapon];
  let aim=null; if(!S.driving){ const h=hitscan(S.angle,Wn.range||12); aim=h.e; }
  const ccol=aim?'rgba(230,80,70,.95)':'rgba(230,224,210,.8)';
  octx.strokeStyle=ccol; octx.lineWidth=Math.max(1,u*.6);
  if(!S.driving){
    if(Wn.kind==='melee'){ octx.beginPath(); octx.arc(cx,cy,3*u,0,Math.PI*2); octx.stroke(); }
    else if(Wn.kind==='rite'){ octx.beginPath(); octx.moveTo(cx,cy-3.5*u); octx.lineTo(cx+3.5*u,cy); octx.lineTo(cx,cy+3.5*u); octx.lineTo(cx-3.5*u,cy); octx.closePath(); octx.stroke(); }
    else { const g=2*u, l=3*u; octx.beginPath();
      octx.moveTo(cx-g-l,cy); octx.lineTo(cx-g,cy); octx.moveTo(cx+g,cy); octx.lineTo(cx+g+l,cy);
      octx.moveTo(cx,cy-g-l); octx.lineTo(cx,cy-g); octx.moveTo(cx,cy+g); octx.lineTo(cx,cy+g+l); octx.stroke(); }
    if(aim&&aim.maxHp){ barH(cx-14*u,cy-12*u,28*u,1.6*u,aim.hp/aim.maxHp,aim.etype==='ghost'?'#7fd6ec':'#c45050'); }
  }
  /* rite progress */
  if(S.weapon==='journal'&&!S.driving){
    const R=RITES[S.rite], known=S.rites.has(S.rite), cool=Math.max(0,(S.riteCool[S.rite]||0)-S.time);
    txt(R.name+(known?'':'  · unknown')+(cool>0?`  · ${cool.toFixed(1)}s`:''),cx,cy+12*u,5.4*u,known?'#cfe0ff':'#6d7b83','center');
    if(S.channel>0) barH(cx-30*u,cy+20*u,60*u,2.2*u,S.channel,'#9cc4ff','rgba(120,150,200,.15)');
    txt(`hold ${keyName('fire')} to chant · ${keyName('alt')} for next rite`,cx,cy+25*u,4.2*u,'rgba(150,160,170,.6)','center');
  }
  /* interaction prompt */
  if(!dlg.open&&!S.menu){ const t=lookTarget();
    if(t){ const s=`${keyName('interact')}   ${t.label}`; octx.font=`${Math.round(6*u)}px ${FONT}`; const tw=octx.measureText(s).width;
      plate(cx-tw/2-6*u,H*.66,tw+12*u,10*u); txt(s,cx,H*.66+5*u,6*u,'#e8dcc4','center','middle'); } }

  const v=u*S.settings.hud;
  /* left panel: portrait, health, armour, stamina, special */
  const px=6*v, py=H-50*v, pw=134*v, ph=44*v; plate(px,py,pw,ph);
  const hcol=S.hero==='dean'?'#c07440':'#7fa6d6';
  octx.fillStyle=hcol; octx.fillRect(px+4*v,py+4*v,32*v,36*v);
  /* painted bust; the expression tracks health: steady, grim, hurt */
  octx.imageSmoothingEnabled=false;
  octx.drawImage(portraitCanvas(costumeLook(),S.hp<35?2:S.hp<70?1:0),px+5.6*v,py+4*v,28.8*v,36*v);
  const shownHP=S.lieHP>0?100:Math.max(0,Math.ceil(S.hp));
  const hpc=shownHP<35?'#e05a4a':shownHP<60?'#d9a441':'#e8dcc4';
  txt(String(shownHP),px+42*v,py+4*v,17*v,hpc);
  txt('HEALTH',px+42*v,py+22*v,4.2*v,'#6d7b83');
  txt(`ARMOUR ${Math.ceil(S.armor)}`,px+78*v,py+6*v,5*v,S.armor>0?'#9fb4cc':'#4a565c');
  txt(`MED ×${S.meds}  (B)`,px+78*v,py+14*v,5*v,S.meds>0?'#d47a7a':'#4a565c');
  barH(px+42*v,py+29*v,86*v,1.8*v,S.stamina/100,'#d9a441');
  const sready=S.special>=100;
  barH(px+42*v,py+34*v,86*v,1.8*v,S.special/100,sready?'#18c866':'#3c6e52');
  txt(`${keyName('special')}  ${S.cfg.special.name}${sready?' — ready':''}`,px+42*v,py+37*v,4.4*v,sready?'#18c866':'#5d6b73');
  if(S.ward>0) txt(`WARD ${S.ward.toFixed(0)}s`,px+110*v,py+22*v,4.4*v,'#9cc4ff');

  /* right panel: weapon, ammunition, slots */
  const rw=124*v, rx=W-rw-6*v, ry=H-50*v; plate(rx,ry,rw,44*v);
  const ammo=Wn.ammo?S.ammo[Wn.ammo]:null;
  txt(Wn.name.toUpperCase(),rx+6*v,ry+5*v,4.8*v,'#8b95a0');
  txt(ammo===null?(Wn.kind==='rite'?`${S.rites.size} RITES`:'—'):String(ammo),rx+6*v,ry+12*v,17*v,ammo===0?'#e05a4a':'#e8dcc4');
  if(S.torchOn||S.battery<100) txt(`TORCH ${Math.ceil(S.battery)}%${S.torchOn?' ON':''}`,rx+rw-6*v,ry+14*v,4.6*v,S.battery<22?'#e05a4a':'#d9a441','right');
  txt(`$${S.cash}`,rx+rw-6*v,ry+22*v,5.4*v,'#18c866','right');
  const sw_=(rw-10*v)/WEAPON_ORDER.length;
  WEAPON_ORDER.forEach((wid,i)=>{ const blade=wid==='knife'&&typeof BLADES!=='undefined', own_=S.owned.has(wid)||(blade&&BLADES.some(b=>S.owned.has(b))), sel=wid===S.weapon||(blade&&BLADES.includes(S.weapon)), bx=rx+6*v+i*sw_, by=ry+33*v;
    octx.fillStyle=sel?'#d9a441':own_?'rgba(200,200,190,.12)':'rgba(255,255,255,.03)'; octx.fillRect(bx,by,sw_-2.5*v,7*v);
    txt(String(i+1),bx+(sw_-2.5*v)/2,by+3.6*v,4.6*v,sel?'#0b0705':own_?'#cbbfae':'#3f4a50','center','middle'); });

  if(S.driving){ const sp=Math.abs(S.driving.speed*8)|0;
    plate(cx-40*u,H-26*u,80*u,18*u); txt(`${sp} MPH`,cx,H-21*u,8*u,'#e8dcc4','center');
    txt(S.highBeam?'HIGH BEAMS':'LOW BEAMS',cx,H-12*u,4.2*u,'#d9a441','center'); }

  drawMinimap();
  octx.restore();
}

/* ── maps ───────────────────────────────────────────────────────────────── */
const POI_GLYPH={door:'▯',car:'▬',term:'▮',npc:'●',note:'·'};
const POI_COL={door:'#d9a441',car:'#9aa6ad',term:'#18c866',npc:'#e0d3bd',note:'#5d6b73'};
function drawMap(ox,oy,w,h,cell,centred,labels){
  const s=S.sector, seen=s.seen, cx=centred?S.px:s.W/2, cy=centred?S.py:s.H/2;
  const X=ox+w/2-cx*cell, Y=oy+h/2-cy*cell;
  octx.save(); octx.beginPath(); octx.rect(ox,oy,w,h); octx.clip();
  octx.fillStyle='rgba(6,8,10,.88)'; octx.fillRect(ox,oy,w,h);
  for(let y=0;y<s.H;y++) for(let x=0;x<s.W;x++){
    if(seen&&!seen[y*s.W+x]) continue;
    const px=X+x*cell, py=Y+y*cell; if(px+cell<ox||py+cell<oy||px>ox+w||py>oy+h) continue;
    const ch=s.grid[y][x];
    octx.fillStyle=SOLID.includes(ch)?(ch==='+'?'#d9a441':ch==='T'?'#18c866':'#55636b'):(ch==='.'?'#1b2226':ch===','?'#232c31':'#161d21');
    octx.fillRect(px,py,Math.ceil(cell),Math.ceil(cell));
  }
  for(const e of s.entities){
    if(e.dead||e.hidden||e.echo) continue;
    if(seen&&!seen[(e.y|0)*s.W+(e.x|0)]) continue;
    let col=null;
    if(e.kind==='pickup') col='#e8c860';
    else if(e.kind==='enemy'&&e.state!=='dormant'&&Math.hypot(e.x-S.px,e.y-S.py)<9) col='#e0504a';
    else if(e.kind==='brother') col='#7fa6d6';
    if(col){ octx.fillStyle=col; octx.fillRect(X+e.x*cell-cell*.45,Y+e.y*cell-cell*.45,cell*.9,cell*.9); }
    else if(typeof unexamined==='function'&&unexamined(e)){ const mx=X+e.x*cell, my=Y+e.y*cell, r=Math.max(2,cell*.55); octx.strokeStyle='#ffe8b0'; octx.lineWidth=1; octx.beginPath(); octx.moveTo(mx,my-r); octx.lineTo(mx+r,my); octx.lineTo(mx,my+r); octx.lineTo(mx-r,my); octx.closePath(); octx.stroke(); }
  }
  const mk=markerHere();
  if(mk){ const px=X+mk.x*cell, py=Y+mk.y*cell, pulse=.55+.45*Math.sin(S.time*4);
    octx.strokeStyle=`rgba(217,164,65,${pulse.toFixed(2)})`; octx.lineWidth=Math.max(1.5,cell*.22);
    octx.beginPath(); octx.arc(px,py,cell*1.6,0,Math.PI*2); octx.stroke();
    octx.fillStyle='#d9a441'; octx.beginPath(); octx.arc(px,py,Math.max(1.5,cell*.42),0,Math.PI*2); octx.fill(); }
  if(labels&&s.pois){ octx.font=`${Math.max(9,cell*1.4)}px ${FONT}`; octx.textBaseline='middle'; octx.textAlign='left';
    for(const p of s.pois){ if(seen&&!seen[(p.y|0)*s.W+(p.x|0)]) continue;
      const px=X+p.x*cell, py=Y+p.y*cell;
      octx.fillStyle=POI_COL[p.kind]||'#8b95a0'; octx.fillText(POI_GLYPH[p.kind]||'·',px-cell*.5,py);
      octx.fillStyle='#a5b0b8'; octx.fillText(p.name,px+cell*1.2,py); } }
  const a=S.angle, r=Math.max(3,cell*1.1), px=X+S.px*cell, py=Y+S.py*cell;
  octx.fillStyle='#e6ddcc'; octx.beginPath();
  octx.moveTo(px+Math.cos(a)*r,py+Math.sin(a)*r); octx.lineTo(px+Math.cos(a+2.5)*r*.8,py+Math.sin(a+2.5)*r*.8);
  octx.lineTo(px+Math.cos(a-2.5)*r*.8,py+Math.sin(a-2.5)*r*.8); octx.closePath(); octx.fill();
  octx.restore();
  octx.strokeStyle='#2a343a'; octx.lineWidth=1; octx.strokeRect(ox+.5,oy+.5,w-1,h-1);
}
function drawMinimap(){
  const W=over.width, H=over.height, size=Math.round(Math.min(W,H)*.26), pad=Math.round(H*.025);
  drawMap(W-size-pad,pad,size,size,size/22,true,false);
  const o=objective();
  if(o) txt(objTitle(o),W-pad,pad+size+5,Math.max(10,H*.024),'#d9a441','right');
}
function drawFullMap(){
  const W=over.width, H=over.height, s=S.sector, u=H/200;
  octx.save(); octx.fillStyle='rgba(4,6,7,.94)'; octx.fillRect(0,0,W,H);
  const mw=Math.round(W*.6), mh=Math.round(H*.8), mx=Math.round(W*.04), my=Math.round(H*.12);
  drawMap(mx,my,mw,mh,Math.min(mw/s.W,mh/s.H),false,true);
  const fs=Math.max(11,Math.round(5.6*u));
  txt(s.name,mx,H*.05,fs*1.2,'#cbbfae');
  const lx=mx+mw+W*.035, maxW=W-lx-fs; let ly=my;
  txt('OBJECTIVES',lx,ly,fs,'#5d6b73'); ly+=fs*2;
  /* only this act's list: four acts of objectives would run off the screen */
  const actOf=o=>o.act||1, cur=objective(), act=cur?actOf(cur):S.act;
  OBJECTIVES.forEach((o,i)=>{
    if(actOf(o)!==act) return;
    const st=i<S.obj?'done':i===S.obj?'now':'later';
    txt((st==='done'?'[x] ':st==='now'?'[>] ':'[ ] ')+(st==='now'?objTitle(o):o.title),lx,ly,fs,st==='done'?'#3f4a50':st==='now'?'#d9a441':'#7a8790');
    ly+=fs*1.5;
    if(st==='now'){ ly=wrapText(o.detail,lx+fs,ly,maxW-fs,fs*.92,'#8b95a0'); txt('→ '+SECTORS[o.sector].name,lx+fs,ly,fs*.92,'#5d6b73'); ly+=fs*1.7; }
  });
  ly+=fs*.6; txt('LEGEND',lx,ly,fs,'#5d6b73'); ly+=fs*1.7;
  for(const [k,l] of [['door','Door'],['npc','Person'],['term','Terminal'],['car','Vehicle']]){
    txt(POI_GLYPH[k],lx,ly,fs,POI_COL[k]); txt(l,lx+fs*1.6,ly,fs,'#8b95a0'); ly+=fs*1.35; }
  octx.fillStyle='#e8c860'; octx.fillRect(lx,ly+fs*.3,fs*.6,fs*.6); txt('Pickup',lx+fs*1.6,ly,fs,'#8b95a0'); ly+=fs*1.35;
  octx.fillStyle='#e0504a'; octx.fillRect(lx,ly+fs*.3,fs*.6,fs*.6); txt('Hostile, nearby',lx+fs*1.6,ly,fs,'#8b95a0'); ly+=fs*1.35;
  octx.fillStyle='#7fa6d6'; octx.fillRect(lx,ly+fs*.3,fs*.6,fs*.6); txt(HEROES[HEROES[S.hero].brother].name,lx+fs*1.6,ly,fs,'#8b95a0');
  txt(`${keyName('map')} to close`,lx,my+mh-fs,fs,'#3f4a50');
  octx.restore();
}
function wrapText(text,x,y,maxW,size,col){
  octx.font=`${Math.round(size)}px ${FONT}`; const words=text.split(' '); let line='';
  for(const w of words){ if(octx.measureText(line+w+' ').width>maxW&&line){ txt(line,x,y,size,col); y+=size*1.35; line=w+' '; } else line+=w+' '; }
  if(line){ txt(line,x,y,size,col); y+=size*1.35; }
  return y;
}

/* ── DOM band and toasts ────────────────────────────────────────────────── */
const elToast=document.getElementById('toast'); let toastT=0;
function toast(m){ if(!m) return; elToast.textContent=m; elToast.classList.add('on'); toastT=2.4; }
function hudDOM(dt){
  const set=(id,v,on)=>{ const g=document.getElementById(id); g.querySelector('span').textContent=v; g.className='g'+(on?' on':''); };
  set('gWho',`${S.cfg.full} · ${(COSTUMES[S.hero][S.costume]||{name:'—'}).name}`);
  set('gCash','$'+S.cash, false);
  const o=objective(); set('gObj',o?objTitle(o):'—',!!o);
  set('gMode',(RENDERERS.find(r=>r.key===S.renderer)||{}).label||'');
  set('gLight',S.light.name);
  if(toastT>0){ toastT-=dt; if(toastT<=0) elToast.classList.remove('on'); }
}

/* ── frame ──────────────────────────────────────────────────────────────── */
function timers(dt,playing){
  S.cool=Math.max(0,S.cool-dt); S.swing=Math.max(0,S.swing-dt); S.recoil=Math.max(0,S.recoil-dt*5);
  S.switchT=Math.max(0,S.switchT-dt); S.muzzle=Math.max(0,S.muzzle-dt*2.6); S.kickT=Math.max(0,S.kickT-dt);
  S.ward=Math.max(0,S.ward-dt); S.luxT=Math.max(0,(S.luxT||0)-dt); S.hurt=Math.max(0,S.hurt-dt*1.6); S.shake=Math.max(0,S.shake-dt*2.4);
  if(!playing) return;
  S.special=Math.min(100,S.special+dt*2.2);
  if(S.healT>0){ S.healT-=dt; heal(40/1.2*dt); }
  if(S.torchOn){ S.battery=Math.max(0,S.battery-dt*.5); S.flicker=S.battery<22?(.35+Math.random()*.65):1;
    if(S.battery<=0){ S.torchOn=false; say('narr','The torch dies in your hand.'); } }
}
let last=performance.now();
/* The loop must never die: one thrown error used to stop requestAnimationFrame
   for good and leave a frozen, blank screen. Errors are reported once and the
   next frame is always scheduled. The first rAF timestamp can also be earlier
   than performance.now() at load, so dt is clamped at zero. */
let frameErr=null;
function frame(now){
  try{ frameBody(now); }
  catch(err){ if(!frameErr){ frameErr=err; console.error('Oakhaven frame error:',err); toastErr(err); } requestAnimationFrame(frame); }
}
function toastErr(err){ try{ toast('Something broke: '+(err&&err.message||err)+' — the game will keep running'); }catch(e){} }
function frameBody(now){
  const rdt=Math.max(0,Math.min(.05,((now||0)-last)/1000)); last=now;
  const dt=S.wheel?rdt*.2:rdt;                      // the quick wheel slows the world down
  S.time+=dt;
  pollPad(rdt); runLater(); cursorEdgeTurn(rdt); updateWheelPad(); updatePolish(rdt);
  if(!S.running){ updateBoot(dt); requestAnimationFrame(frame); return; }
  let playing=false;
  if(CTRL.open){ /* paused under the Controls page */ }
  else if(S.cut){ updateCutscene(dt); updateEntities(dt); }
  else if(S.transition>0){ S.transition-=dt;
    if(S.transition<=.35&&S.pending){ const d=S.pending; S.pending=null; enterSector(d.to,d.x,d.y,d.a); } }
  else if(!dlg.open&&!S.menu&&!S.mapOpen&&!S.caseOpen&&!S.dead){
    playing=true;
    updatePlayer(dt); updateCompanion(dt); updateEntities(dt); updatePickups();
    if(held('fire')&&!S.camMode&&!S.phoneOpen&&WEAPONS[S.weapon].kind!=='rite') fire();
    updateRite(dt); updateStory(dt); updateInvestigations(dt);
    S.seenT-=dt; if(S.seenT<=0){ S.seenT=1/12; markSeen(); checkObjective(); }
  }
  timers(dt,playing); updateParts(dt); updateWeather(dt);
  updateCamera(dt); updatePhone(dt); updateCases(dt);
  const SH=S.shake*S.settings.shake, j=SH>0?(Math.random()-.5)*SH*.035:0, A=S.angle+j+(S.camMode&&S.camMode.selfie?Math.PI:0);
  S.dirX=Math.cos(A); S.dirY=Math.sin(A); S.plX=-S.dirY*FOVP; S.plY=S.dirX*FOVP;
  const pitchSave=S.pitch; if(SH>0) S.pitch+=(Math.random()-.5)*SH*IH*.02;
  gatherDyn(); fogSetup(); render(); glowPass();
  { const ch=Math.max(S.glitchA||0,((S.dread||0)-.7)*1.5)*S.settings.intensity; if(ch>.12&&!S.cut) chromaPass(ch); }
  /* the hall where gravity has opinions: the world is drawn upside down */
  if(S.flipped){ const row=new Uint32Array(IW);
    for(let y=0;y<IH>>1;y++){ const a=y*IW, b=(IH-1-y)*IW; row.set(fb.subarray(a,a+IW)); fb.copyWithin(a,b,b+IW); fb.set(row,b); } }
  drawRain(dt); if(!S.camMode) drawViewmodel();
  S.pitch=pitchSave;
  if(S.transition>0){ const a=1-Math.abs(S.transition-.35)/.36, st=q(rgb(8,10,12));
    for(let i=0;i<IW*IH*a*.5;i++) fb[(Math.random()*IW*IH)|0]=st; }
  wctx.putImageData(img,0,0);
  if(S.snapNow) capturePhoto();
  const am=Math.max(S.ascii,S.cutAscii,(S.glitchA||0)*S.settings.intensity);
  if(am>0) asciiPass(am); else octx.clearRect(0,0,over.width,over.height);
  if(!S.mapOpen) drawGrain();
  if(S.mapOpen) drawFullMap(); else if(S.caseOpen){ } else if(S.camMode) drawCamHUD(); else { drawHUD(); if(!S.cut){ drawGlints(); drawCombatFeedback(); } }
  drawTutorial();
  drawCard(dt); if(!S.cut) drawSaveIcon(dt); drawWheel(rdt);
  hudDOM(dt); updateSubs(dt);
  mouse.lOnce=false; for(const k in keys) if(k[0]==='1') keys[k]=false;
  requestAnimationFrame(frame);
}

/* ═══ Boot screen ═══════════════════════════════════════════════════════
   Renderer, light, sound and subtitles are chosen before you start, and the
   hunter cards show each costume turning in place, so you can see who you're
   about to be. */
function syncPickers(){
  document.querySelectorAll('.rp').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.r===S.renderer)));
  document.querySelectorAll('.lp').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.l===S.preset)));
  document.querySelectorAll('.sp').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.s==='on')===S.settings.sound)));
  document.querySelectorAll('.tp').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.t==='on')===S.settings.subs)));
  const r=RENDERERS.find(x=>x.key===S.renderer); const n=document.getElementById('rnote'); if(n) n.textContent=r?r.note:'';
  for(const h of ['dean','sam']){
    document.querySelectorAll(`.chips[data-h="${h}"] .chip`).forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.c===BOOT.costume[h])));
    const p=document.querySelector(`.perk[data-h="${h}"]`); if(p) p.textContent=COSTUMES[h][BOOT.costume[h]].perk;
  }
}
document.querySelectorAll('.rp').forEach(b=>b.onclick=()=>{ setRenderer(b.dataset.r); syncPickers(); });
document.querySelectorAll('.lp').forEach(b=>b.onclick=()=>{ applyPreset(b.dataset.l); syncPickers(); });
document.querySelectorAll('.sp').forEach(b=>b.onclick=()=>{ S.settings.sound=b.dataset.s==='on'; syncPickers(); });
document.querySelectorAll('.tp').forEach(b=>b.onclick=()=>{ S.settings.subs=b.dataset.t==='on'; syncPickers(); });
for(const h of ['dean','sam']){
  const host=document.querySelector(`.chips[data-h="${h}"]`);
  if(host) for(const [k,c] of Object.entries(COSTUMES[h])){
    const b=document.createElement('button'); b.className='chip'; b.dataset.c=k; b.textContent=c.name;
    b.onclick=()=>{ BOOT.costume[h]=k; syncPickers(); }; host.appendChild(b);
  }
}
document.querySelectorAll('.go').forEach(b=>b.onclick=()=>begin(b.dataset.h));
let bootT=0;
function updateBoot(dt){
  bootT=Math.max(0,bootT+dt);
  const views=[['front',false],['side',false],['back',false],['side',true]], [v,m]=views[Math.floor(bootT/1.3)%4];
  const fr=1+((bootT*3.4|0)&1);
  document.querySelectorAll('canvas.port[data-h]').forEach(cv=>{
    const sp=charSet(COSTUMES[cv.dataset.h][BOOT.costume[cv.dataset.h]].look)[v][fr];
    const cx=cv.getContext('2d'), id=cx.createImageData(32,56), o=new Uint32Array(id.data.buffer);
    for(let y=0;y<56;y++) for(let x=0;x<32;x++){ const c=sp.px[y*32+(m?31-x:x)]; o[y*32+x]=c?(c|0xFF000000)>>>0:0; }
    cx.putImageData(id,0,0);
  });
}
applyPreset('dusk'); setRenderer('doom'); syncPickers(); resize();
bootResume();
requestAnimationFrame(frame);
