import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const states = ['fold', 'views', 'organize', 'navigate', 'logo']
  .flatMap((step) => ['before', 'after'].map((phase) => `${step}-${phase}`))
  .concat('organize-menu', 'organize-quiet');
const images = new URL('../docs/images/readme-v0414/', import.meta.url);
const renderer = fileURLToPath(new URL('../docs/readme-demo-v0414/render-stills.mjs', import.meta.url));
const hash = (url) => createHash('sha256').update(readFileSync(url)).digest('hex');

function dimensions(bytes) {
  assert.equal(bytes.toString('ascii', 12, 16), 'VP8 ', 'expected optimized lossy WebP');
  assert.equal(bytes.toString('hex', 23, 26), '9d012a', 'expected VP8 keyframe dimensions');
  return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
}

test('all twelve mobile stills are genuine 360px responsive WebPs', () => {
  for (const state of states) {
    const bytes = readFileSync(new URL(`${state}-mobile.webp`, images));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', state);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', state);
    assert.ok(bytes.length > 10_000, `${state} text must remain legible`);
    const [width, height] = dimensions(bytes);
    assert.equal(width, 360, `${state} must render at mobile CSS width, not downscale a desktop shot`);
    assert.ok(height > 540 && height <= 1200, `${state} must include the complete vertical mobile layout: ${height}`);
  }
});

test('mobile rendering cleans its new profile, reproduces outputs, and never alters desktop stills', () => {
  const mobileHashes = () => states.map((state) => hash(new URL(`${state}-mobile.webp`, images)));
  const desktopHashes = states.map((state) => hash(new URL(`${state}.webp`, images)));
  const firstMobileHashes = mobileHashes();
  const output = execFileSync(process.execPath, [renderer, '--mobile'], { encoding: 'utf8', timeout: 90_000 });
  assert.match(output, /Rendered 12 offline synthetic mobile stills at 360×/);
  const cleaned = output.match(/Scratch cleaned after Chrome exit .*: (.*navfold-v0414-stills-[^\s]+)$/m);
  assert.ok(cleaned, 'renderer must report its exact cleaned scratch');
  assert.equal(existsSync(cleaned[1]), false, 'this mobile run must remove its own scratch after Chrome exits');
  assert.deepEqual(mobileHashes(), firstMobileHashes, 'mobile output must be byte-for-byte reproducible');
  assert.deepEqual(states.map((state) => hash(new URL(`${state}.webp`, images))), desktopHashes,
    '--mobile must not overwrite any desktop image');
});
