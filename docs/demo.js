// Scripted inputs operate the real client plugin; no private recording is used.
(() => {
  const nav = document.querySelector('nav');
  const toggle = nav.querySelector('[data-sidebar-nav-toggle]');
  const rows = [...nav.querySelectorAll('.x_panelRow')];
  const [first] = rows, memory = rows[5], last = rows.at(-1), previous = rows.at(-2);
  document.querySelector('.canvas').style.height = '760px';
  document.querySelector('.sidebar').style.width = '320px';
  document.querySelector('.footnote').textContent = '真实插件 · 自动化交互 · 全部项目数据均为虚构';
  if (nav.dataset.sidebarNavCollapsed === 'true') toggle.click();
  for (const animation of document.getAnimations()) if (Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.finish();
  const cursor = document.createElement('div');
  cursor.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:20;width:26px;height:32px;filter:drop-shadow(0 2px 3px #0008)';
  cursor.innerHTML = '<svg viewBox="0 0 26 32"><path d="M3 2v24l6-6 5 10 5-2-5-10h9z" fill="white" stroke="#11151b" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  document.body.append(cursor);
  const pointer = (row, type) => row.dispatchEvent(new PointerEvent(type, { bubbles: true }));
  let transfer;
  const drag = (row, type, after = false) => {
    const rect = row.getBoundingClientRect();
    row.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer,
      clientX: after ? rect.right - 2 : rect.left + 2, clientY: rect.top + 8 }));
  };
  const events = [
    [1.1, () => toggle.click()],
    [2.2, () => pointer(first, 'pointerover')],
    [3.3, () => pointer(memory, 'pointerover')],
    [4.4, () => pointer(memory, 'pointerout')],
    [5, () => { transfer = new DataTransfer(); drag(last, 'dragstart'); }],
    [5.35, () => drag(first, 'dragover')],
    [5.9, () => drag(first, 'drop')],
    [7.0, () => { transfer = new DataTransfer(); drag(last, 'dragstart'); }],
    [7.35, () => drag(previous, 'dragover', true)],
    [7.9, () => drag(previous, 'drop', true)],
    [8.7, () => toggle.click()],
  ];
  const points = [[0,toggle],[1.5,toggle],[2.1,first],[3.2,memory],[4.5,toggle],[4.95,last],[5.35,first],[6.3,toggle],[6.95,last],[7.35,previous],[8.6,toggle],[11,toggle]];
  const starts = new WeakMap();
  let eventIndex = 0;
  window.demoFrame = (time) => {
    while (events[eventIndex]?.[0] <= time) events[eventIndex++][1]();
    const phase = time < 1.1 ? 0 : time < 2.2 ? 1 : time < 4.4 ? 2 : time < 8.7 ? 3 : 4;
    document.querySelector('#headline').textContent = ['一条线，刚好够用。','收起，留下空间。','名称，即刻出现。','拖动，放到顺手的位置。','展开，回到熟悉的列表。'][phase];
    document.querySelector('#details').textContent = ['面板、工作区，各在其位。','换行共用列位，细线轻轻淡出。','箭头原位显示面板名称，不多弹一层。','落点有提示，顺序保存在本机。','相同的路径，随时可以反向。'][phase];
    document.body.getBoundingClientRect();
    for (const animation of document.getAnimations()) {
      if (!starts.has(animation)) starts.set(animation, time);
      const end = animation.effect.getComputedTiming().endTime;
      const elapsed = (time - starts.get(animation)) * 1000;
      if (Number.isFinite(end) && elapsed >= end) animation.finish();
      else { animation.pause(); animation.currentTime = elapsed; }
    }
    let index = points.findIndex(([t]) => t > time); if (index < 0) index = points.length - 1;
    const [a,from] = points[Math.max(0,index-1)], [b,to] = points[index];
    const progress = Math.max(0,Math.min(1,(time-a)/(b-a || 1))), ease = progress*progress*(3-2*progress);
    const r = from.getBoundingClientRect(), s = to.getBoundingClientRect();
    cursor.style.transform = `translate(${r.left+r.width/2+(s.left+s.width/2-r.left-r.width/2)*ease}px,${r.top+r.height/2+(s.top+s.height/2-r.top-r.height/2)*ease}px)`;
    return { collapsed: nav.dataset.sidebarNavCollapsed, label: toggle.querySelector('[data-sidebar-label-active]')?.textContent || '', first: [...rows].sort((a,b)=>+a.style.order-+b.style.order)[0].getAttribute('aria-label') };
  };
})();
