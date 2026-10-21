/* 1.9: a phone on its side (touch controls) and the HD and Cinematic renderers. Real Chromium.
   node tests/mobile_browser.js [outdir] */
const path=require('path'), fs=require('fs');
const {chromium,devices}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const file='file://'+path.resolve(__dirname,'..','oakhaven.html'), OUT=process.argv[2]||path.join(require('os').tmpdir(),'oak_mobile'); fs.mkdirSync(OUT,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'ok   ':'FAIL ')+m); if(!c) fails++; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader']});
  /* ── a phone, landscape ── */
  const phone={...devices['Pixel 7'],viewport:{width:915,height:412},screen:{width:915,height:412}};
  const ctx=await b.newContext(phone); await ctx.addInitScript(()=>{ if(!localStorage.getItem('oakhaven.settings.v1')) localStorage.setItem('oakhaven.settings.v1',JSON.stringify({warned:true,hints:false,fourth:false,useLoc:false})); });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const cdp=await ctx.newCDPSession(p);
  const touch=async(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map((q,i)=>({x:q[0],y:q[1],id:q[2]??i}))});
  await p.goto(file); await sleep(600);
  ok(await p.evaluate(()=>document.body.classList.contains('touch')&&TOUCH.on),'touch mode turns on by itself on a phone');
  ok(await p.evaluate(()=>S.renderer==='fill'&&IW>=560),'phones start on the Fill screen renderer');
  await p.screenshot({path:path.join(OUT,'m01_title.png')});
  await p.tap('.go[data-h="dean"]'); await sleep(700);
  await p.evaluate(()=>{ skipCutscene(); S.cardQ.length=0; S.card=null; enterSector('street',28,30,-Math.PI/2); for(const e of S.sector.entities) if(e.kind==='enemy') e.dead=true; }); await sleep(500);
  const box=await p.evaluate(()=>{ const r=document.getElementById('vp').getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height}; });
  ok(box.h>=400&&box.w>=880,`the game fills the screen sideways (${Math.round(box.w)}×${Math.round(box.h)})`);
  await p.screenshot({path:path.join(OUT,'m02_play.png')});
  /* left thumb: walk forward */
  const y0=await p.evaluate(()=>S.py); const jx=box.x+box.w*.15, jy=box.y+box.h*.7;
  await touch('touchStart',[[jx,jy]]); await touch('touchMove',[[jx,jy-60]]); await sleep(80); await p.screenshot({path:path.join(OUT,'m03_stick.png')}); await sleep(600);
  const y1=await p.evaluate(()=>S.py); await touch('touchEnd',[]);
  ok(y1<y0-.4,`the stick walks you forward (${y0.toFixed(2)} → ${y1.toFixed(2)})`);
  /* right thumb: look */
  const a0=await p.evaluate(()=>S.angle); const lx=box.x+box.w*.62, ly=box.y+box.h*.45;
  await touch('touchStart',[[lx,ly,5]]); for(let i=1;i<=6;i++) await touch('touchMove',[[lx+i*15,ly,5]]); await touch('touchEnd',[]);
  const a1=await p.evaluate(()=>S.angle); ok(a1>a0+.3,`dragging on the right turns you (${a0.toFixed(2)} → ${a1.toFixed(2)})`);
  /* walking and looking at once */
  await touch('touchStart',[[jx,jy,1],[lx,ly,2]]); await touch('touchMove',[[jx,jy-50,1],[lx-40,ly,2]]); await sleep(300); await touch('touchEnd',[]);
  /* fire */
  const ammo0=await p.evaluate(()=>{ S.cool=0; S.switchT=0; return JSON.stringify(S.ammo); });
  const fire=await p.$('[data-tb="fire"]'); const fb=await fire.boundingBox();
  await touch('touchStart',[[fb.x+fb.width/2,fb.y+fb.height/2,9]]); await sleep(200); await touch('touchEnd',[]);
  ok(await p.evaluate(a=>JSON.stringify(S.ammo)!==a,ammo0),'the fire button fires');
  /* pause through the top bar, and back */
  const pb=await (await p.$('[data-tb="pause"]')).boundingBox(); await touch('touchStart',[[pb.x+10,pb.y+10,3]]); await touch('touchEnd',[]); await sleep(200);
  ok(await p.evaluate(()=>dlg.open),'the pause button pauses'); await p.screenshot({path:path.join(OUT,'m04_pause.png')});
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('touch')).display==='block'&&!document.getElementById('touch').classList.contains('play')),'the controls step aside for menus');
  await p.evaluate(()=>closeDlg());
  /* map, and the ✕ that closes it */
  const mb=await (await p.$('[data-tb="map"]')).boundingBox(); await touch('touchStart',[[mb.x+10,mb.y+10,3]]); await touch('touchEnd',[]); await sleep(250);
  ok(await p.evaluate(()=>S.mapOpen),'the map opens'); await p.screenshot({path:path.join(OUT,'m05_map.png')});
  const xb=await (await p.$('[data-tx="back"]')).boundingBox(); await touch('touchStart',[[xb.x+8,xb.y+8,3]]); await touch('touchEnd',[]); await sleep(200);
  ok(await p.evaluate(()=>!S.mapOpen),'✕ closes the map');
  /* a conversation by tapping */
  await p.evaluate(()=>{ enterSector('motel',10,12,-Math.PI/2); }); await sleep(400);
  await p.evaluate(()=>{ const m=S.sector.entities.find(e=>e.dialogue==='marla'); openDlg('marla',m); }); await sleep(300);
  await p.screenshot({path:path.join(OUT,'m06_dialogue.png')});
  const before=await p.evaluate(()=>dlg.node); const ch=await p.$('#dlg button, #dlg .c'); if(ch) await ch.tap(); await sleep(250);
  ok(await p.evaluate(n=>dlg.node!==n||!dlg.open,before),'dialogue choices take taps');
  await p.evaluate(()=>{ if(dlg.open) closeDlg(); openJournal(); }); await sleep(300); await p.screenshot({path:path.join(OUT,'m07_journal.png')}); await p.evaluate(()=>closeJournal());
  /* portrait asks you to turn the phone */
  await p.setViewportSize({width:412,height:915}); await sleep(300);
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById('rotate')).display==='flex'),'portrait asks to rotate'); await p.screenshot({path:path.join(OUT,'m08_portrait.png')});
  await p.setViewportSize({width:915,height:412}); await sleep(200);
  ok(!errs.length,'no page errors on the phone'+(errs.length?': '+errs.slice(0,3).join(' | '):''));

  /* ── desktop: HD and Cinematic ── */
  const d=await b.newContext({viewport:{width:1440,height:860}}); await d.addInitScript(()=>{ if(!localStorage.getItem('oakhaven.settings.v1')) localStorage.setItem('oakhaven.settings.v1',JSON.stringify({warned:true,hints:false,fourth:false,useLoc:false})); });
  const q=await d.newPage(); const e2=[]; q.on('pageerror',e=>e2.push(e.message));
  await q.goto(file); await sleep(500);
  ok(await q.evaluate(()=>!document.body.classList.contains('touch')),'no touch controls on a desktop');
  ok(await q.evaluate(()=>!!document.querySelector('.rp[data-r="cinema"]')&&!!document.querySelector('.rp[data-r="hd"]')),'HD and Cinematic on the title screen');
  await q.click('.rp[data-r="cinema"]'); await q.screenshot({path:path.join(OUT,'d01_title_cinema.png')});
  await q.click('.go[data-h="sam"]'); await sleep(700);
  await q.evaluate(()=>{ skipCutscene(); S.cardQ.length=0; S.card=null; CINE.dropped=true; enterSector('street',28,30,-Math.PI/2); }); await sleep(900);
  ok(await q.evaluate(()=>IW===1280&&IH===536&&document.getElementById('vp').classList.contains('cine')),'Cinematic renders at 1280×536');
  await q.screenshot({path:path.join(OUT,'d02_cinema_street.png')});
  await q.evaluate(()=>{ enterSector('library',8,9.6,-Math.PI/2); }); await sleep(800); await q.screenshot({path:path.join(OUT,'d03_cinema_library.png')});
  await q.evaluate(()=>{ S.act=4; enterSector('church',9,20,-Math.PI/2); }); await sleep(800); await q.screenshot({path:path.join(OUT,'d04_cinema_church.png')});
  const ms={}; for(const r of ['crisp','hd','cinema']){ await q.evaluate(r=>{ setRenderer(r); CINE.dropped=true; enterSector('street',28,30,-Math.PI/2); },r); await sleep(500);
    ms[r]=await q.evaluate(()=>new Promise(res=>{ const t=[]; let l=performance.now(); const f=()=>{ const n=performance.now(); t.push(n-l); l=n; if(t.length<60) requestAnimationFrame(f); else res(t.slice(10).reduce((a,b)=>a+b,0)/50); }; requestAnimationFrame(f); })); }
  console.log('frame ms (this machine, software GL):',JSON.stringify(Object.fromEntries(Object.entries(ms).map(([k,v])=>[k,+v.toFixed(1)]))));
  await q.evaluate(()=>setRenderer('hd')); await sleep(600); await q.screenshot({path:path.join(OUT,'d05_hd_street.png')});
  ok(await q.evaluate(()=>IW===960&&IH===540),'HD renders at 960×540');
  /* the renderer is remembered */
  await q.reload(); await sleep(500); ok(await q.evaluate(()=>S.renderer==='hd'),'the renderer is remembered');
  /* too slow: Cinematic steps down by itself */
  await q.evaluate(()=>{ setRenderer('cinema'); }); await q.click('.go[data-h="dean"]'); await sleep(600);
  await q.evaluate(()=>{ skipCutscene(); CINE.ema=40; CINE.slowT=5; }); await sleep(300);
  ok(await q.evaluate(()=>IW===960&&IH===402),'Cinematic drops to 960×402 when the machine can’t keep up');
  ok(!e2.length,'no page errors on the desktop'+(e2.length?': '+e2.slice(0,3).join(' | '):''));
  await b.close();
  console.log(fails?`\n${fails} failure(s)`:'\nAll checks passed'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
