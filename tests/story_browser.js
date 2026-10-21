/* Real-browser look at 1.5's set pieces: the vigil, its choice, the gathering, a car scene, an overheard pair. */
const path=require('path'), fs=require('fs');
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const file=path.resolve(path.join(__dirname,'..','oakhaven.html'));
const OUT=process.argv[2]||path.join(require('os').tmpdir(),'oak_story'); fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader']}); const p=await b.newPage({viewport:{width:1280,height:760}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  const R=[]; const log=(k,v)=>{ R.push([k,v]); console.log(JSON.stringify([k,v])); }; const shot=n=>p.screenshot({path:path.join(OUT,n)}); const wait=ms=>p.waitForTimeout(ms);
  await p.addInitScript(()=>{ try{ localStorage.setItem('oakhaven.settings.v1',JSON.stringify({warned:true,hints:false})); }catch(e){} });
  await p.goto('file://'+file); await wait(400);
  await p.click('.go[data-h="dean"]'); await wait(500); await p.keyboard.press('Enter'); await wait(400);
  await p.evaluate(()=>{ skipCutscene(); S.cardQ.length=0; S.card=null; S.flags.phantom=true; S.flags.marla=true; });
  await p.evaluate(()=>impalaTalk()); await wait(400); await shot('01_car_scene.png'); log('car scene',await p.evaluate(()=>dlg.open));
  await p.evaluate(()=>{ while(dlg.open&&dlg.avail&&dlg.avail[0]) pickChoice(dlg.avail[0]); if(dlg.open) closeDlg(); });
  await p.evaluate(()=>{ startAt(2); }); await wait(500);
  await p.evaluate(()=>{ while(S.cut) skipCutscene(); S.cardQ.length=0; S.card=null; Object.assign(S.flags,{kevin_checked:true,delia_done:true,sarah_met:true,read_ledgers:true,kevin_rested:true}); enterSector('street',28,27,-Math.PI/2); for(const e of SECTORS.street.entities) if(e.kind==='enemy') e.dead=true; });
  await wait(600); await p.evaluate(()=>{ S.flags.vigil_nudge=S.time-30; }); await wait(800);
  log('vigil',await p.evaluate(()=>S.cut&&S.cut.id)); await wait(5500); await shot('02_vigil.png'); await wait(9000); await shot('03_vigil_sheriff.png');
  await p.evaluate(()=>skipCutscene()); await wait(400); await shot('04_vigil_choice.png');
  await p.evaluate(()=>{ const c=dlg.avail.find(c=>(c.act+'').includes("'truth'")); pickChoice(c); }); await wait(600); await shot('05_vigil_after.png'); log('vigil choice',await p.evaluate(()=>S.flags.vigil));
  await p.evaluate(()=>{ startAt(4); }); await wait(500);
  await p.evaluate(()=>{ while(S.cut) skipCutscene(); S.cardQ.length=0; S.card=null; Object.assign(S.flags,{sarah_crew:true,ames_told:true,halvorsen_trusted:true,delia_done:true,elise_returned:true,agnes_told_truth:true,reed_accepted:true,rd_saved:true,juno_spared:true}); inv_().trust.marla=3; inv_().trust.earl=2;
    const c=SECTORS.street.entities.find(e=>e.look==='castiel'&&!e.dead); for(const e of SECTORS.street.entities) if(e.kind==='enemy') e.dead=true; enterSector('street',c.x-3,c.y,0); });
  await wait(800); log('gather',await p.evaluate(()=>S.cut&&S.cut.id)); await wait(3000); await shot('06_gather.png'); await wait(8000); await shot('07_gather_mid.png');
  await p.evaluate(()=>skipCutscene()); await wait(500); await shot('08_gather_after.png'); log('gathered',await p.evaluate(()=>S.flags.gathered));
  log('final',await p.evaluate(()=>({running:!!S.running||true,frameErr:window.__frameErr||null})));
  console.log('errors',JSON.stringify(errs)); await b.close(); process.exit(errs.length?1:0);
})();
