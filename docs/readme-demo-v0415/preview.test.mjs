import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const preview = fileURLToPath(new URL('./preview.html', import.meta.url));
const colors = ['none', '#72cada', '#80afff', '#b09aff', '#cf9ceb', '#b2bac8'];

for (const mode of ['desktop', 'mobile']) test(`${mode} synthetic organizer preserves Host single-row six-swatch menu`, () => {
  const { window } = new JSDOM(readFileSync(preview, 'utf8'), { runScripts: 'dangerously', url: 'file:///synthetic-menu.html' });
  const doc = window.document;
  assert.match(doc.body.textContent, /匿名合成/);
  assert.match(doc.body.textContent, /虚构会话/);
  assert.match(doc.body.textContent, /非真实 DSH 录屏/);
  assert.equal(doc.querySelector('[data-menu]').children.length, 4, 'two actions, color group, and custom footer');
  assert.deepEqual([...doc.querySelectorAll('[data-preset]')].map((swatch) => swatch.dataset.preset), colors);
  assert.equal(window.getComputedStyle(doc.querySelector('[data-menu]')).width, '214px');
  assert.equal(window.getComputedStyle(doc.querySelector('[data-color-grid]')).gridTemplateColumns, 'repeat(6, 30px)');
  assert.deepEqual([...doc.querySelectorAll('[data-preset]:not([data-preset="none"])')].map((swatch) => swatch.style.getPropertyValue('--swatch').trim()), colors.slice(1));
  assert.ok(doc.querySelector('[data-preset="none"] svg'), 'no color is a real icon');
  assert.ok(doc.querySelector('[data-custom-use] [data-custom-dot]'), 'saved custom color has a one-click reuse action');
  assert.ok(doc.querySelector('[data-custom-edit] svg'), 'separate edit action uses a pen icon');
  assert.equal(window.getComputedStyle(doc.querySelector('[data-row-stripe]')).width, '3px');
  assert.match(doc.querySelector('[data-menu]').textContent, /固定在顶部.*免打扰.*色标.*使用自定义颜色/s);
  window.close();
});

test('renderer and intended outputs stay new and reproducible', () => {
  const source = readFileSync(new URL('./render-stills.mjs', import.meta.url), 'utf8');
  assert.match(source, /readme-v0415/);
  assert.match(source, /organize-menu-mobile\.webp/);
  assert.match(source, /organize-menu\.webp/);
  assert.doesNotMatch(source, /readme-v0414/);
});
