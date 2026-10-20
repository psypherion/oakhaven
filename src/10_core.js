"use strict";
/* ═══════════════════════════════════════════════════════════════════════════
   OAKHAVEN — v4

   A raycaster in the Doom tradition: walls by DDA, floors and ceilings by row
   casting, characters as camera-facing sprites. v4 is where it becomes a game
   rather than a renderer: directional, animated characters built from a
   paper-doll system, a first-person weapon viewmodel, incantations, a store,
   pickups, a companion, weather, and cutscenes staged inside the engine.

   Source lives in src/ and is concatenated by build.py into one HTML file.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Pixel modes differ in pixel *geometry*, not art direction. Doom drew a
   320×200 buffer shown at 4:3, so pixels were 1.2× taller than wide, and it
   could not look up or down at all. Build engine games faked vertical look by
   shearing the horizon. */
const PIXEL_MODES = {
  doom:   {name:'Doom 320×200',   w:320, h:200, par:1.2, quantise:true,  pitch:'none',  dim:1.00},
  build:  {name:'Build 320×240',  w:320, h:240, par:1.2, quantise:true,  pitch:'shear', dim:0.82},
  modern: {name:'Modern 480×270', w:480, h:270, par:1.0, quantise:false, pitch:'shear', dim:0.55},
  crisp:  {name:'Crisp 640×400',  w:640, h:400, par:1.0, quantise:false, pitch:'shear', dim:0.55},
};
let MODE = PIXEL_MODES.doom;
let IW = MODE.w, IH = MODE.h;
const FOVP = 0.72, VIEWD = 26, LEVELS = 48;

const world = document.getElementById('world');
const over  = document.getElementById('over');
world.width = IW; world.height = IH;
const wctx = world.getContext('2d', {alpha:false});
const octx = over.getContext('2d');
let img  = wctx.createImageData(IW, IH);
let fb   = new Uint32Array(img.data.buffer);
let zbuf = new Float32Array(IW);
let coneLut = new Float32Array(IW);
let colAng  = new Float32Array(IW);
let colU    = new Int32Array(IW);
let dsArr = new Int32Array(IW), deArr = new Int32Array(IW);
function computeColAng(){ for(let x=0;x<IW;x++) colAng[x]=Math.atan((2*x/IW-1)*FOVP); }
computeColAng();

/* ── colour + maths ─────────────────────────────────────────────────────── */
/* Little-endian ABGR, so a pixel is one array store. Alpha 254 is a private
   marker meaning "emissive": eyes, bulbs, flames and headlights ignore scene
   lighting and always render at full colour. */
const rgb  = (r,g,b) => ((255<<24)|((b&255)<<16)|((g&255)<<8)|(r&255))>>>0;
const glow = (r,g,b) => ((254<<24)|((b&255)<<16)|((g&255)<<8)|(r&255))>>>0;
const clamp255 = v => v<0?0:v>255?255:v|0;
const C = a => rgb(a[0]|0, a[1]|0, a[2]|0);
const lerp = (a,b,t) => a+(b-a)*t;
const clamp = (v,a,b) => v<a?a:v>b?b:v;
function scaleC(c,f){
  const al=c>>>24;
  return ((al<<24)|(clamp255(((c>>16)&255)*f)<<16)|(clamp255(((c>>8)&255)*f)<<8)|clamp255((c&255)*f))>>>0;
}
function hash(x,y){ let h=(x*374761393+y*668265263)|0;
  h=(h^(h>>13))*1274126177|0; return ((h^(h>>16))>>>0)/4294967295; }
const noise = hash;
/* smooth value noise, periodic in x — used for the sky so clouds wrap */
function vnoise(x,y,period){
  const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
  const p=period||1e9, w=t=>t*t*(3-2*t);
  const x0=((xi%p)+p)%p, x1=(((xi+1)%p)+p)%p;
  const a=hash(x0,yi), b=hash(x1,yi), c=hash(x0,yi+1), d=hash(x1,yi+1);
  const u=w(xf), v=w(yf);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function mulberry(seed){ return ()=>{ seed|=0; seed=seed+0x6D2B79F5|0;
  let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }; }

/* ── 256-colour palette ─────────────────────────────────────────────────── */
/* Sixteen ramps of sixteen. Almost all of Doom's palette was ramps, which is
   why its shading reads as one coherent image. */
const PALETTE = new Uint32Array(256);
{
  const ramps = [
    [10,10,10, 236,236,236],  [14,10,6,  232,196,148],
    [12,6,4,   210,120,64],   [10,6,4,   170,86,48],
    [8,5,3,    150,110,62],   [10,8,5,   190,154,98],
    [4,8,6,    96,170,110],   [4,6,10,   96,140,206],
    [6,4,10,   140,104,200],  [12,4,6,   216,58,58],
    [10,10,4,  240,226,120],  [4,10,10,  120,206,214],
    [6,6,8,    136,146,164],  [8,6,5,    146,124,106],
    [3,3,4,    74,82,96],     [12,10,8,  255,240,206],
  ];
  for(let r=0;r<16;r++){
    const [r0,g0,b0,r1,g1,b1]=ramps[r];
    for(let i=0;i<16;i++){
      const t=Math.pow(i/15,0.78);
      PALETTE[r*16+i]=rgb((r0+(r1-r0)*t)|0,(g0+(g1-g0)*t)|0,(b0+(b1-b0)*t)|0);
    }
  }
}
/* Nearest-entry lookup precomputed over a 32³ cube, so quantising is O(1). */
const QCUBE = new Uint8Array(32768);
{
  const pr=[],pg=[],pb=[];
  for(let i=0;i<256;i++){ const c=PALETTE[i]; pr.push(c&255); pg.push((c>>8)&255); pb.push((c>>16)&255); }
  for(let r=0;r<32;r++) for(let g=0;g<32;g++) for(let b=0;b<32;b++){
    const R=r*8+4,G=g*8+4,B=b*8+4; let best=0,bd=1e9;
    for(let i=0;i<256;i++){
      const d=(pr[i]-R)**2*0.30+(pg[i]-G)**2*0.59+(pb[i]-B)**2*0.11;
      if(d<bd){bd=d;best=i;}
    }
    QCUBE[(r<<10)|(g<<5)|b]=best;
  }
}
const quant = c => PALETTE[QCUBE[(((c&255)>>3)<<10)|((((c>>8)&255)>>3)<<5)|(((c>>16)&255)>>3)]];

/* ── procedural textures, 64×64 ─────────────────────────────────────────── */
function tex(w,h,fn){ const px=new Uint32Array(w*h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) px[y*w+x]=fn(x,y);
  return {w,h,px}; }

const RAWT = {};
RAWT.brick = tex(64,64,(x,y)=>{
  const row=(y/8)|0, off=(row%2)*8, bx=(x+off)%16, by=y%8, n=noise(x,y)*22-8;
  if(bx===0||by===0) return rgb(clamp255(52+n*.4),clamp255(46+n*.4),clamp255(42+n*.4));
  const soot = y<10 ? (10-y)*3 : 0;
  return rgb(clamp255(124+n-soot),clamp255(66+n*.6-soot),clamp255(48+n*.5-soot));
});
RAWT.wood = tex(64,64,(x,y)=>{
  const plank=(y/11)|0;
  if(y%11===0) return rgb(38,28,20);
  if(x%29===4&&y%11===5) return rgb(96,90,84);
  const g=Math.sin(x*.55+plank*3.1)*7+noise(x,plank)*26-10;
  return rgb(clamp255(118+g),clamp255(84+g*.75),clamp255(52+g*.5));
});
RAWT.steel = tex(64,64,(x,y)=>{
  const c=Math.sin(x*.78)*.5+.5, n=noise(x,y)*16-8, rust=noise((x/7)|0,(y/7)|0), base=52+c*74+n;
  if(rust>.86) return rgb(clamp255(base*.9+44),clamp255(base*.55),clamp255(base*.35));
  return rgb(clamp255(base),clamp255(base+4),clamp255(base+7));
});
RAWT.glass = tex(64,64,(x,y)=>{
  if(x<3||x>60||y<3||y>60||Math.abs(x-32)<2||Math.abs(y-32)<2) return rgb(46,38,32);
  const s=clamp255(28+(x+y)%40*1.4+noise(x,y)*30);
  return rgb(clamp255(s*.5),clamp255(s*.8),clamp255(s));
});
RAWT.door = tex(64,64,(x,y)=>{
  const n=noise(x,y)*18-8;
  if((x-50)*(x-50)+(y-32)*(y-32)<9) return rgb(196,168,90);
  if(x<4||x>59||y<4||y>59) return rgb(clamp255(96+n),clamp255(62+n*.6),clamp255(38+n*.4));
  if(x>10&&x<53&&((y>10&&y<28)||(y>35&&y<53))) return rgb(clamp255(72+n),clamp255(46+n*.6),clamp255(28+n*.4));
  return rgb(clamp255(112+n),clamp255(74+n*.6),clamp255(46+n*.4));
});
RAWT.crt = tex(64,64,(x,y)=>{
  if(x<6||x>57||y<6||y>57) return rgb(40,42,44);
  const g=clamp255((60+noise(x,y)*90)*((y%3===0)?.55:1));
  return rgb(clamp255(g*.2),g,clamp255(g*.4));
});
RAWT.fog = tex(64,64,(x,y)=>{ const n=noise(x,y)*70+noise(x>>2,y>>2)*60;
  return rgb(clamp255(58+n*.5),clamp255(66+n*.5),clamp255(74+n*.5)); });
RAWT.shelf = tex(64,64,(x,y)=>{
  const row=(y/16)|0, ry=y%16;
  if(ry>=14) return rgb(84,60,40);
  const n=hash(((x/8)|0)+row*9,17), ih=4+((n*9)|0);
  if(ry<14-ih||(x%8)===0) return rgb(24,20,17);
  const pal=[[128,72,48],[64,96,74],[156,134,82],[78,76,118],[138,60,58],[96,96,92]];
  const c=pal[(n*6)|0], s=hash(x,y)*16;
  return rgb(clamp255(c[0]+s),clamp255(c[1]+s),clamp255(c[2]+s));
});
RAWT.paper = tex(64,64,(x,y)=>{
  if(y>=44){ const n=hash(x,y)*20-8;
    return (x%16===0)?rgb(52,36,26):rgb(clamp255(98+n),clamp255(70+n*.7),clamp255(46+n*.5)); }
  if(y===43) return rgb(70,50,36);
  const stripe=((x/8)|0)%2===0, stain=hash(x>>4,y>>4)>.82?24:0, n=hash(x,y)*14;
  let r=stripe?150:134, g=stripe?136:118, b=stripe?104:92;
  if(((x+4)%8===0)&&(y%10===5)){ r=112; g=60; b=60; }
  return rgb(clamp255(r+n-stain),clamp255(g+n-stain),clamp255(b+n-stain*1.2));
});
/* floors */
RAWT.asphalt = tex(64,64,(x,y)=>{ const n=noise(x,y)*46-18; return rgb(clamp255(58+n),clamp255(60+n),clamp255(62+n)); });
RAWT.walk    = tex(64,64,(x,y)=>{ if(x%16===0||y%16===0) return rgb(52,56,58);
  const n=noise(x,y)*30-12; return rgb(clamp255(104+n),clamp255(106+n),clamp255(100+n)); });
RAWT.dirt    = tex(64,64,(x,y)=>{ const n=noise(x,y)*54-20; return rgb(clamp255(84+n),clamp255(70+n),clamp255(50+n)); });
RAWT.boards  = tex(64,64,(x,y)=>{ if(y%16===0) return rgb(44,34,25);
  const g=Math.sin(x*.4)*8+noise(x,y)*22-9; return rgb(clamp255(104+g),clamp255(76+g*.7),clamp255(48+g*.5)); });
RAWT.conc    = tex(64,64,(x,y)=>{ const n=noise(x,y)*30-12+noise(x>>3,y>>3)*20;
  if(noise(x*3,y*7)>.985) return rgb(150,120,70);                     // sawdust
  const crack=Math.abs(x-y*.7-20)<.8&&y>10&&y<40, c=crack?50:100+n;
  return rgb(clamp255(c),clamp255(c*.98),clamp255(c*.94)); });
/* Upper storeys: the same material with a dark sash window, used above the
   ground floor on alternate tiles so a three-unit wall reads as a building. */
RAWT.brickwin = tex(64,64,(x,y)=>{
  if(x>=16&&x<=47&&y>=12&&y<=51){
    if(x<=18||x>=45||y<=14||y>=49||Math.abs(x-32)<=1||Math.abs(y-31)<=1) return rgb(62,54,46);
    const lit=hash(x>>4,y>>4)>.86, n=noise(x,y)*14;
    return lit?rgb(clamp255(150+n),clamp255(118+n),clamp255(60+n)):rgb(clamp255(22+n*.5),clamp255(26+n*.5),clamp255(32+n*.5));
  }
  if(y===52||y===53) return rgb(132,126,116);
  const row=(y/8)|0, off=(row%2)*8, bx=(x+off)%16, by=y%8, n=noise(x,y)*22-8;
  if(bx===0||by===0) return rgb(clamp255(52+n*.4),clamp255(46+n*.4),clamp255(42+n*.4));
  return rgb(clamp255(118+n),clamp255(62+n*.6),clamp255(46+n*.5));
});
RAWT.woodwin = tex(64,64,(x,y)=>{
  if(x>=18&&x<=45&&y>=14&&y<=49){
    if(x<=20||x>=43||y<=16||y>=47||Math.abs(x-31)<=1) return rgb(196,190,176);
    const n=noise(x,y)*12; return rgb(clamp255(20+n),clamp255(24+n),clamp255(28+n));
  }
  if(y%11===0) return rgb(38,28,20);
  const g=Math.sin(x*.55+((y/11)|0)*3.1)*7+noise(x,(y/11)|0)*26-10;
  return rgb(clamp255(112+g),clamp255(80+g*.75),clamp255(50+g*.5));
});
RAWT.paperup = tex(64,64,(x,y)=>{
  const stripe=((x/8)|0)%2===0, stain=hash(x>>4,(y+20)>>4)>.84?20:0, n=hash(x,y)*14;
  let r=stripe?150:134, g=stripe?136:118, b=stripe?104:92;
  if(((x+4)%8===0)&&(y%10===5)) { r=112; g=60; b=60; }
  if(y<3) { r=98; g=70; b=46; }                                  // picture rail
  return rgb(clamp255(r+n-stain),clamp255(g+n-stain),clamp255(b+n-stain*1.2));
});
RAWT.velvet = tex(64,64,(x,y)=>{
  const u=x%16-8, v=y%16-8, d=Math.abs(u)+Math.abs(v), n=noise(x,y)*14;
  const motif = d===6||(d<3&&((x+y)&1)) ? 26 : 0;            // flocked damask diamonds
  if(y>=48){ if(y===48) return rgb(150,118,60); const g=Math.sin(x*.5)*6+n; return rgb(clamp255(70+g),clamp255(40+g*.6),clamp255(28+g*.4)); }
  return rgb(clamp255(96+motif+n),clamp255(22+motif*.3+n*.4),clamp255(32+motif*.4+n*.5));
});
/* Act III onward: the town turned inside out. */
RAWT.flesh = tex(64,64,(x,y)=>{
  const n=noise(x,y)*26, m=noise(x>>2,y>>2)*40, w=Math.sin(x*.21+Math.sin(y*.13)*2.2)*.5+.5;
  const vein=Math.abs(Math.sin((x+Math.sin(y*.19)*7)*.17+y*.05))<.07||Math.abs(Math.sin((y+Math.sin(x*.23)*6)*.15))<.05;
  const pore=hash(x>>1,y>>1)>.985;
  if(pore) return rgb(40,10,16);
  if(vein) return rgb(clamp255(70+n*.4),clamp255(18+n*.2),clamp255(40+n*.3));
  const r=118+m*.8+w*30+n-22, g=46+m*.3+w*14+n*.4-10, b=52+m*.3+w*12+n*.4-8;
  return rgb(clamp255(r),clamp255(g),clamp255(b));
});
RAWT.veins = tex(64,64,(x,y)=>{
  const n=noise(x,y)*20, m=noise(x>>3,y>>3)*30;
  const vein=Math.abs(Math.sin((x*.7+y*.3)*.2+Math.sin(y*.11)*2))<.06;
  return vein?rgb(clamp255(96+n),20,clamp255(36+n*.5)):rgb(clamp255(46+m+n*.5),clamp255(20+m*.3),clamp255(26+m*.3));
});
RAWT.chapel = tex(64,64,(x,y)=>{
  const row=(y/16)|0, off=(row%2)*16, bx=(x+off)%32, by=y%16, n=noise(x,y)*18-6, st=noise(x>>3,y>>2)>.82?-26:0;
  if(bx===0||by===0) return rgb(clamp255(96+n*.5),clamp255(92+n*.5),clamp255(86+n*.5));
  return rgb(clamp255(164+n+st),clamp255(156+n+st),clamp255(142+n+st));
});
RAWT.stainglass = tex(64,64,(x,y)=>{
  const cx=x-32, cy=y-28, arch=y<14&&Math.abs(cx)>Math.sqrt(Math.max(0,196-(y-14)**2))+8;
  if(x<6||x>57||y<4||y>59||arch) return rgb(56,50,44);
  if(x%13===6||y%11===4||Math.abs(cx)<1) return rgb(24,22,22);
  const cell=((x/13)|0)*7+((y/11)|0)*3, pal=[[150,40,40],[40,70,140],[170,140,50],[50,110,70],[120,60,130]];
  const c=pal[cell%pal.length], g=noise(x,y)*30;
  return rgb(clamp255(c[0]+g),clamp255(c[1]+g),clamp255(c[2]+g));
});
RAWT.carpet = tex(64,64,(x,y)=>{
  const n=noise(x,y)*14, edge=x<4||x>59, gold=x===5||x===58;
  if(gold) return rgb(150,120,60);
  return edge?rgb(clamp255(40+n),clamp255(14+n*.4),clamp255(18+n*.4)):rgb(clamp255(98+n),clamp255(22+n*.4),clamp255(28+n*.4));
});
RAWT.plaster = tex(64,64,(x,y)=>{ const n=noise(x,y)*30-12, stain=noise(x>>3,y>>3);
  const b=140+n-(stain>.8?38:0); return rgb(clamp255(b),clamp255(b*.94),clamp255(b*.84)); });

/* Doom-style light tables: every texture pre-shaded into LEVELS copies,
   quantised to the palette where the mode calls for it. Lighting in the
   inner loop is then one array index. */
function shadeTable(t){
  const out=new Array(LEVELS);
  for(let l=0;l<LEVELS;l++){
    const f=Math.pow(l/(LEVELS-1),.82), a=new Uint32Array(t.px.length);
    for(let i=0;i<t.px.length;i++){
      const c=t.px[i];
      if(!(c>>>24)){ a[i]=0; continue; }
      const sh=rgb(((c&255)*f)|0,(((c>>8)&255)*f)|0,(((c>>16)&255)*f)|0);
      a[i]=MODE.quantise?quant(sh):sh;
    }
    out[l]=a;
  }
  return {w:t.w,h:t.h,lit:out};
}
const T = {};
function rebuildTables(){ for(const k in RAWT) T[k]=shadeTable(RAWT[k]); }
rebuildTables();

const lvl = v => { const l=(v*(LEVELS-1))|0; return l<0?0:l>LEVELS-1?LEVELS-1:l; };
/* Ordered dithering across the light steps, so receding floors don't band. */
const BAYER = new Float32Array(16), DITH = new Float32Array(16);
[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].forEach((v,i)=>{ BAYER[i]=v/16-.46; DITH[i]=BAYER[i]/(LEVELS-1); });
const dlvl = (v,x,y) => lvl(v+DITH[(x&3)+((y&3)<<2)]);

/* Per-pixel shading for sprites. Sprites cover a small share of the frame, so
   shading them directly is cheaper in memory than pre-shaded tables for every
   frame of every character. */
function shadeOne(c,f){
  let out;
  if((c>>>24)===254) out=(c|0xFF000000)>>>0;
  else {
    let r=(c&255)*f, g=((c>>8)&255)*f, b=((c>>16)&255)*f;
    if(r>255)r=255; if(g>255)g=255; if(b>255)b=255;
    out=((255<<24)|((b|0)<<16)|((g|0)<<8)|(r|0))>>>0;
  }
  return MODE.quantise?quant(out):out;
}

/* ── sprite drawing API ─────────────────────────────────────────────────── */
/* Everything visual that isn't a wall is drawn with these primitives: no
   binary assets, and every model can be re-coloured by code — which is what
   makes costumes cheap. */
function art(w,h,fn){
  const px=new Uint32Array(w*h);
  const A={w,h,px,
    set(x,y,c){ x=Math.round(x); y=Math.round(y); if(x>=0&&y>=0&&x<w&&y<h) px[y*w+x]=c; },
    get(x,y){ x=Math.round(x); y=Math.round(y); return (x<0||y<0||x>=w||y>=h)?0:px[y*w+x]; },
    rect(x0,y0,x1,y1,c){ for(let y=Math.round(y0);y<=Math.round(y1);y++) for(let x=Math.round(x0);x<=Math.round(x1);x++) A.set(x,y,c); },
    ell(cx,cy,rx,ry,c){
      for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
        const dx=(x-cx)/Math.max(.5,rx), dy=(y-cy)/Math.max(.5,ry); if(dx*dx+dy*dy<=1) A.set(x,y,c); } },
    disc(cx,cy,r,c){ A.ell(cx,cy,r,r,c); },
    line(x0,y0,x1,y1,c){ const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));
      for(let i=0;i<=n;i++){ const t=i/n; A.set(x0+(x1-x0)*t, y0+(y1-y0)*t, c); } },
    /* light from the upper left, for volume */
    shade(k=.2){ for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=y*w+x, c=px[i];
      if(!c||(c>>>24)===254) continue; px[i]=scaleC(c,1+k*.5-k*(x/w)-.05*(y/h)); } },
    /* a one-pixel dark outline is what makes a sprite read against any
       background — the single most important legibility pass */
    outline(c){ const src=px.slice();
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(src[y*w+x]) continue;
        if((x>0&&src[y*w+x-1])||(x<w-1&&src[y*w+x+1])||(y>0&&src[(y-1)*w+x])||(y<h-1&&src[(y+1)*w+x])) px[y*w+x]=c; } },
  };
  fn(A);
  return {w,h,px};
}
