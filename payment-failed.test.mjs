import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./payment-failed.html', import.meta.url), 'utf8');

test('Robokassa FailURL page allows checking an existing order', () => {
  assert.match(html, /<html lang="ru">/);
  assert.match(html, /href="\.\/secure-purchase\.html"/);
  assert.match(html, /href="\.\/secure-game\.html"/);
  assert.match(html, /href="mailto:gudush03@gmail\.com"/);
  assert.match(html, /не создавайте новую оплату/i);
});

test('FailURL page does not claim a payment is confirmed or collect payment data', () => {
  assert.doesNotMatch(html, /оплата подтверждена/i);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /robokassa_(?:test_)?password/i);
  assert.doesNotMatch(html, /<script\b/i);
});
