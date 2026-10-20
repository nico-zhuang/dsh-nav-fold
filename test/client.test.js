import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from '../../turn-file-actions-plugin/node_modules/jsdom/lib/api.js';

const path = fileURLToPath(new URL('../lib/client.js', import.meta.url));
const panel = (name) => `<button class="_3WPZCG_panelRow" aria-label="${name}"><span class="_3WPZCG_panelGlyph">★</span><span class="_3WPZCG_panelTitle">${name}</span></button>`;
const navigation = (name = 'Plugins') => `<nav class="_3WPZCG_panelList" aria-label="Global panels">${panel(name)}${panel('Tasks')}</nav><div id="workspaces">Workspace and sessions</div>`;

function start(html = navigation(), savedState, savedOrder) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, { url: 'http://localhost/' });
  if (savedState) dom.window.localStorage.setItem('dsh-sidebar-nav-collapse', savedState);
  if (savedOrder) dom.window.localStorage.setItem('dsh-sidebar-nav-collapse:order', savedOrder);
  let bundle;
  const code = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
  assert.match(code, /window\.__ModuleLoader__\.load/, 'client bundle must exist');
  vm.runInNewContext(code, { window: Object.assign(dom.window, { __ModuleLoader__: { load: (value) => { bundle = value; } } }), document: dom.window.document, MutationObserver: dom.window.MutationObserver });
  assert.equal(bundle.id, 'dsh-sidebar-nav-collapse');
  const client = bundle.factory(() => { throw Error('unexpected dependency'); });
  const disposers = [];
  client.apply({ effect: (fn) => { disposers.push(fn()); } });
  return { dom, dispose: () => { for (const fn of disposers.reverse()) fn(); }, doc: dom.window.document };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('collapse is a keyboard-accessible icon strip scoped to global nav; workspace remains intact', () => {
  const { doc, dom, dispose } = start();
  const nav = doc.querySelector('nav');
  const toggle = nav.querySelector('button[data-sidebar-nav-toggle]');
  assert.ok(toggle);
  assert.equal(toggle.type, 'button');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.ok(toggle.getAttribute('aria-label'));
  assert.equal(nav.dataset.sidebarNavCollapsed, 'true');
  assert.equal(nav.nextElementSibling.id, 'workspaces');
  assert.equal(nav.querySelectorAll('button[class*="panelRow"]').length, 2);
  assert.equal(nav.querySelector('button[class*="panelRow"]').getAttribute('aria-label'), 'Plugins');
  const css = doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent;
  assert.match(css, /flex-wrap:\s*wrap/);
  assert.doesNotMatch(css, /overflow-x:\s*auto/);
  assert.match(css, /panelTitle/);
  assert.match(css, /panelGlyph/);
  assert.match(css, /data-sidebar-nav-collapsed/);
  toggle.click();
  assert.equal(nav.dataset.sidebarNavCollapsed, 'false');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(dom.window.localStorage.getItem('dsh-sidebar-nav-collapse'), 'expanded');
  dispose();
});

test('both states share a full-width slim top bar with a legible SVG icon', () => {
  const { doc, dispose } = start();
  const nav = doc.querySelector('nav');
  const toggle = nav.querySelector('[data-sidebar-nav-toggle]');
  const css = doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent;
  assert.match(css, /nav\[class\*="panelList"\]\[data-sidebar-nav-collapsed\][^{]*\{[^}]*position:\s*relative;[^}]*padding-top:\s*24px/);
  assert.match(css, /\[data-sidebar-nav-toggle\][^{]*\{[^}]*position:\s*absolute;[^}]*top:\s*0;[^}]*left:\s*0;[^}]*width:\s*100%;[^}]*height:\s*24px/);
  assert.match(css, /\[data-sidebar-nav-toggle\][^{]*\{[^}]*border:\s*0;[^}]*background:\s*transparent/);
  assert.match(css, /\[data-sidebar-nav-toggle\]::before[^}]*\{/);
  assert.match(css, /\[data-sidebar-nav-toggle\]::after[^}]*\{/);
  assert.match(css, /\[data-sidebar-nav-toggle\]\s+svg[^{]*\{[^}]*width:\s*14px;[^}]*height:\s*14px/);
  assert.equal(toggle.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
  const closedPath = toggle.querySelector('path')?.getAttribute('d');
  toggle.click();
  assert.equal(nav.querySelectorAll('[data-sidebar-nav-toggle]').length, 1);
  assert.notEqual(toggle.querySelector('path')?.getAttribute('d'), closedPath);
  assert.equal(nav.nextElementSibling.id, 'workspaces');
  dispose();
});

test('persistent choice, future panel entries and sidebar remount keep same state', async () => {
  const { doc, dom, dispose } = start();
  const nav = doc.querySelector('nav');
  nav.querySelector('[data-sidebar-nav-toggle]').click();
  nav.insertAdjacentHTML('beforeend', panel('Future plugin'));
  await flush();
  assert.equal(nav.dataset.sidebarNavCollapsed, 'false');
  assert.equal(nav.querySelectorAll('[data-sidebar-nav-toggle]').length, 1);
  nav.outerHTML = navigation('New plugin').replace('<div id="workspaces">Workspace and sessions</div>', '');
  await flush();
  const next = doc.querySelector('nav');
  assert.equal(next.dataset.sidebarNavCollapsed, 'false');
  assert.equal(next.querySelectorAll('[data-sidebar-nav-toggle]').length, 1);
  assert.equal(next.nextElementSibling.id, 'workspaces');
  dispose();
  const again = start(navigation(), dom.window.localStorage.getItem('dsh-sidebar-nav-collapse'));
  assert.equal(again.doc.querySelector('nav').dataset.sidebarNavCollapsed, 'false');
  again.dispose();
});

test('host replacing panel rows inside the same nav restores the toggle', async () => {
  const { doc, dispose } = start();
  const nav = doc.querySelector('nav');
  nav.replaceChildren(...[...nav.querySelectorAll('[class*="panelRow"]')].map(row => row.cloneNode(true)));
  await flush();
  assert.equal(nav.querySelectorAll('[data-sidebar-nav-toggle]').length, 1);
  assert.equal(nav.querySelector('[data-sidebar-nav-toggle]').getAttribute('aria-expanded'), 'false');
  nav.querySelector('[data-sidebar-nav-toggle]').click();
  assert.equal(nav.dataset.sidebarNavCollapsed, 'false');
  dispose();
});

test('collapsed icons show current localized names and restore original titles', async () => {
  const { doc, dispose } = start(`<nav class="_3WPZCG_panelList" aria-label="全局面板">${panel('插件')}${panel('记忆系统').replace('aria-label="记忆系统"', 'aria-label="记忆系统" title="old hint"')}</nav>`);
  const nav = doc.querySelector('nav');
  const rows = [...nav.querySelectorAll('[class*="panelRow"]')];
  assert.equal(rows[0].title, '插件');
  assert.equal(rows[1].title, '记忆系统');
  rows[0].setAttribute('aria-label', 'Plugins');
  await flush();
  assert.equal(rows[0].title, 'Plugins');
  const added = doc.createElement('button');
  added.className = '_3WPZCG_panelRow';
  added.setAttribute('aria-label', '新增面板');
  nav.append(added);
  await flush();
  assert.equal(added.title, '新增面板');
  nav.querySelector('[data-sidebar-nav-toggle]').click();
  assert.equal(rows[0].hasAttribute('title'), false);
  assert.equal(rows[1].title, 'old hint');
  rows[1].title = 'updated host hint';
  nav.append(doc.createElement('span'));
  await flush();
  assert.equal(rows[1].title, 'updated host hint');
  nav.querySelector('[data-sidebar-nav-toggle]').click();
  assert.equal(rows[1].title, '记忆系统');
  nav.querySelector('[data-sidebar-nav-toggle]').click();
  assert.equal(rows[1].title, 'updated host hint');
  dispose();
  assert.equal(added.hasAttribute('title'), false);
});

test('native drag shows a snap placeholder, persists order, and survives remount', async () => {
  const { doc, dom, dispose } = start();
  const nav = doc.querySelector('nav');
  const [first, second] = nav.querySelectorAll('[class*="panelRow"]');
  assert.equal(first.draggable, true);
  assert.equal(second.draggable, true);
  const transfer = { setData() {}, effectAllowed: '', dropEffect: '' };
  const event = (target, name, y = 0) => {
    const e = new dom.window.Event(name, { bubbles: true, cancelable: true });
    Object.defineProperties(e, { dataTransfer: { value: transfer }, clientY: { value: y }, clientX: { value: 2 } });
    target.dispatchEvent(e);
    return e;
  };
  first.getBoundingClientRect = () => ({ top: 0, bottom: 36, left: 0, right: 36, width: 36, height: 36 });
  event(second, 'dragstart');
  assert.equal(transfer.effectAllowed, 'move');
  assert.equal(event(first, 'dragover', 4).defaultPrevented, true);
  assert.equal(first.dataset.sidebarDrop, 'before');
  assert.equal(event(first, 'drop', 4).defaultPrevented, true);
  assert.equal(first.style.order, '2');
  assert.equal(second.style.order, '1');
  assert.equal(second.hasAttribute('data-sidebar-drop'), false);
  const saved = dom.window.localStorage.getItem('dsh-sidebar-nav-collapse:order');
  assert.deepEqual(JSON.parse(saved), ['Tasks', 'Plugins']);
  nav.querySelector('[data-sidebar-nav-toggle]').click();
  assert.equal(second.style.order, '1');
  const css = doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent;
  assert.match(css, /data-sidebar-drop="before"/);
  assert.match(css, /box-shadow/);
  assert.match(css, /prefers-reduced-motion/);
  dispose();
  assert.equal(first.draggable, false);
  assert.equal(first.style.order, '');
  const again = start(navigation(), undefined, saved);
  const [a, b] = again.doc.querySelectorAll('[class*="panelRow"]');
  assert.equal(a.style.order, '2');
  assert.equal(b.style.order, '1');
  again.dispose();
});

test('keyboard reorder, future entries, and canceled drag cleanly update order', async () => {
  const { doc, dom, dispose } = start();
  const nav = doc.querySelector('nav');
  const [first, second] = nav.querySelectorAll('[class*="panelRow"]');
  const key = new dom.window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, altKey: true, key: 'ArrowRight' });
  first.dispatchEvent(key);
  assert.equal(key.defaultPrevented, true);
  assert.equal(first.style.order, '2');
  assert.equal(second.style.order, '1');
  nav.insertAdjacentHTML('beforeend', panel('New panel'));
  await flush();
  const added = nav.querySelector('[aria-label="New panel"]');
  assert.equal(added.draggable, true);
  assert.equal(added.style.order, '3');
  nav.querySelector('[data-sidebar-nav-toggle]').click();
  first.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, altKey: true, key: 'ArrowUp' }));
  assert.equal(first.style.order, '1');
  assert.equal(second.style.order, '2');
  const e = new dom.window.Event('dragstart', { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'dataTransfer', { value: { setData() {}, effectAllowed: '' } });
  second.dispatchEvent(e);
  second.dispatchEvent(new dom.window.Event('dragend', { bubbles: true }));
  assert.equal(nav.querySelector('[data-sidebar-dragging]'), null);
  dispose();
});

test('host disable removes button, style, nav state and observer', async () => {
  const { doc, dispose } = start();
  const nav = doc.querySelector('nav');
  dispose();
  assert.equal(doc.querySelector('[data-sidebar-nav-toggle]'), null);
  assert.equal(doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]'), null);
  assert.equal(nav.hasAttribute('data-sidebar-nav-collapsed'), false);
  doc.body.insertAdjacentHTML('beforeend', navigation('Late plugin'));
  await flush();
  assert.equal(doc.querySelectorAll('[data-sidebar-nav-toggle]').length, 0);
});

test('Chinese nav label also matched without touching unrelated nav', () => {
  const { doc, dispose } = start(`<nav class="_3WPZCG_panelList" aria-label="全局面板">${panel('插件')}</nav><div id="workspaces">sessions</div><nav class="_3WPZCG_panelList" aria-label="Local">${panel('Local')}</nav>`);
  assert.equal(doc.querySelectorAll('[data-sidebar-nav-toggle]').length, 1);
  assert.equal(doc.querySelector('[aria-label="Local"]').hasAttribute('data-sidebar-nav-collapsed'), false);
  dispose();
});
