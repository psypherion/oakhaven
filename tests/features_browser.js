/* Real-browser walk through the new systems, with screenshots for review:
   journal, deduction, autopsy, paper, phone, camera + echo, gallery, the remote
   locations, and the quick wheel. */
const path=require('path'), fs=require('fs');
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const file=path.resolve(path.join(__dirname,'..','oakhaven.html'));
const OUT=process.argv[2]||path.join(require('os').tmpdir(),'oak_shots'); fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader']}); const p=await b.newPage({viewport:{width:1280,height:760}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  const R=[]; const log=(k,v)=>R.push([k,v]); const shot=n=>p.screenshot({path:path.join(OUT,n)});
  const wait=ms=>p.waitForTimeout(ms);
  await p.addInitScript(()=>{ try{ const o=JSON.parse(localStorage.getItem('oakhaven.settings.v1')||'{}'); o.warned=true; o.hints=false; localStorage.setItem('oakhaven.settings.v1',JSON.stringify(o)); }catch(e){} });
  await p.goto('file://'+file); await wait(400);
  await p.click('.go[data-h="sam"]'); await wait(500); await p.keyboard.press('Enter'); await wait(400);
  await p.evaluate(()=>{ skipCutscene(); S.cardQ.length=0; S.card=null; S.flags.marla=true; S.flags.earl=true; });
  /* the mill, investigated */
  await p.evaluate(()=>{ enterSector('mill',14.5,3.2,-Math.PI/2); }); await wait(500); await shot('01_mill_fan.png');
  await p.evaluate(()=>{ for(const id of ['roster','ledger14','inspect']){ const e=SECTORS.mill.entities.find(e=>e.read===id); readThing(e); closeDlg(); } USES.fan(); closeDlg(); });
  await p.keyboard.press('KeyJ'); await wait(300); await shot('02_journal.png');
  log('journal open',await p.evaluate(()=>document.getElementById('journal').classList.contains('on')));
  await p.click('.jr-card[data-clue="ledger14"]'); await p.click('.jr-card[data-clue="fan"]'); await wait(100); await shot('03_journal_selected.png');
  await p.click('[data-link]'); await wait(300); await shot('04_deduction.png');
  log('deduction made',await p.evaluate(()=>deduced('neglect')));
  await p.click('[data-hunch]').catch(()=>{}); await wait(200); await shot('05_hunch.png');
  await p.keyboard.press('Escape'); await wait(200);
  log('journal closed',await p.evaluate(()=>!S.caseOpen));
  /* phone and camera */
  await p.keyboard.press('KeyN'); await wait(400); await shot('06_phone_home.png');
  log('phone open',await p.evaluate(()=>S.phoneOpen));
  await p.keyboard.press('Escape'); await wait(300);
  await p.evaluate(()=>{ enterSector('mill',9.6,11.4,-Math.PI/2); }); await wait(300);
  await p.keyboard.press('KeyY'); await wait(500); await shot('07_camera_echo.png');
  log('camera + echo',await p.evaluate(()=>({cam:!!S.camMode,signal:S.camMode&&S.camMode.signal})));
  await p.mouse.click(640,380); await wait(500);
  await p.evaluate(()=>{ S.snapNow=true; }); await wait(300);
  log('photo taken',await p.evaluate(()=>GALLERY.length));
  await p.keyboard.press('Escape'); await wait(200);
  await p.evaluate(()=>openPhone('gallery')); await wait(300); await shot('08_gallery.png');
  await p.evaluate(()=>{ PHN.photo=GALLERY[0].id; PHN.screen='photo'; phoneRender(); }); await wait(200); await shot('09_photo.png');
  await p.evaluate(()=>closePhone());
  /* autopsy and the morning paper */
  await p.evaluate(()=>{ commitTheory('mill','fan'); closeCase('mill'); }); await wait(600); await shot('10_autopsy.png');
  log('autopsy',await p.evaluate(()=>S.menu));
  await p.keyboard.press('Enter'); await wait(400); await shot('11_paper.png');
  await p.keyboard.press('Enter'); await wait(300);
  log('paper closed',await p.evaluate(()=>!S.menu));
  await p.evaluate(()=>{ openPhone(); PHN.screen='news'; phoneRender(); }); await wait(200); await shot('12_phone_news.png');
  await p.evaluate(()=>{ PHN.article=S.inv.news[0].ed; PHN.screen='article'; phoneRender(); }); await wait(200); await shot('13_phone_article.png');
  await p.evaluate(()=>closePhone());
  /* the quick wheel */
  await p.keyboard.down('Tab'); await wait(300); await shot('14_wheel.png'); await p.keyboard.up('Tab'); await wait(200);
  /* places */
  const place=async(n,fn)=>{ await p.evaluate(fn); await wait(500); await shot(n); };
  await place('15_maint.png',()=>{ S.flags.dwyer_found=true; enterSector('maint',5.6,3.5,Math.PI); });
  await place('16_reservoir.png',()=>{ enterSector('reservoir',20,22,-Math.PI/2); });
  await place('17_reservoir_bell.png',()=>{ S.flags.res_tally=true; S.flags.read_fishlog=true; S.px=20; S.py=15; USES.res_water(); });
  await wait(2500); await shot('18_reflection.png'); await wait(5000); await shot('19_path.png');
  await place('20_carver.png',()=>{ enterSector('carver',9.4,4.5,Math.PI); });
  await place('21_route9.png',()=>{ enterSector('route9',5,50,-Math.PI/2); });
  await place('22_larch.png',()=>{ enterSector('larch',13.5,12,-Math.PI/2); });
  await place('23_agnes.png',()=>{ S.flags.agnes_visits=2; enterSector('agnes',6.5,19.6,-Math.PI/2); });
  await place('24_nursery.png',()=>{ S.px=6.5; S.py=5; S.angle=-Math.PI/2; });
  await place('25_clinic.png',()=>{ enterSector('clinic',8.5,12.4,-Math.PI/2); });
  await place('26_basement.png',()=>{ enterSector('basement',4.5,6.4,-Math.PI/2); });
  await place('27_clinic_lot.png',()=>{ enterSector('clinic_lot',8.5,8.6,-Math.PI/2); });
  await place('28_motel_tv.png',()=>{ S.flags.phantom=true; enterSector('motel',14,4,-Math.PI/2); USES.motel_tv(); });
  await place('29_hub.png',()=>{ enterSector('street',28,38.6,Math.PI/2); carMenu(SECTORS.street.entities.find(e=>e.name==='Impala')); });
  log('final',await p.evaluate(()=>({running:S.running,frameErr:window.__frameErr||null})));
  for(const r of R) console.log(JSON.stringify(r)); console.log('errors',JSON.stringify(errs)); await b.close();
})();
