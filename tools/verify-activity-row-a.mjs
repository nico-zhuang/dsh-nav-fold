// Offline anonymous geometry regression for the Activity A row. Never opens DSH or a real profile.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, writeFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

assert(process.argv.length === 2, 'Usage: node tools/verify-activity-row-a.mjs');
const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
const css = source.match(/const css = `([\s\S]*?)`;\s*function apply\(ctx\)/)?.[1];
assert(css?.includes('.dsh-nav-fold-session-quiet'), 'Cannot extract unchanged plugin CSS');
const escapedCSS = css.replaceAll('</style', '<\\/style');
const moon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 11a6 6 0 0 1-8-8 6 6 0 1 0 8 8Z"/></svg>';
function row(id, { quiet = false, selected = false, color = false, native = false, favorite = false, title = `很长的虚构星桥工作项目合成会话标题 ${id} 需要省略` } = {}) {
  const classes = ['dsh-nav-fold-session', native && 'dsh-nav-fold-session-native', selected && 'dsh-nav-fold-session-selected', quiet && !favorite && 'dsh-nav-fold-session-quiet'].filter(Boolean).join(' ');
  const titleHtml = `<span class="dsh-nav-fold-session-title">${title}</span>`;
  const dot = id === 'normal' || favorite ? '<span class="dsh-nav-fold-state-dot" aria-label="Completed"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="#32c46e"/></svg></span>' : '';
  const workspace = '<span data-workspace>虚构项目 · 星桥</span>';
  const mainText = quiet && !favorite
    ? `<span class="dsh-nav-fold-session-quiet-title-row">${titleHtml}<span class="dsh-nav-fold-quiet-icon" data-activity-quiet-icon>${moon}</span></span>`
    : `${titleHtml}<span class="dsh-nav-fold-session-subtitle">${favorite ? workspace + dot : dot + workspace}</span>`;
  const buttons = native ? ['organize', 'menu'] : ['menu', 'archive', 'pin'];
  return `<div class="${classes}" data-id="${id}" data-favorite="${favorite}">
    ${color ? '<span class="dsh-nav-fold-color-mark" style="background:#80afff"></span>' : ''}
    <button class="dsh-nav-fold-session-main" type="button" aria-current="${selected ? 'page' : 'false'}">${mainText}</button>
    <span class="dsh-nav-fold-session-actions">${buttons.map(name => `<button type="button" aria-label="${name}">${name.slice(0, 1)}</button>`).join('')}</span>
  </div>`;
}
function rail(width, theme, native) {
  const id = `${width}-${theme}-${native ? 'rc1' : 'rc5'}`;
  return `<div class="case ${theme}" data-case="${id}" style="width:${width}px">
    <strong>${id} · 匿名几何夹具</strong>
    <div data-dsh-nav-fold-navigation></div><div class="kB3qhq_regionArea">
      <section data-dsh-workspace-view="activity"><div class="dsh-nav-fold-activity-top-group">
        <h3 class="dsh-nav-fold-activity-top-heading">顶部固定</h3>
        ${row('selected', { selected: true, color: true, native })}
        <div class="dsh-nav-fold-activity-top-divider"></div></div>
        ${row('q1', { quiet: true, native })}${row('q2', { quiet: true, selected: true, color: true, native })}
        ${row('q3', { quiet: true, native })}${row('normal', { native })}
      </section><section data-dsh-workspace-view="favorites">${row('favorite', { native, favorite: true })}</section>
    </div></div>`;
}
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Offline Activity A geometry</title>
<style>${escapedCSS}\n*{box-sizing:border-box}body{margin:0;padding:16px;font:12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#10141b;color:#e8edf4}.cases{display:flex;gap:12px;align-items:start}.case{flex:none;padding:8px 0;background:#1d222c;color:#e8edf4;--dsw-alias-label-primary:#e8edf4;--dsw-alias-interactive-bg-hover:rgba(160,180,210,.22);--dsw-alias-border-l1:#566073}.case.light{background:#f4f6fa;color:#26394f;--dsw-alias-label-primary:#26394f;--dsw-alias-interactive-bg-hover:rgba(60,85,120,.16);--dsw-alias-border-l1:#cbd3de}.case>strong{display:block;margin:0 8px 9px;font-size:11px}.case [data-dsh-workspace-view]{animation:none;overflow:visible}.case [data-dsh-workspace-view="favorites"]{margin-top:10px;border-top:1px dashed currentColor}.case .dsh-nav-fold-session-actions{transition:none}.case .dsh-nav-fold-session{transition:none}</style>
<h1>离线匿名几何回归 · 非真实 DSH 截图</h1><div class="cases">${rail(272, 'dark', true)}${rail(272, 'light', true)}${rail(220, 'dark', false)}${rail(220, 'light', false)}</div></html>`;
const scratch = await mkdtemp(join(tmpdir(), 'navfold-activity-a-'));
const fixture = join(scratch, 'fixture.html');
await writeFile(fixture, html);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--disable-component-update', '--disable-extensions', '--disable-sync', '--disable-default-apps',
  '--remote-debugging-port=0', `--user-data-dir=${join(scratch, 'chrome-profile')}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const chromeExit = new Promise(done => { chrome.once('exit', (code, signal) => done({ code, signal })); chrome.once('error', error => done({ error: error.message })); });
async function bounded(task, ms, message) {
  let timer;
  try { return await Promise.race([task, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(message)), ms); })]); }
  finally { clearTimeout(timer); }
}
let socket;
try {
  const address = await bounded(new Promise((done, reject) => {
    let stderr = '';
    chrome.stderr.on('data', data => { stderr += data; const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/); if (match) done(match[1]); });
    chrome.once('error', reject);
    chrome.once('exit', code => reject(Error(`Chrome startup exit ${code}: ${stderr.slice(-500)}`)));
  }), 20_000, 'Chrome startup timed out');
  socket = new WebSocket(address);
  await bounded(new Promise((done, reject) => { socket.onopen = done; socket.onerror = reject; }), 10_000, 'CDP connection timed out');
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    clearTimeout(waiter.timer);
    message.error ? waiter.reject(Error(JSON.stringify(message.error))) : waiter.resolve(message.result);
  };
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP ${method} timed out`)); }, 15_000);
      pending.set(id, { resolve, reject, timer });
      try { socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); }
      catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
    });
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1240, height: 940, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: new URL(`file://${fixture}`).href });
  async function evaluate(expression) {
    const response = await call('Runtime.evaluate', { expression, returnByValue: true });
    if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  }
  for (let i = 0; i < 100; i++) {
    if (await evaluate('document.querySelectorAll(".case").length === 4')) break;
    await new Promise(done => setTimeout(done, 50));
  }
  assert.equal(await evaluate('location.protocol'), 'file:');
  assert.equal(await evaluate('document.querySelectorAll(".case").length'), 4);
  const failures = [];
  const check = (condition, detail) => { if (!condition) failures.push(detail); };
  const close = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance;
  // This function is serialized into the isolated browser; every value is a measured DOM/style result.
  const measure = function () {
    const box = element => { const { x, y, width, height } = element.getBoundingClientRect(); return { x, y, width, height, left: x, right: x + width, top: y, bottom: y + height }; };
    const style = element => getComputedStyle(element);
    return [...document.querySelectorAll('.case')].map(rail => {
      const rows = [...rail.querySelectorAll('[data-dsh-workspace-view="activity"] .dsh-nav-fold-session')];
      return { id: rail.dataset.case, rail: box(rail), view: box(rail.querySelector('[data-dsh-workspace-view="activity"]')),
        divider: box(rail.querySelector('.dsh-nav-fold-activity-top-divider')),
        rows: rows.concat(rail.querySelector('[data-id="favorite"]')).map(row => {
          const main = row.querySelector('.dsh-nav-fold-session-main');
          const title = row.querySelector('.dsh-nav-fold-session-title');
          const actions = row.querySelector('.dsh-nav-fold-session-actions');
          const buttons = [...actions.querySelectorAll('button')];
          const moon = row.querySelector('.dsh-nav-fold-quiet-icon');
          const marker = row.querySelector('.dsh-nav-fold-color-mark');
          const dot = row.querySelector('.dsh-nav-fold-state-dot');
          const workspace = row.querySelector('[data-workspace]');
          return { id: row.dataset.id, row: box(row), main: box(main), title: box(title), moon: moon && box(moon),
            dot: dot && box(dot), workspace: workspace && box(workspace),
            marker: marker && box(marker), actions: box(actions), buttons: buttons.map(box),
            titleContentRight: box(title).right - parseFloat(style(title).paddingRight),
            background: style(row).backgroundColor, radius: parseFloat(style(row).borderTopLeftRadius),
            outline: style(main).outlineWidth, focusPseudo: getComputedStyle(main, '::after').content,
            focusLeft: parseFloat(getComputedStyle(main, '::after').left),
            ellipsis: style(title).textOverflow, clipped: title.scrollWidth > title.clientWidth,
            opacity: parseFloat(style(actions).opacity), pointer: style(actions).pointerEvents,
            hitMain: document.elementFromPoint(box(main).left + 12, box(main).bottom - 8)?.closest('[data-id]')?.dataset.id,
            hitAction: document.elementFromPoint(box(buttons.at(-1)).left + 12, box(buttons.at(-1)).top + 12)?.closest('[data-id]')?.dataset.id };
        }) };
    });
  };
  const get = () => evaluate(`(${measure})()`);
  const metrics = await get();
  for (const rail of metrics) {
    const expectedWidth = Number(rail.id.split('-')[0]);
    const actionCount = rail.id.endsWith('rc1') ? 2 : 3;
    check(close(rail.rail.width, expectedWidth, .1), `${rail.id}: rail width`);
    check(rail.rows.length === 6, `${rail.id}: 5 Activity + 1 Favorites rows`);
    check(rail.divider.height >= 1, `${rail.id}: pinned divider visible`);
    for (const item of rail.rows.filter(row => row.id !== 'favorite')) {
      const quiet = item.id.startsWith('q');
      check(close(item.radius, 6, .1), `${rail.id}/${item.id}: 6px row radius (${item.radius})`);
      check(item.row.height >= (quiet ? 34 : 46) - .5, `${rail.id}/${item.id}: row height ${item.row.height}`);
      check(item.buttons.length === actionCount, `${rail.id}/${item.id}: ${actionCount} actions`);
      check(item.buttons.every(button => close(button.width, 24, .1) && close(button.height, 24, .1)), `${rail.id}/${item.id}: 24px actions`);
      check(item.actions.top >= item.row.top + 5 - .5 && item.actions.bottom <= item.row.bottom - 5 + .5,
        `${rail.id}/${item.id}: vertical action clearance >=5px`);
      check(item.hitMain === item.id && item.hitAction === item.id, `${rail.id}/${item.id}: correct row hit targets`);
      check(item.actions.left >= item.titleContentRight - .5, `${rail.id}/${item.id}: title/action collision`);
      if (quiet) {
        check(Boolean(item.moon) && item.title.right <= item.moon.left + .5 && item.moon.right <= item.actions.left + .5,
          `${rail.id}/${item.id}: title → moon → action ordering`);
      }
      if (item.marker) check(close(item.marker.width, 3, .1), `${rail.id}/${item.id}: 3px stripe width`);
    }
    for (const id of ['q1', 'q2']) {
      const here = rail.rows.find(row => row.id === id);
      const next = rail.rows.find(row => row.id === (id === 'q1' ? 'q2' : 'q3'));
      check(close(next.row.top - here.row.bottom, 2, .5), `${rail.id}: Quiet row gap 2px (${next.row.top - here.row.bottom})`);
    }
    const ordinary = rail.rows.find(row => row.id === 'normal');
    check(ordinary.dot && ordinary.workspace && ordinary.dot.right <= ordinary.workspace.left
      && close(ordinary.workspace.left - ordinary.dot.right, 4, .6) && ordinary.workspace.right <= ordinary.actions.left + .5,
      `${rail.id}: completed dot leads workspace by 4px without reaching action track`);
    const favorite = rail.rows.at(-1);
    check(favorite.dot && favorite.workspace && favorite.workspace.right <= favorite.dot.left,
      `${rail.id}: Favorites keeps trailing status dot`);
    check(favorite.id === 'favorite' && !favorite.moon && !favorite.marker && close(favorite.radius, 7, .1)
      && favorite.background === 'rgba(0, 0, 0, 0)', `${rail.id}: Favorites keeps ordinary row styling`);
    check(rail.rows.every(row => row.ellipsis === 'ellipsis' && row.clipped), `${rail.id}: long synthetic titles ellipsize`);
    check(rail.rows.find(row => row.id === 'q2').background !== rail.rows.find(row => row.id === 'q1').background,
      `${rail.id}: selected Quiet background distinct from unselected Quiet`);
    console.log(`${rail.id}: rows ${rail.rows.map(row => Math.round(row.row.height)).join('/')}, actions ${actionCount}, Quiet gap ${Math.round(rail.rows[2].row.top - rail.rows[1].row.bottom)}`);
  }
  // Focus and hover are genuine CDP/browser input; never force the actions visible in fixture CSS.
  for (const rail of metrics) {
    const selector = `.case[data-case="${rail.id}"] [data-id="q2"] .dsh-nav-fold-session-main`;
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    const focused = (await get()).find(item => item.id === rail.id).rows.find(row => row.id === 'q2');
    check(focused.opacity > .95 && focused.pointer === 'auto', `${rail.id}: keyboard focus must reveal actions`);
    check(focused.outline !== '0px' || focused.focusPseudo !== 'none', `${rail.id}: focus contour visible`);
    check(!focused.marker || (focused.focusPseudo !== 'none' && focused.main.left + focused.focusLeft >= focused.marker.right + 2),
      `${rail.id}: focused contour clears 3px marker`);
    const normal = rail.rows.find(row => row.id === 'normal');
    await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: normal.main.left + 30, y: normal.main.top + 12 });
    const hovered = (await get()).find(item => item.id === rail.id).rows.find(row => row.id === 'normal');
    check(hovered.opacity > .95 && hovered.pointer === 'auto', `${rail.id}: mouse hover reveals actions`);
    const base = rail.rows.find(row => row.id === 'normal').background;
    check(hovered.background !== base, `${rail.id}: actual hovered background distinct from base`);
    await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1220, y: 920 });
    // Tab from the focused row main: the action button, not the main row, owns the focus.
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    const actionFocus = await evaluate(`(() => {
      const main = document.querySelector(${JSON.stringify(selector)});
      const row = main.closest('[data-id]');
      const buttons = [...row.querySelectorAll('.dsh-nav-fold-session-actions button')];
      const focused = document.activeElement;
      const actionStyle = getComputedStyle(row.querySelector('.dsh-nav-fold-session-actions'));
      return { actionIndex: buttons.indexOf(focused), actionOutline: getComputedStyle(focused).outlineWidth,
        mainFocused: document.activeElement === main, mainPseudo: getComputedStyle(main, '::after').content,
        opacity: Number(actionStyle.opacity), pointer: actionStyle.pointerEvents };
    })()`);
    check(actionFocus.actionIndex === 0 && !actionFocus.mainFocused, `${rail.id}: first action alone owns keyboard focus`);
    check(actionFocus.actionOutline === '2px', `${rail.id}: focused action has 2px outline (${actionFocus.actionOutline})`);
    check(actionFocus.mainPseudo === 'none', `${rail.id}: action focus must not activate main pseudo-ring`);
    check(actionFocus.opacity > .95 && actionFocus.pointer === 'auto', `${rail.id}: action row stays operable while button focused`);
  }
  // Touch emulation must prove the browser actually selected hover:none before we trust this assertion.
  await evaluate('document.activeElement?.blur()');
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1220, y: 920 });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const noHover = await evaluate('matchMedia("(hover: none)").matches');
  if (noHover) {
    const touchRows = await get();
    for (const rail of touchRows) {
      for (const row of rail.rows.filter(row => row.id !== 'favorite')) {
        check(row.opacity > .95 && row.pointer === 'auto', `${rail.id}/${row.id}: hover:none must reveal static actions without focus`);
      }
    }
    console.log('CDP touch emulation: matchMedia(hover:none)=true; verified static Activity actions on all four rails');
  } else {
    check(/@media\s*\(hover:\s*none\)\s*\{\s*\.dsh-nav-fold-session-actions\s*\{\s*opacity:\s*1;\s*pointer-events:\s*auto;/u.test(css),
      'fallback source must retain hover:none action visibility rule');
    console.log('CDP did not select hover:none; only existing CSS source fallback checked (no touch-visibility claim)');
  }
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  console.log(JSON.stringify({ source: 'Offline anonymous CSS + DOM, no real DSH profile', cases: metrics.map(({ id }) => id), touchMediaVerified: noHover, checksFailed: failures.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  socket?.close();
  if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGTERM');
  try { await bounded(chromeExit, 8_000, `Chrome did not exit; scratch retained at ${scratch}`); }
  catch (error) { chrome.unref(); chrome.stderr.destroy(); throw error; }
  const actual = await realpath(scratch);
  const parent = await realpath(tmpdir());
  assert.equal(scratch, join(tmpdir(), basename(scratch)));
  assert.equal(actual, join(parent, basename(scratch)));
  assert.equal(dirname(actual), parent);
  assert(basename(actual).startsWith('navfold-activity-a-'));
  await rm(actual, { recursive: true });
  console.log(`Cleaned this run's anonymous scratch: ${actual}`);
}
