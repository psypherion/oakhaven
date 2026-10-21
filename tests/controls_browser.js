const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:760}});
  /* a fake standard gamepad the test can drive */
  await ctx.addInitScript(()=>{ const pad={id:'Test Pad (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',
      buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0,0,0],vibrationActuator:{playEffect(){ window.__rumbles=(window.__rumbles||0)+1; return Promise.resolve(); }}};
    window.__pad=pad; navigator.getGamepads=()=>[pad]; });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  const R=[]; const log=(k,v)=>R.push([k,v]);
  await p.goto('file://'+require('path').resolve(process.argv[2]||require('path').join(__dirname,'..','oakhaven.html'))); await p.waitForTimeout(500);
  await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('oakhaven.settings.v1',JSON.stringify({warned:true,hints:false})); document.getElementById('gate')?.classList.remove('on'); dispatchEvent(Object.assign(new Event('gamepadconnected'),{gamepad:window.__pad})); });
  // open from boot button
  await p.click('#openCtrl'); await p.waitForTimeout(300); await p.screenshot({path:require('path').join(require('os').tmpdir(),'ctrl_page.png'),fullPage:false});
  log('page open',await p.evaluate(()=>CTRL.open));
  // rebind fire slot 0 -> G
  await p.click('.bind[data-id="fire"][data-slot="0"]'); await p.keyboard.press('KeyG'); await p.waitForTimeout(100);
  log('fire->G',await p.evaluate(()=>CTRL.bind.fire.keys));
  // rebind interact to G: should steal from fire
  await p.click('.bind[data-id="interact"][data-slot="0"]'); await p.keyboard.press('KeyG');
  log('steal',await p.evaluate(()=>({fire:CTRL.bind.fire.keys,interact:CTRL.bind.interact.keys,msg:CTRL.msg})));
  // bind fire to right mouse via mouse capture
  await p.click('.bind[data-id="fire"][data-slot="0"]'); await p.mouse.click(640,300,{button:'right'});
  log('fire->Mouse2',await p.evaluate(()=>({fire:CTRL.bind.fire.keys,alt:CTRL.bind.alt.keys})));
  // escape is reserved
  await p.click('.bind[data-id="jump"][data-slot="1"]'); await p.keyboard.press('Escape'); log('esc cancels',await p.evaluate(()=>({cap:CTRL.capture,jump:CTRL.bind.jump.keys})));
  // pad slot: press a pad button
  await p.click('.bind[data-id="torch"][data-slot="pad"]'); await p.evaluate(()=>{ __pad.buttons[3].pressed=true; }); await p.waitForTimeout(120); await p.evaluate(()=>{ __pad.buttons[3].pressed=false; }); await p.waitForTimeout(80);
  log('torch pad->Y (stolen from special)',await p.evaluate(()=>({torch:CTRL.bind.torch.pad,special:CTRL.bind.special.pad})));
  await p.click('.bind[data-id="kick"][data-slot="1"]'); await p.screenshot({path:require('path').join(require('os').tmpdir(),'ctrl_capture_v2.png')}); await p.keyboard.press('Escape');
  // slider
  await p.evaluate(()=>{ const r=document.querySelector('input[data-opt="mouseSens"]'); r.value=2; r.dispatchEvent(new Event('input')); });
  log('sens',await p.evaluate(()=>CTRL.opts.mouseSens));
  await p.click('button[data-close]'); await p.waitForTimeout(100);
  log('saved',await p.evaluate(()=>JSON.parse(localStorage.getItem('oakhaven.controls.v1')).bind.interact.keys));
  log('help mentions G',await p.evaluate(()=>document.getElementById('keys').textContent.includes('G interact')));
  // reload: persists
  await p.reload(); await p.waitForTimeout(400);
  log('persist',await p.evaluate(()=>({i:CTRL.bind.interact.keys,s:CTRL.opts.mouseSens})));
  // start the game, skip intro with keyboard, then play with pad
  await p.click('.go[data-h="dean"]'); await p.waitForTimeout(600); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  await p.evaluate(()=>dispatchEvent(Object.assign(new Event('gamepadconnected'),{gamepad:window.__pad})));
  const s0=await p.evaluate(()=>({x:S.px,y:S.py,a:S.angle}));
  await p.evaluate(()=>{ __pad.axes[1]=-1; __pad.axes[2]=.8; }); await p.waitForTimeout(700); await p.evaluate(()=>{ __pad.axes[1]=0; __pad.axes[2]=0; });
  const s1=await p.evaluate(()=>({x:S.px,y:S.py,a:S.angle}));
  log('pad moved',Math.hypot(s1.x-s0.x,s1.y-s0.y).toFixed(2)); log('pad looked',(s1.a-s0.a).toFixed(2));
  // RT fires
  const am0=await p.evaluate(()=>S.ammo.shells); await p.evaluate(()=>{ __pad.buttons[7].pressed=true; __pad.buttons[7].value=1; }); await p.waitForTimeout(300);
  await p.evaluate(()=>{ __pad.buttons[7].pressed=false; __pad.buttons[7].value=0; }); await p.waitForTimeout(100);
  log('RT fired',{before:am0,after:await p.evaluate(()=>S.ammo.shells),rumbles:await p.evaluate(()=>window.__rumbles||0)});
  // prompt uses pad label
  await p.evaluate(()=>enterSector('motel',9.5,5.4,-Math.PI/2)); await p.waitForTimeout(500);
  log('pad hint',await p.evaluate(()=>keyName('interact')));
  await p.evaluate(()=>{ __pad.buttons[2].pressed=true; }); await p.waitForTimeout(120); await p.evaluate(()=>{ __pad.buttons[2].pressed=false; }); await p.waitForTimeout(300);
  log('X talks',await p.evaluate(()=>dlg.open));
  await p.evaluate(()=>{ __pad.buttons[0].pressed=true; }); await p.waitForTimeout(120); await p.evaluate(()=>{ __pad.buttons[0].pressed=false; }); await p.waitForTimeout(200);
  log('A picks choice 1',await p.evaluate(()=>document.getElementById('line').textContent.slice(0,50)));
  await p.evaluate(()=>closeDlg());
  // Menu button opens controls in game and pauses
  await p.evaluate(()=>{ __pad.buttons[9].pressed=true; }); await p.waitForTimeout(120); await p.evaluate(()=>{ __pad.buttons[9].pressed=false; }); await p.waitForTimeout(150);
  const paused=await p.evaluate(()=>dlg.open&&document.getElementById('spk').textContent==='Paused');
  /* pause menu → Controls */
  await p.evaluate(()=>pickChoice(dlg.avail.find(c=>c.text==='Controls'))); await p.waitForTimeout(150);
  const t0=await p.evaluate(()=>({open:CTRL.open,hp:S.hp,x:S.px})); await p.screenshot({path:require('path').join(require('os').tmpdir(),'ctrl_ingame_v2.png')});
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  log('Menu button pauses',paused); log('controls from the pause menu',t0.open); log('closed',await p.evaluate(()=>!CTRL.open));
  // keyboard rebinding is live: G interacts
  log('errors',errs.slice(0,5));
  for(const r of R) console.log(JSON.stringify(r)); await b.close();
})();
