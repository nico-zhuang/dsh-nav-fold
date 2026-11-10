// Capture only the offline, synthetic preview; never connect to a running DSH instance.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, realpath, lstat, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

assert(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--mobile'),
  'Usage: node render-stills.mjs [--mobile]');
const mobile = process.argv[2] === '--mobile';
const steps = ['fold', 'views', 'organize', 'navigate', 'logo'];
const states = [...steps.flatMap((step) => ['before', 'after'].map((phase) => [step, phase])), ['organize', 'menu'], ['organize', 'quiet']];
const preview = new URL('./preview.html', import.meta.url);
assert.equal(preview.protocol, 'file:');
const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../images/readme-v0414');
const expectedDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../images/readme-v0414');
assert.equal(outputDirectory, expectedDirectory);
await mkdir(outputDirectory, { recursive: true });
assert.equal(await realpath(outputDirectory), expectedDirectory, 'output directory must not redirect through a symlink');

async function safeOutput(step, phase) {
  const filename = `${step}-${phase}${mobile ? '-mobile' : ''}.webp`;
  assert(states.some(([name, stage]) => `${name}-${stage}${mobile ? '-mobile' : ''}.webp` === filename));
  const target = resolve(outputDirectory, filename);
  assert.equal(target, join(expectedDirectory, filename), 'output path must be exactly the new readme-v0414 image path');
  try {
    const existing = await lstat(target);
    assert(!existing.isSymbolicLink(), `refusing to overwrite symlink: ${target}`);
    assert(existing.isFile(), `refusing to overwrite non-file: ${target}`);
    assert.equal(await realpath(target), target);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return target;
}

// Complete path validation before even starting a browser or writing an output.
const outputs = await Promise.all(states.map(([step, phase]) => safeOutput(step, phase)));
const scratch = await mkdtemp(join(tmpdir(), 'navfold-v0414-stills-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--disable-extensions',
  '--disable-sync', '--disable-default-apps', '--no-pings', '--hide-scrollbars',
  '--remote-debugging-port=0', `--user-data-dir=${join(scratch, 'chrome-profile')}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
// Observe exit immediately so cleanup cannot miss a fast failure or early exit.
const chromeExit = new Promise((finish) => {
  chrome.once('exit', (code, signal) => finish({ code, signal }));
  chrome.once('error', (error) => finish({ spawnError: error.message }));
});
async function bounded(promise, milliseconds, diagnostic) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error(diagnostic)), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
let socket;
try {
  const address = await new Promise((resolveAddress, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(Error(`Chrome startup timeout: ${stderr.slice(-1200)}`)), 20_000);
    chrome.stderr.on('data', (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timer); resolveAddress(match[1]); }
    });
    chrome.on('error', (error) => { clearTimeout(timer); reject(error); });
    chrome.on('exit', (code) => { clearTimeout(timer); reject(Error(`Chrome exited before CDP startup (${code}): ${stderr.slice(-1200)}`)); });
  });
  socket = new WebSocket(address);
  await bounded(new Promise((resolveOpen, reject) => { socket.onopen = resolveOpen; socket.onerror = reject; }),
    10_000, 'CDP socket connection timed out');
  let id = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const waiter = pending.get(message.id);
    if (!waiter) return; // Ignore a late reply after its bounded request expired.
    pending.delete(message.id);
    clearTimeout(waiter.timer);
    message.error ? waiter.reject(Error(JSON.stringify(message.error))) : waiter.resolve(message.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolveCall, reject) => {
    const request = ++id;
    const timer = setTimeout(() => {
      pending.delete(request);
      reject(Error(`CDP request timed out: ${method}`));
    }, 15_000);
    pending.set(request, { resolve: resolveCall, reject, timer });
    try { socket.send(JSON.stringify({ id: request, method, params, ...(sessionId ? { sessionId } : {}) })); }
    catch (error) { clearTimeout(timer); pending.delete(request); reject(error); }
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', {
    width: mobile ? 360 : 960, height: mobile ? 900 : 540, deviceScaleFactor: 2, mobile: false,
  });
  await call('Page.navigate', { url: preview.href });
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await evaluate('typeof window.renderStep === "function"')) break;
    await new Promise((finish) => setTimeout(finish, 80));
  }
  assert.equal(await evaluate('typeof window.renderStep'), 'function');
  assert.equal(await evaluate('location.protocol'), 'file:');
  let totalBytes = 0;
  for (const [index, [step, phase]] of states.entries()) {
    const state = await evaluate(`window.renderStep(${JSON.stringify(step)}, ${JSON.stringify(phase)})`);
    assert.equal(state.synthetic, true);
    assert.equal(state.step, step);
    assert.equal(state.phase, phase);
    const frameHeight = mobile ? await evaluate('Math.ceil(document.querySelector(".frame").getBoundingClientRect().height)') : 540;
    if (mobile) assert(frameHeight > 540 && frameHeight <= 1200, `unexpected responsive frame height: ${frameHeight}`);
    const image = await call('Page.captureScreenshot', mobile
      ? { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 360, height: frameHeight, scale: 1 } }
      : { format: 'png', captureBeyondViewport: false });
    const png = join(scratch, `${step}-${phase}${mobile ? '-mobile' : ''}.png`);
    await writeFile(png, Buffer.from(image.data, 'base64'));
    const target = await safeOutput(step, phase); // Recheck immediately before any overwrite.
    assert.equal(target, outputs[index]);
    execFileSync('cwebp', ['-quiet', '-q', '84', '-resize', mobile ? '360' : '960', String(frameHeight), png, '-o', target]);
    const bytes = (await stat(target)).size;
    totalBytes += bytes;
    console.log(`${step}-${phase}${mobile ? '-mobile' : ''}: ${bytes} bytes (${mobile ? `360×${frameHeight}` : '960×540'})`);
  }
  console.log(`Rendered ${states.length} offline synthetic ${mobile ? 'mobile ' : ''}stills at ${mobile ? '360×responsive height' : '960×540'}; total ${totalBytes} bytes`);
} finally {
  socket?.close();
  if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGTERM');
  let exit;
  try {
    exit = await bounded(chromeExit, 8_000,
      `Chrome did not exit within 8 seconds after SIGTERM; scratch retained at ${scratch}`);
  } catch (error) {
    // Do not delete a directory that Chrome may still be using, or force-kill it.
    console.error(error.message);
    chrome.unref();
    chrome.stderr.destroy();
    throw error;
  }
  const cleanupTarget = await realpath(scratch);
  const realTemp = await realpath(tmpdir());
  assert.equal(scratch, join(tmpdir(), basename(scratch)), 'cleanup must match this process mkdtemp return value');
  assert.equal(cleanupTarget, join(realTemp, basename(scratch)), 'cleanup must resolve to the same new scratch');
  assert.equal(dirname(cleanupTarget), realTemp, 'cleanup must be a direct child of the real temp directory');
  assert(basename(cleanupTarget).startsWith('navfold-v0414-stills-'), 'cleanup requires the renderer scratch prefix');
  await rm(cleanupTarget, { recursive: true });
  console.log(`Scratch cleaned after Chrome exit ${JSON.stringify(exit)}: ${cleanupTarget}`);
}
