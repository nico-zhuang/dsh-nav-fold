import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from '../../turn-file-actions-plugin/node_modules/jsdom/lib/api.js';

const path = fileURLToPath(new URL('../lib/client.js', import.meta.url));
const panel = (name) => `<button class="_3WPZCG_panelRow" aria-label="${name}"><span class="_3WPZCG_panelGlyph">★</span><span class="_3WPZCG_panelTitle">${name}</span></button>`;
const navigation = (name = 'Plugins') => `<nav class="_3WPZCG_panelList" aria-label="Global panels">${panel(name)}${panel('Tasks')}</nav><div id="workspaces">Workspace and sessions</div>`;

function start(html = navigation(), savedState) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, { url: 'http://localhost/' });
  if (savedState) dom.window.localStorage.setItem('dsh-sidebar-nav-collapse', savedState);
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
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /white-space:\s*nowrap/);
  assert.match(css, /panelTitle/);
  assert.match(css, /panelGlyph/);
  assert.match(css, /data-sidebar-nav-collapsed/);
  toggle.click();
  assert.equal(nav.dataset.sidebarNavCollapsed, 'false');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(dom.window.localStorage.getItem('dsh-sidebar-nav-collapse'), 'expanded');
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
