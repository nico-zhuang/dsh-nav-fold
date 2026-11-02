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
const native = () => ({ options: { name: 'sidebar.workspaces' }, registrant: 'Gb', locale: 'workspace', children: { 'sidebar.workspaces.session.menu.item': { kind: 'list' }, 'sidebar.workspaces.session.row.action': { kind: 'list' } } });
const flush = async () => { await Promise.resolve(); await new Promise(resolve => setTimeout(resolve, 0)); };

function mount({ savedOn = false, active = false, peers = [], status = 'ready', syncCallbacks = false, nativePresent = true, folded = false, uiWorkspace = {} } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url: 'http://localhost/' });
  if (savedOn) dom.window.localStorage.setItem('dsh-nav-fold:workspace-tabs', 'on');
  if (folded) dom.window.localStorage.setItem('dsh-nav-fold:workspace-tabs-collapsed', 'true');
  const listeners = new Set();
  const form = {
    snapshot: { status, value: { workspaceViewsEnabled: active }, writable: true, revision: 1 },
    getSnapshot() { return this.snapshot; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async set(field, value) { assert.equal(field, 'workspaceViewsEnabled'); this.publish(value); return true; },
    publish(value) { this.snapshot = { status: 'ready', value: { workspaceViewsEnabled: value }, writable: true, revision: this.snapshot.revision + 1 }; for (const fn of listeners) fn(); },
    setStatus(status) { this.snapshot = { ...this.snapshot, status, revision: this.snapshot.revision + 1 }; for (const fn of listeners) fn(); },
  };
  const entries = [...(nativePresent ? [native()] : []), ...peers];
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
    register(options, component) { const entry = { options: { name: options.name, priority: options.priority }, component, registrant: options.registrant, children: options.children, locale: options.locale }; if (options.name === 'plugins.bundle.config') settingsPages.set(options.key, component); if (options.name === 'sidebar.workspaces') { entries.push(entry); notify(); } return () => { settingsPages.delete(options.key); const index = entries.indexOf(entry); if (index >= 0) { entries.splice(index, 1); notify(); } }; },
    addPeer(registrant = 'another-sidebar') { entries.push({ options: { name: 'sidebar.workspaces' }, registrant }); notify(); },
    removePeer() { const index = entries.findIndex(entry => entry.registrant === 'another-sidebar'); if (index >= 0) { entries.splice(index, 1); notify(); } },
  };
  let bundle;
  vm.runInNewContext(source, { window: Object.assign(dom.window, { __ModuleLoader__: { load: (value) => { bundle = value; } } }), document: dom.window.document, MutationObserver: dom.window.MutationObserver });
  const client = bundle.factory((id) => id === 'react' ? React : id === '@deepseek-ai/dsh-client-ui-primitives'
    ? {
      StateDot: ({ state }) => React.createElement('i', { 'data-dsh-state-dot': state }),
      Menu: ({ anchor, children, open, onClose }) => React.createElement('span', null, anchor,
        open && React.createElement('div', { role: 'menu', onKeyDown: event => { if (event.key === 'Escape') onClose(); } }, children)),
      MenuItemButton: ({ onSelect, children }) => React.createElement('button', { type: 'button', role: 'menuitem', onClick: onSelect }, children),
      IconEllipsisOutlineRegular: () => React.createElement('svg', { 'aria-hidden': true }),
      IconPinOutlineRegular: () => React.createElement('svg', { 'aria-hidden': true }),
      IconPinFillRegular: () => React.createElement('svg', { 'aria-hidden': true }),
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

test('pre-existing competing occupant disables alternate workspace view rather than shadowing peer', async () => {
  const peer = { options: { name: 'sidebar.workspaces', priority: 50 }, registrant: 'peer-plugin' };
  const app = mount({ active: true, peers: [peer] });
  try {
    await flush();
    assert.equal(app.entries.includes(peer), true);
    assert.equal(app.entries.length, 2);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
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
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false, 'confirmed collision is saved as disabled');
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    assert.equal(app.doc.querySelector('#workspaces').textContent, 'Native workspace tree');
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
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.equal(app.entries.length, 2, 'native and peer remain');
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
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
  } finally { app.dispose(); }
});

test('failed automatic disable and form loading cannot silently rearm a quarantined view', async () => {
  const app = mount({ active: true });
  try {
    app.form.set = async () => false;
    app.slots.addPeer(); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]'), null);
    app.slots.removePeer(); await flush();
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

test('after collision only settings off-to-on Save can rearm a now-safe view', async () => {
  const app = mount({ active: true });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = app.dom.window; globalThis.document = app.doc; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    app.slots.addPeer(); await flush();
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
    app.slots.removePeer(); await flush();
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
    app.slots.addPeer(); await flush();
    app.slots.removePeer(); await flush();
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

test('outer fold control preserves Activity selection, native slot, and a quiet current-mode marker', async () => {
  const app = mount({ active: true });
  try {
    await flush();
    const row = app.doc.querySelector('[data-dsh-workspace-tabs-row]');
    const toggle = app.doc.querySelector('[data-dsh-workspace-tabs-toggle]');
    assert.ok(row && toggle, 'one owned row with a separate outer control');
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(app.doc.querySelectorAll('[data-dsh-workspace-tabs] button[data-view]').length, 3);
    app.doc.querySelector('[data-view="activity"]').click();
    const ownEntry = app.entries.find(entry => entry.registrant === 'dsh-nav-fold:workspace-views');
    toggle.click();
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(row.dataset.collapsed, 'true');
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]').hidden, true);
    assert.match(toggle.getAttribute('aria-label'), /活动.*展开/);
    assert.ok(toggle.querySelector('svg[data-current-view="activity"]'));
    assert.equal(app.entries.find(entry => entry.registrant === 'dsh-nav-fold:workspace-views'), ownEntry);
    assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, true);
    assert.equal(app.dom.window.localStorage.getItem('dsh-nav-fold:workspace-tabs-collapsed'), 'true');
    toggle.click();
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]').hidden, false);
    assert.equal(app.doc.querySelector('[data-view="activity"]').getAttribute('aria-pressed'), 'true');
    assert.equal(app.entries.find(entry => entry.registrant === 'dsh-nav-fold:workspace-views'), ownEntry);
  } finally { app.dispose(); }
});

test('saved folded preference is visual only and disappearing feature removes its fold control', async () => {
  const app = mount({ active: true, folded: true });
  try {
    await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]').hidden, true);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-toggle]').getAttribute('aria-expanded'), 'false');
    app.form.publish(false); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-toggle]'), null);
    assert.equal(app.entries.length, 1);
    app.form.publish(true); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs]').hidden, true);
    app.slots.addPeer(); await flush();
    assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
    assert.equal(app.doc.querySelector('#workspaces').textContent, 'Native workspace tree');
  } finally { app.dispose(); }
});

test('host removing either owned row child quarantines alternate view instead of leaving an invisible override', async () => {
  for (const selector of ['[data-dsh-workspace-tabs]', '[data-dsh-workspace-tabs-toggle]']) {
    const app = mount({ active: true });
    try {
      await flush(); app.doc.querySelector('[data-view="activity"]').click();
      app.doc.querySelector(selector).remove(); await flush();
      assert.equal(app.form.getSnapshot().value.workspaceViewsEnabled, false);
      assert.equal(app.doc.querySelector('[data-dsh-workspace-tabs-row]'), null);
      assert.equal(app.entries.length, 1, 'own singleton override removed');
      assert.equal(app.doc.querySelector('#workspaces').textContent, 'Native workspace tree');
    } finally { app.dispose(); }
  }
});

test('expanded three-tab frame reserves equal left and right widths around the outer fold button', () => {
  const css = source.match(/\[data-dsh-workspace-tabs-row\]\s*\{([^}]*)\}/)?.[1];
  assert.ok(css, 'plugin-owned layout row exists');
  assert.match(css, /display:\s*grid/);
  const tracks = css.match(/grid-template-columns:\s*(\d+)px\s+minmax\(0,\s*1fr\)\s+(\d+)px/);
  assert.ok(tracks, 'equal fixed outer grid tracks surround three equal tabs');
  assert.equal(tracks[1], tracks[2], 'tab frame center aligns with sidebar center');
  assert.equal(tracks[2], '28', 'outer track equals clickable fold-button width');
  assert.match(css, /(?:column-)?gap:\s*4px/);
  assert.match(source, /\[data-dsh-workspace-tabs-row\]::before\s*\{[^}]*content:\s*''/);
  assert.match(source, /\[data-dsh-workspace-tabs-row\]\[data-collapsed="true"\]::before\s*\{[^}]*display:\s*none/);
});

test('Pin B remains the lightly tilted Favorites glyph in both expanded and folded states', async () => {
  const app = mount({ active: true });
  try {
    await flush();
    const favorites = app.doc.querySelector('[data-view="favorites"]');
    const path = 'M8.5 5.5h7l-1 4 2 3v1H7.5v-1l2-3-1-4Z';
    assert.equal(favorites.querySelector('svg g')?.getAttribute('transform'), 'rotate(-24 12 12)');
    assert.equal(favorites.querySelector('svg path')?.getAttribute('d'), path);
    favorites.click();
    const toggle = app.doc.querySelector('[data-dsh-workspace-tabs-toggle]');
    toggle.click();
    assert.equal(favorites.getAttribute('aria-pressed'), 'true');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(toggle.querySelector('[data-current-view="favorites"] g')?.getAttribute('transform'), 'rotate(-24 12 12)');
    assert.equal(toggle.querySelector('[data-current-view="favorites"] path')?.getAttribute('d'), path);
  } finally { app.dispose(); }
});

test('small tab glyphs, discreet fold target, and reduced-motion support are scoped', async () => {
  assert.match(source, /\[data-dsh-workspace-tabs\] > button\[data-view\] svg\s*\{[^}]*width:\s*15px/);
  assert.match(source, /\[data-dsh-workspace-tabs-toggle\]\s*\{[^}]*width:\s*28px/);
  assert.match(source, /@media\s*\(prefers-reduced-motion:\s*reduce\)[^\n]*data-dsh-workspace-tabs-row/);
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
    assert.equal(items.length, 3, 'Open, Pin and Copy ID are the safe menu actions');
    assert.deepEqual(calls, [], 'opening menu does not open the conversation');
    await React.act(async () => { items[2].click(); await flush(); });
    assert.deepEqual(calls, [['copy', 'a']]);
    await React.act(async () => { dots.click(); });
    items = [...host.querySelectorAll('[role="menuitem"]')];
    await React.act(async () => { items[1].click(); await flush(); });
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
  assert.match(source, /\.dsh-nav-fold-session-title\s*\{[^}]*padding-right:\s*56px/);
  assert.match(source, /\.dsh-nav-fold-session:hover\s+\.dsh-nav-fold-session-actions,\s*\.dsh-nav-fold-session:focus-within\s+\.dsh-nav-fold-session-actions/);
  assert.match(source, /@media\s*\(hover:\s*none\)\s*\{\s*\.dsh-nav-fold-session-actions\s*\{[^}]*opacity:\s*1/);
  assert.match(source, /\.dsh-nav-fold-session-actions\s+button:focus-visible\s*\{[^}]*outline:/);
});

test('reduced motion disables the action strip fade', () => {
  assert.ok(/@media\s*\(prefers-reduced-motion:\s*reduce\)[^\n]*\.dsh-nav-fold-session-actions\s*\{[^}]*transition:\s*none/.test(source), 'action fade must stop when reduced motion is requested');
});
