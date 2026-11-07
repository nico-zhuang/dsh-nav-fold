import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const path = fileURLToPath(new URL('../lib/client.js', import.meta.url));

test('v0.4.10 release declares shortcuts and required client modules', () => {
  const manifest = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
  assert.deepEqual(manifest.dsh.client.inject, ['@deepseek-ai/dsh-client-ui-sidebar', '@deepseek-ai/dsh-client-ui-session', '@deepseek-ai/dsh-client-ui-workspace', '@deepseek-ai/dsh-client-ui-plugin-manager', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-shortcuts']); assert.deepEqual(manifest.dsh.client.inject, [...new Set(manifest.dsh.client.inject)], 'all required client modules are declared once');
  assert.equal(manifest.version, '0.4.10', 'publish the same nav-fold package as its next stable version');
  assert.ok(manifest.files.includes('THIRD_PARTY_NOTICES.md'), 'release tarball carries the upstream MIT notice');
});
const panel = (name) => `<button class="_3WPZCG_panelRow" aria-label="${name}"><span class="_3WPZCG_panelGlyph">★</span><span class="_3WPZCG_panelTitle">${name}</span></button>`;
const navigation = (name = 'Plugins') => `<nav class="_3WPZCG_panelList" aria-label="Global panels">${panel(name)}${panel('Tasks')}</nav><div id="workspaces">Workspace and sessions</div>`;
const workspaceSidebar = () => `<div class="kB3qhq_root">${navigation().replace('<div id="workspaces">Workspace and sessions</div>', '<div class="kB3qhq_regionArea" id="workspaces">Workspace and sessions</div>')}<div class="kB3qhq_footArea"></div></div>`;

function settingsForm(initial = false) {
  let snapshot = { status: 'ready', writable: true, revision: 0, value: { workspaceViewsEnabled: initial, hideBrandEnabled: false } };
  const listeners = new Set();
  const publish = (patch) => { snapshot = { ...snapshot, ...patch, revision: snapshot.revision + 1, value: { ...snapshot.value, ...patch.value } }; for (const listener of listeners) listener(); };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    accept(value) { publish({ value: { workspaceViewsEnabled: value } }); },
    acceptBrand(value) { publish({ value: { hideBrandEnabled: value } }); },
    acceptNavigation(value) { publish({ value: { navigationEnabled: value } }); },
    setStatus(status) { publish({ status }); },
    async set(key, value) { assert.ok(['workspaceViewsEnabled', 'hideBrandEnabled', 'navigationEnabled'].includes(key)); publish({ value: { [key]: value } }); return true; },
  };
}

function slotFixture() {
  const entries = new Map();
  const listeners = new Map();
  const injected = [];
  const native = { options: { name: 'sidebar.workspaces' }, registrant: 'Gb', locale: 'workspace', children: {
    'sidebar.workspaces.session.menu.item': {}, 'sidebar.workspaces.session.row.action': {},
  } };
  let nativeEntries = [native];
  const notify = (name) => { for (const listener of listeners.get(name) || []) queueMicrotask(listener); };
  const slots = {
    inject: (_name, fn) => { const cleanup = fn(); if (typeof cleanup === 'function') injected.push(cleanup); return cleanup; },
    register(spec, component) {
      assert.ok(['sidebar.workspaces', 'plugins.bundle.config'].includes(spec.name));
      entries.set(spec.name, { spec, component }); notify(spec.name);
      return () => { if (entries.get(spec.name)?.component === component) { entries.delete(spec.name); notify(spec.name); } };
    },
    entries(name) { return name === 'sidebar.workspaces' ? [...nativeEntries, ...(entries.has(name) ? [{ options: entries.get(name).spec, registrant: entries.get(name).spec.registrant }] : [])] : []; },
    entriesOfSlot(name) { return this.entries(name).sort((a, b) => (a.options.priority ?? 0) - (b.options.priority ?? 0)); },
    spec(name) { return name === 'sidebar.workspaces' ? { kind: 'single', scope: 'root' } : undefined; },
    subscribe(name, listener) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(listener); return () => listeners.get(name).delete(listener); },
  };
  return { entries, slots, dispose() { for (const cleanup of injected.reverse()) cleanup(); }, replaceNative(value) { nativeEntries = value; notify('sidebar.workspaces'); } };
}
const configForms = (form) => ({ get: (id) => id === 'nav-fold' ? form : undefined });

function start(html = navigation(), savedState, savedOrder, setup) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, { url: 'http://localhost/' });
  const services = setup?.(dom.window) || {};
  if (savedState) dom.window.localStorage.setItem('dsh-sidebar-nav-collapse', savedState);
  if (savedOrder) dom.window.localStorage.setItem('dsh-sidebar-nav-collapse:order', savedOrder);
  let bundle;
  const code = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
  assert.match(code, /window\.__ModuleLoader__\.load/, 'client bundle must exist');
  vm.runInNewContext(code, { window: Object.assign(dom.window, { __ModuleLoader__: { load: (value) => { bundle = value; } } }), document: dom.window.document, MutationObserver: dom.window.MutationObserver });
  assert.equal(bundle.id, 'dsh-nav-fold');
  const client = bundle.factory((id) => { if (id === 'react') return React; if (id === '@deepseek-ai/dsh-client-ui-primitives') return {
    StateDot: ({ state }) => React.createElement('span', { 'data-host-state-dot': state }),
    Menu: ({ anchor, children, open }) => React.createElement('span', null, anchor, open && React.createElement('span', { role: 'menu' }, children)),
    MenuItemButton: ({ onSelect, children }) => React.createElement('button', { type: 'button', onClick: onSelect }, children),
    IconEllipsisOutlineRegular: () => React.createElement('svg', { 'aria-hidden': true }),
    IconPinOutlineRegular: () => React.createElement('svg', { 'aria-hidden': true }),
    IconPinFillRegular: () => React.createElement('svg', { 'aria-hidden': true }),
    IconArchiveOutlineRegular: () => React.createElement('svg', { 'aria-hidden': true }),
    Button: ({ children, ...props }) => React.createElement('button', { type: 'button', ...props }, children),
    Modal: ({ open, title, description, footer, onClose, children }) => open && React.createElement('div', { role: 'dialog', 'aria-label': title },
      React.createElement('p', null, description), children, footer,
      React.createElement('button', { type: 'button', 'aria-label': 'Close dialog', onClick: onClose }, '×')),
  }; throw Error(`unexpected dependency: ${id}`); });
  const disposers = [];
  client.apply({ effect: (fn) => { disposers.push(fn()); }, ...services });
  return { dom, client, dispose: () => { for (const fn of disposers.reverse()) fn(); }, doc: dom.window.document };
}
const flush = async () => { await Promise.resolve(); await new Promise(resolve => setTimeout(resolve, 0)); };

test('old localStorage opt-in is ignored; accepted setting mounts after DSH creates sidebar', async () => {
  const { slots, entries } = slotFixture();
  const form = settingsForm();
  const { doc, dom, dispose } = start('<div id="loading"></div>', undefined, undefined, (win) => {
    win.localStorage.setItem('dsh-nav-fold:workspace-tabs', 'on');
    return { slots, sessions: {}, uiWorkspace: {}, configForms: configForms(form) };
  });
  try {
    doc.body.innerHTML = workspaceSidebar();
    await flush();
    assert.equal(doc.querySelector('[data-dsh-workspace-tabs]'), null, 'obsolete localStorage setting cannot enable views');
    assert.equal(doc.querySelector('[data-dsh-workspace-tabs-toggle]'), null, 'workspace quick toggle was removed');
    assert.ok(entries.has('plugins.bundle.config'), 'settings page is registered in the official plugin config slot');
    assert.match(renderToStaticMarkup(React.createElement(entries.get('plugins.bundle.config').component, { view: 'page' })), /工作区／活动／收藏三栏/);
    form.accept(true);
    await flush();
    assert.ok(doc.querySelector('[data-dsh-workspace-tabs]'), 'accepted form opt-in appears when host sidebar mounts later');
    assert.equal(dom.window.localStorage.getItem('dsh-nav-fold:workspace-tabs'), 'on', 'obsolete setting is not rewritten');
  } finally { dispose(); }
});

test('saved brand setting owns a macOS-only style independently of workspace views and restores on dispose', async () => {
  const { slots } = slotFixture();
  const form = settingsForm(false);
  const html = `<div data-platform="darwin">${workspaceSidebar().replace('<nav', '<div class="kB3qhq_logoRow">Brand</div><nav')}</div>`;
  const { doc, dom, dispose } = start(html, undefined, undefined, () => ({ slots, sessions: {}, uiWorkspace: {}, configForms: configForms(form) }));
  const ownedStyle = () => doc.querySelector('style[data-plugin="dsh-nav-fold"][data-plugin-css="dsh-nav-fold/hide-brand"]');
  const foreignStyle = doc.createElement('style'); foreignStyle.dataset.pluginCss = 'dsh-hide-brand/logo-row'; doc.head.append(foreignStyle);
  const collidingStyle = doc.createElement('style'); collidingStyle.dataset.pluginCss = 'dsh-nav-fold/hide-brand';
  collidingStyle.dataset.plugin = 'another-context'; doc.head.append(collidingStyle);
  const selector = '[data-platform="darwin"] .kB3qhq_root > [class*="logoRow"]';
  try {
    assert.equal(ownedStyle(), null, 'default-off setting leaves the native brand visible');
    assert.equal(doc.querySelector('[data-dsh-workspace-tabs]'), null, 'workspace views remain independently disabled');
    await form.set('hideBrandEnabled', true);
    await form.set('hideBrandEnabled', true);
    assert.equal(doc.querySelectorAll('style[data-plugin="dsh-nav-fold"][data-plugin-css="dsh-nav-fold/hide-brand"]').length, 1, 'repeated on never duplicates Fold-owned style');
    assert.match(ownedStyle()?.textContent || '', /display:\s*none\s*!important/);
    assert.match(ownedStyle().textContent, /\[data-platform="darwin"\]/);
    assert.equal(doc.querySelectorAll(selector).length, 1, 'macOS brand row is the only matching target');
    doc.querySelector('[data-platform]').dataset.platform = 'win32';
    assert.equal(doc.querySelectorAll(selector).length, 0, 'non-macOS interactive brand row is unaffected');
    form.setStatus('loading');
    assert.equal(ownedStyle(), null, 'unready configuration fails open to native branding');
    form.setStatus('ready');
    assert.ok(ownedStyle(), 'a ready saved setting restores the style');
    await form.set('hideBrandEnabled', false);
    assert.equal(ownedStyle(), null, 'saving off restores the brand');
    assert.equal(foreignStyle.isConnected, true, 'Fold never removes another plugin style');
    assert.equal(collidingStyle.isConnected, true, 'even a matching CSS key does not confer ownership');
    form.acceptBrand(true);
    assert.ok(ownedStyle());
  } finally { dispose(); dom.window.close(); }
  assert.equal(ownedStyle(), null, 'unloading Fold removes its own style');
});

test('host changing region class while Activity is open restores native slot', async () => {
  const { slots, entries } = slotFixture();
  const form = settingsForm(true);
  const { doc, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots, sessions: {}, uiWorkspace: {}, configForms: configForms(form) }));
  try {
    assert.ok(doc.querySelector('[data-dsh-workspace-tabs]'));
    doc.querySelector('[data-view="activity"]').click();
    doc.querySelector('#workspaces').className = 'different_host_region';
    await flush();
    assert.equal(entries.has('sidebar.workspaces'), false);
    assert.equal(doc.querySelector('[data-dsh-workspace-tabs]'), null);
  } finally { dispose(); }
});

test('English host tabs have accessible localized names and decorative SVG icons', () => {
  const { slots } = slotFixture();
  const form = settingsForm(true);
  const { doc, dispose } = start(workspaceSidebar(), undefined, undefined, (win) => { win.document.documentElement.lang = 'en'; return { slots, sessions: {}, uiWorkspace: {}, configForms: configForms(form) }; });
  try {
    const buttons = [...doc.querySelectorAll('[data-dsh-workspace-tabs] button')];
    assert.deepEqual(buttons.map(button => button.getAttribute('aria-label')), ['工作区 / Workspaces', '活动 / Activity', '收藏 / Favorites']);
    assert.deepEqual(buttons.map(button => button.title), ['Workspaces', 'Activity', 'Favorites']);
    assert.ok(buttons.every(button => button.querySelector('svg[aria-hidden="true"] path') && button.textContent === ''), 'icon-only tabs preserve accessible labels');
  } finally { dispose(); }
});

test('invalid rc5 sidebar structure removes alternate slot instead of hiding native tree', async () => {
  const { slots, entries } = slotFixture();
  const form = settingsForm(true);
  const { doc, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots, sessions: {}, uiWorkspace: {}, configForms: configForms(form) }));
  try {
    assert.ok(doc.querySelector('[data-dsh-workspace-tabs]'));
    doc.querySelector('[data-view="activity"]').click();
    assert.equal(entries.has('sidebar.workspaces'), true);
    const extra = doc.createElement('div');
    extra.className = 'kB3qhq_regionArea';
    doc.querySelector('.kB3qhq_root').append(extra);
    await flush();
    assert.equal(entries.has('sidebar.workspaces'), false, 'a changed host shape restores the native singleton');
    assert.equal(doc.querySelector('[data-dsh-workspace-tabs]'), null);
  } finally { dispose(); }
});

test('workspace views require a verified native occupant, root singleton, and winning override', () => {
  const invalid = [
    ['missing native child markers', fixture => fixture.replaceNative([{ options: { name: 'sidebar.workspaces' }, registrant: 'Gb', locale: 'workspace', children: {} }])],
    ['foreign occupant', fixture => fixture.replaceNative([{ options: { name: 'sidebar.workspaces' }, registrant: 'other-plugin', locale: 'other', children: {} }])],
    ['multiple native occupants', fixture => fixture.replaceNative([...fixture.slots.entries('sidebar.workspaces'), ...fixture.slots.entries('sidebar.workspaces')])],
    ['non-root slot', fixture => { fixture.slots.spec = () => ({ kind: 'single', scope: 'workspace' }); }],
    ['non-single slot', fixture => { fixture.slots.spec = () => ({ kind: 'multi', scope: 'root' }); }],
    ['override loses winner', fixture => { fixture.slots.entriesOfSlot = name => fixture.slots.entries(name); }],
  ];
  for (const [description, invalidate] of invalid) {
    const fixture = slotFixture(); invalidate(fixture);
    const form = settingsForm(true);
    const { doc, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots: fixture.slots, sessions: {}, uiWorkspace: {}, configForms: configForms(form) }));
    try {
      if (description === 'override loses winner') doc.querySelector('[data-view="activity"]').click();
      assert.equal(doc.querySelector('[data-dsh-workspace-tabs]'), null, description);
      assert.equal(fixture.entries.has('sidebar.workspaces'), false, description);
      assert.ok(fixture.entries.has('plugins.bundle.config'), 'config registration stays independent from workspace override');
      assert.equal(doc.querySelector('#workspaces')?.textContent, 'Workspace and sessions');
    } finally { dispose(); }
  }
});

test('accepted three views keep native workspace slot until alternate selected and saved disable', async () => {
  const { slots, entries } = slotFixture();
  const form = settingsForm();
  const { doc, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots, sessions: {}, uiWorkspace: {}, configForms: configForms(form) }));
  try {
    assert.equal(doc.querySelector('[data-dsh-workspace-tabs]'), null);
    assert.equal(entries.has('sidebar.workspaces'), false);
    assert.equal(doc.querySelector('[data-dsh-workspace-tabs-toggle]'), null);
    form.accept(true);
    const tabs = doc.querySelector('[data-dsh-workspace-tabs]');
    assert.ok(tabs, 'a switch appears immediately above native workspace region');
    const css = doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent;
    assert.match(css, /\[data-dsh-workspace-tabs\]::before[^}]*transition:\s*transform/, 'selected thumb slides rather than replacing a rigid highlight');
    assert.match(css, /prefers-reduced-motion: reduce[^}]*data-dsh-workspace-tabs[^}]*transition:\s*none/s, 'reduced motion removes tab travel');
    assert.match(css, /kB3qhq_root\.kB3qhq_collapsed[^}]*data-dsh-workspace-tabs-row[^}]*display:\s*none/, 'native rail hides the owned tabs row rather than squeezing the three-tab switch');
    assert.equal(tabs.parentElement.nextElementSibling.id, 'workspaces');
    assert.equal(tabs.nextElementSibling, null, 'no tab-specific hide control follows the three equal tab cells');
    assert.deepEqual([...tabs.querySelectorAll('button')].map(button => button.dataset.view), ['workspace', 'activity', 'favorites']);
    assert.equal(tabs.children.length, 3, 'no decorative child may push the third grid tab onto a second row');
    assert.equal(entries.has('sidebar.workspaces'), false, 'Workspaces remains native');
    tabs.querySelector('[data-view="activity"]').click();
    assert.equal(entries.get('sidebar.workspaces')?.spec.priority, -100);
    tabs.querySelector('[data-view="favorites"]').click();
    assert.equal(entries.get('sidebar.workspaces')?.spec.priority, -100);
    tabs.querySelector('[data-view="workspace"]').click();
    assert.equal(entries.has('sidebar.workspaces'), false);
    form.accept(false);
    await flush();
    assert.equal(doc.querySelector('[data-dsh-workspace-tabs]'), null);
    assert.equal(entries.has('sidebar.workspaces'), false);
  } finally { dispose(); }
});

test('alternate workspace occupant renders real session rows and native pinned favorites', () => {
  const { slots, entries } = slotFixture();
  const form = settingsForm(true);
  const { doc, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots, sessions: {}, uiWorkspace: { openSession: () => {} }, configForms: configForms(form) }));
  const list = { phase: 'ready', ids: ['a', 'b'], byId: { a: { id: 'a', title: 'Draft proposal', updatedAt: 42, running: true }, b: { id: 'b', title: 'Reference notes', updatedAt: 40 } } };
  const data = { useSessions: () => list, useSessionStatus: () => new Map(), useWorkspaces: () => ({ items: [{ title: 'Sample Space', sessionIds: ['a','b'] }], pinnedSessionIds: ['b'], archivedSessionIds: [] }), wide: true };
  try {
    doc.querySelector('[data-view="activity"]').click();
    const activity = renderToStaticMarkup(React.createElement(entries.get('sidebar.workspaces').component, data));
    assert.match(activity, /Draft proposal/);
    assert.match(activity, /Reference notes/);
    assert.match(activity, /Sample Space/);
    assert.match(activity, /运行中|Running/);
    assert.match(activity, /aria-label="Draft proposal · Sample Space · 运行中"/, 'screen-reader button name must announce its status');
    assert.match(activity, /data-host-state-dot="ongoing"/, 'running state uses the official host StateDot primitive');
    const css = doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent;
    assert.match(css, /\[data-dsh-workspace-view\]/);
    assert.match(css, /\.dsh-nav-fold-session-main:focus-visible/, 'focus follows the actual open button, not the row wrapper');
    assert.match(css, /\.dsh-nav-fold-session-subtitle\s*\{[^}]*color:\s*color-mix\(/, 'subtitle must adapt to both theme foregrounds rather than #888 on white');
    assert.match(css, /\.dsh-nav-fold-empty\s*\{[^}]*color:\s*color-mix\(/);
    assert.match(css, /\[data-dsh-workspace-view\][^}]*animation:\s*dshWorkspaceEnter/, 'alternate content should ease in without animating native tree');
    assert.match(css, /prefers-reduced-motion: reduce[^}]*\[data-dsh-workspace-view\][^}]*animation:\s*none/s);
    doc.querySelector('[data-view="favorites"]').click();
    const favorites = renderToStaticMarkup(React.createElement(entries.get('sidebar.workspaces').component, data));
    assert.match(favorites, /Reference notes/);
    assert.doesNotMatch(favorites, /Draft proposal/);
    const pending = renderToStaticMarkup(React.createElement(entries.get('sidebar.workspaces').component, { ...data, useSessions: () => ({ phase: 'pending', ids: [], byId: {} }) }));
    assert.match(pending, /正在加载会话|Loading/);
    assert.doesNotMatch(pending, /暂无收藏会话|No pinned sessions/, 'loading should not look like confirmed emptiness');
  } finally { dispose(); }
});

test('Activity inherits running subagent status from rc5 projection catalog', () => {
  const { client, dispose } = start();
  const list = { phase: 'ready', ids: ['parent', 'recent'], byId: { parent: { id: 'parent', title: 'Delegated work', running: false, updatedAt: 1 }, recent: { id: 'recent', title: 'Just opened', running: false, updatedAt: 99 } }, projectionsBySession: { parent: { values: { subagentCatalog: [{ id: 'child-not-in-byId' }] } } } };
  const statuses = new Map([['child-not-in-byId', { running: true }]]);
  const result = client.__test__.selectWorkspaceViews(list, statuses, {}, new Set());
  assert.equal(result.activity[0].id, 'parent');
  assert.equal(result.activity[0].kind, 'running');
  dispose();
});

test('Activity caps only recent rows while Favorites retains native pins beyond that cap', () => {
  const { client, dispose } = start();
  const ids = Array.from({ length: 24 }, (_, index) => `s${index}`);
  const byId = Object.fromEntries(ids.map((id, index) => [id, { id, title: id, updatedAt: 24 - index, running: id === 's23' }]));
  const list = { ids, byId, phase: 'ready' };
  const views = client.__test__.selectWorkspaceViews(list, new Map(), { pinnedSessionIds: ['s22'] }, new Set());
  assert.equal(views.activity.length, 21, '20 recent plus the active session are visible');
  assert.ok(views.activity.some(row => row.id === 's23' && row.kind === 'running'));
  assert.deepEqual(Array.from(views.favorites, row => row.id), ['s22']);
  dispose();
});

test('Activity uses host completionUnread without inventing unread for idle sessions', () => {
  const { client, dispose } = start();
  const list = { ids: ['done', 'idle'], byId: { done: { id: 'done', title: 'Done', running: false }, idle: { id: 'idle', title: 'Idle', completionUnread: true, running: false } } };
  const statuses = new Map([['done', { running: false, completionUnread: true }], ['idle', { running: false, completionUnread: false }]]);
  const result = client.__test__.selectWorkspaceViews(list, statuses, {}, new Set());
  assert.equal(result.activity.find(row => row.id === 'done').kind, 'unread');
  assert.equal(result.activity.find(row => row.id === 'idle').kind, 'recent');
  dispose();
});

test('workspace activity keeps real states while favorites follows native pins', () => {
  const { client, dispose } = start();
  const ids = ['waiting', 'running', 'unread', 'recent', 'favorite', 'archived', 'blank', 'child'];
  const byId = Object.fromEntries(ids.map((id, index) => [id, { id, title: id, updatedAt: id === 'recent' ? 999 : ids.length - index, running: id === 'running', origin: id === 'child' ? 'subagent' : 'user', blank: id === 'blank' }]));
  const list = { ids, byId, phase: 'ready' };
  const statuses = new Map([['waiting', { pendingInteraction: { kind: 'approval' }, running: true }], ['running', { running: true }], ['recent', { pendingInteraction: { kind: 'tool' }, running: false }]]);
  const workspaces = { items: [{ path: '/tmp/Project', sessionIds: ids }], pinnedSessionIds: ['favorite'], archivedSessionIds: ['archived'] };
  const result = client.__test__.selectWorkspaceViews(list, statuses, workspaces, new Set(['unread']));
  assert.deepEqual(Array.from(result.activity, row => row.id), ['waiting', 'running', 'unread', 'recent', 'favorite']);
  assert.deepEqual(Array.from(result.activity.slice(0, 3), row => row.kind), ['waiting', 'running', 'unread']);
  assert.equal(result.activity.find(row => row.id === 'recent').kind, 'recent', 'non-visible host pending kinds are not waiting');
  assert.deepEqual(Array.from(result.favorites, row => row.id), ['favorite']);
  assert.equal(result.activity[0].workspace, 'Project');
  dispose();
});

test('accepted workspace views are independent of global folding and have no quick toggle', () => {
  const { slots } = slotFixture();
  const form = settingsForm();
  const { doc, dom, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots, sessions: {}, uiWorkspace: {}, configForms: configForms(form) }));
  const nav = doc.querySelector('nav');
  const fold = nav.querySelector('[data-sidebar-nav-toggle]');
  assert.equal(doc.querySelector('[data-dsh-workspace-tabs-toggle]'), null);
  assert.equal(dom.window.localStorage.getItem('dsh-nav-fold:workspace-tabs'), null);
  assert.equal(nav.dataset.sidebarNavCollapsed, 'true');
  form.accept(true);
  assert.ok(doc.querySelector('[data-dsh-workspace-tabs]'));
  assert.equal(nav.dataset.sidebarNavCollapsed, 'true', 'workspace setting never changes fold state');
  fold.click();
  assert.equal(nav.dataset.sidebarNavCollapsed, 'false');
  assert.ok(doc.querySelector('[data-dsh-workspace-tabs]'), 'fold state does not disable workspace views');
  form.accept(false);
  assert.equal(doc.querySelector('[data-dsh-workspace-tabs]'), null);
  assert.equal(nav.dataset.sidebarNavCollapsed, 'false', 'disabling views never changes fold state');
  assert.equal(dom.window.localStorage.getItem('dsh-nav-fold:workspace-tabs'), null);
  assert.equal(nav.nextElementSibling?.id, 'workspaces', 'workspace region remains in the native root');
  assert.equal(doc.querySelector('#workspaces')?.textContent, 'Workspace and sessions');
  dispose();
});

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
  assert.match(css, /data-sidebar-nav-collapsed="true"\][^{]*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*36px\)/, 'wrapped rows must share column origins instead of centering each flex line');
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

test('both states share a full-width slim bottom line with a legible SVG icon', () => {
  const { doc, dispose } = start();
  const nav = doc.querySelector('nav');
  const toggle = nav.querySelector('[data-sidebar-nav-toggle]');
  const css = doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent;
  assert.match(css, /nav\[class\*="panelList"\]\[data-sidebar-nav-collapsed\][^{]*\{[^}]*position:\s*relative;[^}]*padding-bottom:\s*24px/);
  assert.match(css, /align-content:\s*start/, 'wrapped rows must not stretch while nav height animates');
  assert.match(css, /\[data-sidebar-nav-toggle\][^{]*\{[^}]*position:\s*absolute;[^}]*bottom:\s*0;[^}]*left:\s*0;[^}]*width:\s*100%;[^}]*height:\s*24px/);
  assert.match(css, /\[data-sidebar-nav-toggle\][^{]*\{[^}]*border:\s*0;[^}]*background:\s*transparent/);
  assert.match(css, /\[data-sidebar-nav-toggle\]::before[^}]*\{/);
  assert.match(css, /\[data-sidebar-nav-toggle\]::after[^}]*\{/);
  assert.match(css, /\[data-sidebar-nav-toggle\]\s+svg[^{]*\{[^}]*width:\s*14px;[^}]*height:\s*14px/);
  assert.match(css, /mask-image:\s*linear-gradient/, 'line ends fade instead of cutting off');
  assert.match(css, /height:\s*0\.5px;[^}]*opacity:\s*\.16/, 'separator should be thinner and more subdued');
  assert.match(css, /\[data-sidebar-nav-toggle\]:hover::after\s*\{\s*opacity:\s*\.3/, 'hover must not make the divider heavy');
  assert.match(css, /@keyframes\s+sidebarBreathe/, 'arrow breathes in both states');
  assert.match(css, /prefers-reduced-motion:\s*reduce[^}]*animation:\s*none/, 'reduced motion stops breathing');
  assert.equal(nav.lastElementChild, toggle, 'visual bottom toggle should also be last in keyboard focus order');
  assert.equal(toggle.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
  const closedPath = toggle.querySelector('path')?.getAttribute('d');
  toggle.click();
  assert.equal(nav.querySelectorAll('[data-sidebar-nav-toggle]').length, 1);
  assert.notEqual(toggle.querySelector('path')?.getAttribute('d'), closedPath);
  assert.equal(nav.nextElementSibling.id, 'workspaces');
  dispose();
});

test('startup never subscribes to ResizeObserver; native grid owns sidebar width', () => {
  let created = 0;
  const { doc, dispose } = start(navigation(), undefined, undefined, win => {
    win.ResizeObserver = class { constructor() { created++; } observe() {} unobserve() {} disconnect() {} };
  });
  assert.equal(created, 0, 'layout observers on plugin startup must not contribute to loading starvation');
  const css = doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent;
  assert.match(css, /grid-template-columns:\s*repeat\(auto-fit,\s*36px\)/);
  assert.match(css, /justify-content:\s*space-evenly/);
  dispose();
});

test('hover label uses CSS max-width to follow sidebar changes without JavaScript observation', () => {
  const { doc, dom, dispose } = start(navigation('A long panel name'));
  const nav = doc.querySelector('nav'), button = nav.querySelector('[data-sidebar-nav-toggle]');
  for (const label of button.querySelectorAll('[data-sidebar-label]')) label.getBoundingClientRect = () => ({ width: 180 });
  nav.querySelector('[aria-label="A long panel name"]').dispatchEvent(new dom.window.MouseEvent('pointerover', { bubbles: true }));
  assert.equal(button.querySelector('[data-sidebar-toggle-center]').style.width, '196px');
  const css = doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent;
  assert.match(css, /max-width:\s*calc\(100% - 32px\)/);
  dispose();
});

test('toggle animates icon placement and bar travel, cancels fast reversals, respects reduced motion', () => {
  const { doc, dom, dispose } = start();
  const nav = doc.querySelector('nav');
  const rows = [...nav.querySelectorAll('[class*="panelRow"]')];
  const currentHeight = () => nav.dataset.sidebarNavCollapsed === 'true' ? 80 : 160;
  const getStyle = dom.window.getComputedStyle.bind(dom.window);
  dom.window.getComputedStyle = el => el === nav ? { height: `${currentHeight()}px` } : getStyle(el);
  nav.getBoundingClientRect = () => ({ left: 0, top: 0, width: 180, height: currentHeight() });
  rows.forEach((row, index) => { row.getBoundingClientRect = () => nav.dataset.sidebarNavCollapsed === 'true' ? { left: index * 40, top: 0 } : { left: 0, top: index * 40 }; });
  dom.window.matchMedia = () => ({ matches: false });
  const played = [];
  let canceled = 0;
  dom.window.Element.prototype.animate = function (frames, options) {
    played.push({ element: this, frames, options });
    return { cancel() { canceled++; } };
  };
  const toggle = nav.querySelector('[data-sidebar-nav-toggle]');
  toggle.click();
  assert.equal(nav.dataset.sidebarNavCollapsed, 'false');
  assert.deepEqual(Array.from(played.find(item => item.element === nav).frames, frame => frame.height), ['80px', '160px']);
  assert.equal(played.find(item => item.element === rows[1]).frames[0].transform, 'translate(40px, -40px)');
  const firstCount = played.length;
  toggle.click();
  assert.equal(nav.dataset.sidebarNavCollapsed, 'true');
  assert.equal(canceled, firstCount);
  dom.window.matchMedia = () => ({ matches: true });
  toggle.click();
  assert.equal(nav.dataset.sidebarNavCollapsed, 'false');
  assert.equal(played.length, firstCount * 2);
  dispose();
});

test('host title restoration cannot create an observer feedback loop', async () => {
  let Native, deliveries = 0, capped = false;
  const { doc, dom, dispose } = start(navigation(), undefined, undefined, win => {
    Native = win.MutationObserver;
    win.MutationObserver = class extends Native { constructor(callback) { super(records => { if (++deliveries > 24) { capped = true; this.disconnect(); return; } callback(records); }); } };
  });
  const nav = doc.querySelector('nav'), row = nav.querySelector('[class*="panelRow"]');
  const peer = new Native(() => { if (!row.hasAttribute('title')) row.title = 'Host hint'; });
  peer.observe(row, { attributes: true, attributeFilter: ['title'] });
  try {
    row.title = 'Host hint';
    nav.insertAdjacentHTML('beforeend', panel('Future'));
    await flush();
    assert.equal(capped, false, 'title ownership must not starve the event loop');
    assert.ok(deliveries < 5);
    peer.disconnect();
    row.title = 'Updated host hint';
    row.dispatchEvent(new dom.window.MouseEvent('pointerover', { bubbles: true }));
    assert.equal(row.hasAttribute('title'), false, 'suppress native hint on actual hover without continuously policing title');
    nav.querySelector('[data-sidebar-nav-toggle]').click();
    assert.equal(row.title, 'Updated host hint');
  } finally { peer.disconnect(); dispose(); }
});

test('host rejecting the injected toggle falls back to native nav instead of reinjecting forever', async () => {
  let Native, deliveries = 0, capped = false;
  const { doc, dispose } = start(navigation(), undefined, undefined, win => {
    Native = win.MutationObserver;
    win.MutationObserver = class extends Native { constructor(callback) { super(records => { if (++deliveries > 24) { capped = true; this.disconnect(); return; } callback(records); }); } };
  });
  const nav = doc.querySelector('nav');
  const peer = new Native(() => nav.querySelector('[data-sidebar-nav-toggle]')?.remove());
  peer.observe(nav, { childList: true });
  try {
    nav.querySelector('[data-sidebar-nav-toggle]').remove();
    await flush();
    assert.equal(capped, false, 'a rejected control must not be reinserted in an endless microtask loop');
    assert.equal(nav.querySelector('[data-sidebar-nav-toggle]'), null);
    assert.equal(nav.hasAttribute('data-sidebar-nav-collapsed'), false);
    assert.equal(nav.querySelector('[class*="panelRow"]').draggable, false);
  } finally { peer.disconnect(); dispose(); }
});

test('repeated host row replacement cannot continually reinject the removed control', async () => {
  let Native, deliveries = 0, capped = false;
  const { doc, dispose } = start(navigation(), undefined, undefined, win => {
    Native = win.MutationObserver;
    win.MutationObserver = class extends Native { constructor(callback) { super(records => { if (++deliveries > 24) { capped = true; this.disconnect(); return; } callback(records); }); } };
  });
  const nav = doc.querySelector('nav');
  let replacements = 0;
  const peer = new Native(() => {
    if (nav.querySelector(':scope > [data-sidebar-nav-toggle]')) {
      replacements++;
      nav.replaceChildren(...[...nav.querySelectorAll(':scope > button[class*="panelRow"]')].map(row => row.cloneNode(true)));
    }
  });
  peer.observe(nav, { childList: true });
  try {
    nav.append(doc.createElement('span'));
    const deadline = Date.now() + 500;
    while ((nav.querySelector('[data-sidebar-nav-toggle]') || nav.hasAttribute('data-sidebar-nav-collapsed')) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    // After native ownership wins, observe another tick to catch unwanted reinjection.
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.equal(capped, false);
    assert.ok(replacements <= 2, 'a host that owns the row list must not be fought indefinitely');
    assert.equal(nav.querySelector('[data-sidebar-nav-toggle]'), null);
    assert.equal(nav.hasAttribute('data-sidebar-nav-collapsed'), false);
  } finally { peer.disconnect(); dispose(); }
});

test('unrelated conversation mutations do not rescan or rewrite global navigation', async () => {
  const { doc, dispose } = start();
  const query = doc.querySelectorAll.bind(doc); let scans = 0;
  doc.querySelectorAll = selector => { if (selector === 'nav[class*="panelList"]') scans++; return query(selector); };
  const conversation = doc.createElement('div'); conversation.setAttribute('aria-label', 'Conversation');
  doc.body.append(conversation); conversation.append(doc.createElement('p')); conversation.setAttribute('aria-label', 'Reply');
  await flush();
  assert.equal(scans, 0);
  dispose();
});

test('disposing with a queued navigation sync cannot recreate controls', async () => {
  const { doc, dispose } = start();
  doc.querySelector('nav').insertAdjacentHTML('beforeend', panel('Queued'));
  await Promise.resolve();
  dispose();
  await flush();
  assert.equal(doc.querySelector('[data-sidebar-nav-toggle]'), null);
  assert.equal(doc.querySelector('nav').hasAttribute('data-sidebar-nav-collapsed'), false);
});

test('persistent choice, future panel entries and sidebar remount keep same state', async () => {
  const { doc, dom, dispose } = start();
  const nav = doc.querySelector('nav');
  nav.querySelector('[data-sidebar-nav-toggle]').click();
  nav.insertAdjacentHTML('beforeend', panel('Future plugin'));
  await flush();
  assert.equal(nav.lastElementChild, nav.querySelector('[data-sidebar-nav-toggle]'));
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

test('collapsed icon hover instantly replaces arrow with current label without native tooltip', async () => {
  const { doc, dom, dispose } = start(`<nav class="_3WPZCG_panelList" aria-label="全局面板">${panel('插件')}${panel('记忆系统')}</nav>`);
  const nav = doc.querySelector('nav');
  const [first, second] = nav.querySelectorAll('[class*="panelRow"]');
  const toggle = nav.querySelector('[data-sidebar-nav-toggle]');
  for (const label of toggle.querySelectorAll('[data-sidebar-label]')) label.getBoundingClientRect = () => ({ width: 48 });
  const pointer = (row, type, relatedTarget = null) => row.dispatchEvent(new dom.window.MouseEvent(type, { bubbles: true, relatedTarget }));
  assert.equal(first.hasAttribute('title'), false);
  pointer(first, 'pointerover');
  assert.equal(toggle.querySelector('[data-sidebar-label-active]')?.textContent, '插件');
  assert.ok(parseFloat(toggle.querySelector('[data-sidebar-toggle-center]').style.width) > 28, 'separator should stretch smoothly around label');
  pointer(first, 'pointerout', second);
  pointer(second, 'pointerover', first);
  assert.equal(toggle.querySelector('[data-sidebar-label-active]')?.textContent, '记忆系统');
  second.setAttribute('aria-label', 'Memory');
  await flush();
  assert.equal(toggle.querySelector('[data-sidebar-label-active]')?.textContent, 'Memory');
  nav.insertAdjacentHTML('beforeend', panel('新增面板'));
  await flush();
  const future = nav.querySelector('[aria-label="新增面板"]');
  pointer(future, 'pointerover');
  assert.equal(toggle.querySelector('[data-sidebar-label-active]')?.textContent, '新增面板');
  pointer(future, 'pointerout');
  assert.equal(toggle.querySelector('[data-sidebar-label-active]'), null);
  first.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true }));
  assert.equal(toggle.querySelector('[data-sidebar-label-active]')?.textContent, '插件');
  pointer(second, 'pointerover');
  pointer(second, 'pointerout');
  assert.equal(toggle.querySelector('[data-sidebar-label-active]')?.textContent, '插件', 'pointer leaving should restore focused icon');
  toggle.click();
  assert.equal(toggle.querySelector('[data-sidebar-label-active]'), null);
  dispose();
  assert.equal(first.hasAttribute('title'), false);
});

test('collapsed icons show current localized names and restore original titles', async () => {
  const { doc, dispose } = start(`<nav class="_3WPZCG_panelList" aria-label="全局面板">${panel('插件')}${panel('记忆系统').replace('aria-label="记忆系统"', 'aria-label="记忆系统" title="old hint"')}</nav>`);
  const nav = doc.querySelector('nav');
  const rows = [...nav.querySelectorAll('[class*="panelRow"]')];
  assert.equal(rows[0].hasAttribute('title'), false);
  assert.equal(rows[1].hasAttribute('title'), false);
  rows[0].setAttribute('aria-label', 'Plugins');
  await flush();
  assert.equal(rows[0].hasAttribute('title'), false);
  const added = doc.createElement('button');
  added.className = '_3WPZCG_panelRow';
  added.setAttribute('aria-label', '新增面板');
  nav.append(added);
  await flush();
  assert.equal(added.hasAttribute('title'), false);
  nav.querySelector('[data-sidebar-nav-toggle]').click();
  assert.equal(rows[0].hasAttribute('title'), false);
  assert.equal(rows[1].title, 'old hint');
  rows[1].title = 'updated host hint';
  nav.append(doc.createElement('span'));
  await flush();
  assert.equal(rows[1].title, 'updated host hint');
  nav.querySelector('[data-sidebar-nav-toggle]').click();
  assert.equal(rows[1].hasAttribute('title'), false);
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

function shortcutFixture() {
  let command;
  let released = false, registrations = 0, releases = 0;
  return { shortcuts: { register(value) { command = value; registrations++; return () => { command = undefined; released = true; releases++; }; } },
    get command() { return command; }, get released() { return released; }, get registrations() { return registrations; }, get releases() { return releases; } };
}

test('saved navigation switch releases active focus and shortcut without disabling workspace views', async () => {
  const fixture = slotFixture(); const form = settingsForm(true); const shortcut = shortcutFixture();
  const { doc, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots: fixture.slots, shortcuts: shortcut.shortcuts,
    sessions: {}, uiWorkspace: {}, configForms: configForms(form) }));
  try {
    doc.querySelector('#workspaces').innerHTML = '<div role="treeitem" data-row-key="session:current" aria-selected="true">Current</div>';
    assert.equal(shortcut.registrations, 1, 'legacy saved workspace views keep navigation available');
    assert.deepEqual(Object.keys(shortcut.command.defaults), [], 'no default key steals an existing binding');
    shortcut.command.resolve({ region: 'page', modal: null, target: doc.body }).run();
    assert.ok(doc.querySelector('[data-dsh-nav-fold-navigation]'));
    form.acceptNavigation(false);
    assert.equal(doc.querySelector('[data-dsh-nav-fold-navigation]'), null);
    assert.equal(shortcut.command, undefined, 'disabled navigation is unregistered');
    assert.equal(shortcut.releases, 1);
    assert.ok(doc.querySelector('[data-dsh-workspace-tabs]'), 'three workspace views remain enabled');
    form.acceptNavigation(true);
    assert.equal(shortcut.registrations, 2);
    assert.equal(shortcut.command.resolve({ region: 'page', modal: null, target: doc.body }).status, 'handled');
    form.accept(false);
    assert.equal(shortcut.command, undefined, 'disabled workspace views also release navigation');
  } finally { fixture.dispose(); dispose(); }
});

test('remote navigation registers one unbound shortcut and focuses without opening', async () => {
  const fixture = slotFixture(); const form = settingsForm(true); const shortcut = shortcutFixture();
  const opened = [];
  const { doc, dom, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots: fixture.slots, shortcuts: shortcut.shortcuts,
    sessions: {}, uiWorkspace: { openSession(id) { opened.push(id); } }, configForms: configForms(form) }));
  const region = doc.querySelector('#workspaces');
  region.innerHTML = '<div role="treeitem" data-row-key="workspace:w">Folder</div><div class="_sessionRow" data-row-key="session:first" role="treeitem" aria-selected="true">First</div><div class="_sessionRow" data-row-key="session:second" role="treeitem">Second</div>';
  const [first, second] = [...region.querySelectorAll('[data-row-key^="session:"]')];
  first.addEventListener('click', () => opened.push('native-first'));
  second.addEventListener('click', () => opened.push('native-second'));
  const key = (name, target = doc.activeElement) => target.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  try {
    assert.equal(shortcut.command.id, 'dsh-nav-fold.session-navigation');
    assert.equal(Object.keys(shortcut.command.defaults).length, 0, 'no shortcut steals a pre-existing key by default');
    const action = shortcut.command.resolve({ region: 'page', modal: null, target: doc.body });
    assert.equal(action.status, 'handled'); action.run();
    assert.equal(doc.activeElement, first);
    assert.match(doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent,
      /data-dsh-nav-fold-navigation[^}]*data-row-key\^=[^}]*:focus[^}]*outline/, 'native focused session has visible candidate ring');
    key('ArrowDown'); assert.equal(doc.activeElement, second); assert.deepEqual(opened, []);
    second.addEventListener('keydown', (event) => event.stopPropagation());
    key('ArrowUp'); assert.equal(doc.activeElement, first, 'native row cannot block active navigation by stopping bubble');
    key('ArrowDown'); assert.equal(doc.activeElement, second);
    region.innerHTML = '<div data-row-key="session:first" role="treeitem">First</div><div data-row-key="session:second" role="treeitem">Second</div>';
    region.querySelector('[data-row-key="session:second"]').addEventListener('click', () => opened.push('native-second'));
    await flush();
    assert.equal(doc.activeElement.getAttribute('data-row-key'), 'session:second', 'rerender keeps the candidate session focused');
    key('Enter'); assert.deepEqual(opened, ['native-second']);
  } finally { fixture.dispose(); dispose(); }
  assert.equal(shortcut.released, true);
});

test('remote workspace arrows visit native folders and Enter toggles their own tree without opening sessions', async () => {
  const fixture = slotFixture(); const form = settingsForm(true); const shortcut = shortcutFixture(); const opened = [];
  const { doc, dom, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots: fixture.slots, shortcuts: shortcut.shortcuts,
    sessions: {}, uiWorkspace: { openSession(id) { opened.push(id); } }, configForms: configForms(form) }));
  const region = doc.querySelector('#workspaces');
  region.innerHTML = '<div role="treeitem" data-row-key="workspace:outer" aria-expanded="true">Outer</div><div role="group" id="outer-children"><div role="treeitem" data-row-key="workspace:inner" aria-expanded="false">Inner</div><div role="group" id="inner-children" hidden><div role="treeitem" data-row-key="session:hidden">Hidden</div></div><div role="treeitem" data-row-key="session:current" aria-selected="true">Current</div></div><div role="treeitem" data-row-key="session:other">Other</div>';
  const outer = region.querySelector('[data-row-key="workspace:outer"]');
  const inner = region.querySelector('[data-row-key="workspace:inner"]');
  const current = region.querySelector('[data-row-key="session:current"]');
  const hidden = region.querySelector('[data-row-key="session:hidden"]');
  const other = region.querySelector('[data-row-key="session:other"]');
  const toggle = (row, children) => row.addEventListener('click', () => { const expanded = row.getAttribute('aria-expanded') !== 'true'; row.setAttribute('aria-expanded', String(expanded)); children.hidden = !expanded; });
  toggle(outer, region.querySelector('#outer-children')); toggle(inner, region.querySelector('#inner-children'));
  hidden.addEventListener('click', () => opened.push('hidden-click'));
  other.addEventListener('click', () => opened.push('other-click'));
  const key = (name) => doc.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  try {
    shortcut.command.resolve({ region: 'page', modal: null, target: doc.body }).run();
    assert.equal(doc.activeElement, current, 'start still prefers the current session');
    key('ArrowUp'); assert.equal(doc.activeElement, inner, 'nested folder is a real focus stop');
    key('ArrowDown'); assert.equal(doc.activeElement, current, 'collapsed descendants are skipped');
    key('ArrowUp'); key('ArrowUp'); assert.equal(doc.activeElement, outer);
    key('Enter'); assert.equal(outer.getAttribute('aria-expanded'), 'false');
    assert.equal(doc.activeElement, outer, 'folder retains focus after native toggle');
    assert.ok(doc.querySelector('[data-dsh-nav-fold-navigation]'), 'folder Enter keeps navigation active');
    key('ArrowDown'); assert.equal(doc.activeElement, other, 'hidden subtree is not traversed');
    key('ArrowUp'); key('Enter'); assert.equal(outer.getAttribute('aria-expanded'), 'true');
    key('ArrowDown'); assert.equal(doc.activeElement, inner);
    key('Enter'); assert.equal(inner.getAttribute('aria-expanded'), 'true');
    assert.equal(doc.activeElement, inner);
    key('ArrowDown'); assert.equal(doc.activeElement, hidden, 'expanded nested descendants are traversed');
    assert.deepEqual(opened, [], 'folder Enter does not open or create a session');
    assert.match(doc.querySelector('style[data-plugin-css="dsh-sidebar-nav-collapse"]').textContent,
      /data-dsh-nav-fold-navigation[^}]*data-row-key\^=[^}]*workspace:[^}]*:focus[^}]*outline/, 'folder receives the scoped keyboard focus outline');
    key('ArrowDown'); key('ArrowDown'); assert.equal(doc.activeElement, other);
    key('Enter'); assert.deepEqual(opened, ['other-click'], 'session Enter still opens exactly one session');
    assert.equal(doc.querySelector('[data-dsh-nav-fold-navigation]'), null, 'session Enter exits navigation');
  } finally { fixture.dispose(); dispose(); }
});

test('replaced native folder regains focus and Escape returns to entry focus', async () => {
  const fixture = slotFixture(); const form = settingsForm(true); const shortcut = shortcutFixture();
  const { doc, dom, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots: fixture.slots, shortcuts: shortcut.shortcuts,
    sessions: {}, uiWorkspace: {}, configForms: configForms(form) }));
  const region = doc.querySelector('#workspaces');
  region.innerHTML = '<div role="treeitem" data-row-key="workspace:w" aria-expanded="false">Folder</div><div role="treeitem" data-row-key="session:current" aria-selected="true">Current</div>';
  const entry = doc.createElement('button'); doc.body.append(entry); entry.focus();
  const key = (name) => doc.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  try {
    shortcut.command.resolve({ region: 'page', modal: null, target: entry }).run();
    key('ArrowUp'); assert.equal(doc.activeElement.dataset.rowKey, 'workspace:w');
    region.querySelector('[data-row-key="workspace:w"]').outerHTML = '<div role="treeitem" data-row-key="workspace:w" aria-expanded="false">Remounted folder</div>';
    await flush();
    assert.equal(doc.activeElement, region.querySelector('[data-row-key="workspace:w"]'));
    key('Escape'); assert.equal(doc.activeElement, entry);
  } finally { fixture.dispose(); dispose(); }
});

test('remote arrows change tabs, focus custom rows, and exit without grabbing other inputs', async () => {
  const fixture = slotFixture(); const form = settingsForm(true); const shortcut = shortcutFixture(); const opened = [];
  const { doc, dom, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots: fixture.slots, shortcuts: shortcut.shortcuts,
    sessions: {}, uiWorkspace: { openSession(id) { opened.push(id); } }, configForms: configForms(form) }));
  const region = doc.querySelector('#workspaces');
  region.innerHTML = '<div class="_sessionRow" data-row-key="session:native" role="treeitem">Native</div>';
  const origin = doc.createElement('input'); doc.body.append(origin); origin.focus();
  const key = (name, target = doc.activeElement) => target.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  try {
    shortcut.command.resolve({ region: 'editable', modal: null, target: origin }).run();
    key('ArrowRight'); assert.equal(doc.querySelector('[data-view="activity"]').getAttribute('aria-pressed'), 'true');
    region.innerHTML = '<section data-dsh-workspace-view="activity"><button data-dsh-nav-fold-session-id="a">A</button><button data-dsh-nav-fold-session-id="b">B</button></section>';
    await flush();
    assert.equal(doc.activeElement.textContent, 'A');
    key('ArrowDown'); assert.equal(doc.activeElement.textContent, 'B'); assert.deepEqual(opened, []);
    key('Escape'); assert.equal(doc.activeElement, origin, 'Escape restores focus to the previous input');
    shortcut.command.resolve({ region: 'editable', modal: null, target: origin }).run();
    key('ArrowRight'); assert.equal(doc.querySelector('[data-view="favorites"]').getAttribute('aria-pressed'), 'true');
    await flush();
    assert.equal(doc.activeElement.dataset.view, 'favorites', 'old Activity row cannot receive focus as Favorites');
    region.innerHTML = '<section data-dsh-workspace-view="favorites"><button data-dsh-nav-fold-session-id="fav">Pinned</button><input aria-label="Inline rename"></section>';
    await flush(); assert.equal(doc.activeElement.textContent, 'Pinned');
    const inlineEditor = region.querySelector('input'); inlineEditor.focus();
    const inlineArrow = new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    inlineEditor.dispatchEvent(inlineArrow); assert.equal(inlineArrow.defaultPrevented, false, 'editing inside the sidebar keeps native arrow behavior');
    shortcut.command.resolve({ region: 'page', modal: null, target: doc.body }).run();
    key('Enter'); assert.deepEqual(opened, ['fav']);
    const input = doc.createElement('input'); doc.body.append(input); input.focus();
    const event = new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    input.dispatchEvent(event); assert.equal(event.defaultPrevented, false);
    assert.equal(shortcut.command.resolve({ region: 'editable', modal: 'other', target: input }).status, 'pass');
  } finally { fixture.dispose(); dispose(); }
});

test('entry expands the narrow sidebar before focusing a session row', () => {
  const fixture = slotFixture(); const form = settingsForm(true); const shortcut = shortcutFixture();
  const { doc, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots: fixture.slots, shortcuts: shortcut.shortcuts,
    layout: { toggleSidebar() { doc.querySelector('.kB3qhq_root').classList.remove('kB3qhq_collapsed'); } },
    sessions: {}, uiWorkspace: {}, configForms: configForms(form) }));
  try {
    const root = doc.querySelector('.kB3qhq_root'); root.classList.add('kB3qhq_collapsed');
    doc.querySelector('#workspaces').innerHTML = '<div class="_sessionRow" data-row-key="session:native" role="treeitem">Native</div>';
    shortcut.command.resolve({ region: 'page', modal: null, target: doc.body }).run();
    assert.equal(root.classList.contains('kB3qhq_collapsed'), false);
    assert.equal(doc.activeElement.textContent, 'Native');
  } finally { fixture.dispose(); dispose(); }
});

test('DS-Bot peer suspension releases navigation without changing saved opt-in', async () => {
  const fixture = slotFixture(); const form = settingsForm(true); const shortcut = shortcutFixture();
  const { doc, dom, dispose } = start(workspaceSidebar(), undefined, undefined, () => ({ slots: fixture.slots, shortcuts: shortcut.shortcuts,
    sessions: {}, uiWorkspace: { openSession() { assert.fail('should not open session'); } }, configForms: configForms(form) }));
  try {
    doc.querySelector('#workspaces').innerHTML = '<div class="_sessionRow" data-row-key="session:native" role="treeitem">Native</div>';
    shortcut.command.resolve({ region: 'page', modal: null, target: doc.body }).run();
    fixture.replaceNative([...fixture.slots.entries('sidebar.workspaces'), { registrant: 'Gb', locale: 'bot', options: { name: 'sidebar.workspaces' } }]);
    await flush();
    const event = new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    doc.activeElement.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
    assert.equal(shortcut.command.resolve({ region: 'page', modal: null, target: doc.body }).status, 'pass');
    assert.equal(form.getSnapshot().value.workspaceViewsEnabled, true);
  } finally { fixture.dispose(); dispose(); }
});
