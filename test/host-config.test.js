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

test('navigation switch defaults on without activating disabled workspace views', () => {
  assert.equal(Config({}).navigationEnabled.get(), true);
  assert.equal(Config({ navigationEnabled: false }).navigationEnabled.get(), false);
  assert.equal(Config.dict.navigationEnabled.meta.volatile, true);
  assert.equal(Config({}).workspaceViewsEnabled.get(), false);
});

test('hideBrandEnabled is an independent default-off persisted setting', () => {
  assert.equal(Config({}).hideBrandEnabled.get(), false);
  assert.equal(Config({ hideBrandEnabled: true }).hideBrandEnabled.get(), true);
  assert.equal(Config.dict.hideBrandEnabled.meta.volatile, true);
  assert.equal(Config.dict.hideBrandEnabled.meta.default, false);
  assert.equal(Config({ hideBrandEnabled: true }).workspaceViewsEnabled.get(), false);
});

test('Activity preferences use an uninitialized volatile Host profile string, not a browser-only key', () => {
  assert.equal(Config({}).activityPreferences.get(), '');
  assert.equal(Config.dict.activityPreferences.meta.default, '');
  assert.equal(Config.dict.activityPreferences.meta.volatile, true);
  assert.equal(Config({ activityPreferences: '{"version":1,"sessions":{}}' }).activityPreferences.get(), '{"version":1,"sessions":{}}');
});

test('package declares the official schema peer and settings client modules', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.version, '0.4.17');
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  assert.equal(lock.version, '0.4.17');
  assert.equal(lock.packages[''].version, '0.4.17');
  assert.match(manifest.description, /customizable shortcut.*focus navigation.*stoner-byte\/dsh-hide-brand/, 'plugin manager leads with its own navigation capability and credits the included implementation');
  assert.doesNotMatch(manifest.description, /workspace tabs and macOS logo hiding adapted from/, 'upstream logo implementation must not be credited for our workspace tabs');
  assert.equal(manifest.peerDependencies['@deepseek-ai/schemastery'], '~3.18.5');
  assert.match(manifest.description, /stoner-byte.*dsh-hide-brand/, 'plugin listing credits the integrated colleague implementation');
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const notices = readFileSync(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8');
  assert.match(readme, /^# dsh-nav-fold · v0\.4\.17（正式版）/m);
  assert.match(readme, /releases\/download\/v0\.4\.17\/dsh-nav-fold-0\.4\.17\.tgz/);
  assert.match(readme, /0\.2\.1-rc\.5.*0\.2\.2-rc\.1/s, 'name both tested DSH builds, without claiming every 0.2.1 variant');
  assert.match(readme, /可配置.*快捷键.*焦点/s);
  assert.match(readme, /无线麦.*小米蓝牙遥控器/s);
  assert.match(readme, /上一公开版.*v0\.4\.15/s, 'keep v0.4.15 available for public rollback');
  assert.match(readme, /4px.*24px.*rc\.1.*4px.*rc\.5.*2px/s, 'document optical lift and native-width Tab margins without shrinking the target');
  assert.match(readme, /实际 v0\.4\.15 菜单.*独立 QA profile.*深色.*浅色.*键盘验收/s, 'document genuine menu QA separately from synthetic README illustrations');
  assert.match(readme, /合成宣传图不充当验收证据/, 'do not present offline stills as authenticated GUI evidence');
  assert.match(readme, /选中.*Tab.*主题.*柔和/s, 'describe softer theme-adaptive selected Tab');
  assert.match(readme, /8px.*6px.*重复.*间距/s, 'describe removal of duplicate Fold navigation margins');
  assert.doesNotMatch(readme, /^### 开发中：0\.4\.8-preview/gm, 'current release features are not labelled preview');
  assert.match(readme, /收录并适配.*stoner-byte.*dsh-hide-brand/s);
  assert.match(notices, /stoner-byte.*dsh-hide-brand/s);
  assert.match(notices, /MIT License/);
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
