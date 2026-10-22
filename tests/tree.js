/* 1.10: the story tree (jump to any point) and the one who comes next. Headless. */
const {load}=require('./harness');
let fails=0; const ok=(c,m)=>{ if(!c){ console.log('  FAIL:',m); fails++; } };
const mk=()=>{ const K=load({isolated:true}); let t=0; K.ks=n=>{ for(let i=0;i<n;i++){ t+=16; K.frame(t); } }; return K; };
console.log('— every point in the tree can be played from');
const E=[];
for(const n of mk().TREE){ if(n.end||n.kind==='heir') continue;
  for(const hero of ['dean','sam']){ const K=mk(); let err=null;
    const ce=K.console.error; K.console.error=(...a)=>{ err=a.map(String).join(' '); };
    try{ ok(K.treeStart(n.id,hero),`${n.id}: did not start`); K.ks(240); }catch(e){ err=e.message; }
    ok(K.S.running,`${n.id}/${hero}: not running`); ok(!err,`${n.id}/${hero}: ${err}`);
    ok(K.S.act===n.act,`${n.id}/${hero}: act ${K.S.act}, expected ${n.act}`);
    if(n.id==='drowned') ok(K.S.sector.id==='d_drowned',`drowned: in ${K.S.sector.id}`);
    if(n.id==='altar') ok(K.S.sector.id==='cathedral','altar: not in the cathedral');
    if(n.id==='radio') ok(K.S.sector.id==='station','radio: not at the station');
    E.push(n.id); } }
ok(E.length>=56,'too few jump points: '+E.length);
console.log('— the tree renders, with links, veils and a jump panel');
{ const K=mk(); K.openTree(); const h=K.elTree_().innerHTML; ok(/<svg/.test(h)&&(h.match(/data-tn=/g)||[]).length===K.TREE.length,'tree nodes missing');
  ok(/class="tl"/.test(h),'no threads between stories'); ok(/· · ·/.test(h),'later acts not veiled on a fresh profile');
  K.TV.all=true; K.renderTree(); ok(!/· · ·/.test(K.elTree_().innerHTML),'show everything did not unveil'); K.TV.sel='kevin'; K.renderTree(); ok(/Play from here/.test(K.elTree_().innerHTML),'no play button'); }
console.log('— the one who comes next');
const run=(hero,fx,end)=>{ const K=mk(); K.begin(hero); K.ks(2); K.skipCutscene(); fx(K.S.flags,K); K.S.flags.ending=end; const H=K.heirMake(); return {K,H}; };
{ const a=run('sam',(F,K)=>{ Object.assign(F,{delia_done:true,kevin_done:true,kevin_rested:true,alistair_spared:true,lily_rested:true,lil_no:true}); K.S.freed=6; },'B').H;
  const b=run('dean',(F,K)=>{ Object.assign(F,{delia_done:true,delia_killed:true,kevin_done:true,kevin_used:true}); K.S.kills={demon:40,ghost:10}; },'D').H;
  const a2=run('sam',(F,K)=>{ Object.assign(F,{delia_done:true,kevin_done:true,kevin_rested:true,alistair_spared:true,lily_rested:true,lil_no:true}); K.S.freed=6; },'B').H;
  ok(a.traits[0].k==='mercy','a merciful run did not make a merciful person: '+a.traits.map(t=>t.k));
  ok(b.traits[0].k==='force'||b.traits[0].k==='defiance','a violent, defiant run made: '+b.traits.map(t=>t.k));
  ok(a.name!==b.name||a.job!==b.job,'different runs made the same person');
  ok(a.name===a2.name&&a.place===a2.place,'the same run made a different person');
  ok(a.tells.length===3&&a.opening.includes(a.first)&&a.traits.every(t=>t.t),'thin sheet');
  ok(a.traits.some(t=>/Father Alistair|Kevin|Delia|freed/.test(t.why)),'traits don’t say which choices made them');
  ok(a.echo.length>0,'no echo of the run');
  const {K}=run('dean',()=>{},'C'); ok(K.heirLoad()&&K.LOOKS.heir,'not kept, or no look'); K.openHeir(null,true); ok(/The one who comes next/.test(K.elHeir_().innerHTML)&&/closes his eyes/.test(K.elHeir_().innerHTML),'no sheet');
  let port=true; try{ K.portraitCanvas('heir',0); }catch(e){ port=false; } ok(port,'no portrait');
  K.openCodex('characters'); ok(/The one who comes next/.test(K.elCodex_().innerHTML),'not in Characters');
  K.TV.sel='heir'; K.TV.all=true; K.openTree(); ok(/Meet him/.test(K.elTree_().innerHTML),'not in the tree'); }
{ const K=mk(); K.begin('sam'); K.ks(2); K.skipCutscene(); K.S.flags.ending='E'; K.showEnding('E'); ok(K.heirLoad(),'the end screen did not make him'); }
console.log(fails?`\n${fails} failure(s)`:'\nAll checks passed'); process.exit(fails?1:0);
