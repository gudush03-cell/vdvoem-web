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
// GitHub Pages and Cloudflare deploy asynchronously after a push.
// Retry expected content instead of failing against a still-live previous release.
async function getPublishedText(url,expected){
  let last;
  for(let attempt=0;attempt<24;attempt++){
    try {
      const r=await fetch(url,{signal:AbortSignal.timeout(12000),cache:'no-store'});
      if(r.ok){
        const body=await r.text();
        if(expected.test(body))return body;
        last=Error('Previous deployment still served at '+url);
      } else last=Error(url+' returned '+r.status);
    } catch(error){last=error;}
    await new Promise(resolve=>setTimeout(resolve,5000));
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

// Cloudflare Pages is tested in parallel with the original GitHub Pages site.
const cloudflareWebsite='https://vdvoem-web.pages.dev';
for(const path of ['/','/secure-game.html','/secure-purchase.html','/offer.html','/privacy.html','/app-secure.js']){
  const body=await getPublishedText(cloudflareWebsite+path,
    path==='/offer.html'?/499 ₽/:path==='/privacy.html'?/Политика обработки персональных данных/:/[\\s\\S]/);
  if(path==='/') {
    assert.match(body,/secure-purchase\.html/);
    assert.match(body,/secure-game\.html/);
  } else if(path==='/secure-game.html'){
    assert.match(body,/app-secure\.js/);
  } else if(path==='/secure-purchase.html'){
    assert.match(body,/\/api\/checkout/);
    assert.match(body,/data-telegram-login|telegram-widget\.js/);
  } else if(path==='/app-secure.js'){
    assert.match(body,/\/api\/account\/card/);
  } else if(path==='/offer.html'){
    assert.match(body,/499 ₽/);
    assert.match(body,/privacy\.html/);
    assert.doesNotMatch(body,/Это проект оферты|Цена в рублях будет показана/);
  } else if(path==='/privacy.html'){
    assert.match(body,/Политика обработки персональных данных/);
    assert.match(body,/Telegram/);
  } else {
    assert.match(body,/<html\b/i);
  }
  console.log('PASS Cloudflare Pages '+path);
}


const legal=await getPublishedText(website+'/offer.html',/499 ₽/);
assert.match(legal,/499 ₽/);
const privacy=await getPublishedText(website+'/privacy.html',/Политика обработки персональных данных/);
assert.match(privacy,/Политика обработки персональных данных/);
console.log('PASS original site legal pages');

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

for(const origin of ['https://gudush03-cell.github.io','https://vdvoemnalegke.ru','https://www.vdvoemnalegke.ru','https://vdvoem-web.pages.dev']){
  const preflight=await fetch(backend+'/api/auth/telegram',{
    method:'OPTIONS',
    headers:{'Origin':origin,'Access-Control-Request-Method':'POST',
      'Access-Control-Request-Headers':'Content-Type, Authorization'},
    signal:AbortSignal.timeout(12000)
  });
  assert.equal(preflight.status,204,'CORS '+origin);
  assert.equal(preflight.headers.get('access-control-allow-origin'),origin,
    'Explicit domain CORS '+origin);
}
for(const origin of ['https://fake.vdvoemnalegke.ru','http://vdvoemnalegke.ru']){
  const blocked=await fetch(backend+'/api/auth/telegram',{
    method:'OPTIONS',headers:{Origin:origin},signal:AbortSignal.timeout(12000)
  });
  assert.equal(blocked.status,403,'Disallowed CORS '+origin);
}
console.log('PASS new HTTPS domain allowed, old origin preserved, spoofed origins blocked');

console.log('PASS unauthorized Telegram signature and paid card requests rejected');
