/* Real-browser look at 1.7: weapons in each style, a tear, the three dimensions and their bosses, a guise. */
const path=require('path'), fs=require('fs');
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const file=path.resolve(path.join(__dirname,'..','oakhaven.html'));
const OUT=process.argv[2]||path.join(require('os').tmpdir(),'oak_v17'); fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader']}); const ctx=await b.newContext({viewport:{width:1280,height:760}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/bigdatacloud|net::|Failed to fetch/.test(m.text())) errs.push(m.text()); });
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('oakhaven.settings.v1',JSON.stringify({warned:true,hints:false,fourth:false})); }catch(e){} });
  const shot=n=>p.screenshot({path:path.join(OUT,n)}), wait=ms=>p.waitForTimeout(ms), log=(k,v)=>console.log(JSON.stringify([k,v]));
  await p.goto('file://'+file); await wait(400); await p.click('.go[data-h="sam"]'); await wait(500); await p.keyboard.press('Enter'); await wait(300);
  await p.evaluate(()=>{ skipCutscene(); S.cardQ.length=0; S.card=null; setRenderer('crisp'); S.owned.add('angelblade'); });
  for(const st of ['painted','classic','original']){ await p.evaluate(st=>{ setWeaponStyle(st); S.weapon='revolver'; S.switchT=0; enterSector('street',28,30,-Math.PI/2); },st); await wait(400); await shot(`01_style_${st}.png`); }
  await p.evaluate(()=>setWeaponStyle('painted'));
  /* the deer and the tear */
  await p.evaluate(()=>{ S.act=2; S.flags.closed_bell=true; inv_().closed=Object.assign(inv_().closed||{},{bell:true}); enterSector('reservoir',23,22,-Math.PI/2); }); await wait(900); await shot('02_deer.png');
  await p.evaluate(()=>{ S.px=23.2; S.py=17.8; }); await wait(1500); await p.evaluate(()=>{ S.px=23; S.py=21; S.angle=-Math.PI/2; }); await wait(600); await shot('03_tear.png');
  /* 1951 */
  await p.evaluate(()=>enterDim('drowned')); await wait(1600); await shot('04_1951_arrive.png');
  await p.evaluate(()=>{ S.px=30; S.py=17; S.angle=-Math.PI/2+.1; }); await wait(500); await shot('05_1951_chapel.png');
  await p.evaluate(()=>{ S.flags.d1_margaret=true; S.flags.d1_trust=1; d1Open(); S.px=32; S.py=11; S.angle=-Math.PI/2; const a=SECTORS.d_drowned.entities.find(e=>e.boss); a.state='hunt'; }); await wait(1800); await shot('06_1951_ashby.png');
  await p.evaluate(()=>{ for(const e of SECTORS.d_drowned.entities) if(e.kind==='enemy') e.dead=true; }); 
  /* 2031 */
  await p.evaluate(()=>{ leaveDim(); }); await wait(900); await p.evaluate(()=>enterDim('ash')); await wait(1600); await shot('07_2031.png');
  await p.evaluate(()=>{ d2Wake(); S.px=20; S.py=14; S.angle=-Math.PI/2; }); await wait(1200); await shot('08_2031_king.png');
  /* the nave */
  await p.evaluate(()=>{ for(const e of SECTORS.d_ash.entities) if(e.kind==='enemy') e.dead=true; leaveDim(); }); await wait(900);
  await p.evaluate(()=>enterDim('nave')); await wait(1600); await shot('09_nave.png');
  await p.evaluate(()=>{ d3Wake(); S.px=15; S.py=13; S.angle=-Math.PI/2; }); await wait(1500); await shot('10_nave_choir_inverted.png');
  await p.evaluate(()=>{ for(const e of SECTORS.d_nave.entities) if(e.kind==='enemy') e.dead=true; leaveDim(); }); await wait(900);
  /* a guise: the black dog */
  await p.evaluate(()=>{ S.act=3; S.flags.g_dog3=false; enterSector('street',28,30,-Math.PI/2); for(const e of SECTORS.street.entities) if(e.kind==='enemy') e.dead=true; S.hp=20; }); await wait(700);
  await p.evaluate(()=>{ const d=S.sector.entities.find(e=>e.gdog&&!e.dead); if(d){ d.x=S.px+S.dirX*3; d.y=S.py+S.dirY*3; } }); await wait(250); await shot('11_dog.png');
  log('final',await p.evaluate(()=>({hp:S.hp,sector:S.sector.id,running:S.running})));
  console.log('errors',JSON.stringify(errs)); await b.close(); process.exit(errs.length?1:0);
})();
