import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./secure-purchase.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
const script = scripts.map(match => match[1]).find(code => code.includes('async function startPurchase()'));
assert.ok(script, 'checkout inline JavaScript must exist');

test('Telegram checkout never renders, copies, or requests manual access codes', () => {
  const result = html.match(/<section id="result" hidden>([\s\S]*?)<\/section>/)?.[1] || '';
  assert.ok(result.includes('secure-game.html'));
  assert.ok(!result.includes('accessCode'));
  assert.ok(!result.includes('Скопировать код'));
  assert.ok(!result.includes('Обязательно сохраните код'));
  assert.match(script, /\/api\/account\/status/);
  assert.ok(!script.includes('codeBox.textContent'));
  assert.ok(!script.includes("getElementById('copy')"));
});


function boot(token = null, {paid = false, unauthorized = false, live = true, healthFailed = false} = {}) {
  const elements = new Map();
  const requests = [];
  const assigned = [];
  const storage = new Map();
  const sessions = new Map();
  if (token) sessions.set('vdvoem.preview.token', token);
  const el = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        id, disabled:false, hidden:false, textContent:'',
        listeners:new Map(), children:[],
        addEventListener(type, handler) { this.listeners.set(type, handler); },
        append(child) { this.children.push(child); },
        setAttribute(name, value) { this[name] = value; }
      });
    }
    return elements.get(id);
  };
  const context = {
    document:{
      documentElement:{dataset:{}},
      getElementById:el,
      createElement:tag=>({
        tag, attrs:{},
        setAttribute(name,value){this.attrs[name]=value;}
      })
    },
    window:{ location:{ assign(url){ assigned.push(url); } } },
    location:{ search:'', pathname:'/secure-purchase.html' },
    history:{ replaceState(){} },
    URLSearchParams, setTimeout:()=>0,
    sessionStorage:{
      getItem:key=>sessions.get(key)??null,
      setItem:(key,value)=>sessions.set(key,value),
      removeItem:key=>sessions.delete(key)
    },
    localStorage:{
      getItem:key=>storage.get(key)??null,
      setItem:(key,value)=>storage.set(key,value),
      removeItem:key=>storage.delete(key)
    },
    navigator:{clipboard:{writeText:async()=>{}}},
    AbortSignal:{timeout:()=>({})},
    confirm:()=>false,
    fetch:async (url, options)=>{
      requests.push({url,options});
      if(url.endsWith('/api/account/status'))return {
        ok:!unauthorized,status:unauthorized?401:200,
        json:async()=>({signedIn:!unauthorized,paid})
      };
      if(url.endsWith('/health'))return healthFailed
        ? {ok:false,status:503,json:async()=>({})}
        : {ok:true,status:200,json:async()=>({checkout_mode:live?'live':'test',payments_enabled:live})};
      return {ok:true,json:async()=>({
        orderId:'987', claimToken:'example-token',
        paymentUrl:'https://payment.example/checkout'
      })};
    }
  };
  vm.runInNewContext(script, context, {filename:'secure-purchase.html',timeout:2000});
  return {el, requests, assigned, sessions};
}

async function settle(){for(let i=0;i<8;i++)await Promise.resolve();}

function checkoutCalls(requests){return requests.filter(x=>x.url.endsWith("/api/checkout"));}

function accountCalls(requests){return requests.filter(x=>x.url.endsWith("/api/account/status"));}

test('secure checkout initializes without runtime ReferenceError', () => {
  const {el} = boot();
  assert.equal(el('buy').disabled,true);
  assert.equal(el('telegramLogin').children.length,1);
  assert.equal(typeof el('buy').listeners.get('click'),'function');
});

test('guest cannot purchase or call checkout API', async () => {
  const {el,requests} = boot();
  await el('buy').listeners.get('click')();
  assert.equal(checkoutCalls(requests).length,0);
  assert.match(el('message').textContent,/Telegram/);
});

test('Telegram session is verified by backend before checkout', async () => {
  const token='a'.repeat(43);
  const {el,requests,assigned} = boot(token);
  assert.equal(el('buy').disabled,true);
  await settle();
  assert.equal(accountCalls(requests).length,1);
  assert.equal(el('buy').disabled,true);
  for(const id of ['offerAccepted','privacyRead']){
    await el('buy').listeners.get('click')();
    assert.equal(checkoutCalls(requests).length,0);
    el(id).checked=true;
    el('terms').listeners.get('change')();
  }
  assert.equal(el('buy').disabled,false);
  await el('buy').listeners.get('click')();
  assert.equal(checkoutCalls(requests).length,1);
  assert.equal(JSON.parse(checkoutCalls(requests)[0].options.body).termsVersion,'2026-11-23.1');
  assert.equal(checkoutCalls(requests)[0].options.headers.Authorization,'Bearer '+token);
  assert.deepEqual(assigned,['https://payment.example/checkout']);
});

test('existing paid account sees one access screen and no new checkout', async () => {
 const {el,requests} = boot('a'.repeat(43),{paid:true});
 await settle();
 assert.equal(el('result').hidden,false);
 assert.equal(el('buy').hidden,true);
 assert.equal(el('purchaseOffer').hidden,true);
 assert.equal(el('accountEntry').hidden,true);
 assert.equal(el('message').hidden,true);
 assert.equal(checkoutCalls(requests).length,0);
});

test('expired Telegram session is not treated as paid', async () => {
 const {el,requests,sessions}=boot('a'.repeat(43),{unauthorized:true});
 await settle();
 assert.equal(sessions.has('vdvoem.preview.token'),false);
 assert.equal(el('result').hidden,true);
 assert.equal(el('buy').disabled,true);
 assert.equal(el('telegramLogin').hidden,false);
 assert.equal(accountCalls(requests).length,1);
});

test('non-live backend never creates a checkout order for an authenticated buyer', async () => {
  const {el,requests,assigned}=boot('a'.repeat(43),{live:false});
  await settle();
  assert.equal(el('result').hidden,true);
  assert.equal(el('paymentNotice').hidden,false);
  assert.equal(el('buy').disabled,true);
  await el('buy').listeners.get('click')();
  assert.equal(checkoutCalls(requests).length,0);
  assert.equal(assigned.length,0);
});

test('status request failures are not misreported as live payments being disabled', async () => {
  const {el} = boot('a'.repeat(43),{healthFailed:true});
  await settle();
  assert.equal(el('paymentNotice').hidden,false);
  assert.match(el('paymentNotice').textContent,/Не удалось проверить возможность оплаты/);
  assert.doesNotMatch(el('paymentNotice').textContent,/Приём платежей пока не открыт/);
});
