/* Real-browser look at 1.6: names page, switching, Rae, the enchantress rewriting the choices,
   the stranger at the altar, Vishvarupa, an ending, and the fourth wall. Screenshots for review. */
const path=require('path'), fs=require('fs');
const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const file=path.resolve(path.join(__dirname,'..','oakhaven.html'));
const OUT=process.argv[2]||path.join(require('os').tmpdir(),'oak_hearts'); fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader']}); const ctx=await b.newContext({viewport:{width:1280,height:760}}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/bigdatacloud|net::|Failed to fetch/.test(m.text())) errs.push(m.text()); });
  const log=(k,v)=>console.log(JSON.stringify([k,v])); const shot=n=>p.screenshot({path:path.join(OUT,n)}); const wait=ms=>p.waitForTimeout(ms);
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('oakhaven.settings.v1',JSON.stringify({warned:true,hints:false,useLoc:false})); localStorage.removeItem('oakhaven.names.v1'); }catch(e){} });
  await p.goto('file://'+file); await wait(400);
  /* names */
  await p.evaluate(()=>openNames()); await wait(200);
  await p.fill('input[data-n="dean"]','Arjun'); await p.fill('input[data-n="god"]','The One'); await wait(100); await shot('01_names.png');
  log('names',await p.evaluate(()=>[NAMES.dean,NAMES.god,HEROES.dean.full]));
  await p.evaluate(()=>closeSettings()); await wait(100);
  await p.click('.go[data-h="dean"]'); await wait(500); await p.keyboard.press('Enter'); await wait(400);
  await p.evaluate(()=>{ skipCutscene(); S.cardQ.length=0; S.card=null; S.flags.marla=true; S.flags.phantom=true; enterSector('street',24.4,39.4,-Math.PI/2); for(const e of SECTORS.street.entities) if(e.kind==='enemy') e.dead=true; });
  await wait(500); await shot('02_rae_street.png');
  await p.evaluate(()=>openDlg('rae',SECTORS.street.entities.find(e=>e.rae))); await wait(300); await shot('03_rae_talk.png');
  log('rae line renamed',await p.evaluate(()=>/Arjun|Rae/.test(document.getElementById('line').textContent)));
  await p.evaluate(()=>{ closeDlg(); });
  /* switch */
  await p.keyboard.press('KeyU'); await wait(600); await shot('04_switched.png'); log('switched',await p.evaluate(()=>S.hero));
  await p.keyboard.press('KeyU'); await wait(300); log('switched back',await p.evaluate(()=>S.hero));
  /* Vesper */
  await p.evaluate(()=>{ S.act=2; S.hp=30; S.cash=20; inv_().bond=1; enterSector('lounge',10.5,5.4,-Math.PI/2+.6); }); await wait(500); await shot('05_vesper_bar.png');
  await p.evaluate(()=>{ openDlg('vesper',SECTORS.lounge.entities.find(e=>e.vesper)); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); }); await wait(500); await shot('06_spell_start.png');
  await wait(1700); await shot('07_spell_mid.png'); await wait(3200); await shot('08_spell_done.png'); await wait(1600); await shot('09_rescue.png');
  log('rescue offered',await p.evaluate(()=>dlg.avail.map(c=>c.text)));
  await p.evaluate(()=>pickChoice(dlg.avail[0])); await wait(300); await shot('10_freed.png'); log('after rescue',await p.evaluate(()=>[dlg.open,dlg.node,(dlg.avail||[]).length,ENTH.on])); await p.evaluate(()=>{ let n=0; while(dlg.open&&dlg.avail&&dlg.avail[0]&&n++<5) pickChoice(dlg.avail[0]); if(dlg.open) closeDlg(); });
  /* the stranger, early */
  await p.evaluate(()=>{ S.act=1; S.flags.tg1=false; enterSector('motel',13.2,7.4,-Math.PI/4); }); await wait(600); await shot('11_stranger_motel.png');
  /* the altar */
  await p.evaluate(()=>{ startAt(4); }); await wait(500);
  await p.evaluate(()=>{ while(S.cut) skipCutscene(); S.cardQ.length=0; S.card=null; S.flags.cas_open=true; S.flags.bell_seal=true; S.flags.kevin_rig=true; inv_().bond=1;
    enterSector('cathedral',12.5,9.6,-Math.PI/2); resolveAlistair(false); openDlg('chuck_end',SECTORS.cathedral.entities.find(e=>e.chuck)); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); });
  await wait(700); await shot('12_third_chair.png');
  await p.evaluate(()=>{ for(let i=0;i<8;i++) pickChoice(dlg.avail[0]); }); await wait(1500); await shot('13_rewrite_attempt.png'); await wait(3200); await shot('14_rewrite_failed.png');
  await p.evaluate(()=>{ pickChoice(dlg.avail[0]); pickChoice(dlg.avail.find(c=>/Go on/.test(c.text))); }); await wait(300); await shot('15_phase1.png');
  await p.evaluate(()=>{ pickChoice(dlg.avail.find(c=>/seal/.test(c.text))); pickChoice(dlg.avail[0]); pickChoice(dlg.avail.find(c=>/Enough/.test(c.text)));
    pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); });
  await wait(300); log('node',await p.evaluate(()=>dlg.node)); await wait(7600); await shot('16_phase2_spell.png');
  await p.evaluate(()=>{ const l=dlg.avail.find(c=>!/voice|“/.test(c.text.slice(0,2))&&!/voice/.test(c.text)); pickChoice(dlg.avail[dlg.avail.length-1]); }); await wait(300); await shot('17_maya.png');
  log('maya options',await p.evaluate(()=>dlg.avail.map(c=>c.text)));
  await p.evaluate(()=>{ pickChoice(dlg.avail.find(c=>/Grab|hunger wearing/.test(c.text))||dlg.avail[0]); pickChoice(dlg.avail[0]); }); await wait(1400); await shot('18_sceneD.png'); await wait(3400); await shot('19_sceneD_after.png');
  await p.evaluate(()=>{ pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); }); await wait(900); await shot('20_vishva1.png');
  await p.evaluate(()=>{ pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); }); await wait(1500); await shot('21_vishvarupa.png');
  log('named',await p.evaluate(()=>[S.flags.tg_named,document.getElementById('spk').textContent]));
  await p.evaluate(()=>{ pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); pickChoice(dlg.avail[0]); pickChoice(dlg.avail.find(c=>/chosen/.test(c.text))); pickChoice(dlg.avail.find(c=>/a hunger/.test(c.text))); pickChoice(dlg.avail.find(c=>/inside his script/.test(c.text))); });
  await wait(600); await shot('22_phase4.png');
  await p.evaluate(()=>{ pickChoice(dlg.avail.find(c=>/^“We reject/.test(c.text))); pickChoice(dlg.avail[0]); }); await wait(5000); await shot('23_ending_F.png');
  await p.evaluate(()=>skipCutscene()); await wait(2500); await shot('24_epilogue.png');
  /* the fourth wall */
  const p2=await ctx.newPage(); p2.on('pageerror',e=>errs.push(e.message));
  await p2.goto('file://'+file); await p2.waitForTimeout(400); await p2.click('.go[data-h="sam"]'); await p2.waitForTimeout(500); await p2.keyboard.press('Enter'); await p2.waitForTimeout(400);
  await p2.evaluate(()=>{ skipCutscene(); S.cardQ.length=0; S.card=null; S.act=3; enterSector('street',28,30,-Math.PI/2); for(const e of SECTORS.street.entities) if(e.kind==='enemy') e.dead=true; });
  await p2.waitForTimeout(800); await p2.evaluate(()=>{ FW.t3=S.time-40; }); await p2.waitForTimeout(500);
  log('armed',await p2.evaluate(()=>[FW.armed,FW.loc,FW.src]));
  await p2.keyboard.press('KeyW'); await p2.waitForTimeout(700); await p2.screenshot({path:path.join(OUT,'25_fourth_glitch.png')});
  await p2.waitForTimeout(3600); await p2.screenshot({path:path.join(OUT,'26_fourth_town.png')});
  await p2.waitForTimeout(5200); log('fourth over',await p2.evaluate(()=>[FW.on,S.menu,!!document.fullscreenElement]));
  console.log('errors',JSON.stringify(errs)); await b.close(); process.exit(errs.length?1:0);
})();
