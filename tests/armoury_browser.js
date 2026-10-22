/* 1.11 in a real browser: the painted poses for every weapon, and the trunk. node tests/armoury_browser.js [outdir] */
const path=require('path'), fs=require('fs');
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const file='file://'+path.resolve(__dirname,'..','oakhaven.html'), OUT=process.argv[2]||path.join(require('os').tmpdir(),'oak_arm'); fs.mkdirSync(OUT,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'ok   ':'FAIL ')+m); if(!c) fails++; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader']}); const ctx=await b.newContext({viewport:{width:1280,height:760}});
  await ctx.addInitScript(()=>{ if(!localStorage.getItem('oakhaven.settings.v1')) localStorage.setItem('oakhaven.settings.v1',JSON.stringify({warned:true,hints:false,fourth:false,useLoc:false,renderer:'crisp'})); });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(file); await sleep(600); await p.click('.go[data-h="dean"]'); await sleep(800);
  await p.evaluate(()=>{ skipCutscene(); S.cardQ.length=0; S.card=null; enterSector('street',28,30,-Math.PI/2); for(const e of S.sector.entities) if(e.kind==='enemy') e.dead=true;
    CARRY.weapons=99; for(const w of ['torch','rifle','crossbow','knife','angelblade','archangel','holywater','lantern','flare','ring']) S.owned.add(w); ensureAmmo(); S.ammo.bolts=10; S.ammo.rifle=10; S.ammo.holywater=4; S.ammo.flares=4; });
  ok(await p.evaluate(()=>VM_IMG.ready&&Object.keys(VM_IMG.frames).length===14&&Object.keys(VM_IMG.items).length>=13),'the new weapon art decoded');
  const W=['crowbar','torch','revolver','rifle','shotgun','crossbow','knife','angelblade','archangel','holywater','lantern','flare','journal','ring'];
  for(const w of W){ await p.evaluate(w=>{ S.weapon=w; S.switchT=0; S.cool=0; S.swing=0; S.muzzle=0; },w); await sleep(250); await p.screenshot({path:path.join(OUT,`w_${w}_idle.png`)});
    await p.evaluate(w=>{ const W=WEAPONS[w]; S.cool=W.rate||.5; S.swing=W.swingT||.3; S.muzzle=W.kind==='hitscan'||W.kind==='projectile'?.2:0; if(w==='journal') S.channel=1; },w); await sleep(60); await p.screenshot({path:path.join(OUT,`w_${w}_attack.png`)});
    await p.evaluate(()=>{ S.channel=0; }); }
  await p.evaluate(()=>{ S.weapon='revolver'; CARRY.weapons=6; S.trunk=2; stash().weapons.push('crossbow'); stash().ammo.shells=14; openArmoury(true); }); await sleep(400); await p.screenshot({path:path.join(OUT,'trunk.png')});
  ok(await p.evaluate(()=>document.querySelectorAll('#trunk img').length>5),'the trunk shows the item art');
  ok(!errs.length,'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close(); console.log(fails?`\n${fails} failure(s)`:'\nAll checks passed'); process.exit(fails?1:0); })().catch(e=>{ console.error(e); process.exit(1); });
