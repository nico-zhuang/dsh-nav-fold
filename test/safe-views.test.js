import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';

const source = fs.readFileSync(fileURLToPath(new URL('../lib/client.js', import.meta.url)), 'utf8');
const html = `<div class="kB3qhq_root"><nav class="_3WPZCG_panelList" aria-label="Global panels"><button class="_3WPZCG_panelRow" aria-label="Plugins"><span class="_3WPZCG_panelGlyph">★</span><span class="_3WPZCG_panelTitle">Plugins</span></button></nav><div class="kB3qhq_regionArea" id="workspaces">Native workspace tree</div><div class="kB3qhq_footArea"></div></div>`;
const native = (rawScoped = false) => ({ options: rawScoped ? {} : { name: 'sidebar.workspaces' }, registrant: 'Gb', locale: 'workspace', children: { 'sidebar.workspaces.directoryFlow': { kind: 'list' }, 'sidebar.workspaces.session.menu.item': { kind: 'list' }, 'sidebar.workspaces.session.row.action': { kind: 'list' }, 'sidebar.session.row.leading': { kind: 'list' }, 'sidebar.session.row.hover': { kind: 'list' } } });
// Installed DSH 0.2.2-rc.1: ui-workspace/lib/client.js:6050-6079; menu.item now belongs to contextMenu.content.
const nativeRc1 = (rawScoped = false) => ({ options: rawScoped ? {} : { name: 'sidebar.workspaces' }, registrant: 'tk', locale: 'workspace', children: {
  'sidebar.workspaces.directoryFlow': { kind: 'single', scope: 'root' },
  'sidebar.workspaces.session.row.action': { kind: 'list', scope: 'root' },
  'sidebar.session.row.leading': { kind: 'list', scope: 'root', inline: true },
  'sidebar.session.row.trailing': { kind: 'list', scope: 'root', inline: true },
  'sidebar.session.row.hover': { kind: 'list', scope: 'root' },
} });
const flush = async () => { await Promise.resolve(); await new Promise(resolve => setTimeout(resolve, 0)); };

function mount({ savedOn = false, active = false, peers = [], status = 'ready', syncCallbacks = false, nativePresent = true, nativeBuild = 'rc5', nativeOverride = null, folded = false, mode = 'workspace', uiWorkspace = {}, rawScoped = false } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url: 'http://localhost/' });
  if (savedOn) dom.window.localStorage.setItem('dsh-nav-fold:workspace-tabs', 'on');
  if (folded) dom.window.localStorage.setItem('dsh-nav-fold:workspace-tabs-collapsed', 'true');
  if (mode !== 'workspace') dom.window.localStorage.setItem('dsh-nav-fold:workspace-mode', mode);
  const listeners = new Set();
  const form = {
    snapshot: { status, value: { workspaceViewsEnabled: active, hideBrandEnabled: false }, writable: true, revision: 1 },
    setCalls: [],
    getSnapshot() { return this.snapshot; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async set(field, value) { assert.ok(['workspaceViewsEnabled', 'hideBrandEnabled', 'navigationEnabled'].includes(field)); this.setCalls.push([field, value]); this.publishValue({ [field]: value }); return true; },
    publishValue(changes) { this.snapshot = { ...this.snapshot, status: 'ready', value: { ...this.snapshot.value, ...changes }, revision: this.snapshot.revision + 1 }; for (const fn of listeners) fn(); },
    publish(value) { this.publishValue({ workspaceViewsEnabled: value }); },
    setStatus(status) { this.snapshot = { ...this.snapshot, status, revision: this.snapshot.revision + 1 }; for (const fn of listeners) fn(); },
  };
  const nativeEntries = new Set();
  const nativeFactory = nativeBuild === 'rc1' ? nativeRc1 : native;
  const entries = [...(nativePresent ? [nativeOverride || nativeFactory(rawScoped)] : []), ...peers];
  if (nativePresent) nativeEntries.add(entries[0]);
  const settingsPages = new Map();
  const changes = new Set();
  let notificationCount = 0;
  const notify = () => { for (const fn of changes) { if (syncCallbacks) { assert.ok(++notificationCount < 30, 'slot callback loop'); fn(); } else queueMicrotask(fn); } };
  const slots = {
    spec(name) { return name === 'sidebar.workspaces' ? { kind: 'single', scope: 'root' } : null; },
    entries(name) { return name === 'sidebar.workspaces' ? [...entries] : []; },
    entriesOfSlot(name) { return this.entries(name).sort((a, b) => (a.options.priority ?? 0) - (b.options.priority ?? 0)); },
    subscribe(name, callback) { if (name === 'sidebar.workspaces') changes.add(callback); return () => changes.delete(callback); },
    inject(_name, fn) { return fn(); },
    register(options, component) { const entry = { options: { ...(rawScoped && options.name === 'sidebar.workspaces' ? {} : { name: options.name }), priority: options.priority }, component, registrant: options.registrant, children: options.children, locale: options.locale }; if (options.name === 'plugins.bundle.config') settingsPages.set(options.key, component); if (options.name === 'sidebar.workspaces') { entries.push(entry); notify(); } return () => { settingsPages.delete(options.key); const index = entries.indexOf(entry); if (index >= 0) { entries.splice(index, 1); notify(); } }; },
    addNative() { const entry = nativeFactory(rawScoped); nativeEntries.add(entry); entries.push(entry); notify(); },
    addPeer(registrant = 'another-sidebar', priority = 50) { const entry = { options: { ...(rawScoped ? {} : { name: 'sidebar.workspaces' }), priority }, registrant }; entries.push(entry); notify(); return entry; },
    removePeer(registrant = 'another-sidebar') { const index = entries.findIndex(entry => entry.registrant === registrant && !nativeEntries.has(entry)); if (index >= 0) { entries.splice(index, 1); notify(); } },
  };
  let bundle;
  vm.runInNewContext(source, { window: Object.assign(dom.window, { __ModuleLoader__: { load: (value) => { bundle = value; } } }), document: dom.window.document, MutationObserver: dom.window.MutationObserver, Error });
  const client = bundle.factory((id) => id === 'react' ? React : id === '@deepseek-ai/dsh-client-ui-primitives'
    ? {
      StateDot: ({ state }) => React.createElement('i', { 'data-dsh-state-dot': state }),
      Menu: ({ anchor, children, open, onClose }) => React.createElement('span', null, anchor,
        open && React.createElement('div', { role: 'menu', onKeyDown: event => { if (event.key === 'Escape') onClose(); } }, children)),
      MenuItemButton: ({ onSelect, children }) => React.createElement('button', { type: 'button', role: 'menuitem', onClick: onSelect }, children),
      IconEllipsisOutlineRegular: () => React.createElement('svg', { 'aria-hidden': true }),
      IconPinOutlineRegular: () => React.createElement('svg', { 'aria-hidden': true }),
      IconPinFillRegular: () => React.createElement('svg', { 'aria-hidden': true }),
      IconArchiveOutlineRegular: () => React.createElement('svg', { 'aria-hidden': true }),
      Button: ({ children, ...props }) => React.createElement('button', { type: 'button', ...props }, children),
      Modal: ({ open, title, description, footer, onClose, children }) => open && React.createElement('div', { role: 'dialog', 'aria-label': title },
        React.createElement('p', null, description), children, footer,
        React.createElement('button', { type: 'button', 'aria-label': 'Close dialog', onClick: onClose }, '×')),
    }
    : (() => { throw Error(`unexpected dependency ${id}`); })());
  const disposers = [];
  client.apply({ effect: fn => { const disposer = fn(); if (typeof disposer === 'function') disposers.push(disposer); }, slots, sessions: {}, uiWorkspace, configForms: { get: () => form } });
  return { dom, doc: dom.window.document, slots, form, entries, settingsPages, dispose: () => { for (const fn of disposers.reverse()) fn(); dom.window.close(); } };
}

test('legacy localStorage on cannot bypass settings default off', async () => {
  const app = mount({ savedOn: true });
  try {
    await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-toggle]'), null);
    assert.equal(app.entries.length, 1);
    assert.equal(app.doc.querySelector('#workspaces').textContent, 'Native workspace tree');
  } finally { app.dispose(); }
});

test('settings accepted on creates icon tab; accepted off restores native slot without removing native DOM', async () => {
  const app = mount();
  try {
    app.form.publish(true);
    await flush();
    assert.equal(app.doc.querySelectorAll('[data-dsh-workspace-tabs] button[data-view]').length, 3);
    app.doc.querySelector('[data-view="activity"]').click();
    assert.equal(app.entries.length, 2);
    app.form.publish(false);
    await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    assert.equal(app.entries.length, 1);
    assert.equal(app.doc.querySelector('#workspaces').textContent, 'Native workspace tree');
  } finally { app.dispose(); }
});

test('rc1 native shows three views and never saves them off during ordinary switching', async () => {
  const app = mount({ active: true, nativeBuild: 'rc1' });
  try {
    await flush();
    assert.deepEqual([...app.doc.querySelectorAll('[data-dsh-workspace-tabs] button[data-view]')].map(node => node.dataset.view), ['workspace', 'activity', 'favorites']);
    assert.deepEqual(app.form.setCalls, []);
    for (const view of ['activity', 'favorites']) {
      app.doc.querySelector(`[data-view="${view}"]`).click();
      await flush();
      assert.equal(app.entries.filter(entry => entry.registrant === 'dsh-nav-fold:workspace-views').length, 1);
      assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    }
    app.doc.querySelector('[data-view="workspace"]').click();
    await flush();
    assert.deepEqual(app.entries.map(entry => entry.registrant), ['tk']);
    assert.deepEqual(app.form.setCalls, []);
    app.form.publish(false); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    app.form.publish(true); await flush();
    assert.equal(app.doc.querySelectorAll('[data-dsh-workspace-tabs] button[data-view]').length, 3);
    assert.deepEqual(app.form.setCalls, []);
  } finally { app.dispose(); }
});

test('rc1 peer suspends tabs without modifying saved opt-in and restores after leaving', async () => {
  const app = mount({ active: true, nativeBuild: 'rc1' });
  try {
    const activity = app.doc.querySelector('[data-view="activity"]');
    assert.ok(activity, 'recognized rc1 native exposes tabs before peer arrives');
    activity.click();
    app.slots.addPeer('peer-plugin', -101); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    assert.deepEqual(app.form.setCalls, []);
    app.slots.removePeer('peer-plugin'); await flush();
    assert.equal(app.doc.querySelector('[data-view="activity"]')?.getAttribute('aria-pressed'), 'true');
    assert.deepEqual(app.form.setCalls, []);
  } finally { app.dispose(); }
});

test('rc1 malformed or augmented native children and lone tk imposter remain quarantined', async () => {
  const malformed = nativeRc1();
  delete malformed.children['sidebar.session.row.trailing'];
  const augmented = nativeRc1();
  augmented.children['sidebar.workspaces.unknown'] = { kind: 'list', scope: 'root' };
  const wrongInline = nativeRc1();
  wrongInline.children['sidebar.workspaces.directoryFlow'].inline = true;
  for (const options of [{ active: true, nativeBuild: 'rc1', nativeOverride: malformed },
    { active: true, nativeBuild: 'rc1', nativeOverride: augmented },
    { active: true, nativeBuild: 'rc1', nativeOverride: wrongInline },
    { active: true, nativePresent: false, peers: [{ options: { name: 'sidebar.workspaces' }, registrant: 'tk' }] }]) {
    const app = mount(options);
    try {
      await flush();
      assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
      assert.deepEqual(app.form.setCalls, [['workspaceViewsEnabled', false]]);
    } finally { app.dispose(); }
  }
});

test('pre-existing competing occupant suspends and restores the saved workspace view', async () => {
  const peer = { options: { name: 'sidebar.workspaces', priority: 50 }, registrant: 'peer-plugin' };
  const app = mount({ active: true, peers: [peer] });
  try {
    await flush();
    assert.equal(app.entries.includes(peer), true);
    assert.equal(app.entries.length, 2);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    app.slots.removePeer('peer-plugin'); await flush();
    assert.equal(app.entries.length, 1);
    assert.equal(app.doc.querySelectorAll('[data-dsh-workspace-tabs] [data-view]').length, 3);
  } finally { app.dispose(); }
});

test('DS-Bot slot entry pauses views and leaves saved intent intact across Bot-Agent switches', async () => {
  const app = mount({ active: true });
  const writes = [];
  const set = app.form.set.bind(app.form);
  app.form.set = async (field, value) => { writes.push([field, value]); return set(field, value); };
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    for (let i = 0; i < 2; i++) {
      app.slots.addPeer('ds-bot-client', -101);
      await flush();
      assert.deepEqual(app.entries.map(entry => entry.registrant).sort(), ['Gb', 'ds-bot-client'].sort());
      assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
      assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
      app.slots.removePeer('ds-bot-client');
      await flush();
      assert.equal(app.doc.querySelector('[data-view="activity"]')?.getAttribute('aria-pressed'), 'true');
      assert.equal(app.entries.filter(entry => entry.registrant === 'dsh-nav-fold:workspace-views').length, 1);
    }
    assert.deepEqual(writes, []);
  } finally { app.dispose(); }
});

test('actual scoped Gb peer suspends Activity through two Bot-Agent cycles without saving off', async () => {
  const app = mount({ active: true, rawScoped: true });
  const writes = [];
  const set = app.form.set.bind(app.form);
  app.form.set = async (field, value) => { writes.push([field, value]); return set(field, value); };
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    assert.equal(app.entries.length, 2);
    assert.ok(app.entries.every(entry => entry.options.name === undefined));
    for (let i = 0; i < 2; i++) {
      const peer = app.slots.addPeer('Gb', -101);
      await flush();
      assert.equal(peer.locale, undefined);
      assert.equal(peer.children, undefined);
      assert.equal(app.entries.length, 2, 'only the native entry and Gb peer remain');
      assert.ok(app.entries.includes(peer), 'the peer remains registered');
      assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
      assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
      assert.deepEqual(writes, []);
      app.slots.removePeer('Gb'); await flush();
      assert.equal(app.entries.length, 2, 'native and own entry return after peer removal');
      assert.equal(app.entries.includes(peer), false, 'peer removal does not remove the native Gb entry');
      assert.equal(app.doc.querySelector('[data-view="activity"]')?.getAttribute('aria-pressed'), 'true');
      assert.deepEqual(writes, []);
    }
  } finally { app.dispose(); }
});

test('wrong explicit native slot name during scoped Gb peer suspension hard-quarantines on departure', async () => {
  const app = mount({ active: true, rawScoped: true });
  const writes = [];
  const set = app.form.set.bind(app.form);
  app.form.set = async (field, value) => { writes.push([field, value]); return set(field, value); };
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    const peer = app.slots.addPeer('Gb', -101); await flush();
    assert.equal(app.entries.length, 2);
    assert.ok(app.entries.includes(peer));
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    assert.deepEqual(writes, []);
    app.entries[0].options.name = 'wrong-slot';
    app.slots.removePeer('Gb'); await flush();
    assert.deepEqual(writes, [['workspaceViewsEnabled', false]]);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.deepEqual(app.entries.map(entry => entry.registrant), ['Gb'], 'no own slot override remains');
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.doc.querySelector('#workspaces').textContent, 'Native workspace tree');
    app.form.publish(true); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null, 'ready(true) alone cannot rearm hard quarantine');
    assert.deepEqual(app.entries.map(entry => entry.registrant), ['Gb']);
  } finally { app.dispose(); }
});

test('wrong explicit own slot name during scoped registration hard-quarantines', async () => {
  const app = mount({ active: true, rawScoped: true });
  const writes = [];
  const set = app.form.set.bind(app.form);
  app.form.set = async (field, value) => { writes.push([field, value]); return set(field, value); };
  const register = app.slots.register.bind(app.slots);
  app.slots.register = (options, component) => {
    const unregister = register(options, component);
    if (options.registrant === 'dsh-nav-fold:workspace-views') {
      app.entries.find(entry => entry.registrant === options.registrant).options.name = 'wrong-slot';
    }
    return unregister;
  };
  try {
    app.doc.querySelector('[data-view="activity"]').click(); await flush();
    assert.deepEqual(writes, [['workspaceViewsEnabled', false]]);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.deepEqual(app.entries.map(entry => entry.registrant), ['Gb']);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.doc.querySelector('#workspaces').textContent, 'Native workspace tree');
  } finally { app.dispose(); }
});

test('actual scoped Gb peer suspends Workspace without saving off', async () => {
  const app = mount({ active: true, rawScoped: true });
  const writes = [];
  app.form.set = async (field, value) => { writes.push([field, value]); return true; };
  try {
    assert.ok(app.doc.querySelector('[data-dsh-workspace-tabs-row]'));
    app.slots.addPeer('Gb', -101); await flush();
    assert.equal(app.entries.length, 2);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    assert.deepEqual(writes, []);
    app.slots.removePeer('Gb'); await flush();
    assert.equal(app.entries.length, 1);
    assert.ok(app.doc.querySelector('[data-dsh-workspace-tabs-row]'));
    assert.deepEqual(writes, []);
  } finally { app.dispose(); }
});

test('peer arriving while Activity selected withdraws only our occupant and bar', async () => {
  const app = mount({ active: true });
  try {
    await flush();
    app.doc.querySelector('[data-view="activity"]').click();
    assert.equal(app.entries.length, 2);
    app.slots.addPeer();
    await flush();
    assert.equal(app.entries.length, 2, 'native and peer only');
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true, 'verified peer leaves saved intent intact');
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    assert.equal(app.doc.querySelector('#workspaces').textContent, 'Native workspace tree');
    app.slots.removePeer(); await flush();
    assert.equal(app.doc.querySelector('[data-view="activity"]')?.getAttribute('aria-pressed'), 'true');
    assert.equal(app.entries.length, 2, 'own view returns only after peer leaves');
  } finally { app.dispose(); }
});

test('synchronous slot notifications do not recursively register or unregister our occupant', async () => {
  const app = mount({ active: true, syncCallbacks: true });
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    assert.equal(app.entries.length, 2, 'one native and one plugin-owned entry');
    app.doc.querySelector('[data-view="workspace"]').click();
    assert.equal(app.entries.length, 1, 'switching to native removes only our entry');
    app.doc.querySelector('[data-view="favorites"]').click();
    assert.equal(app.entries.length, 2);
    app.slots.addPeer();
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    assert.equal(app.entries.length, 2, 'native and peer remain');
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    app.slots.removePeer(); await flush();
    assert.equal(app.doc.querySelector('[data-view="favorites"]')?.getAttribute('aria-pressed'), 'true');
    assert.equal(app.entries.length, 2, 'native and own entry return');
  } finally { app.dispose(); }
});

test('auto-resume never exposes controls while own registration loses native priority', async () => {
  const app = mount({ active: true, syncCallbacks: true });
  const writes = [];
  const set = app.form.set.bind(app.form);
  app.form.set = async (field, value) => { writes.push(value); return set(field, value); };
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    app.slots.addPeer(); await flush();
    app.entries.find(entry => entry.registrant === 'Gb').options.priority = -200;
    const observed = [];
    app.slots.subscribe('sidebar.workspaces', () => {
      if (app.entries.some(entry => entry.registrant === 'dsh-nav-fold:workspace-views')) {
        observed.push(Boolean(app.doc.querySelector('[data-dsh-workspace-tabs-row]')));
      }
    });
    app.slots.removePeer(); await flush();
    assert.deepEqual(observed, [false], 'failed winner registration cannot show unverified controls');
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.entries.length, 1);
    assert.deepEqual(writes, [false], 'genuine own override failure is hard quarantine');
  } finally { app.dispose(); }
});

test('Workspace view remains suspended until every peer leaves', async () => {
  const app = mount({ active: true, syncCallbacks: true });
  const writes = [];
  app.form.set = async (field, value) => { writes.push(value); return true; };
  try {
    assert.ok(app.doc.querySelector('[data-dsh-workspace-tabs-row]'));
    app.slots.addPeer('peer-one'); await flush();
    app.slots.addPeer('peer-two'); await flush();
    app.slots.removePeer('peer-one'); await flush();
    assert.equal(app.entries.length, 2);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    assert.deepEqual(writes, []);
    app.slots.removePeer('peer-two'); await flush();
    assert.equal(app.entries.length, 1);
    assert.ok(app.doc.querySelector('[data-dsh-workspace-tabs-row]'));
    assert.deepEqual(writes, []);
  } finally { app.dispose(); }
});

test('peer joining synchronously during own register keeps Activity suspended without saving off', async () => {
  const app = mount({ active: true, syncCallbacks: true, rawScoped: true, peers: [{ options: { priority: -101 }, registrant: 'Gb' }], mode: 'activity' });
  const writes = [];
  app.form.set = async (field, value) => { writes.push(value); return true; };
  try {
    await flush();
    let join = true;
    const observed = [];
    app.slots.subscribe('sidebar.workspaces', () => {
      if (join && app.entries.some(entry => entry.registrant === 'dsh-nav-fold:workspace-views')) {
        join = false;
        observed.push(Boolean(app.doc.querySelector('[data-dsh-workspace-tabs-row]')));
        app.slots.addPeer('Gb', -101);
      }
    });
    app.slots.removePeer('Gb'); await flush();
    assert.equal(join, false, 'race was exercised');
    assert.deepEqual(observed, [false]);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.deepEqual(writes, []);
    app.slots.removePeer('Gb'); await flush();
    assert.equal(app.doc.querySelector('[data-view="activity"]')?.getAttribute('aria-pressed'), 'true');
    assert.equal(app.entries.filter(entry => entry.registrant === 'dsh-nav-fold:workspace-views').length, 1);
    assert.deepEqual(writes, []);
  } finally { app.dispose(); }
});

test('a peer joining synchronously during our unregister is detected after the transition', async () => {
  const app = mount({ active: true, syncCallbacks: true });
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    let join = true;
    app.slots.subscribe('sidebar.workspaces', () => {
      if (join && app.entries.length === 1) { join = false; app.slots.addPeer(); }
    });
    app.doc.querySelector('[data-view="workspace"]').click();
    await flush();
    assert.equal(app.entries.length, 2, 'native and peer remain');
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    app.slots.removePeer(); await flush();
    assert.equal(app.doc.querySelectorAll('[data-dsh-workspace-tabs] [data-view]').length, 3);
    assert.equal(app.entries.length, 1, 'native view remains selected after peer leaves');
  } finally { app.dispose(); }
});

test('failed automatic disable and form loading cannot silently rearm a quarantined view', async () => {
  const app = mount({ active: true });
  try {
    app.form.set = async () => false;
    app.doc.querySelector('[data-dsh-workspace-tabs]').remove(); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true, 'failed disable leaves saved state unchanged');
    app.form.setStatus('loading');
    app.form.publish(true);
    await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null, 'ready(true) is not a saved off→on user retry');
  } finally { app.dispose(); }
});

test('settings Save rejection keeps a retryable draft and explains the failure', async () => {
  const app = mount();
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const host = app.doc.createElement('div'); app.doc.body.append(host);
    await React.act(async () => { root = createRoot(host); root.render(React.createElement(app.settingsPages.get('dsh-nav-fold'), { view: 'page' })); });
    await React.act(async () => { host.querySelector('input').click(); });
    assert.equal(host.querySelector('input').checked, true);
    app.form.set = async () => { throw Error('temporary write failure'); };
    await React.act(async () => { host.querySelector('button').click(); await flush(); });
    assert.match(host.textContent, /未能保存，请重试/);
    assert.equal(host.querySelector('input').checked, true, 'failed Save leaves the draft available');
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
  } finally {
    if (root) await React.act(async () => root.unmount());
    globalThis.window = previousWindow; globalThis.document = previousDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    app.dispose();
  }
});

test('settings layout stays scoped, uses host theme tokens and adapts at narrow widths', () => {
  assert.match(source, /\[data-dsh-nav-fold-settings\] \[data-dsh-nav-fold-option\] \{[^}]*grid-template-columns/s);
  assert.match(source, /\[data-dsh-nav-fold-settings\][^{}]*\{[^}]*var\(--dsw-alias-border-l1\)/s);
  assert.match(source, /@media \(max-width: 540px\)[^{}]*\{[^}]*\[data-dsh-nav-fold-settings\]/s);
});

test('settings groups navigation and space with concise binding help and visible module credit', async () => {
  const app = mount({ active: true });
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const host = app.doc.createElement('div'); app.doc.body.append(host);
    await React.act(async () => { root = createRoot(host); root.render(React.createElement(app.settingsPages.get('dsh-nav-fold'), { view: 'page' })); });
    const navigation = host.querySelector('[data-dsh-nav-fold-group="navigation"]');
    const space = host.querySelector('[data-dsh-nav-fold-group="space"]');
    assert.ok(navigation && space, 'two purpose-based settings groups replace unrelated headings');
    assert.deepEqual([...navigation.querySelectorAll('[data-dsh-nav-fold-option]')].map((row) => row.dataset.dshNavFoldOption), ['views', 'session-navigation']);
    assert.deepEqual([...space.querySelectorAll('[data-dsh-nav-fold-option]')].map((row) => row.dataset.dshNavFoldOption), ['brand']);
    assert.match(navigation.querySelector('[data-dsh-nav-fold-option="views"]').textContent, /待处理.*最近/,
      'Activity description includes waiting and recent sessions, not just running ones');
    assert.equal(host.querySelectorAll('input[type="checkbox"]').length, 3);
    assert.equal(host.querySelectorAll('button[type="button"]').length, 3, 'each persisted choice keeps its independent Save');
    const guide = navigation.querySelector('[data-dsh-nav-fold-guide]');
    assert.equal(guide?.tagName, 'OL', 'set up steps have a scannable order');
    assert.equal(guide.querySelectorAll('li').length, 3);
    assert.match(guide.textContent, /DSH 设置.*快捷键.*会话导航/s);
    assert.match(guide.textContent, /无线麦.*小米蓝牙遥控器/s);
    assert.match(navigation.textContent, /不直接连接蓝牙/);
    assert.match(navigation.textContent, /↑↓.*←→.*Enter.*Esc/s);
    const credit = space.querySelector('a[href="https://github.com/stoner-byte/dsh-hide-brand"]');
    assert.ok(credit, 'the included source is credited at its own switch');
    assert.match(space.textContent, /收录并适配.*stoner-byte.*dsh-hide-brand.*MIT/s);
    assert.match(space.textContent, /macOS/);
    assert.match(space.textContent, /关闭仅移除 Fold 自身的隐藏样式/);
    assert.doesNotMatch(space.textContent, /关闭后恢复 DSH 原有品牌行/);
  } finally {
    if (root) await React.act(async () => root.unmount());
    globalThis.window = previousWindow; globalThis.document = previousDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    app.dispose();
  }
});

test('navigation setting guides shortcut mapping and independently preserves retryable draft', async () => {
  const app = mount({ active: true });
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const host = app.doc.createElement('div'); app.doc.body.append(host);
    await React.act(async () => { root = createRoot(host); root.render(React.createElement(app.settingsPages.get('dsh-nav-fold'), { view: 'page' })); });
    const navigation = host.querySelector('input[data-dsh-nav-fold-navigation-enabled]');
    const save = host.querySelector('button[data-dsh-nav-fold-navigation-save]');
    assert.ok(navigation && save, 'dedicated navigation switch and Save appear in the plugin settings');
    assert.equal(navigation.checked, true, 'existing shortcut users are not disabled on upgrade');
    assert.match(host.textContent, /DSH 设置.*快捷键.*会话导航/s);
    assert.match(host.textContent, /无线麦/);
    assert.match(host.textContent, /冲突/);
    await React.act(async () => { navigation.click(); app.form.publishValue({ hideBrandEnabled: true }); });
    assert.equal(navigation.checked, false, 'another setting does not discard the unsaved navigation draft');
    const set = app.form.set.bind(app.form);
    app.form.set = async () => false;
    await React.act(async () => { save.click(); await flush(); });
    assert.equal(navigation.checked, false);
    assert.match(host.textContent, /导航设置未能保存/);
    assert.equal(app.form.getSnapshot().value.navigationEnabled, undefined);
    app.form.set = set;
    await React.act(async () => { save.click(); await flush(); });
    assert.equal(app.form.getSnapshot().value.navigationEnabled, false);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    assert.equal(app.form.getSnapshot().value.hideBrandEnabled, true);
    await React.act(async () => { app.form.publish(false); });
    assert.match(host.textContent, /先.*三栏/, 'workspace views are an explicit prerequisite');
  } finally {
    if (root) await React.act(async () => root.unmount());
    globalThis.window = previousWindow; globalThis.document = previousDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    app.dispose();
  }
});

test('brand setting saves independently and a failed save keeps its retryable draft', async () => {
  const app = mount();
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const host = app.doc.createElement('div'); app.doc.body.append(host);
    await React.act(async () => { root = createRoot(host); root.render(React.createElement(app.settingsPages.get('dsh-nav-fold'), { view: 'page' })); });
    const brandInput = host.querySelector('input[data-dsh-nav-fold-brand-enabled]');
    const save = host.querySelector('button[data-dsh-nav-fold-brand-save]');
    assert.ok(brandInput && save, 'brand checkbox and its own Save button are present');
    assert.equal(brandInput.checked, false);
    assert.equal(save.disabled, true);
    await React.act(async () => { brandInput.click(); });
    assert.equal(brandInput.checked, true);
    await React.act(async () => { app.form.publishValue({ workspaceViewsEnabled: false }); });
    assert.equal(brandInput.checked, true, 'unrelated workspace snapshot must not discard an unsaved brand draft');
    assert.equal(save.disabled, false);
    const originalSet = app.form.set.bind(app.form);
    app.form.set = async () => false;
    await React.act(async () => { save.click(); await flush(); });
    assert.equal(brandInput.checked, true, 'failed save leaves the draft available');
    assert.equal(app.form.getSnapshot().value.hideBrandEnabled, false);
    assert.match(host.textContent, /品牌设置未能保存/);
    app.form.set = originalSet;
    await React.act(async () => { save.click(); await flush(); });
    assert.equal(app.form.getSnapshot().value.hideBrandEnabled, true);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false, 'brand is independent of workspace views');
    assert.ok(app.doc.querySelector('style[data-plugin-css="dsh-nav-fold/hide-brand"]'));
    await React.act(async () => { brandInput.click(); save.click(); await flush(); });
    assert.equal(app.form.getSnapshot().value.hideBrandEnabled, false);
    assert.equal(app.doc.querySelector('style[data-plugin-css="dsh-nav-fold/hide-brand"]'), null);
  } finally {
    if (root) await React.act(async () => root.unmount());
    globalThis.window = previousWindow; globalThis.document = previousDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    app.dispose();
  }
});

test('saving either setting preserves the other unsaved draft in both orders', async () => {
  const app = mount();
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const host = app.doc.createElement('div'); app.doc.body.append(host);
    await React.act(async () => { root = createRoot(host); root.render(React.createElement(app.settingsPages.get('dsh-nav-fold'), { view: 'page' })); });
    const workspace = host.querySelector('input:not([data-dsh-nav-fold-brand-enabled])');
    const brand = host.querySelector('input[data-dsh-nav-fold-brand-enabled]');
    const saveWorkspace = host.querySelector('button:not([data-dsh-nav-fold-brand-save])');
    const saveBrand = host.querySelector('button[data-dsh-nav-fold-brand-save]');
    await React.act(async () => { workspace.click(); brand.click(); });
    await React.act(async () => { saveWorkspace.click(); await flush(); });
    assert.equal(brand.checked, true, 'saving workspace does not reset brand draft');
    assert.equal(app.form.getSnapshot().value.hideBrandEnabled, false);
    await React.act(async () => { saveBrand.click(); await flush(); });
    assert.equal(app.form.getSnapshot().value.hideBrandEnabled, true);
    await React.act(async () => { workspace.click(); brand.click(); });
    await React.act(async () => { saveBrand.click(); await flush(); });
    assert.equal(workspace.checked, false, 'saving brand does not reset workspace draft');
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    await React.act(async () => { saveWorkspace.click(); await flush(); });
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
  } finally {
    if (root) await React.act(async () => root.unmount());
    globalThis.window = previousWindow; globalThis.document = previousDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    app.dispose();
  }
});

test('brand style remains independent while DS-Bot temporarily occupies the workspace slot', async () => {
  const app = mount({ active: true });
  const style = () => app.doc.querySelector('style[data-plugin-css="dsh-nav-fold/hide-brand"]');
  try {
    await app.form.set('hideBrandEnabled', true);
    assert.ok(style());
    app.slots.addPeer('ds-bot-client', -101); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    assert.ok(style(), 'brand style is unrelated to temporary workspace suspension');
    app.form.publish(false); await flush();
    assert.ok(style(), 'switching workspace views off does not reset the brand choice');
    app.slots.removePeer('ds-bot-client'); await flush();
    assert.ok(style());
  } finally { app.dispose(); }
  assert.equal(style(), null, 'disposing the bundle removes the brand rule');
});

test('after structural damage only settings off-to-on Save can rearm a now-safe view', async () => {
  const app = mount({ active: true });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    app.doc.querySelector('[data-dsh-workspace-tabs]').remove(); await flush();
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    const host = app.doc.createElement('div'); app.doc.body.append(host);
    await React.act(async () => { root = createRoot(host); root.render(React.createElement(app.settingsPages.get('dsh-nav-fold'), { view: 'page' })); });
    await React.act(async () => { host.querySelector('input').click(); });
    await React.act(async () => { host.querySelector('button').click(); await flush(); });
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    assert.equal(app.doc.querySelectorAll('[data-dsh-workspace-tabs] [data-view]').length, 3);
  } finally {
    if (root) await React.act(async () => root.unmount());
    globalThis.window = previousWindow; globalThis.document = previousDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    app.dispose();
  }
});

test('a concurrent ready(true) cannot release quarantine while settings Save is still pending', async () => {
  const app = mount({ active: true });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    app.doc.querySelector('[data-dsh-workspace-tabs]').remove(); await flush();
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    const host = app.doc.createElement('div'); app.doc.body.append(host);
    await React.act(async () => { root = createRoot(host); root.render(React.createElement(app.settingsPages.get('dsh-nav-fold'), { view: 'page' })); });
    await React.act(async () => { host.querySelector('input').click(); });
    let rejectPending;
    app.form.set = () => new Promise((_, reject) => { rejectPending = reject; });
    await React.act(async () => { host.querySelector('button').click(); });
    await React.act(async () => { app.form.publish(true); }); // unrelated external/reload notification, not a successful Save
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    await React.act(async () => { rejectPending(Error('Save refused')); await flush(); });
    assert.match(host.textContent, /未能保存，请重试/);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
  } finally {
    if (root) await React.act(async () => root.unmount());
    globalThis.window = previousWindow; globalThis.document = previousDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    app.dispose();
  }
});

test('a peer masquerading as the native workspace cannot be shadowed', async () => {
  const masquerade = { options: { name: 'sidebar.workspaces' }, registrant: 'peer-plugin', locale: 'workspace', children: native().children };
  const app = mount({ active: true, nativePresent: false, peers: [masquerade] });
  try {
    await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    assert.equal(app.entries.length, 1);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
  } finally { app.dispose(); }
});

test('peer arriving with damaged owned DOM hard-quarantines instead of suspending', async () => {
  const app = mount({ active: true });
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    app.doc.querySelector('[data-dsh-workspace-tabs]').remove();
    app.slots.addPeer('ds-bot-client', -101); await flush();
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.deepEqual(app.entries.map(entry => entry.registrant).sort(), ['Gb', 'ds-bot-client'].sort());
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    app.slots.removePeer('ds-bot-client'); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null, 'peer departure cannot rearm hard quarantine');
  } finally { app.dispose(); }
});

test('peer with malformed host slot specification still hard-quarantines', async () => {
  const app = mount({ active: true });
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    app.slots.spec = () => ({ kind: 'list', scope: 'root' });
    app.slots.addPeer(); await flush();
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.equal(app.entries.length, 2, 'only native and peer remain');
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
  } finally { app.dispose(); }
});

test('peer with corrupted native registration still hard-quarantines', async () => {
  const app = mount({ active: true });
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    app.entries[0].children = {};
    app.slots.addPeer(); await flush();
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.equal(app.entries.length, 2, 'only untrusted native and peer remain');
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
  } finally { app.dispose(); }
});

test('temporarily empty native registration withdraws and resumes without persisting off', async () => {
  const app = mount({ active: true, nativePresent: false });
  const writes = [];
  app.form.set = async (field, value) => { writes.push([field, value]); return true; };
  try {
    await flush();
    assert.equal(app.entries.length, 0);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    assert.deepEqual(writes, []);
    app.slots.addNative(); await flush();
    assert.equal(app.doc.querySelectorAll('[data-dsh-workspace-tabs] [data-view]').length, 3);
    assert.deepEqual(writes, []);
  } finally { app.dispose(); }
});

test('temporary region or footer loss withdraws Activity without saving off and restores after host recovery', async () => {
  for (const selector of ['.kB3qhq_regionArea', '.kB3qhq_footArea']) {
    const app = mount({ active: true });
    const writes = [];
    app.form.set = async (field, value) => { writes.push([field, value]); return true; };
    try {
      app.doc.querySelector('[data-view="activity"]').click();
      const missing = app.doc.querySelector(selector);
      missing.remove(); await flush();
      assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
      assert.equal(app.entries.length, 1);
      assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
      assert.deepEqual(writes, []);
      const root = app.doc.querySelector('.kB3qhq_root');
      if (selector === '.kB3qhq_regionArea') root.insertBefore(missing, root.querySelector('.kB3qhq_footArea'));
      else root.append(missing);
      await flush();
      assert.equal(app.doc.querySelector('[data-view="activity"]')?.getAttribute('aria-pressed'), 'true');
      assert.equal(app.entries.length, 2);
      assert.deepEqual(writes, []);
    } finally { app.dispose(); }
  }
});

test('moved intact bar with a peer is hard-quarantined, not peer-suspended', async () => {
  const app = mount({ active: true });
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    const bar = app.doc.querySelector('[data-dsh-workspace-tabs-row]');
    app.doc.querySelector('.kB3qhq_root').append(bar);
    app.slots.addPeer(); await flush();
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.entries.length, 2);
  } finally { app.dispose(); }
});

test('malformed peer entry cannot be classified as a reversible competitor', async () => {
  for (const peer of [{ options: { name: 'wrong-slot' }, registrant: 'peer' }, { options: { name: 'sidebar.workspaces' } }]) {
    const app = mount({ active: true });
    try {
      app.slots.addPeer(); await flush();
      app.entries.push(peer); app.slots.removePeer(); await flush();
      assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
      assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    } finally { app.dispose(); }
  }
});

test('duplicate COMPLETE native identity beside the real native hard-quarantines', async () => {
  const app = mount({ active: true, rawScoped: true });
  const writes = [];
  const set = app.form.set.bind(app.form);
  app.form.set = async (field, value) => { writes.push([field, value]); return set(field, value); };
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    app.entries.push(native(true));
    app.slots.addPeer('other'); await flush();
    assert.deepEqual(writes, [['workspaceViewsEnabled', false]]);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.equal(app.entries.filter(entry => entry.registrant === 'dsh-nav-fold:workspace-views').length, 0);
  } finally { app.dispose(); }
});

test('explicit wrong slot name on scoped peer hard-quarantines', async () => {
  const app = mount({ active: true, rawScoped: true });
  const writes = [];
  const set = app.form.set.bind(app.form);
  app.form.set = async (field, value) => { writes.push([field, value]); return set(field, value); };
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    const peer = app.slots.addPeer('Gb', -101);
    peer.options.name = 'wrong-slot';
    await flush();
    assert.deepEqual(writes, [['workspaceViewsEnabled', false]]);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
  } finally { app.dispose(); }
});

test('duplicate own registration beside a peer hard-quarantines', async () => {
  const app = mount({ active: true });
  try {
    app.doc.querySelector('[data-view="activity"]').click();
    app.entries.push({ options: { name: 'sidebar.workspaces', priority: -100 }, registrant: 'dsh-nav-fold:workspace-views' });
    app.slots.addPeer(); await flush();
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
  } finally { app.dispose(); }
});

test('approved framed tab is icon-only with accessible names', async () => {
  const app = mount({ active: true });
  try {
    await flush();
    const buttons = [...app.doc.querySelectorAll('[data-dsh-workspace-tabs] button[data-view]')];
    assert.deepEqual(buttons.map(button => button.textContent), ['', '', '']);
    assert.ok(buttons.every(button => button.querySelector('svg[aria-hidden="true"]')));
    assert.ok(buttons.every(button => button.getAttribute('aria-label')));
  } finally { app.dispose(); }
});

test('one-child tabs remain visible while selecting Activity and preserve native slot', async () => {
  const app = mount({ active: true });
  try {
    await flush();
    const row = app.doc.querySelector('[data-dsh-workspace-tabs-row]');
    const tabs = app.doc.querySelector('[data-dsh-workspace-tabs]');
    assert.equal(row.children.length, 1);
    assert.equal(row.firstElementChild, tabs);
    assert.equal(tabs.hidden, false);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-toggle]'), null);
    assert.equal(tabs.querySelectorAll('button[data-view]').length, 3);
    app.doc.querySelector('[data-view="activity"]').click();
    assert.equal(tabs.hidden, false);
    assert.equal(app.doc.querySelector('[data-view="activity"]').getAttribute('aria-pressed'), 'true');
    assert.equal(app.entries.find(entry => entry.registrant === 'dsh-nav-fold:workspace-views')?.component !== undefined, true);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
  } finally { app.dispose(); }
});

test('legacy folded preference is ignored without clearing or rewriting storage', async () => {
  const app = mount({ active: true, folded: true });
  try {
    await flush();
    const key = 'dsh-nav-fold:workspace-tabs-collapsed';
    const tabs = app.doc.querySelector('[data-dsh-workspace-tabs]');
    assert.equal(tabs.hidden, false);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-toggle]'), null);
    app.doc.querySelector('[data-view="favorites"]').click();
    assert.equal(tabs.hidden, false);
    assert.equal(app.dom.window.localStorage.getItem(key), 'true');
    app.form.publish(false); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.entries.length, 1);
    app.form.publish(true); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]').hidden, false);
    assert.equal(app.dom.window.localStorage.getItem(key), 'true');
    app.slots.addPeer(); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.doc.querySelector('#workspaces').textContent, 'Native workspace tree');
  } finally { app.dispose(); }
});

test('legacy folded key is no longer referenced by the client', () => {
  assert.doesNotMatch(source, /dsh-nav-fold:workspace-tabs-collapsed/);
});

test('host removing the sole owned tabs child quarantines alternate view instead of leaving an invisible override', async () => {
  const app = mount({ active: true });
  try {
    await flush(); app.doc.querySelector('[data-view="activity"]').click();
    app.doc.querySelector('[data-dsh-workspace-tabs]').remove(); await flush();
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.entries.length, 1, 'own singleton override removed');
    assert.equal(app.doc.querySelector('#workspaces').textContent, 'Native workspace tree');
  } finally { app.dispose(); }
});

test('three-tab frame fills the native sidebar content width without double padding', () => {
  const css = source.match(/\[data-dsh-workspace-tabs-row\]\s*\{([^}]*)\}/)?.[1];
  assert.ok(css, 'plugin-owned layout row exists');
  assert.match(css, /display:\s*grid/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /margin:\s*6px\s+0\s+8px/, 'sidebar root already contributes 12px horizontal padding');
  assert.doesNotMatch(source, /\[data-dsh-workspace-tabs-row\]::before/);
  assert.doesNotMatch(source, /\[data-dsh-workspace-tabs-row\]\[data-collapsed/);
});

test('Pin B remains the lightly tilted Favorites glyph while selected', async () => {
  const app = mount({ active: true });
  try {
    await flush();
    const favorites = app.doc.querySelector('[data-view="favorites"]');
    const path = 'M8.5 5.5h7l-1 4 2 3v1H7.5v-1l2-3-1-4Z';
    assert.equal(favorites.querySelector('svg g')?.getAttribute('transform'), 'rotate(-24 12 12)');
    assert.equal(favorites.querySelector('svg path')?.getAttribute('d'), path);
    favorites.click();
    assert.equal(favorites.getAttribute('aria-pressed'), 'true');
    assert.equal(favorites.querySelector('svg path')?.getAttribute('d'), path);
  } finally { app.dispose(); }
});

test('small tab glyphs and reduced-motion support remain scoped', () => {
  assert.match(source, /\[data-dsh-workspace-tabs\] > button\[data-view\] svg\s*\{[^}]*width:\s*15px/);
  assert.match(source, /@media\s*\(prefers-reduced-motion:\s*reduce\)[^\n]*\[data-dsh-workspace-tabs\]::before/);
  assert.doesNotMatch(source, /\[data-dsh-workspace-tabs-toggle\]/);
});

test('Activity shows native status dots only for explicit pending running and unread completion', async () => {
  const app = mount({ active: true });
  try {
    await flush();
    app.doc.querySelector('[data-view="activity"]').click();
    const View = app.entries.find(entry => entry.registrant === 'dsh-nav-fold:workspace-views').component;
    const ids = ['wait', 'run', 'unread', 'idle'];
    const statuses = new Map([['wait', { pendingInteraction: { kind: 'approval' } }], ['run', { running: true }], ['unread', { completionUnread: true }]]);
    const markup = renderToStaticMarkup(React.createElement(View, {
      useSessions: () => ({ phase: 'ready', ids, byId: Object.fromEntries(ids.map((id, index) => [id, { id, title: `Session ${id}`, updatedAt: 100 - index }])) }),
      useSessionStatus: () => statuses,
      useWorkspaces: () => ({ items: [{ title: 'Demo', sessionIds: ids }], pinnedSessionIds: [], archivedSessionIds: [] }),
    }));
    assert.match(markup, /data-dsh-state-dot="warning"/);
    assert.match(markup, /data-dsh-state-dot="ongoing"/);
    assert.match(markup, /data-dsh-state-dot="done"/);
    assert.doesNotMatch(markup, /data-dsh-state-dot="error"/);
    assert.doesNotMatch(markup, />待处理<|>运行中<|>未读</);
  } finally { app.dispose(); }
});

test('current main conversation remains highlighted across Activity and Favorites, but not another main panel', async () => {
  const app = mount({ active: true });
  try {
    await flush();
    const sessions = { phase: 'ready', ids: ['a', 'b'], byId: {
      a: { id: 'a', title: 'Current', retainedBy: { mainView: 1 }, updatedAt: 30 },
      b: { id: 'b', title: 'Other', retainedBy: { mainView: 0 }, updatedAt: 20 },
    } };
    const props = { useSessions: () => sessions, useSessionStatus: () => new Map(),
      useWorkspaces: () => ({ items: [{ title: 'Demo', sessionIds: ['a', 'b'] }], pinnedSessionIds: ['a', 'b'], archivedSessionIds: [] }),
      usePanelInfo: () => false };
    for (const tab of ['activity', 'favorites']) {
      app.doc.querySelector(`[data-view="${tab}"]`).click();
      const View = app.entries.find(entry => entry.registrant === 'dsh-nav-fold:workspace-views').component;
      const markup = renderToStaticMarkup(React.createElement(View, props));
      assert.match(markup, /aria-current="page"[^>]*>.*Current/);
      assert.match(markup, /<button(?![^>]*aria-current)[^>]*aria-label="Other · Demo"/);
      const hidden = renderToStaticMarkup(React.createElement(View, { ...props, usePanelInfo: () => true }));
      assert.doesNotMatch(hidden, /aria-current="page"/);
    }
  } finally { app.dispose(); }
});

test('running dot alone has a looping pulse and respects reduced motion', async () => {
  const app = mount({ active: true });
  try {
    await flush(); app.doc.querySelector('[data-view="activity"]').click();
    const View = app.entries.find(entry => entry.registrant === 'dsh-nav-fold:workspace-views').component;
    const markup = renderToStaticMarkup(React.createElement(View, {
      useSessions: () => ({ ids: ['run', 'idle'], byId: { run: { id: 'run', title: 'Run', running: true }, idle: { id: 'idle', title: 'Idle' } } }),
      useSessionStatus: () => new Map(), useWorkspaces: () => ({ items: [{ sessionIds: ['run', 'idle'] }], pinnedSessionIds: [] }),
    }));
    assert.match(markup, /class="dsh-nav-fold-state-dot dsh-nav-fold-state-dot-running"/);
    assert.equal((markup.match(/dsh-nav-fold-state-dot-running/g) || []).length, 1);
    assert.match(source, /\.dsh-nav-fold-state-dot-running\s*\{[^}]*animation:[^}]*infinite/);
    assert.match(source, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.dsh-nav-fold-state-dot-running[^}]*animation:\s*none/);
  } finally { app.dispose(); }
});

test('pin button is a sibling of the open button and persists through uiWorkspace', async () => {
  const calls = [];
  const app = mount({ active: true, uiWorkspace: {
    openSession: id => calls.push(['open', id]),
    pinSession: async id => { calls.push(['pin', id]); },
    unpinSession: async id => { calls.push(['unpin', id]); },
  } });
  const previousWindow = globalThis.window, previousDocument = globalThis.document, previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    await flush(); app.doc.querySelector('[data-view="activity"]').click();
    const View = app.entries.find(entry => entry.registrant === 'dsh-nav-fold:workspace-views').component;
    const host = app.doc.createElement('div'); app.doc.body.append(host);
    await React.act(async () => { root = createRoot(host); root.render(React.createElement(View, {
      useSessions: () => ({ ids: ['a'], byId: { a: { id: 'a', title: 'Session A' } } }),
      useSessionStatus: () => new Map(),
      useWorkspaces: () => ({ items: [{ title: 'Demo', sessionIds: ['a'] }], pinnedSessionIds: [] }),
    })); });
    const row = host.querySelector('.dsh-nav-fold-session');
    const open = row?.querySelector('.dsh-nav-fold-session-main');
    const pin = row?.querySelector('[data-session-pin]');
    assert.ok(open && pin, 'main open and pin are separate controls');
    assert.equal(open.contains(pin), false, 'do not nest interactive buttons');
    assert.equal(pin.getAttribute('aria-pressed'), 'false');
    await React.act(async () => { pin.click(); await flush(); });
    assert.deepEqual(calls, [['pin', 'a']], 'Pin must not open conversation');
    await React.act(async () => { open.click(); });
    assert.deepEqual(calls, [['pin', 'a'], ['open', 'a']]);
  } finally {
    if (root) await React.act(async () => root.unmount());
    globalThis.window = previousWindow; globalThis.document = previousDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    app.dispose();
  }
});

test('ellipsis menu opens safe session actions without activating the main row', async () => {
  const calls = [];
  const app = mount({ active: true, uiWorkspace: {
    openSession: id => calls.push(['open', id]),
    pinSession: async id => { calls.push(['pin', id]); },
  } });
  const previousWindow = globalThis.window, previousDocument = globalThis.document, previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(app.dom.window.navigator, 'clipboard', { configurable: true,
    value: { writeText: async text => { calls.push(['copy', text]); } } });
  let root;
  try {
    await flush(); app.doc.querySelector('[data-view="activity"]').click();
    const View = app.entries.find(entry => entry.registrant === 'dsh-nav-fold:workspace-views').component;
    const host = app.doc.createElement('div'); app.doc.body.append(host);
    await React.act(async () => { root = createRoot(host); root.render(React.createElement(View, {
      useSessions: () => ({ ids: ['a'], byId: { a: { id: 'a', title: 'Session A' } } }),
      useSessionStatus: () => new Map(),
      useWorkspaces: () => ({ items: [{ title: 'Demo', sessionIds: ['a'] }], pinnedSessionIds: [] }),
    })); });
    const row = host.querySelector('.dsh-nav-fold-session');
    const dots = row?.querySelector('[data-session-menu]');
    assert.ok(dots, 'independent ellipsis menu button exists');
    assert.equal(dots.getAttribute('aria-haspopup'), 'menu');
    await React.act(async () => { dots.click(); });
    let items = [...host.querySelectorAll('[role="menuitem"]')];
    assert.equal(items.length, 4, 'Open, Pin, Archive and Copy ID are independent actions');
    assert.deepEqual(calls, [], 'opening menu does not open the conversation');
    await React.act(async () => { items.find(item => /复制会话 ID/.test(item.textContent)).click(); await flush(); });
    assert.deepEqual(calls, [['copy', 'a']]);
    await React.act(async () => { dots.click(); });
    items = [...host.querySelectorAll('[role="menuitem"]')];
    await React.act(async () => { items.find(item => /收藏会话/.test(item.textContent)).click(); await flush(); });
    assert.deepEqual(calls, [['copy', 'a'], ['pin', 'a']]);
    await React.act(async () => { row.dispatchEvent(new app.dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); });
    assert.ok(host.querySelector('[role="menu"]'), 'right-click uses the same controlled menu');
    await React.act(async () => { host.querySelector('[role="menu"]').dispatchEvent(new app.dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    assert.equal(host.querySelector('[role="menu"]'), null, 'Escape closes menu');
  } finally {
    if (root) await React.act(async () => root.unmount());
    globalThis.window = previousWindow; globalThis.document = previousDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    app.dispose();
  }
});

test('failed unpin leaves the favorite pressed and offers retry', async () => {
  const calls = [];
  let fail;
  const app = mount({ active: true, uiWorkspace: {
    openSession: id => calls.push(['open', id]),
    unpinSession: id => { calls.push(['unpin', id]); return new Promise((_, reject) => { fail = reject; }); },
  } });
  const previousWindow = globalThis.window, previousDocument = globalThis.document, previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    await flush(); app.doc.querySelector('[data-view="favorites"]').click();
    const View = app.entries.find(entry => entry.registrant === 'dsh-nav-fold:workspace-views').component;
    const host = app.doc.createElement('div'); app.doc.body.append(host);
    await React.act(async () => { root = createRoot(host); root.render(React.createElement(View, {
      useSessions: () => ({ ids: ['a'], byId: { a: { id: 'a', title: 'Saved' } } }),
      useSessionStatus: () => new Map(),
      useWorkspaces: () => ({ items: [{ title: 'Demo', sessionIds: ['a'] }], pinnedSessionIds: ['a'] }),
    })); });
    const pin = host.querySelector('[data-session-pin]');
    assert.equal(pin.getAttribute('aria-pressed'), 'true');
    await React.act(async () => { pin.click(); await flush(); });
    assert.equal(pin.disabled, true, 'in-flight writes cannot be submitted twice');
    await React.act(async () => { fail(Error('network failure')); await flush(); });
    assert.deepEqual(calls, [['unpin', 'a']], 'never navigates while unpinning');
    assert.equal(pin.disabled, false);
    assert.equal(pin.getAttribute('aria-pressed'), 'true', 'failed write cannot fake new snapshot');
    assert.match(host.querySelector('[role="alert"]').textContent, /请重试/);
  } finally {
    if (root) await React.act(async () => root.unmount());
    globalThis.window = previousWindow; globalThis.document = previousDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    app.dispose();
  }
});

test('session actions reserve title space and reveal on hover, focus or touch', () => {
  assert.match(source, /\.dsh-nav-fold-session-title\s*\{[^}]*padding-right:\s*82px/);
  assert.match(source, /\.dsh-nav-fold-session:hover\s+\.dsh-nav-fold-session-actions,\s*\.dsh-nav-fold-session:focus-within\s+\.dsh-nav-fold-session-actions/);
  assert.match(source, /@media\s*\(hover:\s*none\)\s*\{\s*\.dsh-nav-fold-session-actions\s*\{[^}]*opacity:\s*1/);
  assert.match(source, /\.dsh-nav-fold-session-actions\s+button:focus-visible\s*\{[^}]*outline:/);
});

test('reduced motion disables the action strip fade', () => {
  assert.ok(/@media\s*\(prefers-reduced-motion:\s*reduce\)[^\n]*\.dsh-nav-fold-session-actions\s*\{[^}]*transition:\s*none/.test(source), 'action fade must stop when reduced motion is requested');
});

async function withArchiveView(uiWorkspace, check, { favorites = false } = {}) {
  const app = mount({ active: true, uiWorkspace });
  const previousWindow = globalThis.window, previousDocument = globalThis.document, previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    await flush(); app.doc.querySelector(`[data-view="${favorites ? 'favorites' : 'activity'}"]`).click();
    const View = app.entries.find(entry => entry.registrant === 'dsh-nav-fold:workspace-views').component;
    const host = app.doc.createElement('div'); app.doc.body.append(host);
    const sessions = { ids: ['a'], byId: { a: { id: 'a', title: 'Session A' } } };
    let archived = [];
    const props = { useSessions: () => sessions, useSessionStatus: () => new Map(),
      useWorkspaces: () => ({ items: [{ title: 'Demo', sessionIds: ['a'] }], pinnedSessionIds: favorites ? ['a'] : [], archivedSessionIds: archived }) };
    const render = async () => React.act(async () => { root ||= createRoot(host); root.render(React.createElement(View, props)); });
    await render();
    await check({ app, host, render, archiveSnapshot: async () => { archived = ['a']; await render(); } });
  } finally {
    if (root) await React.act(async () => root.unmount());
    globalThis.window = previousWindow; globalThis.document = previousDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    app.dispose();
  }
}

const activeArchiveError = () => Object.assign(new Error('session busy'), { name: 'WorkspaceArchiveError', rpcError: { code: 'workspace/session-active' } });

for (const favorites of [false, true]) test(`archive button and menu share native API without navigation in ${favorites ? 'Favorites' : 'Activity'} until host snapshot`, async () => {
  const calls = [];
  await withArchiveView({ openSession: id => calls.push(['open', id]), archiveSession: async (...args) => { calls.push(['archive', ...args]); } }, async ({ host, archiveSnapshot }) => {
    const row = host.querySelector('.dsh-nav-fold-session');
    const open = row.querySelector('.dsh-nav-fold-session-main');
    const actions = row.querySelector('.dsh-nav-fold-session-actions');
    assert.deepEqual([...actions.children].map(child => child.matches('[data-session-menu], [data-session-archive], [data-session-pin]') ? child.getAttributeNames().find(name => name.startsWith('data-session-')) : child.querySelector('button')?.getAttributeNames().find(name => name.startsWith('data-session-'))), ['data-session-menu', 'data-session-archive', 'data-session-pin']);
    assert.ok([...actions.querySelectorAll('button')].every(button => !open.contains(button)), 'all action buttons are siblings of the main button');
    const archive = actions.querySelector('[data-session-archive]');
    assert.ok(archive, 'standalone archive button exists');
    await React.act(async () => { archive.click(); await flush(); });
    assert.deepEqual(calls, [['archive', 'a']]);
    assert.ok(host.querySelector('.dsh-nav-fold-session'), 'no optimistic removal');
    await React.act(async () => { actions.querySelector('[data-session-menu]').click(); });
    const menuArchive = [...host.querySelectorAll('[role="menuitem"]')].find(item => /归档会话/.test(item.textContent));
    assert.ok(menuArchive);
    await React.act(async () => { menuArchive.click(); await flush(); });
    assert.deepEqual(calls, [['archive', 'a'], ['archive', 'a']]);
    assert.equal(host.querySelector('[role="menu"]'), null);
    assert.ok(host.querySelector('.dsh-nav-fold-session'));
    await archiveSnapshot();
    assert.equal(host.querySelector('.dsh-nav-fold-session'), null, 'host archived IDs remove the row');
  }, { favorites });
});

test('known active archive refusal requires explicit confirmation and Cancel never stops work', async () => {
  const calls = [];
  await withArchiveView({ archiveSession: async (...args) => { calls.push(args); throw activeArchiveError(); } }, async ({ host }) => {
    await React.act(async () => { host.querySelector('[data-session-archive]').click(); await flush(); });
    assert.deepEqual(calls, [['a']]);
    const dialog = host.querySelector('[role="dialog"]');
    assert.ok(dialog, 'only known active refusal displays confirmation');
    assert.match(dialog.textContent, /停止.*运行|stop.*running/i);
    const cancel = [...dialog.querySelectorAll('button')].find(button => /取消|Cancel/.test(button.textContent));
    await React.act(async () => { cancel.click(); });
    assert.equal(host.querySelector('[role="dialog"]'), null);
    assert.deepEqual(calls, [['a']], 'Cancel never sends stopActivity');
  });
});

test('explicit archive confirmation stops once, guards pending submissions and preserves dialog for retry', async () => {
  const calls = [];
  let reject, resolve;
  await withArchiveView({ archiveSession: (...args) => {
    calls.push(args);
    if (calls.length === 1) return Promise.reject(activeArchiveError());
    return new Promise((yes, no) => { resolve = yes; reject = no; });
  } }, async ({ host, archiveSnapshot }) => {
    await React.act(async () => { host.querySelector('[data-session-menu]').click(); });
    await React.act(async () => { [...host.querySelectorAll('[role="menuitem"]')].find(item => /归档会话/.test(item.textContent)).click(); await flush(); });
    assert.equal(host.querySelector('[role="menu"]'), null);
    const confirm = () => [...host.querySelector('[role="dialog"]').querySelectorAll('button')].find(button => /归档并停止|Stop and archive/.test(button.textContent));
    assert.ok(confirm());
    await React.act(async () => { confirm().click(); });
    assert.equal(confirm().disabled, true);
    assert.equal(host.querySelector('[data-session-archive]').disabled, true);
    await React.act(async () => { confirm().click(); host.querySelector('[data-session-archive]').click(); host.querySelector('[aria-label="Close dialog"]').click(); });
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['a'], ['a', { stopActivity: true }]], 'in-flight guard and close do not resubmit');
    assert.ok(host.querySelector('[role="dialog"]'));
    await React.act(async () => { reject(Error('temporary stop failure')); await flush(); });
    assert.ok(host.querySelector('[role="dialog"]'), 'failed confirmation remains retryable');
    assert.match(host.querySelector('[role="dialog"] [role="alert"]').textContent, /重试|retry/i);
    assert.equal(host.querySelector('[role="dialog"] [role="alert"]').className, 'dsh-nav-fold-archive-error', 'retry error needs styling even when Modal portals outside the row');
    await React.act(async () => { confirm().click(); });
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['a'], ['a', { stopActivity: true }], ['a', { stopActivity: true }]]);
    await React.act(async () => { resolve(); await flush(); });
    assert.equal(host.querySelector('[role="dialog"]'), null);
    assert.ok(host.querySelector('.dsh-nav-fold-session'), 'successful promise still waits for authoritative host snapshot');
    await archiveSnapshot();
    assert.equal(host.querySelector('.dsh-nav-fold-session'), null);
  });
});

test('generic archive failure is non-destructive and can retry without forced stop', async () => {
  const calls = [];
  await withArchiveView({ archiveSession: async (...args) => { calls.push(args); throw Error('network'); } }, async ({ host }) => {
    await React.act(async () => { host.querySelector('[data-session-archive]').click(); await flush(); });
    assert.equal(host.querySelector('[role="dialog"]'), null);
    assert.match(host.querySelector('[role="alert"]').textContent, /重试|retry/i);
    assert.ok(host.querySelector('.dsh-nav-fold-session'));
    await React.act(async () => { host.querySelector('[data-session-archive]').click(); await flush(); });
    assert.deepEqual(calls, [['a'], ['a']], 'generic errors never trigger forced stop');
  }, { favorites: true });
});

test('missing archive API fails closed without a stop attempt or navigation', async () => {
  const calls = [];
  await withArchiveView({ openSession: id => calls.push(id) }, async ({ host }) => {
    const button = host.querySelector('[data-session-archive]');
    assert.equal(button.disabled, true);
    await React.act(async () => { host.querySelector('[data-session-menu]').click(); });
    await React.act(async () => { [...host.querySelectorAll('[role="menuitem"]')].find(item => /归档会话/.test(item.textContent)).click(); });
    assert.deepEqual(calls, []);
    assert.match(host.querySelector('[role="alert"]').textContent, /不可用|unavailable/i);
    assert.equal(host.querySelector('[role="dialog"]'), null);
  });
});

test('ordinary archive request blocks concurrent Pin and duplicate menu submissions', async () => {
  const calls = [];
  let resolve;
  await withArchiveView({ archiveSession: id => { calls.push(['archive', id]); return new Promise(yes => { resolve = yes; }); },
    unpinSession: async id => { calls.push(['unpin', id]); } }, async ({ host }) => {
    await React.act(async () => { host.querySelector('[data-session-archive]').click(); });
    assert.equal(host.querySelector('[data-session-pin]').disabled, true);
    await React.act(async () => { host.querySelector('[data-session-menu]').click(); });
    await React.act(async () => {
      [...host.querySelectorAll('[role="menuitem"]')].find(item => /归档会话/.test(item.textContent)).click();
      host.querySelector('[data-session-pin]').click(); });
    assert.deepEqual(calls, [['archive', 'a']]);
    await React.act(async () => { resolve(); await flush(); });
    assert.equal(host.querySelector('[data-session-archive]').disabled, false);
  }, { favorites: true });
});

test('archive confirmation retry error retains danger styling outside the row portal', () => {
  assert.match(source, /\.dsh-nav-fold-archive-error\s*\{[^}]*color:\s*var\(--dsw-alias-label-danger/);
});

test('archive controls reserve three targets at 220px without hover layout shifts', () => {
  const title = source.match(/\.dsh-nav-fold-session-title\s*\{([^}]*)\}/)?.[1];
  const actions = source.match(/\.dsh-nav-fold-session-actions\s*\{([^}]*)\}/)?.[1];
  assert.match(title, /padding-right:\s*82px/);
  assert.match(title, /overflow:\s*hidden/);
  assert.match(actions, /position:\s*absolute/);
  assert.match(actions, /gap:\s*2px/);
  assert.match(source, /@media\s*\(hover:\s*none\)[^\n]*\.dsh-nav-fold-session-actions/);
});
