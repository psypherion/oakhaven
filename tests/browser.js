const {chromium}=(()=>{try{return require('playwright')}catch(e){return require('/opt/npm-tools/node_modules/playwright')}})();
const file=process.argv[2]||require('path').join(__dirname,'..','oakhaven.html');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--autoplay-policy=no-user-gesture-required']});
  let fails=0; const res=[];
  for(const hero of ['dean','sam']){
    const p=await b.newPage({viewport:{width:1280,height:720}});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
    await p.addInitScript(()=>{ try{ const o=JSON.parse(localStorage.getItem('oakhaven.settings.v1')||'{}'); o.warned=true; o.hints=false; localStorage.setItem('oakhaven.settings.v1',JSON.stringify(o)); }catch(e){} });
  await p.goto('file://'+require('path').resolve(file)); await p.waitForTimeout(700);
    await p.click(`.go[data-h="${hero}"]`); await p.waitForTimeout(1500);
    const lit=async()=>p.evaluate(()=>{ const c=document.getElementById('world'), x=c.getContext('2d'), d=x.getImageData(0,0,c.width,c.height).data;
      let n=0,sum=0; for(let i=0;i<d.length;i+=4*97){ n++; sum+=d[i]+d[i+1]+d[i+2]; } return {w:c.width,h:c.height,avg:sum/n/3|0}; });
    const t0=await p.evaluate(()=>S.time);
    await p.keyboard.press('Enter'); await p.waitForTimeout(1200); await p.screenshot({path:require('path').join(require('os').tmpdir(),`${hero}_street.png`)});
    const a=await lit(); res.push([hero,'street',a]);
    await p.keyboard.down('KeyW'); await p.waitForTimeout(900); await p.keyboard.up('KeyW');
    await p.keyboard.down('KeyA'); await p.waitForTimeout(400); await p.keyboard.up('KeyA');
    await p.mouse.move(700,360); await p.mouse.down(); await p.waitForTimeout(300); await p.mouse.up();
    const t1=await p.evaluate(()=>S.time);
    res.push([hero,'clock advances',(t1-t0).toFixed(2)]);
    // talk to someone: put Marla in front and press E
    await p.evaluate(()=>{ enterSector('motel',9.5,7.6,-Math.PI/2); });
    await p.waitForTimeout(900); await p.keyboard.press('KeyE'); await p.waitForTimeout(500);
    const dl=await p.evaluate(()=>({open:dlg.open, port:document.getElementById('dlg').classList.contains('withport'), w:document.getElementById('dlg').getBoundingClientRect().width}));
    res.push([hero,'dialogue',dl]); await p.screenshot({path:require('path').join(require('os').tmpdir(),`${hero}_dialogue.png`)});
    await p.evaluate(()=>closeDlg()); await p.waitForTimeout(200);
    await p.keyboard.press('KeyJ'); await p.waitForTimeout(300); await p.screenshot({path:require('path').join(require('os').tmpdir(),`${hero}_case.png`)}); await p.keyboard.press('KeyJ');
    await p.keyboard.press('KeyM'); await p.waitForTimeout(300); await p.keyboard.press('KeyM');
    for(let i=0;i<5;i++){ await p.keyboard.press('KeyR'); await p.waitForTimeout(350); const r=await p.evaluate(()=>MODE&&MODE.name||String(i)); const l=await lit(); res.push([hero,'renderer '+r,l]); await p.screenshot({path:require('path').join(require('os').tmpdir(),`${hero}_r${i}.png`)}); }
    for(const k of ['KeyL','KeyF','Digit1','Digit2','KeyQ','KeyV','KeyB','KeyC','Space']){ await p.keyboard.press(k); await p.waitForTimeout(120); }
    await p.waitForTimeout(500);
    const ok=await p.evaluate(()=>({running:S.running,frameErr:typeof frameErr!=='undefined'&&frameErr?String(frameErr):null}));
    res.push([hero,'final',ok]);
    if(errs.length){ fails++; res.push([hero,'ERRORS',errs.slice(0,5)]); }
    await p.close();
  }
  for(const r of res) console.log(JSON.stringify(r));
  console.log(fails?'BROWSER ERRORS':'no browser errors'); await b.close();
})();
