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
 assert.match(home,/код активации не нужен/i);
 assert.match(home,/при следующем входе используйте тот же Telegram-аккаунт/);
 assert.doesNotMatch(home,/Где получить код\?|Введите тот же код|доступ по личному коду|тестовая оплата|тестовой покупке|Тестовый режим/);
 assert.doesNotMatch(game,/старый код покупки|Привязать существующий код покупки|loginForm|accessCode/);
});

test('FAQ and seller notice match the offer and linked privacy policy',()=>{
 assert.match(home,/499 ₽/);
 assert.match(home,/Robokassa/);
 assert.match(home,/href="\.\/offer\.html#refund"/);
 assert.match(home,/href="\.\/privacy\.html"/);
 assert.doesNotMatch(home,/Гудушаури Даниил Николаевич/);
 assert.doesNotMatch(home,/231216001846/);
 assert.match(offer,/Гудушаури Даниил Николаевич/);
 assert.match(offer,/231216001846/);
 assert.match(privacy,/Telegram ID/);
 assert.match(offer,/499 ₽ на сайте/);
 assert.match(offer,/Подтверждённая покупка Robokassa или Telegram Stars/);
 assert.match(offer,/Telegram ID/);
 assert.match(offer,/\.\/privacy\.html/);
 assert.match(privacy,/Политика обработки персональных данных/);
 assert.match(home,/class="faq-accordion"/);
 assert.match(home,/id="faq-answer-6"/);
});

test('home header has the requested guest links and one signed-in action',()=>{
 const nav=home.match(/<nav aria-label="Навигация" class="header-nav">([\s\S]*?)<\/nav>/)?.[1]||'';
 assert.match(nav,/href="#decks">Колоды<\/a>[\s\S]*href="#rules">Правила<\/a>[\s\S]*href="#box">Коробка<\/a>[\s\S]*data-start-demo[^>]*>Попробовать 6 карт/);
 assert.match(nav,/data-owner class="header-cta" href="\.\/secure-game\.html\?resume=1">Продолжить/);
 assert.match(home,/\.header-nav \.nav-info[\s\S]*\.header-nav \[data-start-demo\]\{display:none!important\}/);
 assert.match(home,/html\[data-account="paid"\] #siteHeader \[data-owner\]\{display:none!important\}/);
 assert.match(home,/html\[data-account="paid"\] \.evening-entry\{display:block!important\}/);
 assert.match(home,/html\[data-account="member"\] \.evening-entry\{display:none!important\}/);
 assert.match(home,/href="\.\/secure-game\.html\?resume=1">Продолжить/);
 assert.doesNotMatch(home,/Снова вечер вдвоём|Все 10 колод уже ваши/);
 assert.match(home,/class="account-verified">✓ Telegram подтверждён/);
 assert.match(home,/html:is\(\[data-account="paid"\],\[data-account="member"\]\) \.account-verified\{display:inline-flex!important\}/);
 assert.doesNotMatch(home,/<span id="homeAccountStatus"[^>]*><\/span>/);
});

test('free demo header uses the brand logo and a home action',()=>{
 assert.match(home,/<div class="game-top"><a class="game-brand" href="#top"[^>]*><img src="\.\/brand\.png"/);
 assert.match(home,/<button aria-label="На главную" class="demo-home" id="closeDemo"[^>]*>На главную<\/button>/);
});

test('subpages keep only a home route in their headers',()=>{
 for(const page of [purchase,offer,privacy]) assert.match(page,/href="(?:\.\/index\.html|https:\/\/vdvoemnalegke\.online\/)"[^>]*>На главную|brand-image" href="\.\/index\.html"/);
 assert.match(purchase,/max-width:\s*700px/);
 assert.match(purchase,/class="purchase-top"/);
 assert.match(purchase,/<a class="home-link" href="\.\/index\.html">На главную<\/a>/);
 assert.match(privacy,/width:min\(calc\(100% - 48px\),1120px\)/);
 assert.match(privacy,/family=Prata/);
 assert.match(privacy,/class="hero-logo" src="\.\/brand\.png"/);
 assert.match(privacy,/ИГРА МЕЖДУ НАМИ · ПОЛИТИКА ДАННЫХ/);
 assert.match(privacy,/--rose:#f49dbb/);
});

test('checkout only enables live payments or explicitly labelled test mode',()=>{
 assert.match(purchase,/\/health/);
 assert.match(purchase,/checkoutMode==='test'\|\|\(checkoutMode==='live'&&status\.payments_enabled===true\)/);
 assert.match(purchase,/status\.payments_enabled===true/);
 assert.match(purchase,/ТЕСТОВЫЙ режим Robokassa: проверяем оплату, реальные списания не выполняются/);
 assert.match(purchase,/if\(!await refreshPaymentAvailability\(\)\)/);
});

test('FAQ payment steps do not claim that live checkout is closed',()=>{
 assert.match(home,/Войдите через Telegram, примите оферту/);
 assert.match(home,/завершите платёж на странице Robokassa/);
 assert.doesNotMatch(home,/Пока приём реальных платежей не включён/);
});

test('old public routes redirect to the current Telegram account flow',()=>{
 assert.match(oldGame,/location\.replace\(next\.href\)/);
 assert.match(oldGame,/secure-game\.html/);
 assert.match(oldPurchase,/location\.replace\(next\.href\)/);
 assert.match(oldPurchase,/secure-purchase\.html/);
});
