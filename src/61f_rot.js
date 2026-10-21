/* ═══ Chapter One, for two: The Rot ═════════════════════════════════════════
   Why are people dying, and why do the records disagree?

   The investigation is split down the middle on purpose:
     · the Observer can read the county death register properly: a number is
       missing, a page has been cut close to the spine, and the stub says
       “— 14 Mar — 9 yrs —”. The Interrogator sees six tidy certificates;
     · the Interrogator can get Dr. Halvorsen to talk, at the bar of the
       Velvet Hour: in March he sent a mill worker’s little girl home with
       cough syrup; in September a man from Delaware made him cut her page
       out. He won’t talk to the Observer at all. What he says goes into
       the Interrogator’s notebook, and stays there until it’s shared.
   Either alone has a mystery. Together they have the first death.

   Then the Fracture: once the register is on the shared file and both of
   you are playing, the library stops being the same library. The Observer
   sees Sarah at the archive desk and blood on it; the Interrogator sees an
   empty room and a clean desk. Some things you can both check — the clock,
   the pages, the marks on the archive door — and the contradiction ledger
   keeps both your accounts side by side. While you compare, the room
   changes. And at some point a message arrives from your brother. It is
   written entirely by the game; your brother never sent it.

   Lilith can get Halvorsen to talk to anyone. What he says that way is not
   something he chose to say, and it won’t survive daylight.

   Sarah lost an hour in that archive. What you tell her is a decision you
   make together, and how it goes depends on how each of you has treated
   her. Three endings, decided by the evidence and the two of you.

   Everything here exists only in a two-player campaign. */

SPR.claws=art(16,26,A=>{ for(let i=0;i<4;i++){ const x=3+i*3; for(let y=3;y<20;y++){ const xx=x+Math.round(Math.sin((y+i)*.3)*.6);
  A.set(xx,y,C([30,14,12])); if(y%3) A.set(xx+1,y,C([90,60,48])); } } });
SPR.bloodrun=art(24,18,A=>{ const red=[[92,8,10],[120,12,14],[150,20,22]], dr=[2,9,4,14,6,3,11,7,16,5,8,12,3,10,6];
  for(let x=1;x<23;x++){ const top=2+((x*7)%3===0?1:0), L=dr[x%dr.length];
    for(let y=top;y<Math.min(17,top+2+L*(x%4===1?1:.35));y++){ const k=y<top+2?2:y>top+L*.3?0:1; A.set(x,y,C(red[k])); } }
  for(let x=3;x<21;x+=5) A.set(x,3,C([210,90,90])); });
const ROT_LIB=[
  {kind:'prop',m:'cabinet',x:14.3,y:2.1,r:.4,h:1.25,rot:'arch',use:'rot_register',useName:'The county death register'},
  {kind:'prop',m:'clock',x:12.9,y:1.25,r:.15,h:.45,z:1.0,rot:'arch',use:'fr_clock',useName:'The library clock'},
  {kind:'prop',m:'desk',x:14.1,y:4.5,r:.45,h:.85,rot:'arch',use:'fr_desk',useName:'The archive desk'},
  {kind:'prop',m:'bloodrun',x:14.02,y:4.98,r:.05,h:.6,z:.18,rot:'blood'},
  {kind:'prop',m:'stain',x:13.7,y:5.4,r:.3,h:.12,z:0,rot:'blood'},
  {kind:'prop',m:'door',x:14.82,y:8.1,r:.1,h:1.6,rot:'arch',use:'fr_marks',useName:'The archive door'},
  {kind:'prop',m:'claws',x:14.74,y:8.1,r:.05,h:.9,z:.75,rot:'claws'},
];
{ const L=SECTORS.library; if(L){ L.entities.push(...ROT_LIB.map(e=>Object.assign({},e,{hidden:true})));
    L.entities.push(char_('sarah',13.5,4.9,{kind:'npc',name:'Sarah Lindqvist',use:'fr_sarah',useName:'Sarah',h:1.8,face:0,rot:'frsarah',hidden:true})); } }
{ const L=SECTORS.lounge; if(L) L.entities.push(npc_('doctor',11.1,5.9,'rot_halv','A man alone at the bar',{h:1.8,face:-Math.PI/2,rot:'halv',hidden:true})); }

const frStage=()=>(coopShared().flags||{}).fracture||0;
const rotOut=()=>(coopShared().flags||{}).sarahOut||null;
/* who sees what */
function rotVisible(){ const on=COOP.on, st=frStage(), obs=on&&COOP.role==='observer', out=rotOut();
  for(const e of (SECTORS.library?SECTORS.library.entities:[])){
    if(e.rot==='arch') e.hidden=!on;
    else if(e.rot==='blood') e.hidden=!(on&&((st===1&&obs)||(st===2&&!obs)||out==='beast'));
    else if(e.rot==='claws') e.hidden=!(on&&(st>=1||out==='beast'));
    else if(e.rot==='frsarah') e.hidden=!(on&&st===1&&obs);
    else if(e.dialogue==='sarah'&&on) e.hidden=!!((st===1||st===2)||out==='beast'); }
  for(const e of (SECTORS.lounge?SECTORS.lounge.entities:[])) if(e.rot==='halv') e.hidden=!on; }
INV_UPDATES.push(rotVisible);
SECTOR_HOOKS.push&&SECTOR_HOOKS.push(()=>rotVisible());

/* ── the register ──────────────────────────────────────────────────────── */
USES.rot_register=e=>{ const F=S.flags, st=frStage();
  if(rotOut()==='beast'&&!F.rot_register){ openMenu('The county death register','The cabinet is on its side. The register is pulp, and the pulp has been raked through by something with four nails.',[{text:'Step back'}]); return; }
  F.rot_register=true;
  let t;
  if(isObserver()){ F.rot_stub=true; F.rot_ray=true;
    t='County death register, Oakhaven, this year.\n\nCertificates 0108 to 0113: six men of line three, October, every one signed P. Halvorsen. Then 0115.\n\nThere is no 0114. The binding has a stub where a page was cut out close to the spine, carefully, with a blade. The stub still carries the edge of the form:\n\n      “— 14 Mar — 9 yrs —”\n\nThe register says six. The numbering says seven.\n\nAnd one more thing: all six October certificates give the time of death as 2:40 a.m.'; }
  else t='Six certificates in a row, October, all in the same careful hand: P. Halvorsen. The writing gets smaller as it goes, like a man trying to take up less room.\n\nThe numbers run on. Paper isn’t really your thing; your brother would read this differently.';
  if(COOP.on&&st>=1&&st<3){ F.fr_pages=true; t+='\n\nYou count the pages, because the room feels like it is counting you: fourteen leaves, and one cut.'; ledgerClaim('pages','14-1','Fourteen leaves in the register, one of them cut.'); }
  openMenu('The county death register',t,[{text:'Step back'}]); };

/* ── Dr. Halvorsen, at the bar ─────────────────────────────────────────── */
const HV=(t,n,fx,req)=>D_(t,n,fx,req);
const halvConfess=inf=>{ const F=S.flags; F.rot_conf=true; F.met_halv_rot=true; trust('halvorsen',inf?0:1);
  if(inf){ F.rot_conf_inf=true; if(COOP.on){ cop({op:'set',path:'shared.flags.confInf',val:{by:COOP.seat}});
    ledgerClaim('confession','influenced','Halvorsen’s confession was drawn out by Lilith. He did not choose to say it, and he will not remember choosing.'); }
    relEvent(S.hero,'lilith',{influence:1},'let her into a man’s head',{major:true,line:`${relName(S.hero)} let Lilith ask Halvorsen. He answered.`}); relEvent('lilith',S.hero,{affection:1,respect:-1},'he used her'); } };
const CONFESSION="\"In March I sent a little girl home with cough syrup. Her father worked nights at the mill and he brought it home on his coat, and I didn’t ask what he did, because I was tired.\"\n\nHe puts the glass down very precisely.\n\n\"In September a man from Delaware came to the clinic with very good manners and a folder. Every patient I ever lost. He said a malpractice suit is a kind of weather. He said my daughter would be standing in it. Then he asked me to go to the county office and take her page out of the register.\"\n\n\"Why her page?\"\n\n\"He didn’t say why. Men like that don’t.\"\n\n\"What was her name?\"\n\n\"I don’t say her name.\" He looks at you for the first time. \"I took it out. I don’t get to say it.\"";
DIALOGUE.rot_halv={port:'doctor',start:()=>S.flags.rot_conf?'h9':isInterrogator()?'i0':'o0',nodes:{
  o0:{speaker:'A man alone at the bar',text:"He doesn’t look up.\n\n\"I gave my statement to the county. If the federal government has more questions it can send someone who doesn’t look at me like I’m a column of figures.\"\n\nHe turns his shoulder to you. It’s a very complete gesture.",
    choices:[HV('[Leave him to it.]',null),HV('[Say Lilith’s name under your breath.]','oL',null,()=>!!S.flags.lil_yes)]},
  oL:{speaker:'Dr. Halvorsen',text:"You don’t see her come in. You see his shoulders drop, as if somebody has lifted a wet coat off them.\n\n"+CONFESSION+"\n\nWhen he’s finished he blinks at the empty stool beside him as though someone had just stood up from it.",
    choices:[HV('[…]',null,{now:()=>halvConfess(true)})]},
  i0:{speaker:'A man alone at the bar',text:"He’s three whiskeys in and he knows what you are before you sit down.\n\n\"You’re the other one,\" he says. \"The one who looks at people instead of paper. Your brother was in the library half the night. I could see him from the street.\"",
    choices:[HV('“You signed six certificates in October. Who else did you sign for?”','i1c',{now:()=>{ trust('halvorsen',-1); S.flags.rot_hostile=true; }}),
      HV('“Whatever somebody has on you, I’m not here to use it.”','i1p',{now:()=>{ trust('halvorsen',2); S.flags.rot_protect=true; }}),
      HV('[Read him] He keeps turning his wedding ring. He isn’t afraid of you. He’s afraid of a phone ringing.','i1r'),
      HV('[Say Lilith’s name under your breath.]','oL',null,()=>!!S.flags.lil_yes)]},
  i1c:{speaker:'Dr. Halvorsen',text:"His glass stops halfway up. \"Six. I signed six.\" The ice rattles. \"Get away from me.\"\n\nHe doesn’t get up, though. He wants to be made to say it.",
    choices:[HV('“Who’s been calling you, Doctor?”','i2')]},
  i1p:{speaker:'Dr. Halvorsen',text:"He laughs, once, without anything in it. \"Everybody who says that is here to use it.\"\n\nBut he moves his coat off the stool next to him.",
    choices:[HV('[Sit.] “Who’s been calling you?”','i2')]},
  i1r:{speaker:'Dr. Halvorsen',text:"You don’t ask about the certificates. You ask, \"When does he usually call?\"\n\nHalvorsen’s thumb stops on the ring.\n\n\"Sundays,\" he says. \"He calls on Sundays. It has been Sunday for a while.\"",
    choices:[HV('“Who is he?”','i2',{now:()=>trust('halvorsen',1)})]},
  i2:{speaker:'Dr. Halvorsen',text:"\"A man from Delaware with very good manners.\"\n\nHe is quiet for a long time. Then he starts talking to the bottles behind the bar instead of to you, which is how you know it’s true.",
    choices:[HV('[Let him.]','i3'),HV('“I’ll keep asking until you say it.”','i3',{now:()=>{ S.flags.rot_offrecord=true; }},()=>!!S.flags.rot_hostile)]},
  i3:{speaker:'Dr. Halvorsen',text:()=>CONFESSION+(S.flags.rot_offrecord?'\n\n"And I will deny every word of this to anyone with a notebook."':S.flags.rot_protect?'\n\n"If somebody needs to hear it from me, properly, with my name on it. I think I could. I think I’d like to."':''),
    choices:[HV('[…]',null,{now:()=>halvConfess(false)})]},
  h9:{speaker:'Dr. Halvorsen',text:()=>S.flags.rot_conf_inf?"He looks at you as if you’re familiar and he can’t think why. \"Have we met? I— I don’t think I want to talk tonight.\"":"\"I said what I said. Once. Don’t make me say it to the bottles again.\"",choices:[HV('[Leave him be.]',null)]},
}};

/* ── the Fracture: checking things in a room that disagrees with itself ── */
const FR_TOPICS={desk:{t:'The archive desk',verify:false},sarah:{t:'Who is in the archive',verify:false},clock:{t:'The library clock',verify:true},
  pages:{t:'The register’s pages',verify:true},marks:{t:'The archive door',verify:true},confession:{t:'Halvorsen’s confession',single:true}};
function ledgerClaim(topic,val,text){ if(!COOP.on) return;
  if((coopShared().ledger||[]).some(e=>e.topic===topic&&e.by===COOP.seat&&e.val===val)) return;
  cop({op:'push',path:'shared.ledger',val:{topic,val,text,stage:frStage()}}); }
function ledgerRows(){ const rows={};
  for(const e of (coopShared().ledger||[])){ const r=rows[e.topic]=rows[e.topic]||{topic:e.topic}; r[e.by]=e; }
  return Object.values(rows).map(r=>{ const a=r[COOP.seat], b=r[partnerSeat()], T=FR_TOPICS[r.topic]||{};
    return {topic:r.topic,title:T.t||r.topic,mine:a,theirs:b,verifiable:!!T.verify,
      status:T.single?'flag':!a||!b?'waiting':a.val===b.val?'agree':'contradiction'}; }); }
const frVerified=()=>ledgerRows().filter(r=>r.verifiable&&r.status==='agree').length;
USES.fr_clock=()=>{ const st=frStage();
  const t=st>=1&&st<3?'The clock over the archive has stopped at twenty to three. Your watch agrees with it, which it didn’t when you came in.':'An electric clock over the archive door. It says 2:40, and it’s right, for once.';
  if(COOP.on&&st>=1&&st<3){ S.flags.fr_clock=true; ledgerClaim('clock','2:40','Stopped at 2:40. My watch stopped with it.'); }
  openMenu('The library clock',t,[{text:'Step back'}]); };
USES.fr_marks=()=>{ const st=frStage(), F=S.flags;
  if(!(st>=1||rotOut()==='beast')){ openMenu('The archive door','A door marked ARCHIVE — STAFF. Locked. Sarah has the key.',[{text:'Step back'}]); return; }
  F.fr_marks=true; if(COOP.on&&st<3) ledgerClaim('marks','4-shoulder','Four parallel gouges in the archive door, at shoulder height, deep enough to show raw wood.');
  openMenu('The archive door','Four parallel gouges in the door, at shoulder height. Deep enough to show raw wood. Not new; not old. The edges have been sanded smooth by something, or someone, running fingers along them.',[{text:'Step back'}]); };
USES.fr_desk=()=>{ const st=frStage(), obs=isObserver(), F=S.flags;
  if(!COOP.on||st===0||st===3){ openMenu('The archive desk',rotOut()==='beast'?'The desk is split down the middle. There is blood on one half, dry.':'A reading desk, a lamp, a blotter covered in Sarah’s neat handwriting: call numbers, dates, a shopping list.',[{text:'Step back'}]); return; }
  let t, val;
  if(st===1){ if(obs){ val='blood'; t='There is blood on the blotter. A lot of it, still tacky, soaked into Sarah’s handwriting so that only one line is readable:\n\n      “it was not me it was not me it was not”\n\nSarah is standing right beside you. She hasn’t looked up.'; }
    else { val='clean'; t='A clean desk. A lamp, a blotter, Sarah’s neat handwriting: call numbers, dates, a shopping list. Nobody’s here. The chair is still warm.'; } }
  else { if(obs){ val='clean'; t='The blotter is clean. Not cleaned: clean, as if it never happened. Sarah isn’t here. You are absolutely sure she was.'; }
    else { val='blood'; t='The blotter is soaked. Blood, still tacky, over a line of Sarah’s handwriting: “it was not me it was not me”.\n\nIt wasn’t there a minute ago. You looked. You know you looked.'; } }
  const claim={blood:st===1?'Blood on the blotter, still tacky, over Sarah’s handwriting: “it was not me”. Sarah is standing beside it.':'Now there’s blood on the blotter. It wasn’t there a minute ago.',clean:st===1?'A clean desk. Nobody here. The chair is still warm.':'Now the blotter is clean, and Sarah is gone.'}[val];
  F.fr_desk=true; ledgerClaim('desk',val+(st===2?'2':''),claim);
  openMenu('The archive desk',t,[{text:'Step back'}]); };
USES.fr_sarah=()=>{ S.flags.fr_saw_sarah=true; ledgerClaim('sarah','present','Sarah is at the archive desk. She doesn’t answer, or look up.');
  noteMine('fr_sarah','Sarah at the desk','She was standing at the archive desk with her hands flat on the blotter. She didn’t look up when you said her name. Her lips were moving. You think she was counting.','vision');
  openMenu('Sarah','She is standing at the desk with both hands flat on the blotter. You say her name. She doesn’t look up. Her lips are moving.\n\nYou lean closer. She is counting: “…five, six. Six. Six.”',[{text:'Step back'}]); };
/* the Interrogator, at the empty desk, can say so too */
INV_UPDATES.push(()=>{ if(!COOP.on||frStage()!==1||S.sector.id!=='library'||isObserver()) return;
  if(Math.hypot(S.px-13.6,S.py-4.8)<2.2&&!S.flags.fr_empty){ S.flags.fr_empty=true; ledgerClaim('sarah','absent','Nobody is in the archive corner. The chair at the desk is still warm.'); } });
/* the Fracture starts when the register is on the file and you’re both here */
INV_UPDATES.push(dt=>{ if(!COOP.on||!S.running||S.sector.id!=='library') return; const C=coopState(); if(!C) return;
  if(frStage()===0&&!COOP.frAsk&&partnerJoined()&&partnerOnline()&&clueShared(CASES.rot,'register')){
    COOP.frAsk=true; cop({op:'set',path:'shared.flags.fracture',val:1,expect:null},ok=>{ COOP.frAsk=false;
      if(ok) chron('fracture','The library stopped being the same library for both of you.',{feed:'something is wrong with the library'}); }); }
  const st=frStage();
  if(st===1&&!S.flags.fr_felt){ S.flags.fr_felt=true; S.glitchA=.5; sfx('bell'); say('narr','The lights hum a half-tone flat. Something about the room has been decided without you.',4,{now:true}); }
  /* the message your brother didn’t send */
  if((st===1||st===2)&&partnerJoined()&&!partnerHere()&&!(myPriv().fake)&&!COOP.fakeShown){
    COOP.fakeT=(COOP.fakeT||0)+(dt||0);
    if(COOP.fakeT>14){ COOP.fakeShown=true;
      const text='I’m in the back room. Somebody’s in here with me. Don’t look at the desk. Come to the back. Please.';
      feedPush({who:partnerName(),text,kind:'ping',t:'02:40',fake:true}); sfx('switch');
      cop({op:'set',path:`priv.${COOP.seat}.fake`,val:{t:Date.now(),text}});
      noteMine('fake','A message at 2:40',`From ${partnerName()}: “${text}” It came in on the signal channel, like their others.`,'vision'); } } });
/* comparing notes changes the room */
COOP_SYNC.push(C=>{ const st=frStage();
  if(st===1){ const r=ledgerRows().find(x=>x.topic==='desk');
    if(r&&r.status==='contradiction'&&!COOP.fr2Ask){ COOP.fr2Ask=true; cop({op:'set',path:'shared.flags.fracture',val:2,expect:1},ok=>{ if(ok&&COOP.seat==='A') chron('fracture','While you compared the desk, the room changed sides.',{feed:'the room is changing'}); }); } }
  if(st===2&&!S.flags.fr_shift){ S.flags.fr_shift=true; S.glitchA=.6; sfx('bell'); feedSys('The room is changing while you compare notes. Check what you can both check.'); } });

/* ── the case ──────────────────────────────────────────────────────────── */
defCase({ id:'rot', n:12, kicker:'Chapter One · two players', title:'The Rot', open:()=>COOP.on,
  summary:()=>'Six men from one shift are dead, the paperwork is perfect, and the numbers in the county register don’t add up. Why are people dying, and why do the records disagree?',
  clues:{
    register:{t:'Six certificates',k:'record',x:'County register: six line-three men, October, all signed P. Halvorsen.',have:F_('rot_register')},
    stub:{t:'Certificate 0114, cut out',k:'doc',x:'Stub only, cut close to the spine: “— 14 Mar — 9 yrs —”. The register says six. The numbering says seven.',have:F_('rot_stub')},
    ray:{t:'Twenty to three, six times',k:'doc',x:'Every October certificate gives the time of death as 2:40 a.m.',have:F_('rot_ray')},
    confession:{t:'Halvorsen: “I took it out”',k:'talk',who:'Dr. Halvorsen',x:()=>'A girl in March, sent home with cough syrup; her father worked nights at the mill. In September a man from Delaware made him cut her page from the register.'+(S.flags.rot_conf_inf?' (Drawn out of him by Lilith.)':''),have:F_('rot_conf')},
    roster:{t:'Line three, night shift',k:'doc',x:'Hollis, Brandt, Okafor, Okafor, Lindqvist, Haddad. Supervisor: F. Dwyer.',have:F_('read_roster')},
    fan:{t:'Fan fourteen requisitions',k:'doc',x:'Seven requests, March to September. Every one deferred.',have:F_('read_ledger14')},
    leon:{t:'Leon: twenty to three',k:'talk',who:'Leon Bell',x:'A man in a white hat walks up the mill wall at twenty to three.',have:F_('w_leon')},
    lilith:{t:'Lilith: “Count them”',k:'talk',who:'Lilith',x:'Three people told you “it was my decision”. People who decide for themselves don’t use the same sentence.',have:F_('lil_met')},
    marks:{t:'Four gouges',k:'place',x:'The archive door, at shoulder height.',have:F_('fr_marks')},
    real:{t:'What the room couldn’t change',k:'note',x:()=>({records:'The clock, the register and the door agreed for both of you. The desk didn’t.',sarah:'You decided Sarah was there.',us:'You decided one of you was seeing wrong.'})[S.flags.fr_pick]||'You never settled it.',have:F_('fr_real')},
    index:{t:'Sarah’s index card',k:'doc',x:'In Sarah’s hand: “0114 — HOLLIS, Lily Anne, 9 — WITHDRAWN BY ORDER, 30 Sept.”',have:F_('rot_index')},
  },
  links:[
    {id:'first',a:'stub',b:'confession',t:'The first death',x:'A nine-year-old died on 14 March, while the mill was still running, and the doctor who signed for her was made to cut her page out. The count was always seven.',
      dean:'They didn’t just lose a kid. They filed her under nothing.',sam:'The first death is the one that makes the mill liable. That’s why it had to go.',opens:'the true theory'},
    {id:'named',a:'index',b:'confession',t:'Lily Hollis',x:'The girl Halvorsen sent home was Lily Anne Hollis, nine. Her father, Ray, worked line three. The dust came home on his coat.',
      dean:'Ray Hollis’s kid. He was still trying to file the form.',sam:'Her name was on an index card the whole time. Sarah kept it.'},
    {id:'motive',a:'stub',b:'register',t:'Why the count starts in October',x:'The book runs without a gap except in March. Six October deaths stand in a neat row, after the mill closed. A death in March, while it ran, would have been the mill’s.',
      dean:'Liability. It’s always liability.',sam:'Move one date and a death becomes bad luck.'},
    {id:'dust',a:'fan',b:'roster',t:'One shift, one fan',x:'Every dead man worked line three, nights, under fan fourteen, which was deferred seven times.',
      dean:'Same air, same men.',sam:'The cause isn’t a mystery. The paperwork is.'},
    {id:'clock',a:'ray',b:'leon',t:'Twenty to three',x:'Every certificate gives 2:40 a.m. Leon sees a man walk up the mill wall at 2:40. Whatever keeps that hour is in the paperwork too.',
      dean:'The thing in the mill keeps office hours.',sam:'Same time, every time. Either something is killing on a schedule, or somebody wrote the same time six times.'},
    {id:'sentence',a:'lilith',b:'confession',t:'The same sentence',x:'“It was my decision,” Halvorsen said, word for word what two other people said this week. Somebody has been deciding things for this town and letting it keep the credit.',
      dean:'Same words, different mouths. That’s a script.',sam:'She’s right. That’s not how people talk. That’s how people are talked into things.'},
  ],
  theory:{q:'Why are people dying, and why do the records disagree?',reward:40,
    opts:[{id:'ghost',t:'Something in the mill kills at twenty to three. The records agree because it keeps the same hours.',support:['clock']},
          {id:'neglect',t:'Fan fourteen killed six men of one shift. The records disagree because the county is careless.',support:['dust']},
          {id:'coverup',t:'The dust has killed seven, starting with a child in March while the mill still ran — and her page was cut so the deaths would start after it closed.',ok:true,support:['first','motive','dust']}],
    right:'The air killed them, and the first one was nine. The records disagree because somebody needed the dying to start after the mill shut.',
    wrong:'The deaths are real and the cause is plain. What you didn’t see is why the count begins in October, and who it leaves out.'},
  talk:()=>[[S.hero,isObserver()?'There’s a number missing from the register. I can’t tell you whose.':'The doctor at the Velvet Hour is sitting on something heavy.'],[S.hero,'Neither of us has the whole thing. That’s the point, I think.']],
  questions:()=>[!S.flags.rot_register?'The county keeps a death register. Where?':null,!S.flags.rot_conf?'Who signed the certificates, and why is he drinking?':null,
    frStage()===2&&frVerified()<2?'What in the library can you both check?':null].filter(Boolean),
  autopsy:()=>{ const E=rotEnding()||'six';
    return {what:[ROT_END[E].title+'. '+ROT_END[E].lines()[0]],cause:['Fan fourteen, deferred seven times; the dust on a father’s coat; a page cut out of the county register in September.'],
      open:['Who is the man from Delaware?','“Per C.H.” — the same initials as the mill’s deferrals.','Who has been deciding things for this town?'],
      dean:'We did that one together. Mostly.',sam:'Next time we compare notes sooner.'}; },
  paper:()=>{ const E=rotEnding()||'six', named=deduced('named');
    return E==='seven'?{head:'COUNTY REGISTER MISSING A PAGE: SEVENTH DEATH WAS A CHILD',deck:named?'Lily Anne Hollis, 9, died in March while line three was still running.':'A nine-year-old died in March while line three was still running. Her page was removed in September.',
      by:'Ledger staff',body:['A page was removed from the Oakhaven County death register in September, according to records reviewed by the Ledger and a statement from the physician who signed it.',
        S.flags.rot_offrecord?'The physician spoke on condition that he not be named.':'Dr. P. Halvorsen said: “I took it out. I want that on the record, with my name.”','The mill’s owners, Crossroads Holdings, did not respond.']}
      :E==='divided'?{head:'MILL DEATHS: QUESTIONS REMAIN',deck:'Two federal agents left town with what a clerk called “two different files.”',by:'Ledger staff',body:['Six deaths at the former mill remain under review.']}
      :{head:'FAN 14: SIX DEATHS TIED TO DEFERRED REPAIR',deck:'The register lists six. The county says that is the count.',by:'Ledger staff',body:['The county register lists six certificates for the autumn deaths at the former mill.']}; },
});

/* ── joint choices in this chapter ─────────────────────────────────────── */
JOINT['fr-real']={title:'What in the library is real?',q:'Your accounts of the archive contradict each other, and the room keeps changing while you compare them. Decide together what you will treat as real.',sealed:true,
  avail:()=>frStage()===2&&frVerified()>=2,
  opts:[{id:'records',t:'The clock, the register and the door are real. The desk, and who stood at it, are the room lying to us.'},
        {id:'sarah',t:'Sarah was there. Whatever happened at that desk, it was her.'},
        {id:'us',t:'One of us is seeing wrong. In here, we can’t trust each other’s eyes.'}],
  apply:f=>{ const F=S.flags; if(F.fr_real) return; F.fr_real=true; F.fr_pick=f.pick||'contested';
    if(frStage()===2) cop({op:'set',path:'shared.flags.fracture',val:3,expect:2});
    if(f.pick==='records') relBrothers({trust:1,understanding:1},'believed each other over the room');
    else if(f.pick==='sarah'){ relEvent(S.hero,'sarah',{trust:-1},'blamed her for the desk'); relEvent('sarah',S.hero,{resentment:1},'she can tell'); }
    else relBrothers({trust:-2},'stopped trusting each other’s eyes');
    S.glitchA=.3; feedSys('The library is one library again.');
    const fk=myPriv().fake; if(fk&&!F.fake_told){ F.fake_told=true;
      chron('fracture',`At 2:40, ${myName()} got a message from ${partnerName()}: “${fk.text}” ${partnerName()} never sent it.`,{feed:'a message you never sent'}); } } };
JOINT['sarah']={title:'What do you tell Sarah?',q:'Sarah lost an hour in her own archive and there are gouges in its door. Whatever you say, you say it together.',sealed:false,
  avail:()=>frStage()===3&&!rotOut(),
  opts:[{id:'tell',t:'Tell her everything, together: what was seen at the desk, the door, the hour she lost.'},
        {id:'protect',t:'Keep it from her, and keep her out of the archive until we know more.'},
        {id:'watch',t:'Say nothing. Watch her.'}],
  apply:f=>{ const F=S.flags; if(F.rot_sarah_done) return; F.rot_sarah_done=true;
    if(f.pick==='tell'){ if(!rotOut()){ const sc=['dean','sam'].reduce((s,h)=>{ const r=relGet('sarah',h); return s+r.trust+r.safety; },0);
        cop({op:'set',path:'shared.flags.sarahOut',val:sc>=4?'index':'beast',expect:null},ok=>{ if(ok) chron('rel',sc>=4?'You told Sarah together. She heard it, and gave you what she’d written.':'You told Sarah together. She wasn’t ready to hear it from you. The archive didn’t survive the night.',{feed:'Sarah'}); }); } }
    else if(f.pick==='protect'){ F.rot_sarah_locked=true; relEvent('sarah',S.hero,{resentment:2,respect:-1},'locked out of her own archive',{major:true,line:`Sarah was kept out of her own archive. She noticed who did it.`}); }
    else { relEvent('sarah',S.hero,{trust:-1},'watched like a suspect'); relEvent(S.hero,'sarah',{understanding:1},'watched her'); } } };
COOP_SYNC.push(()=>{ const o=rotOut(), F=S.flags; if(!o||F.rot_out_seen) return; F.rot_out_seen=true;
  if(o==='index'){ F.rot_index=true; relEvent('sarah',S.hero,{trust:1,safety:1},'they told her the truth, together');
    later(.5,()=>say('sarah','I wrote it down in September. I didn’t know why I was writing it. I think I knew.',4.2,{now:true})); toast('Sarah gave you her index card — J'); }
  else { F.rot_beast=true;
    noteMine('beast','The archive, after','In the morning the archive is split open from the inside. The register is pulp. On the counter, in Sarah’s handwriting: “Don’t look for me tonight. I’m sorry about the books.”','vision');
    toast('Something happened in the library'); } });
JOINT['ch1']={title:'What you do with what you know',q:'This closes the chapter, for both of you, permanently.',sealed:true,
  avail:()=>!!(coopShared().final||{})['th-rot'],
  opts:[{id:'expose',t:'Put it on the record: the cut page, the doctor, the man from Delaware. The Ledger prints it.'},
        {id:'protect',t:'Keep Halvorsen’s name out of it. He walks the page back into the county office himself.'},
        {id:'bury',t:'Leave it. The record says six. Six is what the town can carry.'}],
  apply:f=>{ if(S.flags.rot_end_seen) return; S.flags.rot_end_seen=true; S.flags.ch1_done=true; closeCase('rot',{quiet:true});
    const E=rotEnding(); if(COOP.seat==='A') chron('ending',`Chapter One ended: ${ROT_END[E].title}.`,{feed:'Chapter One: '+ROT_END[E].title});
    later(.8,()=>showRotEnding(E)); } };

/* ── three endings ─────────────────────────────────────────────────────── */
function rotEnding(){ const FN=coopShared().final||{}, th=FN['th-rot'], ch=FN.ch1; if(!th||!ch) return null;
  if(!th.pick||!ch.pick) return 'divided';
  if(th.pick==='coverup'&&(ch.pick==='expose'||ch.pick==='protect')) return ch.pick==='expose'&&(coopShared().flags||{}).confInf?'six':'seven';
  return 'six'; }
const ROT_END={
  seven:{title:'Seven',kicker:'Chapter One · ending',lines:()=>{ const ch=(coopShared().final||{}).ch1||{}, named=deduced('named');
    return [ch.pick==='expose'?(S.flags.rot_offrecord?'On Monday the Ledger prints seven deaths. The doctor isn’t named; he made sure of that. The seventh is nine years old.':'On Monday the Ledger prints seven deaths and a doctor’s name, signed by the doctor. The seventh is nine years old.')
        :'Nobody prints anything. On Tuesday Dr. Halvorsen walks to the county office with a page he wrote again by hand, and puts it back in the register, at 0114, where it belongs.',
      named?'Her name is Lily Anne Hollis. Her father brought the dust home on his coat and never knew.':'You never found her name. The register has it now. That will have to be enough for a while.',
      'The count was always seven. Now the record knows it.']; }},
  six:{title:'Six',kicker:'Chapter One · ending',lines:()=>{ const SH=coopShared(), ch=(SH.final||{}).ch1||{}, th=(SH.final||{})['th-rot']||{};
    if(ch.pick==='expose'&&(SH.flags||{}).confInf) return ['The Ledger runs the story on Monday. On Tuesday Dr. Halvorsen recants all of it, sincerely, because he cannot remember choosing to say it. He is right not to.','What Lilith drew out of him was true, and it was not his to give. The page stays missing.','The record says six.'];
    if(th.pick==='coverup') return ['You knew there were seven. You chose six, because six is what the town could carry this week.','The cut page is still a cut page. Someone who reads the register carefully will find it, some day, and wonder why nobody asked.','The record says six.'];
    return ['The story everybody can live with: '+(th.pick==='ghost'?'something in the mill, keeping its hours.':'a fan, a budget line, a careless county.'),'It isn’t wrong. It isn’t finished either. Somewhere in the county register a number is missing, and you didn’t go looking for it.','The record says six. Next chapter, that will matter.']; }},
  divided:{title:'Two files',kicker:'Chapter One · ending',lines:()=>['You leave the first week of Oakhaven with two case files that don’t agree. Neither of you is wrong about everything. Neither of you will say which parts.',
    'In the Impala the radio does the talking. Somewhere around the county line one of you says “Okay,” and the other doesn’t answer, and that is the conversation.','The record says whatever the last person to touch it wanted. Next chapter, you will both have to read it again.']},
};
function rotPersonal(){ const me=S.hero, L=[];
  const s=relGet('sarah',me), l=relGet('lilith',me), ml=relGet(me,'lilith');
  L.push(relReact([[()=>rotOut()==='beast','Sarah left town for a night and came back with her sleeves pulled down over her hands. She doesn’t talk about it. Neither do you.'],
    [()=>s.resentment>=2,'Sarah stamps your library card without looking at you. You kept her out of her own archive. She hasn’t decided yet whether to forgive it.'],
    [()=>s.trust+s.safety>=4,'Sarah meets you on the library steps with two coffees. “I keep losing hours,” she says. “I’d like someone to know when I do.”']],
    'Sarah is behind the desk when you leave. She lifts a hand. You can’t tell if it means goodbye or wait.'));
  if(S.flags.lil_met) L.push(relReact([[()=>ml.influence>=3,'You think about Lilith more than you’d like. You aren’t sure the thinking is yours.'],
    [()=>l.respect>=2,'The vinyl chair by the motel ice machine is empty when you check out. On the seat, a note in old, careful handwriting: “You asked properly. Thank you.”'],
    [()=>l.resentment>=2,'The motel bell rings once, for nobody, as you leave. You get the feeling it was rung at you.']],
    'Lilith isn’t in the lobby when you check out. You look anyway.'));
  const b=relGet(me,partnerHero());
  L.push(b.trust>=6?`Whatever the file says, you’d stake your life on ${relName(partnerHero())}. You may have to.`:b.trust<=2?`You have started double-checking what ${relName(partnerHero())} tells you. You hate that you have.`:`You and ${relName(partnerHero())} are fine. Mostly. Ask again next chapter.`);
  return L; }
function showRotEnding(E){
  const R=ROT_END[E]; if(!R) return; S.menu='autopsy'; document.exitPointerLock?.(); clearHeld();
  const C=coopState(), mem=((C&&C.chron)||[]).filter(e=>['joint','fracture','rel','decision'].includes(e.kind)).slice(-6);
  elAut.innerHTML=`<div class="au-sheet co-end"><small class="k">${esc_(R.kicker)} · The Rot</small><h2>${esc_(R.title)}</h2>`
    +R.lines().map(p=>`<p>${esc_(p)}</p>`).join('')
    +`<section><small>Just you</small>${rotPersonal().map(p=>`<p>${esc_(p)}</p>`).join('')}</section>`
    +(mem.length?`<section><small>What the chronicle remembers</small>${mem.map(e=>`<p class="co-mem">${esc_(e.text)}</p>`).join('')}</section>`:'')
    +`<p class="co-next">Chapter One is complete. Your campaign continues: the rest of Oakhaven is open in your own town, and the case file, the chronicle and everything between the four of you carries on.</p>`
    +`<div class="au-btns"><button data-x>Continue</button></div></div>`;
  elAut.classList.add('on'); sfx('bell');
  const b=elAut.querySelector('[data-x]'); if(b) b.onclick=()=>{ elAut.classList.remove('on'); elAut.innerHTML=''; S.menu=null; };
}

/* ── Sarah, after ──────────────────────────────────────────────────────── */
const sR=()=>relGet('sarah',S.hero);
function sarahAsks(){ return relReact([
  [()=>sR().resentment>=3,'She doesn’t wait for you to speak. "You’re going to tell me what I can handle. Go on. You’ve had practice."'],
  [()=>relGet(S.hero,'lilith').influence>=3,'"Your voice is doing something," she says. "Like it’s been tuned by someone else. Stop it, or stop talking to me."'],
  [()=>sR().safety>=3&&sR().trust>=2,'"Tell me the truth," she says. "I can hear it. I just can’t hear it alone."'],
  [()=>relGet(S.hero,'sarah').understanding>=3,'"You already know what I’m going to ask. You’ve got that look. Pete used to have it."'],
  [()=>sR().safety<=-1,'"Never mind. Don’t answer. I’d rather not know what my face looked like."'],
],'"Did you see me there?" she asks. "In the archive. I lost an hour. I’ve never lost an hour in my life."'); }
{ const T=DIALOGUE.sarah, st=T.start; T.start=()=>COOP.on&&frStage()===3&&!S.flags.rs_done&&!rotOut()?'rs0':(typeof st==='function'?st():st);
  Object.assign(T.nodes,{
    rs0:{speaker:'Sarah Lindqvist — librarian',text:()=>'She is re-shelving books that don’t need it. When she sees you she stops with one held against her chest like a shield.\n\n'+sarahAsks(),
      choices:[D_('“Tell me what you remember.”','rs1',{now:()=>{ relEvent('sarah',S.hero,{safety:1,respect:1},'asked first'); relEvent(S.hero,'sarah',{understanding:1},'listened'); }}),
        D_('“I saw you at the desk. There was blood. And then there wasn’t.”','rs2',null,()=>!!S.flags.fr_saw_sarah),
        D_('“Stay out of the archive for a while. For your own good.”','rs3',{now:()=>{ relEvent('sarah',S.hero,{respect:-2,resentment:2},'told what was good for her'); }}),
        D_('[Say nothing about it.]','rs4',{now:()=>relEvent('sarah',S.hero,{trust:-1},'said nothing')})]},
    rs1:{speaker:'Sarah Lindqvist',text:'"Iron. The smell of it. The clock saying twenty to three, and my own handwriting on a card I don’t remember writing." She swallows. "And being very, very angry at someone who wasn’t in the room."\n\n"Thank you for asking it that way round."',
      choices:[D_('[…]','rs9')]},
    rs2:{speaker:'Sarah Lindqvist',text:()=>sR().trust+sR().safety>=2?'She sits down on the step stool, hard.\n\n"Thank you," she says, "for not making me guess." Her hands are shaking. She lets you see them shake.':'Her hands go flat on the counter. The wood under her nails splinters with a small, dry sound. She doesn’t notice.\n\n"Don’t," she says. "Don’t say it like that. Like you’re reading it off a slide."',
      choices:[D_('[…]','rs9',{now:()=>{ if(sR().trust+sR().safety>=2){ relEvent('sarah',S.hero,{trust:2,safety:1},'told her the truth gently'); relEvent(S.hero,'sarah',{affection:1},'she let you see'); }
        else relEvent('sarah',S.hero,{safety:-2},'told too bluntly'); }})]},
    rs3:{speaker:'Sarah Lindqvist',text:'"It’s my archive." Very quietly. "I have the only key. I have had the only key for eleven years. You’ve known me a week."',choices:[D_('[…]','rs9')]},
    rs4:{speaker:'Sarah Lindqvist',text:'She waits. You let her.\n\n"You’re doing the thing," she says, "where somebody decides what I can handle." She puts the book back where it was.',choices:[D_('[…]','rs9')]},
    rs9:{speaker:'Sarah Lindqvist',text:'"I don’t know what you two saw in there. I know you didn’t see the same thing; you have two different faces about it." She looks at the archive door. "Decide between you what to tell me. I’m not doing this twice."',
      choices:[D_('[…]',null,{flag:'rs_done',now:()=>feedSys('Sarah is waiting for you both to decide what to tell her — board (I).')})]},
  }); }
