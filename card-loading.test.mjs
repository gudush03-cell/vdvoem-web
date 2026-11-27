import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const js=readFileSync(new URL('./app-secure.js',import.meta.url),'utf8');
const html=readFileSync(new URL('./secure-game.html',import.meta.url),'utf8');

function section(from,to) {
  const start=js.indexOf(from);
  const end=js.indexOf(to,start+from.length);
  assert.ok(start>=0&&end>start,from+' must exist');
  return js.slice(start,end);
}

test('loading state prevents accidental paid-card turn changes',()=>{
  const render=section('async function render(){','function advance(');
  assert.match(render,/cardLoading=true;cardLoadFailed=false/);
  assert.match(render,/\$\('nextCard'\)\.disabled=true/);
  assert.match(render,/\$\('skipButton'\)\.disabled=true/);
  assert.match(render,/\$\('cardBody'\)\.replaceChildren\(\)/);
  assert.match(render,/\$\('nextCard'\)\.disabled=false/);
  const advance=section('function advance(','function skip(');
  assert.match(advance,/cardLoading\|\|cardLoadFailed/);
  const skip=section('function skip(','async function scene(');
  assert.match(skip,/cardLoading\|\|cardLoadFailed/);
});

test('a failed card fetch offers a retry without advancing or consuming a skip',()=>{
  const render=section('async function render(){','function advance(');
  assert.match(render,/cardLoadFailed=true/);
  assert.match(render,/Повторить загрузку/);
  assert.match(render,/\$\('nextCard'\)\.disabled=false/);
  const wire=section('function wire(){','populate();wire();');
  assert.match(wire,/cardLoadFailed\?render\(\):advance\(false\)/);
});

test('secure game cache-busts the script after controls update',()=>{
  assert.match(html,/app-secure\.js\?v=8/);
});
