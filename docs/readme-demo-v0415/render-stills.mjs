// Reproduce two offline, anonymous synthetic menu stills without a DSH profile or network.
// Run: node docs/readme-demo-v0415/render-stills.mjs
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, realpath, lstat, stat, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ownDirectory = dirname(fileURLToPath(import.meta.url));
const preview = new URL('./preview.html', import.meta.url);
assert.equal(preview.protocol, 'file:');
const outputDirectory = resolve(ownDirectory, '../images/readme-v0415');
const renderTargets = [
  { filename: 'organize-menu.webp', width: 960, height: 540 },
  { filename: 'organize-menu-mobile.webp', width: 360, height: 740 },
];
await mkdir(outputDirectory, { recursive: true });
assert.equal(await realpath(outputDirectory), outputDirectory, 'output directory cannot be a symlink');
async function safeOutput(filename) {
  assert(renderTargets.some((target) => target.filename === filename));
  const path = resolve(outputDirectory, filename);
  assert.equal(path, join(outputDirectory, filename));
  try {
    const existing = await lstat(path);
    assert(existing.isFile() && !existing.isSymbolicLink(), `refusing unexpected output: ${path}`);
    assert.equal(await realpath(path), path);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return path;
}
for (const target of renderTargets) await safeOutput(target.filename);

const scratch = await mkdtemp(join(tmpdir(), 'navfold-v0415-menu-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--disable-extensions',
  '--disable-sync', '--disable-default-apps', '--no-pings', '--hide-scrollbars',
  '--remote-debugging-port=0', `--user-data-dir=${join(scratch, 'chrome-profile')}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const chromeExit = new Promise((finish) => {
  chrome.once('exit', (code, signal) => finish({ code, signal }));
  chrome.once('error', (error) => finish({ error: error.message }));
});
let socket;
function bounded(promise, ms, message) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(message)), ms); })])
    .finally(() => clearTimeout(timer));
}
try {
  const address = await new Promise((resolveAddress, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(Error(`Chrome startup timed out: ${stderr.slice(-900)}`)), 20_000);
    chrome.stderr.on('data', (part) => {
      stderr += part;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timer); resolveAddress(match[1]); }
    });
    chrome.once('error', (error) => { clearTimeout(timer); reject(error); });
    chrome.once('exit', (code) => { clearTimeout(timer); reject(Error(`Chrome exited before CDP startup (${code})`)); });
  });
  socket = new WebSocket(address);
  await bounded(new Promise((finish, reject) => { socket.onopen = finish; socket.onerror = reject; }), 10_000, 'CDP connection timeout');
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id); clearTimeout(entry.timer);
    message.error ? entry.reject(Error(JSON.stringify(message.error))) : entry.resolve(message.result);
  };
  function send(method, params = {}, sessionId) {
    return new Promise((finish, reject) => {
      const request = ++id;
      const timer = setTimeout(() => { pending.delete(request); reject(Error(`CDP timeout: ${method}`)); }, 15_000);
      pending.set(request, { resolve: finish, reject, timer });
      socket.send(JSON.stringify({ id: request, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call('Page.enable');
  for (const { filename, width, height } of renderTargets) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await call('Page.navigate', { url: preview.href });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const check = await call('Runtime.evaluate', { expression: 'document.readyState === "complete" && !!document.querySelector("[data-menu]") && location.protocol === "file:"', returnByValue: true });
      if (check.result.value) { ready = true; break; }
      await new Promise((finish) => setTimeout(finish, 50));
    }
    assert(ready, 'only the local synthetic page may be captured');
    const frame = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const png = join(scratch, filename.replace('.webp', '.png'));
    await writeFile(png, Buffer.from(frame.data, 'base64'));
    const output = await safeOutput(filename);
    execFileSync('cwebp', ['-quiet', '-q', '84', png, '-o', output]);
    const bytes = (await stat(output)).size;
    console.log(`${filename}: ${width}×${height}, ${bytes} bytes`);
  }
} finally {
  socket?.close();
  if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGTERM');
  const exit = await bounded(chromeExit, 8_000, `Chrome exit timeout; scratch retained: ${scratch}`);
  assert(!exit.error, `Chrome failed: ${exit.error}`);
  const resolved = await realpath(scratch);
  const temp = await realpath(tmpdir());
  assert.equal(resolved, join(temp, basename(scratch)));
  assert.equal(dirname(resolved), temp);
  assert(basename(resolved).startsWith('navfold-v0415-menu-'));
  await rm(resolved, { recursive: true });
}
