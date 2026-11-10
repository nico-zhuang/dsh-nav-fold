import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const preview = fileURLToPath(new URL('../docs/readme-demo-v0414/preview.html', import.meta.url));
const steps = ['fold', 'views', 'organize', 'navigate', 'logo'];
const phases = ['before', 'after'];
const stillStates = [...steps.flatMap((step) => phases.map((phase) => [step, phase])), ['organize', 'menu'], ['organize', 'quiet']];
const stillDirectory = new URL('../docs/images/readme-v0414/', import.meta.url);

function loadPreview() {
  return new JSDOM(readFileSync(preview, 'utf8'), { runScripts: 'dangerously', url: 'file:///synthetic-preview.html' });
}

test('all five stages render independently with a visible caption and synthetic disclosure', () => {
  const { window } = loadPreview();
  assert.match(window.document.body.textContent, /匿名合成/);
  assert.match(window.document.body.textContent, /非真实 DSH 录屏/);
  for (const step of steps) for (const phase of phases) {
    const state = window.renderStep(step, phase);
    assert.equal(state.step, step);
    assert.equal(state.phase, phase);
    assert.equal(state.synthetic, true);
    assert.equal(window.document.querySelector('[data-scene]').dataset.scene, step);
    assert.equal(window.document.querySelector('[data-phase]').dataset.phase, phase);
    assert.ok(window.document.querySelector('[data-stage-title]').textContent.trim());
  }
  window.close();
});

test('all twelve deterministic states have legible WebP stills', () => {
  const { window } = loadPreview();
  for (const [step, phase] of stillStates) {
    const state = window.renderStep(step, phase);
    assert.equal(state.synthetic, true);
    assert.equal(state.step, step);
    assert.equal(state.phase, phase);
    const image = new URL(`${step}-${phase}.webp`, stillDirectory);
    const bytes = readFileSync(image);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${step}-${phase} RIFF signature`);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `${step}-${phase} WEBP signature`);
    assert.ok(statSync(image).size > 10_000, `${step}-${phase} must exceed 10 KB`);
  }
  window.close();
});

test('fold collapses six global labels without removing new session and workspace', () => {
  const { window } = loadPreview();
  assert.equal(window.renderStep('fold', 'before').folded, false);
  assert.equal(window.renderStep('fold', 'after').folded, true);
  assert.equal(window.document.querySelectorAll('[data-global-entry]').length, 6);
  assert.ok(window.document.querySelector('[data-new-session]'));
  assert.ok(window.document.querySelector('[data-workspace-tree]'));
  window.close();
});

test('views start off and reveal three authentic SVG tabs only after enabling', () => {
  const { window } = loadPreview();
  assert.equal(window.renderStep('views', 'before').tabsVisible, false);
  assert.equal(window.renderStep('views', 'after').tabsVisible, true);
  const tabs = [...window.document.querySelectorAll('[data-dsh-workspace-tabs] button[data-view]')];
  assert.deepEqual(tabs.map((tab) => tab.dataset.view), ['workspace', 'activity', 'favorites']);
  assert.ok(tabs.every((tab) => tab.querySelector('svg path')));
  window.close();
});

test('organize gives one focused activity row its own menu then moves it to top with a 3px color mark', () => {
  const { window } = loadPreview();
  const before = window.renderStep('organize', 'before');
  assert.equal(before.topGroup, false);
  assert.equal(before.folded, true); // Leave room for the activity rows in a fixed-size frame.
  assert.equal(before.focused, true);
  assert.equal(before.colorStripe, false);
  assert.equal(window.document.activeElement, window.document.querySelector('[data-focus-row]'));
  assert.equal(window.document.querySelector('[data-activity-menu]').hidden, true);
  const menu = window.renderStep('organize', 'menu');
  assert.equal(menu.topGroup, false);
  assert.equal(menu.colorStripe, false);
  assert.equal(window.document.activeElement, window.document.querySelector('[data-focus-row]'));
  assert.equal(window.document.querySelector('[data-activity-menu]').hidden, false);
  assert.equal(window.document.querySelectorAll('[data-activity-swatch]').length, 6);
  assert.equal(window.document.querySelector('[data-activity-organize]').dataset.menuOwner, 'fold');
  const after = window.renderStep('organize', 'after');
  assert.equal(after.topGroup, true);
  assert.equal(after.colorStripe, true);
  assert.equal(window.document.querySelector('[data-top-group]').hidden, false);
  assert.equal(window.document.querySelector('[data-target-row]').parentElement, window.document.querySelector('[data-top-group]'));
  assert.equal(window.getComputedStyle(window.document.querySelector('[data-color-mark]')).width, '3px');
  assert.equal(window.getComputedStyle(window.document.querySelector('[data-color-mark]')).backgroundColor, 'rgb(128, 175, 255)');
  assert.equal(window.document.querySelector('[data-activity-menu]').hidden, true);
  assert.equal(window.document.querySelector('[data-quiet-row]').hidden, true);
  assert.equal(window.document.activeElement, window.document.querySelector('[data-focus-row]'));
  window.close();
});

test('Quiet only softens its activity row while another running state stays visible', () => {
  const { window } = loadPreview();
  window.renderStep('organize', 'after');
  assert.equal(window.document.querySelector('[data-quiet-row]').hidden, true);
  const quiet = window.renderStep('organize', 'quiet');
  assert.equal(quiet.topGroup, true);
  assert.equal(window.document.querySelector('[data-quiet-row]').hidden, false);
  assert.ok(window.document.querySelector('[data-quiet-row] svg[aria-label="仅活跃列表免打扰"]'));
  assert.ok(window.document.querySelector('[data-running-dot]'));
  window.renderStep('logo', 'after');
  assert.equal(window.document.querySelector('[data-quiet-row]').hidden, true);
  window.close();
});

test('navigation moves focus before Enter and does not claim a default binding', () => {
  const { window } = loadPreview();
  assert.equal(window.renderStep('navigate', 'before').opened, false);
  assert.equal(window.document.activeElement, window.document.querySelector('[data-focus-row]'));
  const remote = window.document.querySelector('[data-remote-flow]');
  assert.equal(remote.hidden, false);
  assert.ok(remote.querySelector('svg'));
  assert.match(remote.textContent, /遥控器.*无线麦.*用户自行绑定的快捷键/);
  const after = window.renderStep('navigate', 'after');
  assert.equal(window.document.activeElement, window.document.querySelector('[data-focus-row]'));
  assert.equal(after.opened, true);
  assert.equal(after.focused, true);
  assert.match(window.document.body.textContent, /用户自行绑定/);
  assert.match(window.document.querySelector('[data-action]').textContent, /Enter/);
  window.close();
});

test('macOS logo switch is independent of the default-off three tabs and moves new session upward', () => {
  const { window } = loadPreview();
  assert.equal(window.renderStep('logo', 'before').logoHidden, false);
  const after = window.renderStep('logo', 'after');
  assert.equal(after.logoHidden, true);
  assert.equal(after.tabsVisible, false);
  assert.equal(window.document.querySelector('[data-brand]').hidden, true);
  assert.equal(window.document.querySelector('[data-new-session]').dataset.position, 'top');
  window.close();
});

test('replaying a stage never depends on a previous stage state', () => {
  const { window } = loadPreview();
  window.renderStep('organize', 'after');
  const fresh = window.renderStep('views', 'before');
  assert.equal(fresh.topGroup, false);
  assert.equal(fresh.colorStripe, false);
  assert.equal(fresh.tabsVisible, false);
  assert.equal(fresh.logoHidden, false);
  assert.equal(fresh.opened, false);
  assert.equal(window.document.activeElement, window.document.body);
  assert.equal(window.document.querySelector('[data-target-row]').parentElement, window.document.querySelector('[data-row-list]'));
  assert.equal(window.document.querySelector('[data-remote-flow]').hidden, true);
  window.close();
});

test('fold displays an immediate center label on hover or focus and restores the arrow on leave', () => {
  const { window } = loadPreview();
  window.renderStep('fold', 'after');
  const label = window.document.querySelector('[data-toggle-label]');
  assert.equal(label.hidden, false);
  assert.equal(label.textContent, '工作区');
  assert.equal(window.document.querySelector('[data-toggle-arrow]').hidden, true);
  const nav = window.document.querySelectorAll('[data-global-entry]')[3];
  assert.equal(nav.hasAttribute('title'), false); // No delayed browser tooltip substitutes for Fold's label.
  nav.dispatchEvent(new window.MouseEvent('mouseenter'));
  assert.equal(label.textContent, '搜索');
  nav.dispatchEvent(new window.MouseEvent('mouseleave'));
  assert.equal(label.hidden, true);
  nav.focus();
  assert.equal(label.textContent, '搜索');
  nav.blur();
  assert.equal(label.hidden, true);
  window.close();
});

test('six cool swatches use the actual shipped dark palette in a 2×3 grid', () => {
  const { window } = loadPreview();
  window.renderStep('organize', 'menu');
  assert.deepEqual([...window.document.querySelectorAll('[data-activity-swatch]')].map((swatch) =>
    window.getComputedStyle(swatch).getPropertyValue('--swatch').trim()),
    ['', '#72cada', '#80afff', '#b09aff', '#cf9ceb', '#b2bac8']);
  assert.equal(window.getComputedStyle(window.document.querySelector('.swatches')).gridTemplateColumns, 'repeat(3,32px)');
  window.close();
});
