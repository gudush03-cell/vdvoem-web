(()=>{'use strict';
const API='https://perceptive-patience-production-79bfb421.up.railway.app/api/game';
const keys=['laugh','know','unsaid','inside','mend','choose','scene','silent','midnight','exhale'];
const mainKeys=keys.slice(0,6);
const descriptions={
 laugh:'Абсурд и смешные истории. Выдумывайте, шутите и смейтесь вместе.',
 know:'Проверяемые догадки о партнёре. Узнайте, насколько хорошо вы друг друга знаете.',
 unsaid:'Личные истории и признания. То, о чём не всегда находится повод поговорить.',
 inside:'Близость и чувства. Вопросы, которые помогают услышать друг друга.',
 mend:'Бережные разговоры о конфликтах. Ищите общий язык без обвинений.',
 choose:'Игровые выборы и действия. Решайте, пробуйте и удивляйте друг друга.',
 scene:'Совместные сценарии. Представьте, как вы поступили бы вдвоём.',
 silent:'Невербальная забота. В колоде 12 заданий: каждому выпадут 3 случайных.',
 midnight:'Флирт и желания при взаимном согласии. Перед началом ответят оба игрока.',
 exhale:'Разнообразные способы завершить игру. Одна случайная карта для двоих.'
};
const lengths=[20,20,20,20,20,20,10,12,20,6];
const meta={
laugh:['Орём','😂','#ead2bd','Смеяться вместе'],
know:['Я тебя знаю?','🧩','#e4a5b0','Узнать ближе'],
unsaid:['Я это не говорил(а)','💌','#e9b4c1','Сказать важное'],
inside:['Внутри','💭','#d1c8df','Без масок'],
mend:['Починим','🛠️','#d1dcc9','Услышать друг друга'],
choose:['Выбирай','🎲','#eeb2a9','Смелые варианты'],
scene:['Ситуация','🎭','#b7cde2','В любой момент'],
silent:['Без слов','🤫','#d8d7d9','3 задания каждому'],
midnight:['После полуночи','🌙','#713647','По желанию обоих'],
exhale:['Выдох','🌿','#dce9e6','Финал для двоих']
};
const demo=[
{deck:'ОРЁМ',tone:'#ead2bd',title:'ВЕРНИТЕ МОЙ 2017',body:['Что из времён 2017-го ты бы с удовольствием вернул(а) прямо сейчас?','А что оттуда должно навсегда остаться в прошлом?']},
{deck:'Я ТЕБЯ ЗНАЮ?',tone:'#e4a5b0',title:'СИНХРОН',body:['На счёт три одновременно покажите на себя или партнёра:','• кто забудет, зачем вошёл в комнату; • кто предложит спонтанно куда-нибудь уехать; • кто обидится и скажет: «Я не обиделся(ась)»; • кто потратит слишком много на какую-нибудь херню; • кто первым заговорит после ссоры.','Сколько ответов из пяти совпало?']},
{deck:'ОРЁМ',tone:'#ead2bd',title:'НИШЕВОСТЬ',body:['В какой максимально странной или бесполезной теме ты внезапно эксперт уровня «даже не спорь со мной»?']},
{deck:'Я ТЕБЯ ЗНАЮ?',tone:'#e4a5b0',title:'ТРАТИМ',body:['Партнёру прямо сейчас переводят сумму, равную его месячному доходу. Никаких долгов и обязательных расходов.','Запиши, на что он первым делом потратит часть денег. Партнёр одновременно записывает настоящий ответ.','Открывайте вместе.']},
{deck:'ВНУТРИ',tone:'#d1c8df',title:'МНЕ ТЕБЯ НЕ ХВАТАЛО',body:['Вспомни конкретный момент, когда ты особенно сильно хотел(а), чтобы я оказался(ась) рядом.','Где ты был(а) и что тогда происходило?']},
{deck:'ВНУТРИ',tone:'#d1c8df',title:'ВЕРНИ МЕНЯ ТУДА',body:['Выбери один день наших отношений, который ты хотел(а) бы прожить ещё раз без каких-либо изменений.','Восстанови его от утра до вечера.']}
];
const $=id=>document.getElementById(id);
const views=['homeView','loginView','lobbyView','handoffView','secretView','consentView','playView','finishView'];
const gamePage=location.pathname.split('/').pop().toLowerCase()==='game.html';
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let decks=null,party=null,aside=null,privateStage=null,view='',timer=0;
const SAVE_KEY='vdvoem-web-progress-v2';
function saveProgress(){try{if(party)localStorage.setItem(SAVE_KEY,JSON.stringify({party,updated:Date.now()}));else localStorage.removeItem(SAVE_KEY);}catch{}}
function restoreProgress(mode){try{const data=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!data?.party||Date.now()-data.updated>30*24*60*60*1000)return false;if(data.party.mode!=='demo'&&mode!=='full')return false;if(data.party.mode==='demo'&&mode==='full')return false;const p=data.party;if(!Array.isArray(p.queue)||!Number.isInteger(p.index)||p.index<0||p.index>=p.queue.length||![1,2].includes(p.player))return false;party=p;return true;}catch{return false;}}

let selected=new URLSearchParams(location.search).get('deck');
if(!keys.includes(selected))selected=null;
function showView(id){
 if(party)saveProgress();
 view=id; for(const k of views)$(k).hidden=k!==id;
 const element=$(id);element.classList.remove('enter');
 if(!reduced){void element.offsetWidth;element.classList.add('enter');}
 window.scrollTo({top:0,behavior:'instant'});
 document.title=id==='homeView'?'Вдвоём налегке : игра для двоих':'Вдвоём налегке : полная игра';
}
function toast(msg){const el=$('toast');el.textContent=msg;el.hidden=false;clearTimeout(timer);timer=setTimeout(()=>{el.hidden=true;},3600);}
function shuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function fmt(a,b){return String(a).padStart(2,'0')+' / '+String(b).padStart(2,'0');}
function tile(id,i,active){
 const info=meta[id],el=document.createElement(active?'button':'a');
 el.className='deck-card reveal'+(id==='midnight'?' midnight':'');
 el.style.setProperty('--tone',info[2]);
 if(active){el.type='button';el.addEventListener('click',()=>describeDeck(id));}
 else el.href='./game.html?deck='+id;
 el.setAttribute('aria-label',(i+1)+'. '+info[0]+', '+lengths[i]+' карт');
 const order=document.createElement('span');order.className='ordinal';order.textContent=String(i+1).padStart(2,'0');
 const count=document.createElement('span');count.className='count';count.textContent=lengths[i]+' КАРТ';
 const emoji=document.createElement('span');emoji.className='emoji';emoji.textContent=info[1];
 const name=document.createElement('strong');name.className='name';name.textContent=info[0];
 const hint=document.createElement('small');hint.className='hint';hint.textContent=info[3];
 el.append(order,count,emoji,name,hint);return el;
}
function describeDeck(id){
 const info=meta[id];if(!info)return;
 const dialog=document.createElement('dialog');dialog.className='deck-description';
 const content=document.createElement('div');content.className='deck-description-inner';
 const symbol=document.createElement('div');symbol.className='deck-description-symbol';symbol.textContent=info[1];
 const heading=document.createElement('h2');heading.textContent=info[0];
 const description=document.createElement('p');description.textContent=descriptions[id];
 const count=document.createElement('small');count.textContent=lengths[keys.indexOf(id)]+' карточек';
 const row=document.createElement('div');row.className='deck-description-actions';
 const start=document.createElement('button');start.type='button';start.className='btn';start.textContent=id==='silent'?'Показать задания':id==='exhale'?'Вытянуть карту':'Начать играть ♡';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='btn secondary';cancel.textContent='Назад к колодам';
 start.addEventListener('click',()=>{dialog.close();dialog.remove();selectDeck(id);});
 cancel.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>dialog.remove());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 row.append(start,cancel);content.append(symbol,heading,description,count,row);dialog.append(content);
 document.body.append(dialog);dialog.showModal();
}
function reveals(){
 if(reduced||!('IntersectionObserver' in window)){document.querySelectorAll('.reveal').forEach(el=>el.classList.add('in-view'));return;}
 const obs=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('in-view');obs.unobserve(e.target);}}, {threshold:.08});
 document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
}
function populate(){ $('publicDecks').replaceChildren(...keys.map((k,i)=>tile(k,i,false)));$('privateDecks').replaceChildren(...keys.map((k,i)=>tile(k,i,true)));reveals();}
function lobby(){if(!decks){showView('loginView');return;}aside=null;$('resumeBox').hidden=!party||!party.queue.length||party.index>=party.queue.length;showView('lobbyView');reveals();}
function nextPlayer(){party.player=party.player===1?2:1;}
function startDemo(){party={mode:'demo',queue:demo.map((_,i)=>({demo:i})),index:0,player:1,skips:{1:1,2:1},secrets:null,seen:[]};aside=null;render();showView('playView');}
function startParty(mode,id){
 let queue;
 if(mode==='full')queue=mainKeys.flatMap(key=>decks[key].map((_,i)=>({deck:key,index:i})));
 else if(mode==='quick')queue=shuffle(mainKeys.flatMap(key=>decks[key].map((_,i)=>({deck:key,index:i}))));
 else queue=decks[id].map((_,i)=>({deck:id,index:i}));
 const ids=shuffle(decks.silent.map((_,i)=>i));
 party={mode,deck:id||null,queue,index:0,player:1,skips:{1:1,2:1},secrets:{1:ids.slice(0,3),2:ids.slice(3,6)},seen:[]};
 aside=null;startSecrets('start');
}
function selectDeck(id){
 if(!decks){location.assign('./game.html?deck='+id);return;}
 if(id==='silent'){
   if(party?.secrets)startSecrets('review');
   else{const ids=shuffle(decks.silent.map((_,i)=>i));party={mode:'silent',deck:id,queue:[],index:0,player:1,skips:{1:1,2:1},secrets:{1:ids.slice(0,3),2:ids.slice(3,6)},seen:[]};startSecrets('start');}
 }else if(id==='exhale')exhale();
 else if(id==='midnight'){$('consent1').checked=false;$('consent2').checked=false;$('cancelConsent').textContent='Вернуться к колодам';showView('consentView');}
 else startParty('single',id);
}
function startSecrets(reason){if(!party?.secrets)return;privateStage={player:1,reason,returnTo:view==='playView'?'playView':'lobbyView'};handoff();}
function handoff(){const p=privateStage.player;$('handoffTitle').textContent='Передайте телефон Игроку '+p;$('handoffText').textContent=(p===1?'Сейчас появятся только её 3 тайных задания.':'Сейчас появятся только его 3 тайных задания.')+' Не показывайте карты другому игроку.';showView('handoffView');}
function showSecrets(){
 const p=privateStage.player;
 $('secretTitle').textContent='Игрок '+p+' · 3 тайных задания';
 $('secretList').replaceChildren(...party.secrets[p].map((id,i)=>{
  const c=decks.silent[id],box=document.createElement('article');box.className='private-mission';
  const heading=document.createElement('strong');heading.textContent=(i+1)+'. '+c.title;box.append(heading);
  for(const text of c.body){const item=document.createElement('p');item.textContent=text;box.append(item);}
  return box;
 }));showView('secretView');
}
function finishSecrets(){
 $('secretList').replaceChildren();
 if(privateStage.player===1){privateStage.player=2;handoff();return;}
 const step=privateStage;privateStage=null;
 if(step.reason==='start'&&party.mode!=='silent'){render();showView('playView');return;}
 if(step.returnTo==='playView'&&party.queue.length){render();showView('playView');return;}
 lobby();
}
function current(){
 if(!party||party.index>=party.queue.length)return null;
 const pointer=party.queue[party.index];
 if(party.mode==='demo'){const c=demo[pointer.demo];return {...c,ink:'#291f23'};}
 const c=decks[pointer.deck][pointer.index],m=meta[pointer.deck];
 return {...c,deck:m[0],tone:m[2],ink:pointer.deck==='midnight'?'#fff1f5':'#291f23'};
}
function render(){
 saveProgress();
 const c=aside?.card||current();
 if(!c){finish(false);return;}
 $('playingCard').style.setProperty('--tone',c.tone);
 $('playingCard').style.setProperty('--ink',c.ink);
 $('cardDeck').textContent=(aside?.label||c.deck).toUpperCase();
 const indexText=aside?'ОСОБАЯ КАРТА':fmt(party.index+1,party.queue.length);
 $('cardIndex').textContent=indexText;$('playCount').textContent=indexText;
 $('cardTitle').textContent=c.title;
 $('cardBody').replaceChildren(...c.body.map(text=>{const el=document.createElement('p');el.textContent=text;return el;}));
 $('cardFooter').textContent=aside?.kind==='exhale'?'ОТВЕЧАЮТ ОБА · НЕ СПЕШИТЕ':'ЧИТАЙТЕ · ОТВЕЧАЙТЕ · ПЕРЕДАВАЙТЕ ХОД';
 $('turnName').textContent=aside?.kind==='exhale'?'Игрок 1 и Игрок 2':party.player===1?'Игрок 1 · Девушка':'Игрок 2 · Партнёр';
 $('turnSymbol').textContent=aside?.kind==='exhale'?'♡♡':'♡';
 $('progress').style.width=aside?'100%':Math.round((party.index+1)/party.queue.length*100)+'%';
 for(let p=1;p<=2;p++){
   $('skipCount'+p).textContent=party.skips[p]+' / 1';
   $('skip'+p).classList.toggle('off',party.skips[p]===0);
   $('skip'+p).classList.toggle('current',p===party.player);
 }
 $('skipCards').hidden=aside?.kind==='exhale';
 $('skipButton').hidden=aside?.kind==='exhale';
 $('skipButton').disabled=party.skips[party.player]===0;
 $('skipButton').textContent=party.skips[party.player]?'Не сегодня':'Не сегодня · использовано';
 $('sceneButton').hidden=!!aside||party.mode==='demo'||!decks;
 $('tasksButton').hidden=party.mode==='demo'||!party.secrets;
 $('exhaleButton').hidden=aside?.kind==='exhale'||party.mode==='demo'||!decks;
 $('nextCard').textContent=aside?.kind==='exhale'?'Завершить вечер ♡':aside?.kind==='scene'?'Вернуться к основной карте':party.index===party.queue.length-1?'Завершить колоду ♡':'Ответили · Передать ход ♡';
 const node=$('playingCard');node.classList.remove('switching');if(!reduced){void node.offsetWidth;node.classList.add('switching');}node.scrollTop=0;
}
function advance(skipped=false){
 if(!party)return;
 if(aside?.kind==='exhale'){aside=null;finish(true);return;}
 if(aside?.kind==='scene'){aside=null;if(skipped)nextPlayer();render();return;}
 if(party.index===party.queue.length-1){party.index++;finish(false);return;}
 party.index++;nextPlayer();render();
}
function skip(){
 if(!party||aside?.kind==='exhale'||!party.skips[party.player])return;
 party.skips[party.player]--;toast('«Не сегодня». Без объяснений ♡');advance(true);
}
function scene(){
 if(!party||!decks||aside)return;
 let choices=decks.scene.map((_,i)=>i).filter(i=>!party.seen.includes(i));
 if(!choices.length){party.seen=[];choices=decks.scene.map((_,i)=>i);}
 const i=choices[Math.floor(Math.random()*choices.length)];party.seen.push(i);
 aside={kind:'scene',label:'Ситуация',card:{...decks.scene[i],deck:'Ситуация',tone:meta.scene[2],ink:'#291f23'}};
 render();toast('Ситуация: после этой карты вернётесь к основной.');
}
function exhale(){
 if(!decks){location.assign('./game.html?deck=exhale');return;}
 if(!party){party={mode:'exhale',queue:[],index:0,player:1,skips:{1:1,2:1},secrets:null,seen:[]};}
 const i=Math.floor(Math.random()*decks.exhale.length);
 aside={kind:'exhale',label:'Выдох · Отвечают оба',card:{...decks.exhale[i],deck:'Выдох',tone:meta.exhale[2],ink:'#291f23'}};
 render();showView('playView');
}
function finish(afterExhale){
 if(!afterExhale&&party&&(party.mode==='full'||party.mode==='quick')&&!party.midnightStage){
   party.midnightStage='asked';
   $('consent1').checked=false;$('consent2').checked=false;
   $('cancelConsent').textContent='Не играем · К финальному «Выдоху»';
   aside=null;showView('consentView');return;
 }
 aside=null;
 $('finishEyebrow').textContent=afterExhale?'Финал вечера':'Колода пройдена';
 $('finishText').textContent=afterExhale?'Спасибо за этот разговор. Можете начать новую партию.':'В финале вытяните случайную карту «Выдох». На неё отвечают оба.';
 $('finishExhale').hidden=afterExhale||party?.mode==='demo';
 $('finishAgain').hidden=party?.mode==='exhale';
 showView('finishView');
}
function again(){
 if(!party)return lobby();
 if(party.mode==='demo')return startDemo();
 if(party.mode==='exhale')return exhale();
 if(party.mode==='single'&&party.deck==='midnight')return selectDeck('midnight');
 if(party.mode==='silent')return lobby();
 startParty(party.mode,party.deck);
}
function logout(){decks=null;party=null;try{localStorage.removeItem(SAVE_KEY)}catch{}aside=null;privateStage=null;$('accessCode').value='';$('loginStatus').textContent='';showView(gamePage?'loginView':'homeView');toast('Игра закрыта. Для повторного входа понадобится код.');}
function wire(){
 $('startDemo').addEventListener('click',startDemo);
 $('backHome').addEventListener('click',()=>location.assign('./index.html'));
 $('loginForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const code=$('accessCode').value.trim();
  const label=$('loginStatus');label.textContent='';label.classList.remove('ok');
  if(!/^[A-HJ-NP-Z2-9]{20}$/i.test(code.replaceAll('-',''))){label.textContent='Проверьте код: 20 символов (четыре группы по пять).';return;}
  const button=$('loginButton');button.disabled=true;button.textContent='Проверяем код…';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({code}),signal:controller.signal});
    if(response.status===401){label.textContent='Код не найден или доступ закрыт.';return;}
    if(!response.ok)throw Error('http');
    const data=await response.json();
    if(data.access!=='granted'||!data.decks||Object.keys(data.decks).length!==10||
       keys.some((k,i)=>!Array.isArray(data.decks[k])||data.decks[k].length!==lengths[i]))throw Error('data');
    decks=data.decks;$('accessCode').value='';label.textContent='';restoreProgress('full');populate();lobby();
    if(selected){const id=selected;selected=null;describeDeck(id);}
  }catch(err){label.textContent=err.name==='AbortError'?'Сервер долго не отвечает. Попробуйте ещё раз.':'Не удалось загрузить игру. Попробуйте позднее.';}
  finally{clearTimeout(timeout);button.disabled=false;button.textContent='Открыть полную игру ♡';}
 });
 document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>startParty(el.dataset.mode)));
 $('resumeButton').addEventListener('click',()=>{if(!party?.queue.length)return lobby();aside=null;render();showView('playView');});
 $('viewMyTasks').addEventListener('click',()=>selectDeck('silent'));
 $('lobbyExhale').addEventListener('click',exhale);
 $('logout').addEventListener('click',logout);
 $('revealTasks').addEventListener('click',showSecrets);
 $('hideTasks').addEventListener('click',finishSecrets);
 $('confirmConsent').addEventListener('click',()=>{
  if(!$('consent1').checked||!$('consent2').checked)return toast('Оба игрока должны согласиться.');
  if(party?.midnightStage==='asked'){
    party.queue=decks.midnight.map((_,i)=>({deck:'midnight',index:i}));
    party.index=0;party.midnightStage='playing';nextPlayer();aside=null;render();showView('playView');
  }else startParty('single','midnight');
 });
 $('cancelConsent').addEventListener('click',()=>{
  if(party?.midnightStage==='asked'){party.midnightStage='declined';finish(false);}
  else lobby();
 });
 $('backLobby').addEventListener('click',()=>party?.mode==='demo'?showView('homeView'):lobby());
 $('nextCard').addEventListener('click',()=>advance(false));
 $('skipButton').addEventListener('click',skip);
 $('sceneButton').addEventListener('click',scene);
 $('tasksButton').addEventListener('click',()=>startSecrets('review'));
 $('exhaleButton').addEventListener('click',exhale);
 $('finishExhale').addEventListener('click',exhale);
 $('finishLobby').addEventListener('click',()=>party?.mode==='demo'?showView('homeView'):lobby());
 $('finishAgain').addEventListener('click',again);
}
populate();wire();if(!gamePage&&restoreProgress('demo')){render();showView('playView');}else showView(gamePage?'loginView':'homeView');
})();