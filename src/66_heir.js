/* ═══ The one who comes next ═══════════════════════════════════════════════
   At the very end the Formless One takes a form: a new person, born into
   an ordinary life, who does not know what he is. Who he turns out to be is
   decided by how you played the whole story: whom you spared, how hard you
   looked, whom you loved, how you fought, and how you ended it. The same
   run always makes the same person.

   He is kept in this browser after any ending (oakhaven.heir.v1), shown on
   the end screen, in Characters, and at the far end of the story tree, and
   can be downloaded as a file to carry into the next chapter of the story. */

const HEIR_KEY='oakhaven.heir.v1';
function heirLoad(){ try{ return JSON.parse(localStorage.getItem(HEIR_KEY)||'null'); }catch(e){ return null; } }
function heirSave(h){ try{ localStorage.setItem(HEIR_KEY,JSON.stringify(h)); }catch(e){} }

/* how the run was played, as nine leanings */
function heirProfile(){
  const F=S.flags, I=inv_(), K=S.kills||{}, P={mercy:0,force:0,inquiry:0,love:0,loyalty:0,wander:0,defiance:0,faith:0,restraint:0}, why={};
  const add=(k,n,w)=>{ P[k]+=n; if(w&&n>0) (why[k]=why[k]||[]).push(w); };
  if(F.delia_done) F.delia_killed?add('force',2,'you killed what was wearing Delia Park'):add('mercy',2,'you got Delia Park out alive');
  if(F.kevin_done) F.kevin_used?add('force',1,'you put Kevin to work'):add('mercy',2,'you let Kevin rest');
  if(F.kevin_used) P.mercy-=1;
  if(F.alistair_spared) add('mercy',2,'you spared Father Alistair'); if(F.alistair_argued) add('inquiry',1,'you argued with Father Alistair instead of shooting');
  if(F.lily_rested||F.lily_waiting) add('mercy',1,'Lily Hollis turned around');
  if(F.ray_heard) add('inquiry',1,'you talked Ray Hollis down by name');
  if((S.freed||0)>0) add('mercy',Math.min(3,S.freed*.5),`you freed ${S.freed} ${S.freed===1?'person':'people'} instead of killing them`);
  const kills=(K.demon||0)+(K.ghost||0)+(K.husk||0)+(K.eldritch||0); if(kills) add('force',Math.min(4,kills/8),`you put down ${kills} things that came at you`);
  let right=0, theories=0; for(const c of Object.values(CASES)){ if(theoryOf(c.id)){ theories++; if(theoryRight(c.id)) right++; } }
  if(right) add('inquiry',right*.8,`${right} of your theories held`);
  let ded=0; for(const k in (S.inv.links||{})) ded+=(S.inv.links[k]||[]).length; if(ded) add('inquiry',Math.min(3,ded/4),`you made ${ded} connections nobody else made`);
  let closedOpt=0; for(const c of Object.values(CASES)) if(/optional/.test(c.kicker||'')&&caseClosed(c.id)&&(theoryOf(c.id)||caseDecision(c.id)||invQuality(c.id)>=.4)) closedOpt++;
  if(closedOpt) add('wander',closedOpt*.7,`you took ${closedOpt} cases nobody asked you to`);
  const dims=['drowned','ash','nave'].filter(d=>F['dim_'+d+'_seen']).length; if(dims) add('wander',dims,'you walked into other years');
  try{ if(trueLove(S.hero)) add('love',3,`you let yourself be loved by ${S.hero==='dean'?NAMES.rae:NAMES.sarah}`); }catch(e){}
  try{ const h=inv_().hearts||{}; const tot=Object.values(h).reduce((a,b)=>a+(+b||0),0); if(tot>0) add('love',Math.min(2,tot*.3)); }catch(e){}
  if(F.lil_no) add('restraint',2,'you told Lilith no, and why');
  if(F.vesper_done&&!F.lost_vesper&&!S.notes.some(n=>n.id==='lost_vesper')) add('restraint',1,'you didn’t lose the night to Vesper');
  if(S.notes.some(n=>n.id==='lost_vesper')) add('love',1,'you lost a night to Vesper');
  const bond=I.bond||0; if(bond>0) add('loyalty',bond,'you and your brother kept agreeing'); else if(bond<0) add('defiance',-bond*.6,'you made the hard calls your brother wouldn’t');
  const k=F.ending;
  ({A:()=>add('faith',2,'you burned the town down to save it'),B:()=>add('faith',3,'you chose the martyr’s ending'),C:()=>add('defiance',2,'you walked away from the altar'),
    D:()=>add('defiance',3,'you deleted the author'),E:()=>add('defiance',2,'you chose liberation'),F:()=>add('faith',2,'you chose equilibrium'),G:()=>add('love',1,'you asked for one more Sunday')}[k]||(()=>{}))();
  add(S.hero==='dean'?'force':'inquiry',1);
  return {P,why};
}
const HEIR_TRAIT={
  mercy:{t:'Can’t walk past someone who’s hurting',job:'a night-shift nurse',coat:[150,92,70],kind:'cardigan',flaw:'He says yes to everyone, and is tired all the time.'},
  force:{t:'Steps between people and trouble without deciding to',job:'a tow-truck driver',coat:[70,48,36],kind:'jacket',flaw:'His temper arrives before he does.'},
  inquiry:{t:'Notices what’s missing from a room before what’s in it',job:'an insurance claims investigator',coat:[92,96,104],kind:'coat',flaw:'He can’t stop pulling a thread, even when it’s holding something up.'},
  love:{t:'Loves completely, and says so too late',job:'a piano tuner',coat:[120,34,40],kind:'coat',flaw:'He falls for people who are leaving.'},
  loyalty:{t:'Would drive all night for someone he trusts',job:'a long-haul trucker',coat:[56,70,98],kind:'jacket',flaw:'He looks for a brother in every crowd. He doesn’t have one.'},
  wander:{t:'Takes the long way, always',job:'a deckhand on a coastal ferry',coat:[60,84,72],kind:'jacket',flaw:'He has never stayed anywhere long enough to be missed.'},
  defiance:{t:'Doesn’t believe anyone gets to write his ending',job:'an investigator for the public defender',coat:[30,30,34],kind:'jacket',flaw:'He won’t take help, even when it’s offered properly.'},
  faith:{t:'Gives up what he wants so someone else can keep theirs',job:'a volunteer firefighter',coat:[150,110,40],kind:'jacket',flaw:'He doesn’t think he’s allowed to want things.'},
  restraint:{t:'Won’t take what isn’t freely given',job:'a watchmaker',coat:[46,54,46],kind:'coat',flaw:'People mistake his stillness for not caring.'},
};
const HEIR_FIRST=['Kiran','Elias','Mateo','Arjun','Ilya','Tomas','Rafael','Ezra','Jonah','Ravi','Aurelio','Nikhil','Dev','Anselm','Teodor','Sami','Noor','Joaquín','Emeric','Vikram','Caspian','Hari','Lior','Bram'];
const HEIR_LAST=['Ashdown','Varma','Okonkwo','Lindgren','Moreau','Castellan','Ferreira','Halloran','Iyer','Novak','Sato','Abernathy','Quint','Delacroix','Mbeki','Strand','Rourke','Bhattacharya','Kowalczyk','Reyes'];
const HEIR_PLACE=['Duluth, Minnesota','Lisbon','Halifax, Nova Scotia','Pune','Valparaíso','Tbilisi','Hull, England','Hobart, Tasmania','Shillong','Gdańsk','Asheville, North Carolina','Tromsø','Galway','Mombasa','Kolkata','Sapporo'];
const HEIR_TELLS=[
  'Clocks near him stop at twenty to three. He has learned to buy cheap watches.',
  'Strangers tell him the truth without meaning to, and apologise afterwards.',
  'Dogs never bark at him. Crows follow him across car parks.',
  'When he is angry, every light on the street flickers once.',
  'He dreams of a chariot between two armies, and wakes knowing the words to a song nobody taught him.',
  'Cuts he bandages for other people close faster than they should.',
  'He can’t remember being a child, and it has never once worried him.',
  'A dark peacock feather turns up in every place he moves into.',
  'The sky is a shade darker blue wherever he stands, if you look for it.',
  'He has never lost at any game of chance, so he stopped playing them.'];
function heirSeed(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function heirMake(){
  const {P,why}=heirProfile(), F=S.flags;
  const order=Object.keys(P).sort((a,b)=>P[b]-P[a]||a.localeCompare(b));
  const top=order.filter(k=>P[k]>0).slice(0,3); if(!top.length) top.push('wander');
  const sig=JSON.stringify([S.hero,F.ending,top,Math.round(P.mercy),Math.round(P.force),Math.round(P.inquiry),S.freed||0,!!F.kevin_used,!!F.delia_killed]);
  let r=heirSeed(sig); const rnd=n=>{ r=Math.imul(r^(r>>>15),2246822507)>>>0; r=(r^(r>>>13))>>>0; return r%n; };
  const first=HEIR_FIRST[rnd(HEIR_FIRST.length)], last=HEIR_LAST[rnd(HEIR_LAST.length)], place=HEIR_PLACE[rnd(HEIR_PLACE.length)], age=27+rnd(12);
  const main=HEIR_TRAIT[top[0]];
  const tells=[]; const pool=HEIR_TELLS.slice();
  if(P.force>=3) tells.push(pool.splice(3,1)[0]); if(P.mercy>=3) tells.push(pool.splice(pool.indexOf(HEIR_TELLS[5]),1)[0]);
  while(tells.length<3){ const t=pool.splice(rnd(pool.length),1)[0]; if(t) tells.push(t); else break; }
  const echoes=[F.kevin_rested&&'He is good at telling people they can stop.',F.kevin_used&&'He hates being useful, and is.',F.delia_killed&&'He can’t stand at a bus stop in fog.',
    F.alistair_spared&&'He keeps a candle lit for people he never met.',(F.lily_rested||F.lily_waiting)&&'He turns round whenever a child calls out, even when it isn’t his name.',
    F.ray_heard&&'He reads every form before he signs it, all the way to the bottom.',F.lil_no&&'He has never once been talked into anything.',
    F.ending==='D'&&'He distrusts anyone who says “it was always meant to be”.',F.ending==='C'&&'He knows when to leave a room.',F.ending==='A'&&'He is not afraid of fire, and should be.'].filter(Boolean);
  const skinPal=[[236,200,170],[214,170,134],[188,140,104],[150,104,74],[112,76,54],[86,58,44]];
  const hairStyles=top[0]==='force'?['buzz','short','messy']:top[0]==='wander'||top[0]==='love'?['shoulder','long','curly']:['short','messy','curly','short'];
  const look={skin:skinPal[rnd(skinPal.length)],hair:{style:hairStyles[rnd(hairStyles.length)],col:[[24,18,16],[60,40,26],[104,72,44],[30,26,30],[140,110,70]][rnd(5)]},
    eyes:{col:[[54,40,34],[70,92,120],[60,80,60],[96,70,46]][rnd(4)]},lip:[150,100,92],stubble:P.force+P.wander>3,
    top:{kind:main.kind,col:main.coat,underCol:[206,198,184],open:main.kind==='jacket'},legs:{kind:'jeans',col:[44,50,62]},shoes:[40,32,26],extras:['darkfeather']};
  const H={v:1,made:Date.now(),from:{hero:S.hero,ending:F.ending||null,build:BUILD},seed:sig,
    name:`${first} ${last}`,first,age,place,job:main.job,look,
    traits:top.map(k=>({k,t:HEIR_TRAIT[k].t,why:(why[k]||[])[0]||''})),flaw:main.flaw,
    tells,echo:echoes.slice(0,2),
    line:`${main.job[0].toUpperCase()+main.job.slice(1)} in ${place}. Does not know what he is.`,
    opening:`${first} ${last} wakes at twenty to three in the morning in ${place}, with his face wet and no idea why. On the windowsill, where there was nothing when he went to sleep, there is a dark peacock feather.`,
    leanings:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,Math.round(v*10)/10]))};
  heirSave(H); heirApplyLook(H); return H;
}
function heirApplyLook(H){ if(!H||!H.look) return; LOOKS.heir=H.look; try{ delete PORT_CACHE['heir|0']; delete PORT_CACHE['heir|1']; delete PORT_CACHE['heir|2']; }catch(e){}
  SPEAKERS.heir={name:H.name,col:'#c8d0e4'}; }
heirApplyLook(heirLoad());

/* the sheet */
const elHeir=(()=>{ const d=document.createElement('div'); d.id='heir'; document.body&&document.body.appendChild&&document.body.appendChild(d); return d; })();
let HEIR_BACK=null;
function openHeir(back,fresh){ const H=heirLoad(); if(!H) return; HEIR_BACK=back||null; heirApplyLook(H);
  let src=''; try{ src=portraitCanvas('heir',0).toDataURL(); }catch(e){}
  const end=H.from&&H.from.ending, bro=H.from&&H.from.hero;
  elHeir.innerHTML=`<div class="hr-box">`
    +(fresh?`<div class="hr-pro"><p>The Formless One closes his eyes.</p><p>When he opens them he is someone else: a person, with a name and an ordinary life, and no memory of having been anything more.</p><p>He has kept a little of you.</p></div>`:'')
    +`<div class="hr-head">${src?`<img src="${src}" alt="">`:''}<div><small>The one who comes next</small><h1>${esc_(H.name)}</h1><p class="hr-l">${esc_(H.age)} · ${esc_(H.job)} · ${esc_(H.place)}</p></div></div>`
    +`<section><h2>Who he is</h2>${H.traits.map(t=>`<p><b>${esc_(t.t)}.</b>${t.why?` <i>Because ${esc_(t.why)}.</i>`:''}</p>`).join('')}<p><b>His flaw:</b> ${esc_(H.flaw)}</p>${(H.echo||[]).map(e=>`<p>${esc_(e)}</p>`).join('')}</section>`
    +`<section><h2>What he doesn’t know</h2>${H.tells.map(t=>`<p>${esc_(t)}</p>`).join('')}</section>`
    +`<section class="hr-open"><h2>The first line of his story</h2><p>${esc_(H.opening)}</p></section>`
    +`<p class="hr-from">Made from a run as ${esc_(bro?heroLabel(bro):'—')}${end?`, ending ${esc_(end)}`:''}. Finish the story another way and someone else will come.</p>`
    +`<div class="hr-btns"><button class="opt" data-hdl>Download him (for the next chapter)</button><button class="opt on" data-hx>${fresh?'Continue':'Close'}</button></div></div>`;
  elHeir.classList.add('on'); try{ elHeir.scrollTop=0; }catch(e){}
  const one=(s,f)=>{ const b=elHeir.querySelector(s); if(b) b.onclick=f; };
  one('[data-hx]',closeHeir); one('[data-hdl]',()=>{ try{ downloadJSON(`oakhaven-heir-${H.first.toLowerCase()}.json`,H); }catch(e){} }); }
function closeHeir(){ elHeir.classList.remove('on'); const b=HEIR_BACK; HEIR_BACK=null; if(b) b(); }
{ const was=inputDown; inputDown=function(code,e){ if(elHeir.classList&&elHeir.classList.contains('on')){ if(code==='Escape') closeHeir(); return; } return was(code,e); }; }
/* every ending makes him, and the end screen introduces him */
{ const was=showEnding; showEnding=function(k){ was(k); let H=null; try{ H=heirMake(); }catch(e){ console.error('heir',e); }
    const el=document.getElementById('endScr'); if(!H||!el||!el.appendChild) return;
    const b=document.createElement('button'); b.textContent='What the Formless One becomes →'; b.className='heirBtn'; b.onclick=()=>openHeir(null,true); el.appendChild(b); }; }
/* ending D goes through the terminal, not the end screen */
{ const was=runPurge; runPurge=function(p){ was(p); try{ heirMake(); }catch(e){} }; }
/* in Characters */
{ const was=renderCodex; renderCodex=function(){ const H=heirLoad(), i=CODEX_CAST.findIndex(c=>c.heir);
    if(H){ const card={look:'heir',heir:true,name:H.name,role:'The one who comes next',creed:H.traits[0]?H.traits[0].k:'',act:1,text:`${H.age}. ${H.line} ${H.flaw}`};
      if(i<0) CODEX_CAST.push({group:'After the end'},card); else CODEX_CAST[i]=card; }
    was(); if(H){ const c=elCodex.querySelector&&[...(elCodex.querySelectorAll('.cx-card')||[])].pop(); if(c&&c.addEventListener) c.addEventListener('click',()=>{ closeCodex(); openHeir(); }); } }; }
