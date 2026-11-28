import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const js=readFileSync(new URL('./app-secure.js',import.meta.url),'utf8');
const html=readFileSync(new URL('./secure-game.html',import.meta.url),'utf8');

test('browsing account decks never starts a game session',()=>{
  const start=js.indexOf('async function accountGame()');
  const end=js.indexOf('window.onTelegramAuth=',start);
  assert.ok(start>=0&&end>start);
  const functionBody=js.slice(start,end);
  assert.ok(!functionBody.includes('await enterParty()'));
  assert.match(functionBody,/\/api\/account\/manifest/);
  assert.doesNotMatch(js,/enterParty|\/api\/party\/start/,
    'Card access must not depend on acquiring an exclusive party lease');
});

test('temporary server failures never silently erase the session',()=>{
  const start=js.indexOf('async function restore()');
  const end=js.indexOf('let selected=',start);
  const restore=js.slice(start,end);
  assert.match(restore,/if\(e.status===401\)/,
    'Only expired or revoked sessions clear the session');
  assert.match(restore,/Проверьте интернет и обновите страницу/);
});

test('public paid game copy describes account access, not codes',()=>{
  assert.match(html,/app-secure\.js\?v=[0-9]+/);
  assert.ok(!html.includes('личный код после покупки'));
  assert.ok(!html.includes('После покупки, личный код'));
  assert.ok(!html.includes('Без регистрации, подписки и обязательного Telegram'));
});

test('the secure-game header has only a home route while account login stays in the page',()=>{
 const header=html.split('<header class="top">')[1]?.split('</header>')[0]||'';
 assert.match(header,/href="\.\/index\.html">На главную/);
 assert.doesNotMatch(header,/Колоды|Правила|Коробка|headerLoginLink|headerAccountBadge/);
 assert.match(header,/id="headerTelegramVerified"[^>]*hidden><svg/);
 assert.match(js,/if\(verified\)verified\.hidden=!accountVerified/);
 assert.match(html,/id="loginView"/);
 assert.match(js,/accountVerified=status\.signedIn===true/);
});

test('only skip action has a stop icon, turn action is concise',()=>{
 const play=html.split('id="playView"')[1]?.split('id="finishView"')[0]||'';
 assert.equal((play.match(/🛑/g)||[]).length,1);
 assert.match(play,/<strong>Девушка<\/strong>/);
 assert.match(play,/<strong>Парень<\/strong>/);
 assert.match(play,/id="turnName">Девушка<\/strong>/);
 assert.match(js,/'Следующая карта'/);
 assert.doesNotMatch(js,/Ответили: передать ход|Передать ход/);
 assert.match(play,/id="backLobby">‹ Назад</);
 assert.match(play,/href="\.\/index\.html">На главную/);
 assert.match(play,/id="gameRulesButton">Правила/);
 assert.match(js,/header\.hidden=id==='playView'/);
});

test('paid cards are available from multiple signed-in devices',()=>{
 assert.doesNotMatch(js,/enterParty|e\.status!==409/);
 assert.match(js,/api\('\/api\/account\/card',\{deck,index\}\)/);
});
