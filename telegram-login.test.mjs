import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./telegram-login.js', import.meta.url), 'utf8');

function boot({enabled = false, configError = false} = {}) {
  const calls = [];
  class Element {
    constructor(tag) { this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.style={};this.label={textContent:''}; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children=[...children]; }
    setAttribute(name,value) { this.attributes[name]=value; }
    addEventListener(name,handler) { this.listeners[name]=handler; }
    querySelector() { return this.label; }
  }
  const container=new Element('div');
  const document={
    head:new Element('head'),
    createElement:tag=>new Element(tag),
    getElementById:id=>id==='telegram-oidc-button-style'?null:null
  };
  const login={
    init(options,callback){calls.push({type:'init',options,callback});},
    open(){calls.push({type:'open'});}
  };
  const context={
    window:{Telegram:{Login:login}},document,
    fetch:async url=>{
      calls.push({type:'fetch',url});
      if(configError)return {ok:false,status:503,json:async()=>({})};
      return {ok:true,json:async()=>enabled
        ? {enabled:true,clientId:'123456789',nonce:'n'.repeat(43)}
        : {enabled:false}};
    },
    AbortSignal:{timeout:()=>({})},
    Promise
  };
  vm.runInNewContext(source,context,{filename:'telegram-login.js',timeout:2000});
  return {api:context.window.VdvoemTelegramLogin,container,calls};
}

test('legacy Telegram widget stays active until OIDC is explicitly configured', async()=>{
  const {api,container}=boot();
  const mode=await api.mount(container,{apiBase:'https://api.example',legacyCallbackName:'onLogin'});
  assert.equal(mode,'legacy');
  assert.equal(container.children.length,1);
  assert.equal(container.children[0].src,'https://telegram.org/js/telegram-widget.js?22');
  assert.equal(container.children[0].attributes['data-onauth'],'onLogin(user)');
});

test('OIDC login uses a fresh server nonce and opens Telegram only from the button tap', async()=>{
  const {api,container,calls}=boot({enabled:true});
  let authenticated=null;
  assert.equal(await api.mount(container,{
    apiBase:'https://api.example',buttonLabel:'Войти через Telegram',legacyCallbackName:'onLogin',
    onAuth:result=>{authenticated=result;}
  }),'oidc');
  const init=calls.find(call=>call.type==='init');
  assert.equal(init.options.client_id,'123456789');
  assert.deepEqual(Array.from(init.options.scope),['profile']);
  assert.equal(init.options.nonce,'n'.repeat(43));
  assert.equal(container.children[0].className,'telegram-oidc-button');
  container.children[0].listeners.click();
  assert.equal(calls.at(-1).type,'open');
  const tokenResult={id_token:'signed-id-token',user:{id:123456789,preferred_username:'buyer'}};
  init.callback(tokenResult);
  assert.equal(authenticated,tokenResult);
});

test('Telegram login configuration failures are visible and never silently fall back', async()=>{
  const {api,container}=boot({configError:true});
  let error=null;
  const mode=await api.mount(container,{apiBase:'https://api.example',legacyCallbackName:'onLogin',onError:value=>{error=value;}});
  assert.equal(mode,'error');
  assert.match(error.message,/настройки входа/);
  assert.equal(container.children.length,0);
});
