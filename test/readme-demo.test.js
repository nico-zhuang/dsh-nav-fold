import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const preview = fileURLToPath(new URL('../docs/readme-demo-v0414/preview.html', import.meta.url));
const steps = ['fold', 'views', 'organize', 'navigate', 'logo'];
const phases = ['before', 'after'];

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
  assert.equal(window.document.querySelector('[data-activity-menu]').hidden, false);
  assert.equal(window.document.querySelectorAll('[data-activity-swatch]').length, 6);
  assert.equal(window.document.querySelector('[data-activity-organize]').dataset.menuOwner, 'fold');
  const after = window.renderStep('organize', 'after');
  assert.equal(after.topGroup, true);
  assert.equal(after.colorStripe, true);
  assert.equal(window.document.querySelector('[data-top-group]').hidden, false);
  assert.equal(window.document.querySelector('[data-color-mark]').getAttribute('data-width'), '3px');
  assert.equal(window.document.querySelector('[data-activity-menu]').hidden, true);
  window.close();
});

test('Quiet only softens its activity row while another running state stays visible', () => {
  const { window } = loadPreview();
  window.renderStep('organize', 'after');
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
  const after = window.renderStep('navigate', 'after');
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
  window.close();
});
