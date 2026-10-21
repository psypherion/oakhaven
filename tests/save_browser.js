/* Real-browser save/resume: save mid-game, load from the pause menu (page reload),
   then Continue from the title screen. */
const path=require('path');
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const file=path.resolve(process.argv[2]||path.join(__dirname,'..','oakhaven.html'));
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader']}); const p=await b.newPage({viewport:{width:1152,height:700}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  const R=[]; const log=(k,v)=>R.push([k,v]); const shot=n=>p.screenshot({path:path.join(require('os').tmpdir(),n)});
  await p.addInitScript(()=>{ try{ const o=JSON.parse(localStorage.getItem('oakhaven.settings.v1')||'{}'); o.warned=true; o.hints=false; localStorage.setItem('oakhaven.settings.v1',JSON.stringify(o)); }catch(e){} });
  await p.goto('file://'+file); await p.evaluate(()=>{ for(const k of Object.keys(localStorage)) if(k.startsWith('oakhaven.save')) localStorage.removeItem(k); }); await p.reload(); await p.waitForTimeout(400);
  log('no Continue on a fresh profile',await p.evaluate(()=>!document.getElementById('resume')));
  await p.click('.go[data-h="dean"]'); await p.waitForTimeout(500); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  await p.evaluate(()=>{ startAt(3); skipCutscene(); S.cardQ.length=0; S.card=null; S.cash=4321; enterSector('library',8,9.6,-Math.PI/2); });
  await p.waitForTimeout(400);
  /* P opens the pause menu; save to slot 2 */
  await p.keyboard.press('KeyP'); await p.waitForTimeout(150); await shot('save_pause.png');
  log('P pauses',await p.evaluate(()=>dlg.open&&document.getElementById('spk').textContent));
  await p.evaluate(()=>pickChoice(dlg.avail.find(c=>c.text==='Save game'))); await p.waitForTimeout(100);
  await p.evaluate(()=>pickChoice(dlg.avail.find(c=>/Slot 2/.test(c.text)))); await p.waitForTimeout(200);
  log('slot 2 written',await p.evaluate(()=>!!localStorage.getItem('oakhaven.save.2')));
  /* change things, then load slot 2 from the pause menu: the page reloads into the save */
  await p.evaluate(()=>{ S.cash=1; enterSector('street',28,30,0); });
  await p.keyboard.press('KeyP'); await p.waitForTimeout(150);
  await p.evaluate(()=>pickChoice(dlg.avail.find(c=>c.text==='Load game'))); await p.waitForTimeout(100);
  await p.evaluate(()=>pickChoice(dlg.avail.find(c=>/Slot 2/.test(c.text)))); await p.waitForTimeout(100);
  await Promise.all([p.waitForNavigation(),p.evaluate(()=>pickChoice(dlg.avail.find(c=>c.text==='Yes')))]);
  await p.waitForTimeout(800); await shot('save_resumed.png');
  log('resumed after reload',await p.evaluate(()=>({running:S.running,act:S.act,cash:S.cash,sector:S.sector.id,obj:objective()&&objective().id})));
  /* back to the title: Continue offers the latest save */
  await p.reload(); await p.waitForTimeout(500); await shot('save_title.png');
  log('Continue shown',await p.evaluate(()=>{ const r=document.getElementById('resume'); return r?r.querySelector('.cont').textContent:null; }));
  await p.click('#resume .cont'); await p.waitForTimeout(700);
  log('Continue resumes',await p.evaluate(()=>({running:S.running,act:S.act,cash:S.cash,hero:S.hero})));
  /* Esc-style pointer-lock loss pauses the game */
  await p.evaluate(()=>{ document.dispatchEvent(new Event('pointerlockchange')); });
  log('losing the mouse pauses',await p.evaluate(()=>dlg.open&&document.getElementById('spk').textContent==='Paused'));
  for(const r of R) console.log(JSON.stringify(r)); console.log('errors',JSON.stringify(errs)); await b.close();
})();
