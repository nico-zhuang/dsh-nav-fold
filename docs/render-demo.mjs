// node docs/render-demo.mjs — Chromium + ffmpeg only; real plugin, synthetic data.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const temporary = await mkdtemp(join(tmpdir(), 'dsh-nav-fold-demo-'));
const frames = join(temporary, 'frames'); await mkdir(frames);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--hide-scrollbars','--allow-file-access-from-files','--remote-debugging-port=0',`--user-data-dir=${join(temporary,'profile')}`,'about:blank'], { stdio: ['ignore','ignore','pipe'] });
let socket;
try {
  const address = await new Promise((resolve,reject) => {
    let output = ''; const timeout = setTimeout(()=>reject(Error('Chromium startup timeout')),15000);
    chrome.stderr.on('data', chunk=>{output+=chunk;const match=output.match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});
    chrome.on('error',reject);
  });
  socket = new WebSocket(address); await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let id=0; const pending=new Map();
  socket.onmessage=event=>{const message=JSON.parse(event.data);if(!message.id)return;const entry=pending.get(message.id);pending.delete(message.id);message.error?entry.reject(Error(JSON.stringify(message.error))):entry.resolve(message.result);};
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});socket.send(JSON.stringify({id:request,method,params,...(sessionId?{sessionId}:{})}));});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const call=(method,params)=>send(method,params,sessionId);
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1024,height:760,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:new URL('./preview.html?mode=demo',import.meta.url).href});
  const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  for(let i=0;i<100;i++){if(await evaluate('typeof window.demoFrame === "function"'))break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert.equal(await evaluate('typeof window.demoFrame'),'function');
  for(let frame=0;frame<660;frame++){
    const state=await evaluate(`window.demoFrame(${frame/60})`);
    if(frame===120)assert.equal(state.collapsed,'true');
    if(frame===240)assert.equal(state.label,'记忆系统');
    if(frame===390)assert.equal(state.first,'示例面板 B');
    if(frame===510)assert.equal(state.first,'插件');
    if(frame===650)assert.equal(state.collapsed,'false');
    const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(join(frames,`${String(frame).padStart(4,'0')}.png`),Buffer.from(image.data,'base64'));
    if(frame%120===0)console.log(`Captured ${frame}/660 frames`);
  }
  const mp4=join(temporary,'dsh-nav-fold-demo.mp4');
  execFileSync('ffmpeg',['-v','error','-framerate','60','-i',join(frames,'%04d.png'),'-c:v','libx264','-preset','slow','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart','-map_metadata','-1','-an',mp4]);
  const gif=fileURLToPath(new URL('./images/demo.gif',import.meta.url));
  execFileSync('ffmpeg',['-v','error','-y','-i',mp4,'-filter_complex','fps=18,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a','-loop','0',gif]);
  console.log(JSON.stringify({mp4,gif,frames:660,duration:11,fps:60,checks:'fold, localized hover, drag order, restored order, expand passed'}));
} finally {socket?.close();chrome.kill();}
