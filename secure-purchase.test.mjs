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


function boot(token = null) {
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
    confirm:()=>false,
    fetch:async (url, options)=>{
      requests.push({url,options});
      return {ok:true,json:async()=>({
        orderId:'987', claimToken:'example-token',
        paymentUrl:'https://payment.example/checkout'
      })};
    }
  };
  vm.runInNewContext(script, context, {filename:'secure-purchase.html',timeout:2000});
  return {el, requests, assigned, sessions};
}

test('secure checkout initializes without runtime ReferenceError', () => {
  const {el} = boot();
  assert.equal(el('buy').disabled,true);
  assert.equal(el('telegramLogin').children.length,1);
  assert.equal(typeof el('buy').listeners.get('click'),'function');
});

test('guest cannot purchase or call checkout API', async () => {
  const {el,requests} = boot();
  await el('buy').listeners.get('click')();
  assert.equal(requests.length,0);
  assert.match(el('message').textContent,/Telegram/);
});

test('Telegram session ties checkout to bearer token', async () => {
  const token='a'.repeat(43);
  const {el,requests,assigned} = boot(token);
  assert.equal(el('buy').disabled,false);
  await el('buy').listeners.get('click')();
  assert.equal(requests.length,1);
  assert.match(requests[0].url,/\/api\/checkout$/);
  assert.equal(requests[0].options.headers.Authorization,'Bearer '+token);
  assert.deepEqual(assigned,['https://payment.example/checkout']);
});
