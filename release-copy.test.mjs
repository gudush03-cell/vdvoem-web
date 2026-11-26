import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const content=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const home=content('./index.html');
const game=content('./secure-game.html');
const purchase=content('./secure-purchase.html');
const offer=content('./offer.html');
const privacy=content('./privacy.html');
const oldGame=content('./game.html');
const oldPurchase=content('./purchase.html');

test('public copy uses Telegram-linked entitlement, not purchase codes',()=>{
 assert.match(home,/Как получить доступ к игре\?/);
 assert.match(home,/Код не нужен/);
 assert.match(home,/В следующий раз просто войдите через тот же аккаунт/);
 assert.doesNotMatch(home,/Где получить код\?|Введите тот же код|доступ по личному коду|тестовая оплата|тестовой покупке|Тестовый режим/);
 assert.doesNotMatch(game,/старый код покупки|Привязать существующий код покупки|loginForm|accessCode/);
});

test('FAQ and seller notice match the offer and linked privacy policy',()=>{
 assert.match(home,/499 ₽/);
 assert.match(home,/Robokassa/);
 assert.match(home,/href="\.\/offer\.html#refund"/);
 assert.match(home,/href="\.\/privacy\.html"/);
 assert.match(home,/Гудушаури Даниил Николаевич/);
 assert.match(home,/231216001846/);
 assert.match(home,/Telegram ID/);
 assert.match(offer,/Стоимость полного доступа — 499 ₽/);
 assert.match(offer,/\.\/privacy\.html/);
 assert.match(privacy,/Политика обработки персональных данных/);
 assert.match(home,/class="faq-accordion"/);
 assert.match(home,/id="faq-answer-6"/);
});

test('checkout only enables live payments or explicitly labelled test mode',()=>{
 assert.match(purchase,/\/health/);
 assert.match(purchase,/checkoutMode==='test'\|\|\(checkoutMode==='live'&&status\.payments_enabled===true\)/);
 assert.match(purchase,/status\.payments_enabled===true/);
 assert.match(purchase,/ТЕСТОВЫЙ режим Robokassa: проверяем оплату, реальные списания не выполняются/);
 assert.match(purchase,/if\(!await refreshPaymentAvailability\(\)\)/);
});

test('old public routes redirect to the current Telegram account flow',()=>{
 assert.match(oldGame,/location\.replace\(next\.href\)/);
 assert.match(oldGame,/secure-game\.html/);
 assert.match(oldPurchase,/location\.replace\(next\.href\)/);
 assert.match(oldPurchase,/secure-purchase\.html/);
});
