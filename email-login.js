(() => {
  'use strict';
  const host='https://perceptive-patience-production-79bfb421.up.railway.app';
  const containers=[...document.querySelectorAll('[data-email-auth]')];
  if(!containers.length)return;
  const tokenKey='vdvoem.preview.token';
  const userKey='vdvoem.preview.telegram';

  async function request(path,body,token) {
    const response=await fetch(host+path,{
      method:'POST',cache:'no-store',
      headers:{
        'Content-Type':'application/json',
        ...(token?{Authorization:'Bearer '+token}:{})
      },
      body:JSON.stringify(body),
      signal:AbortSignal.timeout(15000)
    });
    const json=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(json.error||'Не удалось выполнить запрос.');
    return json;
  }

  async function revealIfReady() {
    try {
      const response=await fetch(host+'/api/auth/providers',{
        cache:'no-store',signal:AbortSignal.timeout(8000)
      });
      if(!response.ok)return;
      const features=await response.json();
      if(features.email!==true)return;
    } catch { return; }

    for(const container of containers) {
      container.hidden=false;
      const form=container.querySelector('[data-email-form]');
      const verify=container.querySelector('[data-email-verify]');
      const message=container.querySelector('[data-email-message]');
      const address=container.querySelector('[data-email-address]');
      const code=container.querySelector('[data-email-code]');
      let pending=null;
      form.addEventListener('submit',async event=>{
        event.preventDefault();
        if(pending)return;
        const button=form.querySelector('button[type=submit]');
        button.disabled=true;
        message.textContent='Отправляем код…';
        try {
          const token=sessionStorage.getItem(tokenKey);
          const result=await request('/api/auth/email/start',
            {email:address.value.trim()},token);
          if(!result.challengeId)throw Error('Не удалось создать проверку.');
          pending=result.challengeId;
          verify.hidden=false;
          message.textContent='Код отправлен на почту. Он действует 10 минут.';
          code.focus();
        } catch(error) {
          message.textContent=error.message||'Не удалось отправить код.';
        } finally {button.disabled=false;}
      });
      verify.addEventListener('submit',async event=>{
        event.preventDefault();
        if(!pending)return;
        const button=verify.querySelector('button[type=submit]');
        button.disabled=true;
        message.textContent='Проверяем код…';
        try {
          const token=sessionStorage.getItem(tokenKey);
          const result=await request('/api/auth/email/verify',{
            email:address.value.trim(),
            challengeId:pending,
            code:code.value.trim()
          },token);
          if(result.linked===true) {
            message.textContent='Почта успешно привязана к вашему аккаунту.';
            pending=null;
            verify.hidden=true;
          } else if(/^[A-Za-z0-9_-]{43}$/.test(result.token||'')) {
            sessionStorage.setItem(tokenKey,result.token);
            sessionStorage.setItem(userKey,'email:'+address.value.trim().toLowerCase());
            location.reload();
          } else throw Error('Сервер не подтвердил вход.');
        } catch(error) {
          message.textContent=error.message||'Неверный или просроченный код.';
        } finally {button.disabled=false;}
      });
    }
  }
  void revealIfReady();
})();
