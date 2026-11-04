import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Config, name, apply } from '../lib/index.js';

test('Host config defaults workspace views off and accepts explicit true', async () => {
  assert.equal(Config({}).workspaceViewsEnabled.get(), false);
  assert.equal(Config({ workspaceViewsEnabled: true }).workspaceViewsEnabled.get(), true);
});

test('workspaceViewsEnabled is volatile using official Schemastery metadata', async () => {
  assert.equal(Config.dict.workspaceViewsEnabled.meta.volatile, true);
  assert.equal(Config.dict.workspaceViewsEnabled.meta.default, false);
});

test('package declares the official schema peer and settings client modules', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.version, '0.4.6-preview.3');
  assert.equal(manifest.peerDependencies['@deepseek-ai/schemastery'], '~3.18.5');
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-plugin-manager'));
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-settings'));
});

test('published repository tests declare local React and jsdom dependencies', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  for (const name of ['jsdom', 'react', 'react-dom', '@deepseek-ai/schemastery']) assert.ok(manifest.devDependencies?.[name], `${name} declared for clean checkout`);
  for (const name of ['client.test.js', 'safe-views.test.js']) {
    const text = readFileSync(new URL(name, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /turn-file-actions-plugin\/node_modules/, `${name} must not depend on a sibling private project`);
  }
});

test('Host exports the nav-fold namespace and apply stays a no-op', async () => {
  assert.equal(name, 'nav-fold');
  assert.equal(apply({}), undefined);
});
