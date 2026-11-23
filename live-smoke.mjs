import assert from 'node:assert/strict';

const website='https://gudush03-cell.github.io/vdvoem-web';
const backend='https://perceptive-patience-production-79bfb421.up.railway.app';

async function getWithRetry(url) {
  let last;
  for(let i=0;i<12;i++){
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(12000),cache:'no-store'});
      if(response.ok)return response;
      last=Error(url+' returned '+response.status);
    } catch(error){last=error;}
    await new Promise(resolve=>setTimeout(resolve,3000));
  }
  throw last;
}
const landingResponse=await getWithRetry(website+'/');
const landing=await landingResponse.text();
assert.match(landing,/secure-purchase\.html/);
assert.match(landing,/secure-game\.html/);
assert.doesNotMatch(landing,/href="\.\/purchase\.html"/);
assert.doesNotMatch(landing,/href="\.\/game\.html/);
console.log('PASS homepage account-bound purchase and deck routes');

for(const path of ['/game.html','/secure-game.html','/secure-purchase.html']){
  const response=await getWithRetry(website+path);
  const html=await response.text();
  assert.match(html,/<html\b/i);
  if(path==='/game.html')assert.match(html,/href="\.\/secure-game\.html"/);
  if(path==='/secure-game.html')assert.match(html,/app-secure\.js/);
  if(path==='/secure-purchase.html')assert.match(html,/data-telegram-login|telegram-widget\.js/);
  console.log('PASS website '+path);
}
const script=await getWithRetry(website+'/app-secure.js');
assert.match(await script.text(),/\/api\/account\/card/);
console.log('PASS protected client script');

const health=await getWithRetry(backend+'/health');
const status=await health.json();
assert.equal(status.status,'ok');
assert.equal(status.database_initialized,true);
assert.equal(status.game_cards_loaded,true);
assert.equal(status.game_cards_total,168);
assert.equal(status.legacy_bulk_enabled,true,
  'Old code-based purchases must stay accessible during transition');
console.log('PASS production backend health, legacy access still enabled');

async function invalidRequest(path,body) {
  const response=await fetch(backend+path,{
    method:'POST',headers:{'Content-Type':'application/json',Origin:'https://gudush03-cell.github.io'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(12000)
  });
  assert.equal(response.status,401,path+' must reject unauthenticated request');
  assert.equal(response.headers.get('access-control-allow-origin'),
    'https://gudush03-cell.github.io');
}
await invalidRequest('/api/auth/telegram',{
  id:123456789,auth_date:Math.floor(Date.now()/1000),hash:'a'.repeat(64)
});
await invalidRequest('/api/account/card',{deck:'laugh',index:0});
const guestStatus=await fetch(backend+'/api/account/status',{
  headers:{Origin:'https://gudush03-cell.github.io'},signal:AbortSignal.timeout(12000)
});
assert.equal(guestStatus.status,401,'Guest cannot read account status');
console.log('PASS unauthorized Telegram signature and paid card requests rejected');
