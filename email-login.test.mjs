import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('./email-login.js',import.meta.url),'utf8');
function control(value='') {
  return {
    value, hidden:true, disabled:false, focus(){},
    listeners:new Map(),
    addEventListener(type,fn){this.listeners.set(type,fn);},
    querySelector(){return null}
  };
}
async function boot(enabled,authenticated=false) {
  const element=control();
  const form=control(),verify=control(),email=control('me@example.com');
  const code=control('123456'),message=control();
  element.querySelector=sel=>({
    '[data-email-form]':form,'[data-email-verify]':verify,
    '[data-email-message]':message,'[data-email-address]':email,
    '[data-email-code]':code
  })[sel];
  const submitButton=control();
  form.querySelector=()=>submitButton;
  verify.querySelector=()=>submitButton;
  const session=new Map();
  if(authenticated)session.set('vdvoem.preview.token','x'.repeat(43));
  const requests=[];
  let reloaded=false;
  const context={
    document:{querySelectorAll(){return [element];}},
    sessionStorage:{
      getItem:k=>session.get(k)||null,
      setItem:(k,v)=>session.set(k,v)
    },
    location:{reload(){reloaded=true;}},
    AbortSignal,
    fetch:async(url,opts)=>{
      requests.push({url,opts});
      if(url.endsWith('/api/auth/providers'))return {ok:true,json:async()=>({email:enabled})};
      if(url.endsWith('/api/auth/email/start'))return {ok:true,json:async()=>({challengeId:'a'.repeat(24)})};
      if(url.endsWith('/api/auth/email/verify'))return {ok:true,json:async()=> authenticated?{linked:true}:{token:'b'.repeat(43)}};
      throw Error('Unexpected request');
    }
  };
  vm.runInNewContext(source,context,{timeout:2000});
  await new Promise(resolve=>setImmediate(resolve));
  return {element,form,verify,email,code,message,session,requests,reloaded:()=>reloaded};
}
test('email option is invisible when provider has not been configured',async()=>{
  const x=await boot(false);
  assert.equal(x.element.hidden,true);
  assert.equal(x.requests.length,1);
});
test('email option is only revealed when backend enables delivery',async()=>{
  const x=await boot(true);
  assert.equal(x.element.hidden,false);
  assert.ok(x.form.listeners.has('submit'));
});
test('verified email login starts browser session',async()=>{
  const x=await boot(true);
  await x.form.listeners.get('submit')({preventDefault(){}});
  assert.equal(x.verify.hidden,false);
  await x.verify.listeners.get('submit')({preventDefault(){}});
  assert.equal(x.session.get('vdvoem.preview.token'),'b'.repeat(43));
  assert.equal(x.session.get('vdvoem.preview.telegram'),'email:me@example.com');
  assert.equal(x.reloaded(),true);
});
test('email linking reuses Telegram session instead of creating a second account',async()=>{
  const x=await boot(true,true);
  await x.form.listeners.get('submit')({preventDefault(){}});
  await x.verify.listeners.get('submit')({preventDefault(){}});
  assert.equal(x.reloaded(),false);
  assert.equal(x.session.get('vdvoem.preview.token'),'x'.repeat(43));
  assert.match(x.message.textContent,/привязана/);
  assert.equal(x.requests[1].opts.headers.Authorization,'Bearer '+'x'.repeat(43));
  assert.equal(x.requests[2].opts.headers.Authorization,'Bearer '+'x'.repeat(43));
});
