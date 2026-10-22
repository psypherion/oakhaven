/* 1.10 in a real browser: the story tree, a jump, and the one who comes next. node tests/tree_browser.js [outdir] */
const path=require('path'), fs=require('fs');
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const file='file://'+path.resolve(__dirname,'..','oakhaven.html'), OUT=process.argv[2]||path.join(require('os').tmpdir(),'oak_tree'); fs.mkdirSync(OUT,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'ok   ':'FAIL ')+m); if(!c) fails++; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader']}); const ctx=await b.newContext({viewport:{width:1440,height:860}});
  await ctx.addInitScript(()=>{ if(!localStorage.getItem('oakhaven.settings.v1')) localStorage.setItem('oakhaven.settings.v1',JSON.stringify({warned:true,hints:false,fourth:false,useLoc:false})); });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(file); await sleep(500);
  await p.evaluate(()=>{ localStorage.setItem('oakhaven.progress.v1',JSON.stringify({act:2,endings:[]})); localStorage.setItem('oakhaven.tree.v1',JSON.stringify({arrive:1,mill:1,shift:1,bell:1,act2:1,delia:1})); });
  await p.click('#codexRow >> text=Story tree'); await sleep(300); await p.screenshot({path:path.join(OUT,'t01_tree.png')});
  await p.click('[data-tn="kevin"]'); await sleep(200); await p.screenshot({path:path.join(OUT,'t02_kevin.png')});
  await p.click('[data-th="sam"]'); await p.click('[data-tgo]'); await sleep(1200);
  ok(await p.evaluate(()=>S.running&&S.act===2&&S.hero==='sam'&&S.flags.delia_done&&!S.flags.kevin_done),'jumped to Kevin on Bellweather as Sam');
  await p.evaluate(()=>{ S.cardQ.length=0; S.card=null; }); await sleep(400); await p.screenshot({path:path.join(OUT,'t03_jumped.png')});
  /* from the pause menu: jump again (reloads) */
  await p.evaluate(()=>{ openPause(); }); ok(await p.evaluate(()=>dlg.avail.some(c=>c.text==='Story tree')),'Story tree is on the pause menu');
  await p.evaluate(()=>{ closeDlg(); openTree(); TV.all=true; TV.sel='altar'; TV.hero='dean'; renderTree(); }); await sleep(200); await p.screenshot({path:path.join(OUT,'t04_tree_all.png')});
  await Promise.all([p.waitForNavigation(),p.click('[data-tgo]')]); await sleep(1500);
  ok(await p.evaluate(()=>S.running&&S.act===4&&S.sector.id==='cathedral'),'jumped to the altar after a reload');
  /* an ending, and who he becomes */
  await p.evaluate(()=>{ Object.assign(S.flags,{delia_done:true,kevin_done:true,kevin_rested:true,alistair_spared:true,lil_no:true}); S.freed=5; S.flags.ending='E'; showEnding('E'); }); await sleep(600);
  await p.click('.heirBtn'); await sleep(4200); await p.screenshot({path:path.join(OUT,'t05_heir.png'),fullPage:false});
  await p.evaluate(()=>{ document.getElementById('heir').scrollTop=600; }); await sleep(200); await p.screenshot({path:path.join(OUT,'t06_heir_more.png')});
  ok(await p.evaluate(()=>!!heirLoad()&&document.getElementById('heir').classList.contains('on')),'the one who comes next is shown and kept');
  ok(!errs.length,'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close(); console.log(fails?`\n${fails} failure(s)`:'\nAll checks passed'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
