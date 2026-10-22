/* ═══ The title screen's reading room: Characters and Plot ═════════════════
   Characters: the cast, with their portraits, what they believe and where
   you meet them. Anyone you haven't reached yet is veiled until you've
   played that far in this browser (or choose to look anyway).
   Plot: the story before the game starts. How the brothers came to
   Oakhaven, what the town was, and what people there say about it.
   Nothing here spoils an act you haven't reached. Both pages are also on
   the pause menu. */

const nmC=k=>(typeof NAMES==='object'&&NAMES[k])||({dean:'Dean',sam:'Sam',family:'Winchester'})[k]||k;
const CODEX_CAST=[
  {group:'The brothers'},
  {look:'dean_leather',name:()=>`${nmC('dean')} ${nmC('family')}`,role:'The older brother',creed:'absurdism',act:1,
   text:()=>`Raised on the road by a hunter father, in motel rooms and the back seat of a 1967 Impala. Nothing is given meaning, so he hauls the rock uphill anyway, loudly, with a shotgun full of rock salt. Moves first, talks second, and changes the subject to pie when anybody gets close to the reason why.`,
   play:'Iron, salt, buckshot, and doors that open when kicked. Best at the problem standing in front of him.'},
  {look:'sam_canvas',name:()=>`${nmC('sam')} ${nmC('family')}`,role:'The younger brother',creed:'humanism',act:1,
   text:()=>`Walked away from Stanford law, and from the life, and came back anyway. The universe is indifferent; people are not. He reads the ledger before he lights the match, and he would rather lose a fight than lose the person the monster is wearing.`,
   play:'Rites that are slow, break if he flinches, and leave the host alive. Sees the pattern in the case file.'},
  {group:'Oakhaven'},
  {look:'marla',name:'Marla Ostrowski',role:'Night clerk, Oakhaven Motor Lodge',creed:'lived materialism',act:1,
   text:'Thirty-one years signing the motel ledger. She has watched the town get smaller one checkout at a time, and she is the first person to tell you, without raising her voice, that somebody in a building she will never see decided Oakhaven cost more than it made.'},
  {look:'sarah',name:()=>`${nmC('sarah')} Lindqvist`,role:'Librarian',creed:'the archivist',act:1,
   text:'Reserved, exact, a stamp for everything. Her brother Pete worked line three at the mill, nights. She keeps the county plans, the parish books and the old property transfers, and the key to the archive room is hers alone. Some nights she loses track of an hour.'},
  {look:'earl',name:'Earl Duchesne',role:'Earl’s Pawn & Loan',creed:'commerce',act:1,
   text:'Sells guns, salt, silver and stranger things to “the other kind of customer”. Doesn’t ask, doesn’t tell, doesn’t refund. There is a terminal in his back room that is still drawing power from somewhere.'},
  {look:'doctor',name:'Dr. Halvorsen',role:'The clinic doctor',creed:'the tired',act:1,
   text:'Signed most of this autumn’s death certificates in the same careful hand. Drinks at the Velvet Hour so he won’t have to talk. He is afraid of something, and it isn’t you.'},
  {look:'sheriff',name:'Sheriff Ames',role:'County law',creed:'looking away',act:1,
   text:'Has decided, as a matter of policy, not to see two men with federal badges that don’t quite check out. Has also decided not to see most of what has happened to this town.'},
  {look:'juno',name:'Juno',role:'The Velvet Hour',creed:'pain is a tax',act:1,
   text:'Runs the only bar still open after midnight. Pours generously, remembers everything, and sells the loophole to anyone who can pay.'},
  {look:'rae',name:()=>nmC('rae'),role:'Tow-truck driver',creed:'steady hands',act:1,
   text:()=>`Hauls dead cars out of ditches on Route 9 and knows every engine in the county by its cough. Doesn’t believe in ghosts. Believes in ${nmC('dean')}, a little more each time he comes back alive.`},
  {look:'phantom',name:'Ray Hollis',role:'Line lead, line three',creed:'unfinished',act:1,
   text:'Filed a requisition for ventilation fan fourteen seven times between March and September. People say there is a man in a hard hat on the old green chain after dark, still reciting the form.'},
  {look:'lilith',name:'Lilith',role:'The Demon Queen who wants to be human',creed:'restraint',act:1,coop:true,
   text:'Waits in the motel lobby with her hands folded the wrong way. She has spent a very long time making people believe her choices were theirs. Now she is practising asking. (Two-player campaigns.)'},
  {group:'Later'},
  {look:'delia',name:'Delia Park',role:'Seventh-grade teacher',creed:'awake the whole time',act:2,
   text:'Hiding in a bus shelter in the fog with something else in the driver’s seat of her body. She can hear everything you say about her.'},
  {look:'kevin',name:()=>`${nmC('kevin')} Tran`,role:'The prophet',creed:'the instrument’s objection',act:2,
   text:'Nineteen. Was going to Princeton. Nine days into reading a stone tablet aloud so that the voices in it stop. Everyone who finds him sees a tool. He would like, very much, to be asked instead of used.'},
  {look:'crowley',name:()=>nmC('crowley'),role:'King of the Crossroads',creed:'rational egoism',act:2,
   text:'Hell has contracts, jurisdictions and a functioning appeals process, and he will tell you its customer service beats Heaven’s. Not good. Orderly. You always know what he wants, which in Oakhaven makes him almost restful.'},
  {look:'vesper',name:'Vesper',role:'A woman at the bar',creed:'appetite',act:2,
   text:'Red coat, second glass already poured. Talking to her is easy. Remembering what you said afterwards is harder.'},
  {look:'castiel',name:()=>nmC('castiel'),role:'An angel of the Lord',creed:'determinism, and its absence',act:3,
   text:'Spent his existence as an instrument of a plan whose author has left the building. He is not grieving God. He is grieving cause with intent.'},
  {look:'ghost_girl',name:'The girl in the nightgown',role:'Always facing away',creed:'uncounted',act:2,
   text:'Seen on Main Street in the fog, barefoot, facing the wrong way. She talks about her father. She never turns round.'},
  {look:'alistair',name:'Father Alistair',role:'St. Brendan’s',creed:'mercy, of a kind',act:3,
   text:'Keeps hundreds of candles burning in the only warm room left in town. Gentle, sincere, and sorry about something he hasn’t told anyone yet.'},
  {look:'celandine',name:'Celandine',role:'A reader in the stacks',creed:'stillness',act:3,
   text:'Silver hair, grey coat, a bookmark in every book you reach for. She knows which page you were going to turn to.'},
  {look:'chuck',name:()=>nmC('chuck'),role:'A man in a bathrobe',creed:'aesthetic solipsism',act:3,
   text:'Likeable. Buys you a beer. Asks about the car. Has a habit of finishing your sentences, and not in the way friends do.'},
  {look:'stranger',name:'A stranger',role:'Seen here and there',creed:'—',act:4,
   text:'Midnight-blue skin, black robes, silver like stars at the cuffs, a dark peacock feather. He turns up at the edges of things and is always gone when you look back.'},
];
const CODEX_PLOT=[
  {h:'The road there',k:'Before Act I',p:[
    ()=>`${nmC('dean')} and ${nmC('sam')} ${nmC('family')} were raised to do one job: find the thing that is killing people, and stop it. Salt the bones, burn them, drive to the next town. Their father taught them out of a leather journal and the trunk of a black 1967 Impala, and the trunk is still full.`,
    'This autumn the job found them. A news brief, three lines long, cut out of a regional paper and left under the Impala’s wiper at a diner in Bend: SIXTH DEATH IN OAKHAVEN. NO FOUL PLAY SUSPECTED. Nobody at the diner had seen who left it.',
    ()=>`That night ${nmC('sam')}’s phone lit up at twenty to three with a text from a number neither of them knew, a (541) area code ending in 0114: “six. come before there are seven.” When ${nmC('dean')} called it back, the line rang and rang, and somewhere very far off a child was counting.`,
    'They found an older entry in their father’s journal, in his smallest writing: “Oakhaven, Coos County. Mill town. Don’t go in October.” It was October. They went.',
    'The Impala crossed the county line at twenty to three in the morning, in the rain. Every window on Main Street was dark except one, at the motel. That is where the game begins.']},
  {h:'Oakhaven, Oregon',k:'Population 1,204 · falling',p:[
    'Oakhaven was a lumber town before it was anything. The mill went up on the river in 1889 and the town grew around the noise of it: the green chain, the whistle at shift change, sawdust on every windowsill. For ninety years, if you were born in Oakhaven you worked at the mill, or you married someone who did.',
    'Then the mill was sold. A company out of Delaware called Crossroads Holdings bought it while it was still profitable, deferred every repair, and ran it into the ground in eleven months. The machines went. The jobs went. The dust stayed.',
    'This autumn six former mill workers died in five weeks, all in the same week of the month, all at night. The county called it bad luck and grief. The town stopped saying anything out loud.',
    'The local paper, the Oakhaven Ledger, still comes out every morning. People have started to notice that it is always dated Sunday, October 4th.']},
  {h:'What they say in Oakhaven',k:'Folklore',lore:true,p:[
    ['Twenty to three','Everything in Oakhaven happens at 2:40 in the morning. Clocks stop there. Watches stop there. Every one of the six was found at about that time, and nobody can say why the old-timers have always called it “the mill hour”.'],
    ['The bell beneath the water','In 1951 the county flooded the lower Pike valley to make a reservoir, and the little chapel there went under with its bell. Fishermen say that on still nights the bell still rings at twenty to three, and that it rings once for everyone who is going to die that month. Walter Pike keeps a tally.'],
    ['The crossroads seal','The reservoir papers, the parish books and the deed to the drowned chapel all carry the same small seal: a circle with a crossroads in it, and the initials C.H. The papers are from 1951. Crossroads Holdings wasn’t incorporated until 1962.'],
    ['The man on the green chain','Leon Bell walked nights at the mill for thirty-one years. He says that since spring a man in a white hard hat walks up the wall of the mill at twenty to three, the way you would walk home, and disappears at the roofline.'],
    ['The road that returns','Route 9 is the only road out of town. People who drive it at night say they pass the same mile marker twice, and that the third time they see their own car parked on the shoulder.'],
    ['The house with one more room','There is a house on Larch Street with more rooms inside than it has windows outside. The woman who lives there keeps a nursery, freshly painted. Nobody on the street remembers a baby.'],
    ['The girl who faces away','Children dare each other to walk Main Street in the fog after dark. Those who do say there is a girl in a white nightgown who stands with her back to you and asks if you have seen her dad. Nobody has ever seen her face.'],
    ['St. Brendan’s candles','Father Alistair keeps hundreds of candles burning at St. Brendan’s, night and day. He says it is the only warm room left in Oakhaven. Some people go there to pray. More go there because it is warm.'],
    ['Sunday, October 4th','Ask anyone in town the date and they will tell you, after a pause, that it is Sunday. They won’t say which Sunday. They don’t seem to find this strange.']]},
  {h:'Why it matters',k:'Before you go in',p:[
    'The brothers have put down hundreds of ghosts. Salt and fire have always worked. In Oakhaven, for the first time, the thing they put down is going to be eaten in front of them by something they can’t see, and the question of who is responsible is going to climb a lot higher than a ghost.',
    'Every monster in Oakhaven is somebody’s employee. Keep a file. Ask who signed it.']},
];

function codexReached(){ try{ return loadProgress().act||1; }catch(e){ return 1; } }
const CODEX={open:false,tab:'characters',shown:{},back:null};
const elCodex=(()=>{ const d=document.createElement('div'); d.id='codex'; document.body&&document.body.appendChild&&document.body.appendChild(d); return d; })();
const cv_=v=>typeof v==='function'?v():v;
function openCodex(tab,back){ CODEX.open=true; CODEX.tab=tab||CODEX.tab; CODEX.back=back||null; if(S.running){ document.exitPointerLock?.(); clearHeld(); S.caseOpen=true; }
  elCodex.classList.add('on'); renderCodex(); try{ elCodex.scrollTop=0; }catch(e){} }
function closeCodex(){ CODEX.open=false; elCodex.classList.remove('on'); if(S.running) S.caseOpen=false; const b=CODEX.back; CODEX.back=null; if(b) b(); }
function renderCodex(){
  const T=CODEX.tab, reached=codexReached();
  let h=`<div class="cx-box"><div class="cx-top"><h1>${T==='plot'?'The story so far':'Characters'}</h1>`
    +`<div class="cx-tabs"><button class="opt${T==='characters'?' on':''}" data-cx="characters">Characters</button><button class="opt${T==='plot'?' on':''}" data-cx="plot">Plot</button><button class="opt" data-cxx>Close · Esc</button></div></div>`;
  if(T==='characters'){
    h+=`<p class="cx-sub">Who you will meet. People from acts you haven’t reached yet are veiled; tap one to look anyway.</p>`;
    let open=false;
    for(const c of CODEX_CAST){
      if(c.group){ if(open) h+='</div>'; h+=`<h2>${esc_(c.group)}</h2><div class="cx-grid">`; open=true; continue; }
      const id=c.look, veiled=c.act>reached&&!CODEX.shown[id];
      let src=''; if(!veiled) try{ src=portraitCanvas(c.look,0).toDataURL(); }catch(e){}
      h+=veiled?`<button class="cx-card veil" data-cxs="${esc_(id)}"><div class="cx-port"></div><div><b>Act ${['','I','II','III','IV'][c.act]}</b><span>You haven’t met them yet. Tap to look anyway.</span></div></button>`
        :`<div class="cx-card">${src?`<img class="cx-port" src="${src}" alt="">`:'<div class="cx-port"></div>'}<div><b>${esc_(cv_(c.name))}</b><small>${esc_(c.role)} · <i>${esc_(c.creed)}</i>${c.act>1?` · from Act ${['','I','II','III','IV'][c.act]}`:''}</small><p>${esc_(cv_(c.text))}</p>${c.play?`<p class="cx-play">${esc_(c.play)}</p>`:''}</div></div>`;
    }
    if(open) h+='</div>';
  } else {
    for(const s of CODEX_PLOT){
      h+=`<section class="cx-sec"><small>${esc_(s.k)}</small><h2>${esc_(s.h)}</h2>`;
      if(s.lore) h+='<div class="cx-lore">'+s.p.map(([t,x])=>`<div><b>${esc_(t)}</b><p>${esc_(x)}</p></div>`).join('')+'</div>';
      else h+=s.p.map(x=>`<p>${esc_(cv_(x))}</p>`).join('');
      h+='</section>'; }
  }
  h+='</div>'; elCodex.innerHTML=h;
  const on=(sel,fn)=>(elCodex.querySelectorAll(sel)||[]).forEach(b=>b.onclick=()=>fn(b));
  on('[data-cx]',b=>{ CODEX.tab=b.dataset.cx; renderCodex(); try{ elCodex.scrollTop=0; }catch(e){} });
  on('[data-cxx]',()=>closeCodex());
  on('[data-cxs]',b=>{ CODEX.shown[b.dataset.cxs]=true; renderCodex(); });
}
/* Esc closes it */
{ const was=inputDown; inputDown=function(code,e){ if(CODEX.open){ if(code==='Escape'||code==='Pad1') closeCodex(); return; } return was(code,e); }; }
/* the title screen: a row of its own */
(function codexRow(){ const opts=document.querySelector('#boot .opts'); if(!opts||!opts.appendChild) return;
  const row=document.createElement('div'); row.className='row'; row.id='codexRow';
  row.innerHTML='<span>Read</span><button class="opt" data-cx-open="characters">Characters</button><button class="opt" data-cx-open="plot">Plot</button>';
  opts.appendChild(row); (row.querySelectorAll('[data-cx-open]')||[]).forEach(b=>b.onclick=()=>openCodex(b.dataset.cxOpen||b.dataset['cx-open'])); })();
/* …and the pause menu */
{ const was=openPause; openPause=function(){ was(); if(!dlg.open||!dlg.avail) return;
    const i=dlg.avail.findIndex(c=>c.text==='Controls'); if(i<0) return;
    dlg.avail.splice(i,0,{text:'Characters',act:()=>{ closeDlg(); openCodex('characters',openPause); }},{text:'Plot',act:()=>{ closeDlg(); openCodex('plot',openPause); }});
    renderChoices(dlg.avail.map(c=>({text:c.text,note:c.note,act:c.act||null}))); }; }
