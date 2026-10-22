/* ═══ The arsenal (1.7) ════════════════════════════════════════════════════
   · Every first-person weapon is redrawn at twice the resolution (240×180,
     shown at the same size), with turned metal, blued steel, walnut grain,
     checkering, engraving and specular highlights.
   · Three blades share slot 4: the demon blade (the old knife), the angel
     blade, and an archangel's blade. Press 4 again to change between them.
   · Divine weapons and armour that the Formless One, or the places he opens,
     can give you: the Ring of Severance (slot 8), the Mantle of Feathers, the
     Ash-plate, and Wren's Cloak. */

/* ── drawing helpers at 2× ────────────────────────────────────────────── */
const clampN=(v,a,b)=>v<a?a:v>b?b:v;
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
/* a lit cylinder from (x0,y0) radius r0 to (x1,y1) radius r1; light from the upper left */
function tube(A,x0,y0,x1,y1,r0,r1,base,o={}){
  const dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L, spec=o.spec??.9, rough=o.rough??0;
  const lx=-.62, ly=-.78, side=(nx*lx+ny*ly)>0?1:-1;
  const minx=Math.floor(Math.min(x0-r0,x1-r1)), maxx=Math.ceil(Math.max(x0+r0,x1+r1)), miny=Math.floor(Math.min(y0-r0,y1-r1)), maxy=Math.ceil(Math.max(y0+r0,y1+r1));
  for(let y=miny;y<=maxy;y++) for(let x=minx;x<=maxx;x++){
    const t=((x-x0)*dx+(y-y0)*dy)/(L*L); if(t<0||t>1) continue; const r=r0+(r1-r0)*t;
    const s=((x-x0)*nx+(y-y0)*ny)/r; if(Math.abs(s)>1) continue;
    const n=s*side, lamb=.42+.58*Math.max(0,Math.sqrt(1-s*s)*.55+n*.62), hl=Math.exp(-Math.pow((n-.55)/.16,2))*spec;
    let c=[base[0]*lamb+255*hl*.75,base[1]*lamb+255*hl*.75,base[2]*lamb+255*hl*.8];
    if(rough){ const g=(hash(x,y)-.5)*rough; c=[c[0]+g,c[1]+g,c[2]+g]; }
    A.set(x,y,C(c.map(v=>clampN(v,0,255)))); } }
/* a filled polygon with a per-pixel colour function */
function poly(A,pts,col){ let minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9; for(const [x,y] of pts){ minx=Math.min(minx,x); maxx=Math.max(maxx,x); miny=Math.min(miny,y); maxy=Math.max(maxy,y); }
  for(let y=Math.floor(miny);y<=Math.ceil(maxy);y++) for(let x=Math.floor(minx);x<=Math.ceil(maxx);x++){
    let inside=false; for(let i=0,j=pts.length-1;i<pts.length;j=i++){ const [xi,yi]=pts[i],[xj,yj]=pts[j];
      if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside; }
    if(inside){ const c=typeof col==='function'?col(x,y):col; if(c) A.set(x,y,typeof c==='number'?c:C(c)); } } }
const wood=(base,x,y,ang=.35)=>{ const g=Math.sin((x*Math.cos(ang)+y*Math.sin(ang))*.9+Math.sin(y*.21+x*.07)*2.2), k=.82+.18*g+(hash(x,y)-.5)*.08; return base.map(v=>clampN(v*k,0,255)); };
const blued=[52,58,72], steel=[118,124,136], bright=[176,182,194], gold=[206,166,74], silver=[196,202,214];
/* arms and hands at 2× */
function arm2(A,x0,y0,x1,y1,r0,r1,sl,sk){ for(let i=0;i<=80;i++){ const t=i/80, r=r0+(r1-r0)*t, c=t<.7?sl:t<.76?dk(sl,.6):sk;
    const x=x0+(x1-x0)*t, y=y0+(y1-y0)*t; A.ell(x,y,r,r*.92,C(dk(c,.82))); A.ell(x-r*.18,y-r*.2,r*.8,r*.72,C(c)); if(t<.7&&i%9===0) A.line(x-r*.6,y,x+r*.2,y-r*.5,C(dk(c,.7))); } }
function fist2(A,x,y,r,sk){ A.ell(x,y,r,r*.84,C(dk(sk,.84))); A.ell(x-r*.15,y-r*.18,r*.84,r*.68,C(sk));
  for(let k=-1.5;k<=1.5;k++) A.ell(x+k*r*.42,y-r*.62,r*.2,r*.16,C(dk(sk,.74)));
  A.line(x-r*.9,y+r*.1,x-r*.3,y+r*.35,C(dk(sk,.7))); A.set(x+r*.5,y-r*.2,C(mix(sk,[255,240,230],.35))); }
const finish2=A=>{ A.outline(rgb(8,7,8)); };
const wrap2=a=>{ a.scale=.5; return a; };

/* ── the guns ─────────────────────────────────────────────────────────── */
function vmRevolver(sl,sk,ench){ return wrap2(art(240,180,A=>{
  /* a big-bore single action seen from behind the hand: short heavy barrel, a fat fluted cylinder, walnut grip */
  tube(A,148,118,124,50,13,9,blued,{spec:1});                                    // barrel
  tube(A,156,116,134,58,4.5,3.4,dk(blued,.8),{spec:.5});                        // ejector housing
  for(let i=0;i<=40;i++){ const t=i/40; A.disc(124+(148-124)*t-(9+4*t)*.45,50+(118-50)*t-1,1.1,C([206,212,224])); }   // a line of light on the top flat
  A.ell(124,50,10,7,C([18,20,26])); A.ell(124,50,6,4.2,C([4,4,6])); A.ell(122,48,2,1.2,C([110,116,130]));            // the muzzle
  poly(A,[[119,38],[127,38],[126,45],[120,45]],C(bright)); A.line(119,38,127,38,C([240,242,248]));                    // front sight blade
  /* the cylinder: six flutes, lit from the upper left */
  for(let y=104;y<=150;y++) for(let x=126;x<=182;x++){ const u=(x-154)/28, v=(y-127)/23; if(u*u+v*v>1) continue;
    const fl=.5+.5*Math.cos((u+.08)*Math.PI*3.2), l=.55+.35*(-u*.6-v*.5)+fl*.22; let c=blued.map(q=>clampN(q*(.6+l)+ (fl>.94?70:0),0,255)); A.set(x,y,C(c)); }
  for(let k=0;k<6;k++){ const x=134+k*8.6; for(let y=0;y<30;y++){ const yy=112+y+Math.abs(k-2.5)*1.2; if(A.get(x,yy)) A.set(x,yy,C([18,20,26])); } }
  /* frame and top strap with a notch sight */
  poly(A,[[140,98],[184,102],[190,118],[178,122],[146,114]],(x,y)=>blued.map(c=>clampN(c*(1.5-(y-98)/30)+(y<101?60:0),0,255)));
  poly(A,[[160,94],[166,90],[172,94]],C([20,22,26]));
  /* hammer, cocked, checkered spur */
  tube(A,184,110,196,88,5,4,steel,{spec:.8}); for(let i=0;i<5;i++) A.line(188+i*1.5,90+i*2,194+i*1.5,92+i*2,C([36,38,44]));
  /* trigger guard and trigger */
  for(let a=0;a<=Math.PI;a+=.04){ A.disc(158+Math.cos(a)*13,148+Math.sin(a)*13,1.8,C(dk(blued,1.3))); }
  tube(A,158,148,162,160,2.2,1.6,steel,{spec:.6});
  /* walnut grip, checkered, with a medallion */
  poly(A,[[166,140],[194,132],[214,178],[180,180]],(x,y)=>{ const w=wood([124,74,40],x,y,1.0); const chk=((x+y)%5===0||(x-y+400)%5===0)&&y>148&&x>178&&x<206; return chk?dk(w,.6):w; });
  A.disc(192,158,4,C(gold)); A.disc(191,157,1.6,C([255,234,170]));
  if(ench.blessed) for(let i=0;i<8;i++) A.disc(128+i*2.6,58+i*7,1.1,glow(255,226,150));
  arm2(A,232,206,196,168,30,21,sl,sk); fist2(A,190,162,21,sk); A.ell(168,150,9,5.5,C(sk)); A.ell(166,148,6,3.4,C(mix(sk,[255,240,230],.2)));
  finish2(A); })); }
function vmShotgun(sl,sk,ench){ return wrap2(art(240,180,A=>{
  /* fore-end first: walnut, mostly hidden under the barrels, showing at the sides */
  poly(A,[[88,100],[152,100],[158,140],[82,140]],(x,y)=>{ const w=wood([126,76,40],x,y,.2); return (((x+y)&3)===0&&y>106&&y<134)?dk(w,.66):w; });
  /* receiver nearest you: case-hardened colour, scroll engraving */
  poly(A,[[90,146],[150,146],[156,180],[84,180]],(x,y)=>{ const ch=Math.sin(x*.31+y*.17)+Math.sin(x*.07-y*.29); return ch>1?[120,104,148]:ch>0?[160,150,128]:ch>-1?[104,116,136]:[138,126,104]; });
  for(let i=0;i<6;i++){ const cx=96+i*10, cy=164; for(let a=0;a<Math.PI*1.7;a+=.2) A.set(cx+Math.cos(a)*a*.9,cy+Math.sin(a)*a*.9,C([214,210,196])); }
  /* two barrels side by side, widening toward you, over the fore-end */
  tube(A,100,176,108,40,16,8,blued,{spec:1}); tube(A,140,176,130,40,16,8,blued,{spec:1});
  for(let y=44;y<176;y++){ const t=(y-40)/136, x=119+t*1; A.set(x,y,C([22,24,30])); }                                   // the seam between them
  tube(A,120,170,119,38,2.6,1.6,steel,{spec:.9}); A.disc(119,34,2.6,C([240,226,170])); A.disc(118,33,1,C([255,250,232]));  // rib and bead
  A.ell(108,40,8.5,6,C([22,24,28])); A.ell(108,40,5.6,3.8,C([4,4,6])); A.ell(130,40,8.5,6,C([22,24,28])); A.ell(130,40,5.6,3.8,C([4,4,6]));
  if(ench.iron) for(let i=0;i<8;i++) A.disc(96+i*6,128,1.3,glow(190,210,230));
  /* hands: the left one under the fore-end, the right on the wrist of the stock */
  arm2(A,6,206,56,150,30,21,sl,sk); fist2(A,78,128,21,sk);
  arm2(A,238,206,196,184,30,22,sl,sk); fist2(A,170,170,21,sk);
  finish2(A); })); }
function vmFlare(sl,sk){ return wrap2(art(240,180,A=>{ const or=[226,104,34];
  tube(A,140,92,112,46,14,11,or,{spec:.7,rough:10});
  A.ell(112,46,13,9,C([150,60,20])); A.ell(112,46,9.5,6.4,C([30,18,12])); A.ell(112,46,5,3.2,C([8,6,6]));
  poly(A,[[132,86],[166,88],[166,106],[132,104]],(x,y)=>dk(or,1.05-(y-86)/60)); A.disc(150,96,4,C([50,36,28])); A.disc(149,95,1.6,C([150,140,130]));
  tube(A,166,88,176,74,4,3,[60,52,46]);
  for(let a=0;a<=Math.PI;a+=.05) A.disc(146+Math.cos(a)*13,110+Math.sin(a)*14,2,C([170,70,26]));
  tube(A,146,110,148,122,2,1.6,[60,50,40]);
  poly(A,[[154,102],[176,98],[194,166],[170,172]],(x,y)=>((y>>2)&1)?dk(or,.86):or);
  poly(A,[[118,58],[126,58],[126,62],[118,62]],C([255,240,200])); A.line(119,60,125,60,C([200,30,30]));
  arm2(A,226,200,186,160,30,20,sl,sk); fist2(A,180,150,20,sk); A.ell(160,118,8,5,C(sk));
  finish2(A); })); }
function vmCrowbar(sl,sk,ench){ return wrap2(art(240,180,A=>{ const iron=[70,70,78];
  tube(A,186,180,92,30,7,5,iron,{spec:.7,rough:18});
  for(let a=0;a<Math.PI*.95;a+=.05) A.disc(92-Math.sin(a)*12,30+(1-Math.cos(a))*10-6,5-a*.6,C(dk(iron,.9+a*.1)));   // the claw curl
  A.line(78,22,74,18,C([30,30,34])); A.line(80,24,76,19,C([30,30,34]));                                                 // the split
  for(let i=0;i<9;i++){ const t=.62+i*.035, x=186+(92-186)*t, y=180+(30-180)*t; A.disc(x+(hash(i,3)-.5)*4,y,2.2,C([158,40,30])); }   // red paint chips
  if(ench.etched) for(let i=0;i<8;i++){ const t=.25+i*.07; A.disc(186+(92-186)*t,180+(30-180)*t,1,glow(200,130,255)); }
  arm2(A,224,206,178,152,30,20,sl,sk); fist2(A,170,142,20,sk);
  finish2(A); })); }
function vmHoly(sl,sk){ return wrap2(art(240,180,A=>{ arm2(A,10,200,66,146,30,20,sl,sk);
  A.ell(88,92,24,30,C([150,186,214])); for(let y=92;y<=122;y++) for(let x=64;x<=112;x++) if(A.get(x,y)) A.set(x,y,glow(90+((x+y)&7)*3,146,214));
  A.ell(80,80,6,14,C([230,240,250])); poly(A,[[80,50],[96,50],[96,64],[80,64]],C([150,186,214])); tube(A,78,46,98,46,5,5,[140,100,60],{spec:.4});
  A.rect(86,74,90,108,C([236,242,248])); A.rect(78,84,98,88,C([236,242,248]));
  fist2(A,82,128,20,sk); finish2(A); })); }

/* ── the blades ───────────────────────────────────────────────────────── */
function vmDemonBlade(sl,sk){ return wrap2(art(240,180,A=>{
  /* a curved, hand-forged blade with a fuller and a line of etched marks that aren't quite writing */
  const L=[],R=[]; for(let i=0;i<=40;i++){ const t=i/40, cx=152+(108-152)*t+Math.sin(t*3.1)*10, cy=122+(22-122)*t, w=11*(1-t*.9)+.8, nx=.9, ny=.42;
    L.push([cx-w*nx,cy-w*ny*.2]); R.push([cx+w*nx,cy+w*ny*.2]); }
  const edge=L.concat(R.reverse()); poly(A,edge,(x,y)=>{ const t=clampN((122-y)/100,0,1), cx=152+(108-152)*t+Math.sin(t*3.1)*10, u=(x-cx)/(11*(1-t*.9)+.8);
    return u<-.45?[236,240,246]:u<.05?[182,188,198]:u<.55?[132,138,150]:[90,96,110]; });
  for(let i=4;i<34;i++){ const t=i/40, cx=152+(108-152)*t+Math.sin(t*3.1)*10, cy=122+(22-122)*t; A.set(cx+2,cy,C([70,74,86])); if(i%5===0) A.set(cx-3,cy,glow(170,40,40)); }
  poly(A,[[132,118],[174,116],[176,128],[130,130]],(x,y)=>dk([160,128,72],1.15-(y-116)/22));                         // brass guard
  tube(A,153,128,166,172,8,9,[74,44,32],{spec:.3,rough:14}); for(let y=134;y<170;y+=4) A.line(146,y,174,y+3,C([42,26,20]));   // leather wrap
  arm2(A,226,208,186,172,30,21,sl,sk); fist2(A,164,156,21,sk); finish2(A); })); }
function vmAngelBlade(sl,sk){ return wrap2(art(240,180,A=>{
  /* the three-sided silver spike: long, plain, terrible */
  poly(A,[[150,124],[166,124],[126,10]],(x,y)=>{ const u=(x-(150+(126-150)*(124-y)/114))/Math.max(1,16*(y-10)/114); return u<.4?[236,240,248]:u<.62?[178,186,200]:[112,120,138]; });
  for(let i=0;i<12;i++){ const y=110-i*8, x=154-(i*8)*24/114; A.set(x+2,y,glow(190,220,255)); if(i%2) A.set(x+4,y-2,glow(150,190,255)); }   // Enochian, catching light
  A.line(158,124,128,14,C([250,252,255]));
  poly(A,[[144,124],[174,124],[172,130],[146,130]],C([90,96,110]));
  tube(A,158,130,164,172,7,8,[38,40,48],{spec:.4}); for(let y=136;y<170;y+=5) A.line(150,y,170,y+2,C([20,20,26]));
  arm2(A,224,206,184,172,30,20,sl,sk); fist2(A,162,156,20,sk); finish2(A); })); }
function vmArchBlade(sl,sk){ return wrap2(art(240,180,A=>{
  /* longer, wider, and lit from inside; the guard opens like wings */
  poly(A,[[146,120],[172,120],[124,0]],(x,y)=>{ const u=(x-(146+(124-146)*(120-y)/120))/Math.max(1,26*(y)/120); return u<.35?[255,250,236]:u<.6?[226,206,150]:[170,140,80]; });
  for(let y=4;y<116;y+=2){ const x=146+(124-146)*(120-y)/120+9*(y/120); A.set(x,y,glow(255,252,236)); A.set(x+1,y,glow(255,236,180)); }
  for(let s=-1;s<=1;s+=2) for(let i=0;i<7;i++){ const x=159+s*(10+i*5), y=122-i*4+(i*i)*.4; A.ell(x,y,4,2,C(i%2?gold:[236,220,170])); }
  A.disc(159,124,5,glow(255,250,220));
  tube(A,158,128,166,174,7,8,[230,220,190],{spec:.8}); for(let y=134;y<172;y+=6) A.line(150,y,172,y+2,C(gold));
  arm2(A,224,206,184,172,30,20,sl,sk); fist2(A,162,158,20,sk); finish2(A); })); }
function vmRing(sl,sk){ return wrap2(art(240,180,A=>{
  /* the Ring of Severance, turning above an open palm: blades within blades, never touching */
  arm2(A,20,206,80,150,30,22,sl,sk); A.ell(98,140,26,14,C(sk)); A.ell(96,136,22,10,C(mix(sk,[255,236,220],.15)));
  for(let k=-2;k<=2;k++) A.ell(90+k*9,128,4,6,C(dk(sk,.9)));
  const cx=104, cy=86;
  for(let r=0;r<3;r++){ const rr=14+r*10, n=8+r*4; for(let a=0;a<Math.PI*2;a+=.02){ A.set(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.55,r%2?C([20,20,28]):glow(206,212,228)); }
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+r*.3; const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr*.55;
      A.line(x,y,x+Math.cos(a+.6)*6,y+Math.sin(a+.6)*3.4,r%2?glow(220,226,240):C([16,16,22])); } }
  A.disc(cx,cy,3,glow(236,240,250)); finish2(A); })); }

/* ── wire them in ─────────────────────────────────────────────────────── */
/* Three weapon styles (Settings → Weapons):
     Painted   the pixel-art sheet (57r_vmatlas.js)
     Classic   the old flat, chunky look, rebuilt properly in 57v_classicart.js: one camera, one light,
               shaded materials, and hands with real anatomy wrapped round the grips
     Original  the 1.x sprites exactly as they were
   The angel blade, archangel's blade and Ring have no 1.x version; they use their drawn art. */
const VM_STYLES=['painted','classic','original'];
for(const k of ['revolver','shotgun','flare']){ WEAPONS[k].muzzleClassic=WEAPONS[k].muzzle.slice(); }
function scale2x(sp){ const w=sp.w, h=sp.h, src=sp.px, W2=w*2, out=new Uint32Array(W2*h*2), at=(x,y)=>(x<0||y<0||x>=w||y>=h)?0:src[y*w+x];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const P=at(x,y), A=at(x,y-1), B=at(x+1,y), Cc=at(x-1,y), D=at(x,y+1);
    let e0=P,e1=P,e2=P,e3=P; if(Cc===A&&Cc!==D&&A!==B) e0=A; if(A===B&&A!==Cc&&B!==D) e1=B; if(D===Cc&&D!==B&&Cc!==A) e2=Cc; if(B===D&&B!==A&&D!==Cc) e3=D;
    const o=(y*2)*W2+x*2; out[o]=e0; out[o+1]=e1; out[o+W2]=e2; out[o+W2+1]=e3; }
  return {w:W2,h:h*2,px:out}; }
function refine(sp){ const r=scale2x(sp), w=r.w, h=r.h, px=r.px, src=px.slice();
  const dark=c=>((c&255)+((c>>8)&255)+((c>>16)&255))<60, solid=c=>c&&!dark(c);
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){ const i=y*w+x, c=src[i]; if(!solid(c)||(c>>>24)===254) continue;
    const ul=src[i-w-1], up=src[i-w], lf=src[i-1], dr=src[i+w+1], dn=src[i+w], rt=src[i+1];
    if(!solid(up)||!solid(lf)||!solid(ul)) px[i]=scaleC(c,1.28);                 // the lit edge
    else if(!solid(dn)||!solid(rt)||!solid(dr)) px[i]=scaleC(c,.78);             // the shadow edge
    else if(((x+y)&7)===0&&!solid(src[i-2*w])) px[i]=scaleC(c,1.12); }          // a soft sheen just under the top
  r.scale=.5; return r; }
/* ── Classic: the 1.x look (flat colours, chunky outlines, simple light from the upper left),
   with the designs drawn properly: right proportions, readable silhouettes. 120×90, then refined. */
function cRevolver(sl,sk,e){ return art(120,90,A=>{ const st=[62,66,76], hi=[150,156,170], dk2=[28,30,36], wood=[120,72,40];
  vmBar(A,72,62,60,34,11,st,hi); vmBar(A,70,58,59,32,2,hi);            // a short, thick barrel with a lit top flat
  vmBar(A,76,62,66,40,3,dk(st,.8));                                     // ejector rod under it
  A.ell(60,34,5,3.6,C(dk2)); A.ell(60,34,2.8,2,C([6,6,8]));            // the muzzle
  A.rect(57,27,61,30,C(hi));                                            // front sight
  A.ell(76,63,12,9,C(st)); for(let k=-2;k<=2;k++) A.rect(76+k*4.2,56,76+k*4.2,70,C(dk(st,.55))); A.rect(66,56,86,57,C(hi));   // cylinder, flutes
  A.rect(68,52,90,57,C(st)); A.rect(68,52,90,52,C(hi)); A.rect(77,50,80,52,C(dk2));         // top strap, rear sight
  vmBar(A,90,58,96,48,3.4,dk2,[100,104,112]);                           // hammer, cocked
  for(let a=0;a<=Math.PI;a+=.12) A.disc(80+Math.cos(a)*6,73+Math.sin(a)*6,1,C(dk2));          // trigger guard
  A.line(80,73,81,78,C(dk(st,.6)));
  for(let y=66;y<=88;y++){ const t=(y-66)/22, x0=84+t*8, x1=95+t*8; for(let x=x0|0;x<=x1;x++) A.set(x,y,C(((x+y)&3)===0?dk(wood,.7):wood)); }
  if(e.blessed) for(let i=0;i<5;i++) A.set(62+i*2,38+i*5,glow(255,226,150));
  vmArm(A,114,100,98,84,15,10,sl,sk); vmFist(A,94,80,10,sk); A.ell(84,74,4,2.4,C(sk)); vmFinish(A); }); }
function cShotgun(sl,sk,e){ return art(120,90,A=>{ const st=[58,60,68], hi=[140,144,154], wood=[128,78,40];
  for(let y=50;y<=74;y++){ const k=(74-y)*.12; A.rect(45+k,y,75-k,y,C(y%5===0?dk(wood,.8):wood)); }   // fore-end, under the barrels
  vmBar(A,52,90,55,26,10,st,hi); vmBar(A,68,90,65,26,10,st,hi);         // two barrels, side by side
  A.line(60,88,60,24,C([22,24,28]));                                    // the seam between them
  A.disc(55,25,4.2,C([18,18,22])); A.disc(65,25,4.2,C([18,18,22])); A.disc(55,25,2.6,C([4,4,6])); A.disc(65,25,2.6,C([4,4,6]));
  A.disc(60,21,1.4,C([236,222,170]));                                   // bead
  A.rect(48,80,72,89,C([84,82,90])); A.rect(48,80,72,80,C(hi));         // receiver
  if(e.iron) for(let i=0;i<5;i++) A.set(52+i*4,62,glow(190,210,230));
  vmArm(A,4,100,32,76,15,10,sl,sk); vmFist(A,40,68,10,sk);
  vmArm(A,118,100,92,88,15,11,sl,sk); vmFist(A,84,86,10,sk); vmFinish(A); }); }
function cCrowbar(sl,sk,e){ return art(120,90,A=>{ const iron=[64,64,72];
  vmBar(A,90,88,48,18,8.5,iron,[134,134,146]);
  for(let a=0;a<=Math.PI*.9;a+=.08) A.disc(48-Math.sin(a)*8,18-(1-Math.cos(a))*6+1,4.4-a*.6,C(iron));   // the hooked claw
  A.line(41,15,38,11,C([30,30,34]));                                   // its split
  vmBar(A,90,88,79,71,10,[150,40,30],[200,80,60]);                       // red paint where the hand goes
  if(e.etched) for(let i=0;i<6;i++){ const t=.25+i*.09; A.set(90+(48-90)*t,88+(18-88)*t,glow(200,130,255)); }
  vmArm(A,112,100,90,80,15,10,sl,sk); vmFist(A,86,74,10,sk); vmFinish(A); }); }
function cKnife(sl,sk){ return art(120,90,A=>{
  const L=[],R=[]; for(let i=0;i<=24;i++){ const t=i/24, cx=74+(56-74)*t+Math.sin(t*3)*4, cy=62+(16-62)*t, w=5*(1-t*.85)+.6; L.push([cx-w,cy]); R.push([cx+w,cy]); }
  poly(A,L.concat(R.reverse()),(x,y)=>{ const t=Math.max(0,Math.min(1,(62-y)/46)), cx=74+(56-74)*t+Math.sin(t*3)*4; return x<cx-1?[222,226,232]:x<cx+1?[170,176,186]:[110,116,126]; });
  A.rect(64,60,84,64,C([170,138,80]));                                  // brass guard
  vmBar(A,76,66,80,80,7,[74,44,32],[104,64,46]);
  vmArm(A,112,100,92,84,15,10,sl,sk); vmFist(A,86,78,10,sk); vmFinish(A); }); }
function cFlare(sl,sk){ return art(120,90,A=>{ const or=[214,96,30], od=[150,60,20];
  vmBar(A,70,48,58,26,12,or,[248,150,80]);                               // barrel
  A.ell(58,26,6.5,4.6,C(od)); A.ell(58,26,4.4,3,C([24,16,12])); A.ell(58,26,2.2,1.4,C([8,6,6]));
  A.rect(66,44,84,52,C(od)); A.rect(66,44,84,45,C([250,150,80])); A.disc(75,48,1.6,C([40,30,24]));
  vmBar(A,84,46,88,40,3,[40,34,30]);
  for(let a=0;a<=Math.PI;a+=.1) A.disc(74+Math.cos(a)*6,56+Math.sin(a)*6,1.1,C(od));
  for(let y=52;y<=84;y++){ const t=(y-52)/32, x0=78+t*8, x1=89+t*8; A.rect(x0,y,x1,y,C(y%6===0?od:or)); }
  A.rect(61,32,64,33,C([255,240,200]));
  vmArm(A,112,100,96,82,15,10,sl,sk); vmFist(A,92,76,10,sk); A.ell(82,60,4,2.4,C(sk)); vmFinish(A); }); }
function cHoly(sl,sk){ return art(120,90,A=>{ vmArm(A,6,100,34,74,15,10,sl,sk);
  A.ell(44,50,12,15,C([150,186,214])); for(let y=50;y<=64;y++) for(let x=32;x<=56;x++) if(A.get(x,y)) A.set(x,y,glow(96,150,216));
  A.rect(40,28,48,36,C([150,186,214])); A.rect(39,24,49,28,C([140,100,60]));
  A.rect(43,40,45,58,C([226,238,246])); A.rect(38,46,50,48,C([226,238,246]));
  vmFist(A,40,66,10,sk); vmFinish(A); }); }
{ const was=buildViewmodels; buildViewmodels=function(lookId,ench){ const V=was(lookId,ench); const L=LOOKS[lookId], sl=sleeveColor(L), sk=L.skin, e=ench||{};
    let style=S.settings.vmStyle==='drawn'?'classic':S.settings.vmStyle; if(!VM_STYLES.includes(style)) style='painted';
    Object.assign(V,{angelblade:vmAngelBlade(sl,sk),archangel:vmArchBlade(sl,sk),ring:vmRing(sl,sk)});
    for(const k of ['revolver','shotgun','flare']) WEAPONS[k].muzzle=WEAPONS[k].muzzleClassic;
    if(style==='original') return V;
    if(style==='classic'){ Object.assign(V,{revolver:kRevolver(sl,sk,e),shotgun:kShotgun(sl,sk,e),flare:kFlare(sl,sk,e),crowbar:kCrowbar(sl,sk,e),holywater:kHoly(sl,sk,e),
        knife:kKnife(sl,sk,e),angelblade:kAngel(sl,sk,e),archangel:kArch(sl,sk,e),ring:kRing(sl,sk,e)});
      Object.assign(WEAPONS.revolver,{muzzle:[34.5,24]}); Object.assign(WEAPONS.shotgun,{muzzle:[19,19.5]}); Object.assign(WEAPONS.flare,{muzzle:[37.5,26.5]});
      return V; }
    Object.assign(V,{revolver:vmRevolver(sl,sk,e),shotgun:vmShotgun(sl,sk,e),flare:vmFlare(sl,sk),crowbar:vmCrowbar(sl,sk,e),holywater:vmHoly(sl,sk),knife:vmDemonBlade(sl,sk)});
    /* the painted sheet, when it has loaded, replaces the drawings; enchantments add their glow on top */
    if(VM_IMG.ready) for(const [k,f] of Object.entries(VM_IMG.frames)){ if(!WEAPONS[k]) continue; WEAPONS[k].muzzle=f.muzzle; const px=f.px.slice();
      const P=VM_IMG.poses&&VM_IMG.poses[k]; if(P){ V[k+'@attack']={w:P.attack.w,h:P.attack.h,px:P.attack.px,scale:P.attack.scale}; V[k+'@alt']={w:P.alt.w,h:P.alt.h,px:P.alt.px,scale:P.alt.scale}; }
      if(k==='journal'&&P) V.journalLit=V['journal@attack'];
      const add=(col,n,seed)=>{ for(let i=0;i<n;i++){ const j=(Math.abs(Math.sin((i+1)*seed*12.9898)*43758.5453)*px.length)|0; if(px[j]&&(px[j]>>>24)===255&&hash(j%240,(j/240)|0)>.4) px[j]=col; } };
      if(k==='revolver'&&e.blessed) add(glow(255,226,150),220,1.3); if(k==='shotgun'&&e.iron) add(glow(190,210,230),220,2.1); if(k==='crowbar'&&e.etched) add(glow(200,130,255),180,3.7);
      V[k]={w:f.w,h:f.h,px,scale:f.scale}; }
    return V; }; }
/* 2× sprites carry scale .5; drawViewmodel (60_render) honours it, so the extra detail shows in the sharper renderers */

/* ── the new weapons ──────────────────────────────────────────────────── */
Object.assign(WEAPONS,{
  angelblade:{name:'Angel blade', slot:4, kind:'melee', rate:.38, range:1.55, swingT:.22, dmg:{ghost:30, demon:170, eldritch:70}, sfx:'stab', smite:true},
  archangel: {name:'Archangel’s blade', slot:4, kind:'melee', rate:.5, range:2.1, swingT:.3, dmg:{ghost:90, demon:260, eldritch:170}, sfx:'stab', smite:true, cleave:true},
  ring:      {name:'Ring of Severance', slot:8, kind:'divine', rate:1.2, cool:7, dmg:{ghost:120, demon:120, eldritch:140}, sfx:'riteEnd'},
});
WEAPONS.knife.name='Demon blade';
const BLADES=['knife','angelblade','archangel'];
WEAPON_ORDER.push('ring');
const CYCLE_ORDER=['crowbar','revolver','shotgun','knife','angelblade','archangel','holywater','flare','journal','ring'];
cycleWeapon=function(dir){ const owned=CYCLE_ORDER.filter(w=>S.owned.has(w)), i=owned.indexOf(S.weapon); selectWeapon(owned[(i+dir+owned.length)%owned.length]); };
PRESS.weapon4=()=>{ const own=BLADES.filter(b=>S.owned.has(b)); if(!own.length) return; const i=own.indexOf(S.weapon); selectWeapon(i<0?own[own.length-1]:own[(i+1)%own.length]); };
if(!ACTIONS.some(a=>a.id==='weapon8')){ ACTIONS.push({id:'weapon8',label:'Weapon 8',group:'Weapons',keys:['Digit8','Numpad8'],pad:null}); if(typeof ACT_BY_ID==='object') ACT_BY_ID.weapon8=ACTIONS.at(-1); loadControls(); }
PRESS.weapon8=()=>selectWeapon('ring');
/* melee: the blades smite and cleave */
{ const was=fire; fire=function(){ const W=WEAPONS[S.weapon];
    if(W&&W.kind==='divine') return fireRing();
    if(W&&W.cleave&&S.cool<=0&&S.switchT<=0&&!S.driving){ S.cool=W.rate; S.swing=W.swingT; sfx(W.sfx);
      let n=0; for(const e of S.sector.entities){ if(e.kind!=='enemy'||e.dead||e.hidden||e.state==='dormant') continue;
        const dx=e.x-S.px, dy=e.y-S.py, d=Math.hypot(dx,dy); if(d>W.range||(dx/d)*S.dirX+(dy/d)*S.dirY<.35) continue;
        damageEnt(e,dmgFor(S.weapon,e),S.weapon,S.angle); n++; }
      if(n){ S.shake=Math.max(S.shake,.25); S.flash=Math.max(S.flash||0,.25); } return; }
    return was(); }; }
{ const was=damageEnt; damageEnt=function(e,amount,src,ang){ was(e,amount,src,ang);
    if(WEAPONS[src]&&WEAPONS[src].smite&&e.dead&&e.etype==='demon'){ S.flash=Math.max(S.flash||0,.5); spawnParts(e.x,e.y,1.2,24,PCOL.spark,{up:2.4}); } }; }
/* the Ring: everything hostile you can see, within reach, cut loose at once; possession is severed before flesh */
function fireRing(){ const W=WEAPONS.ring; if(S.ringCool>0){ toast(`The ring is still turning · ${Math.ceil(S.ringCool)}s`); return; } if(S.switchT>0||S.driving) return;
  S.ringCool=W.cool; S.cool=W.rate; sfx('riteEnd'); sfx('bell'); try{ chakra(1.6); }catch(e){}
  let n=0; for(const e of S.sector.entities){ if(e.kind!=='enemy'||e.dead||e.hidden) continue; const d=Math.hypot(e.x-S.px,e.y-S.py); if(d>16||!los(S.sector,S.px,S.py,e.x,e.y)) continue;
    if(e.etype==='demon'&&e.freeLook&&!e.boss){ killEnt(e,'exorcism'); n++; continue; }
    damageEnt(e,W.dmg[e.etype]||100,'ring',Math.atan2(e.y-S.py,e.x-S.px)); e.stun=Math.max(e.stun||0,1.5); n++; }
  if(!n) say(S.hero,isDean()?'Nothing to cut. Good.':'Nothing here for it.',2); }
INV_UPDATES.push(dt=>{ if(S.ringCool>0) S.ringCool=Math.max(0,S.ringCool-dt); });

/* ── armour ───────────────────────────────────────────────────────────── */
const GEAR={
  mantle:{name:'Mantle of Feathers',perk:'Take 25% less damage. Black feathers that are warm in the rain.'},
  ashplate:{name:'Ash-plate',perk:'Armour slowly refills to 50. Forged from a future that didn’t happen.'},
  wrencloak:{name:'Wren’s Cloak',perk:'The dead hit you half as hard. Waxed canvas from 1951, still wet.'},
};
function gear(){ const I=inv_(); I.gear=I.gear||[]; return I.gear; }
function giveGear(id){ const g=gear(); if(g.includes(id)) return; g.push(id); sfx('pickup'); toast(`${GEAR[id].name} · ${GEAR[id].perk.split('.')[0]}`);
  addNoteRaw('gear_'+id,GEAR[id].name,GEAR[id].perk); }
function giveWeapon(id,why){ if(S.owned.has(id)) return; S.owned.add(id); sfx('pickup'); toast(`${WEAPONS[id].name}${why?' · '+why:''}`);
  if(BLADES.includes(id)) say('narr',`Press ${keyName('weapon4')} again to change blades.`,3); if(id==='ring') say('narr',`${keyName('weapon8')} for the Ring. It cuts every hold in sight, then has to turn a while.`,4); }
{ const was=hurtPlayer; hurtPlayer=function(amount,src){ const g=gear(); let a=amount;
    if(g.includes('mantle')) a*=.75; if(g.includes('wrencloak')&&src&&src.etype==='ghost') a*=.5;
    return was(a,src); }; }
INV_UPDATES.push(dt=>{ if(gear().includes('ashplate')&&S.armor<50) S.armor=Math.min(50,S.armor+2*dt); });
/* both brothers' kits: blades and the ring are shared */
/* (1.11: kits are separate; hand weapons over at the car or from the quick wheel) */

/* ── Castiel gives the angel blade when he first finds you ───────────── */
{ const n=DIALOGUE.castiel&&DIALOGUE.castiel.nodes; if(n) for(const k of Object.keys(n)) for(const c of n[k].choices||[]) if(c.fx&&c.fx.flag==='cas_met'){
    const was=c.fx.now; c.fx.now=()=>{ if(was) was(); later(1.5,()=>{ giveWeapon('angelblade','from Castiel'); say('castiel','Take this. It was mine. I find I would rather it were yours.',4); }); }; } }
