/* ═══ Cinematic and HD ══════════════════════════════════════════════════════
   Two renderers above Crisp:
     HD 960×540        the same game with more than twice Crisp's pixels,
                       smoothly scaled to the screen;
     Cinematic         1280×536, the 2.39:1 widescreen frame, with a soft
                       bloom on whatever glows, film grain, a vignette and a
                       slightly graded image. If the machine can't hold it,
                       it quietly drops to 960×402 and says so.
   The screen-side overlay (HUD, text) already draws at your display's full
   pixel density; on very sharp screens it now goes up to 3× instead of 2×.
   The renderer you pick is remembered. */

Object.assign(PIXEL_MODES,{
  hd:         {name:'HD 960×540',        w:960, h:540, par:1, quantise:false, pitch:'shear', dim:.55, smooth:true},
  cinema:     {name:'Cinematic 1280×536',w:1280,h:536, par:1, quantise:false, pitch:'shear', dim:.55, smooth:true, cine:true},
  cinema_lite:{name:'Cinematic 960×402', w:960, h:402, par:1, quantise:false, pitch:'shear', dim:.55, smooth:true, cine:true},
});
{ const i=RENDERERS.findIndex(r=>r.key==='ascii');
  RENDERERS.splice(i<0?RENDERERS.length:i,0,
    {key:'hd',label:'HD 960×540',mode:'hd',ascii:0,note:'Twice Crisp’s pixels, smoothly scaled. Faces, text on paper and distant figures at their sharpest. Needs a reasonably quick computer.'},
    {key:'cinema',label:'Cinematic',mode:'cinema',ascii:0,note:'Widescreen 2.39:1 at 1280×536, with bloom on everything that glows, film grain and a vignette. The heaviest mode: if your machine can’t keep up it drops to 960×402 by itself.'}); }

/* the layers over the picture */
const CINE={bloom:null,bctx:null,grain:null,vign:null,ema:16,slowT:0,dropped:false,last:0};
(function cineLayers(){ const vp=document.getElementById('vp'); if(!vp||!vp.insertBefore) return;
  const ov=document.getElementById('over');
  const b=document.createElement('canvas'); b.id='bloom'; b.width=320; b.height=134; vp.insertBefore(b,ov); CINE.bloom=b; try{ CINE.bctx=b.getContext('2d'); }catch(e){}
  const g=document.createElement('div'); g.id='filmgrain'; vp.insertBefore(g,ov); CINE.grain=g;
  const v=document.createElement('div'); v.id='vign'; vp.insertBefore(v,ov); CINE.vign=v; })();
{ const was=setPixelMode; setPixelMode=function(key){ was(key); const m=PIXEL_MODES[key]||MODE, vp=document.getElementById('vp');
    if(vp&&vp.classList){ vp.classList.toggle('smooth',!!m.smooth); vp.classList.toggle('cine',!!m.cine); }
    if(CINE.bloom){ CINE.bloom.width=Math.max(1,IW>>2); CINE.bloom.height=Math.max(1,IH>>2); }
    CINE.ema=16; CINE.slowT=0; }; }
{ const was=setRenderer; setRenderer=function(key){ const r=was(key); if(r){ CINE.dropped=false; try{ S.settings.renderer=key; saveSettings(); }catch(e){} } return r; }; }
/* the bloom is the frame, small, blurred and only its bright parts kept */
{ const was=drawGrain; drawGrain=function(){ was();
    if(MODE.cine&&CINE.bctx){ try{ CINE.bctx.drawImage(world,0,0,CINE.bloom.width,CINE.bloom.height); }catch(e){} }
    /* keep the frame rate honest */
    const now=performance.now(), d=CINE.last?now-CINE.last:16; CINE.last=now;
    if(d>0&&d<250) CINE.ema=CINE.ema*.95+d*.05;
    if(S.renderer==='cinema'&&!CINE.dropped&&MODE===PIXEL_MODES.cinema&&S.running){
      CINE.slowT=CINE.ema>26?CINE.slowT+d/1000:0;
      if(CINE.slowT>4){ CINE.dropped=true; setPixelMode('cinema_lite'); toast('Cinematic: dropped to 960×402 to stay smooth'); } } }; }
/* sharper screen-side text on very dense screens */
{ const was=resize; resize=function(){ was(); try{ const r=document.getElementById('vp').getBoundingClientRect(), d=Math.min(3,window.devicePixelRatio||1);
    if(d>2){ over.width=Math.max(1,Math.round(r.width*d)); over.height=Math.max(1,Math.round(r.height*d)); } }catch(e){} }; }
/* remember the renderer */
SET_DEFAULT.renderer='doom';
{ const was=saveSettings; saveSettings=function(){ was(); try{ const o=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{}; o.renderer=S.settings.renderer; localStorage.setItem(SETTINGS_KEY,JSON.stringify(o)); }catch(e){} }; }
(function restoreRenderer(){ let o={}; try{ o=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{}; }catch(e){}
  if(o.renderer&&RENDERERS.some(r=>r.key===o.renderer)){ S.settings.renderer=o.renderer; setRenderer(o.renderer); } })();
/* the title screen's renderer row */
(function cineButtons(){ const asc=document.querySelector('.rp[data-r="ascii"]'); if(!asc||!asc.parentNode) return;
  for(const [k,l] of [['hd','HD 960×540'],['cinema','Cinematic']]){ const b=document.createElement('button'); b.className='opt rp'; b.dataset.r=k; b.textContent=l;
    b.onclick=()=>{ setRenderer(k); syncPickers(); }; asc.parentNode.insertBefore(b,asc); }
  syncPickers(); })();
