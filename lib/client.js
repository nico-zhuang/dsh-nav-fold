window.__ModuleLoader__.load({
  id: 'dsh-nav-fold',
  factory: (require) => {
    const module = { exports: {} };
    const key = 'dsh-sidebar-nav-collapse'; // Preserve existing fold and order settings across the rename.
    function selectWorkspaceViews(list = {}, statuses = new Map(), workspaces = {}, unread = new Set(), limit = 20) {
      const all = list.byId || {};
      const running = new Map();
      const queue = [];
      for (const session of Object.values(all)) {
        const active = statuses.get?.(session.id)?.running ?? session.running;
        running.set(session.id, active === true);
        if (active === true) queue.push(session.id);
      }
      for (const [parentId, projection] of Object.entries(list.projectionsBySession || {})) {
        if (!running.has(parentId) || running.get(parentId)) continue;
        const children = projection?.values?.subagentCatalog || [];
        if (children.some((child) => (statuses.get?.(child.id)?.running ?? all[child.id]?.running) === true)) {
          running.set(parentId, true);
          queue.push(parentId);
        }
      }
      for (let index = 0; index < queue.length; index++) {
        const session = all[queue[index]];
        if (session?.origin === 'subagent' && running.has(session.parentId) && !running.get(session.parentId)) {
          running.set(session.parentId, true);
          queue.push(session.parentId);
        }
      }
      const archived = new Set(workspaces.archivedSessionIds || []);
      const pinned = new Set(workspaces.pinnedSessionIds || []);
      const workspaceBySession = new Map();
      for (const workspace of workspaces.items || []) {
        const label = workspace.title || workspace.path?.split(/[\\/]/).filter(Boolean).pop() || workspace.workspaceId || 'Ungrouped';
        for (const id of workspace.sessionIds || []) workspaceBySession.set(id, label);
      }
      const rows = (list.ids || []).map((id) => all[id]).filter((session) => session && session.origin !== 'subagent' && !session.blank && !archived.has(session.id)).map((session) => {
        const status = statuses.get?.(session.id);
        const pendingKind = status?.pendingInteraction?.kind;
        const kind = ['approval', 'plan-review', 'question'].includes(pendingKind) ? 'waiting' : running.get(session.id) ? 'running' : (unread.has(session.id) || status?.completionUnread === true) ? 'unread' : 'recent';
        return { ...session, kind, pinned: pinned.has(session.id), workspace: workspaceBySession.get(session.id) || session.cwd?.split(/[\\/]/).filter(Boolean).pop() || 'Ungrouped' };
      }).sort((a, b) => ({ waiting: 0, running: 1, unread: 2, recent: 3 })[a.kind] - ({ waiting: 0, running: 1, unread: 2, recent: 3 })[b.kind]
        || (b.updatedAt || 0) - (a.updatedAt || 0) || a.id.localeCompare(b.id));
      let recent = 0;
      return { activity: rows.filter((row) => row.kind !== 'recent' || recent++ < limit), favorites: rows.filter((row) => row.pinned) };
    }
    const css = `
nav[class*="panelList"][data-sidebar-nav-collapsed] { position: relative; padding-bottom: 24px; }
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] {
  display: grid; grid-template-columns: repeat(auto-fit, 36px);
  align-items: center; align-content: start; justify-content: space-evenly; column-gap: 0; min-width: 0;
}
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[class*="panelRow"] {
  width: 36px; min-width: 36px; padding-inline: 8px;
  justify-content: center;
}
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[class*="panelRow"] [class*="panelTitle"] { display: none; }
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[class*="panelRow"] [class*="panelGlyph"] { flex: none; }
nav[class*="panelList"] > [data-sidebar-nav-toggle] {
  position: absolute; bottom: 0; left: 0; width: 100%; height: 24px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 0; background: transparent; color: inherit; cursor: pointer;
}
nav[class*="panelList"] > [data-sidebar-nav-toggle]::before,
nav[class*="panelList"] > [data-sidebar-nav-toggle]::after {
  content: ""; flex: 1 1 0; height: 0.5px; background: currentColor; opacity: .16;
}
nav[class*="panelList"] > [data-sidebar-nav-toggle]::before { mask-image: linear-gradient(to right, transparent, #000 22%); }
nav[class*="panelList"] > [data-sidebar-nav-toggle]::after { mask-image: linear-gradient(to left, transparent, #000 22%); }
nav[class*="panelList"] > [data-sidebar-nav-toggle]:hover::before,
nav[class*="panelList"] > [data-sidebar-nav-toggle]:hover::after { opacity: .3; }
nav[class*="panelList"] > [data-sidebar-nav-toggle]:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
nav[class*="panelList"] > [data-sidebar-nav-toggle] svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; animation: sidebarBreathe 3.8s ease-in-out infinite; transition: opacity 90ms ease; }
@keyframes sidebarBreathe { 0%, 100% { opacity: .48; } 50% { opacity: .85; } }
nav[class*="panelList"] [data-sidebar-toggle-center] { display: grid; place-items: center; width: 28px; min-width: 0; max-width: calc(100% - 32px); transition: width 260ms cubic-bezier(.22,1.12,.35,1); }
nav[class*="panelList"] [data-sidebar-toggle-center] > * { grid-area: 1 / 1; }
nav[class*="panelList"] [data-sidebar-label] { position: absolute; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 1; opacity: 0; pointer-events: none; transition: opacity 90ms ease; }
nav[class*="panelList"] [data-sidebar-label-active] { position: static; opacity: 1; }
nav[class*="panelList"] [data-sidebar-show-label] svg { animation: none; opacity: 0; }
nav[class*="panelList"] > button[class*="panelRow"][data-sidebar-dragging] { opacity: .45; }
nav[class*="panelList"] > button[class*="panelRow"][data-sidebar-drop] { position: relative; transition: transform 120ms ease-out; }
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[data-sidebar-drop] { transform: scale(1.06); }
nav[class*="panelList"] > button[data-sidebar-drop]::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: 6px;
  border: 1px solid #69aaff; background: rgba(105,170,255,.14);
  box-shadow: 0 0 0 2px rgba(105,170,255,.26), 0 0 14px rgba(105,170,255,.4);
}
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[data-sidebar-drop="before"]::after { border-left-width: 3px; }
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[data-sidebar-drop="after"]::after { border-right-width: 3px; }
nav[class*="panelList"][data-sidebar-nav-collapsed="false"] > button[data-sidebar-drop="before"]::after { border-top-width: 3px; }
nav[class*="panelList"][data-sidebar-nav-collapsed="false"] > button[data-sidebar-drop="after"]::after { border-bottom-width: 3px; }
[data-dsh-workspace-tabs-row] { display: grid; grid-template-columns: 28px minmax(0, 1fr) 28px; align-items: center; gap: 4px; margin: 6px 12px 8px; min-width: 0; }
[data-dsh-workspace-tabs-row]::before { content: ''; width: 28px; height: 1px; }
[data-dsh-workspace-tabs-row][data-collapsed="true"] { display: flex; justify-content: flex-end; margin-top: 3px; margin-bottom: 4px; }
[data-dsh-workspace-tabs-row][data-collapsed="true"]::before { display: none; }
.kB3qhq_root.kB3qhq_collapsed [data-dsh-workspace-tabs-row] { display: none; }
[data-dsh-workspace-tabs] {
  --dsh-view-index: 0; position: relative; z-index: 0; display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0;
  flex: 1; min-width: 0; margin: 0; padding: 3px; min-height: 31px;
  border-radius: 8px; background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10));
  box-sizing: border-box;
}
[data-dsh-workspace-tabs][hidden] { display: none; }
[data-dsh-workspace-tabs-toggle] {
  flex: none; display: inline-flex; align-items: center; justify-content: center; gap: 2px;
  width: 28px; min-height: 28px; padding: 0; border: 0; border-radius: 6px;
  background: transparent; color: var(--dsw-alias-label-secondary, inherit); cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}
[data-dsh-workspace-tabs-row][data-collapsed="true"] [data-dsh-workspace-tabs-toggle] { width: 32px; }
[data-dsh-workspace-tabs-toggle]:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10)); color: var(--dsw-alias-label-primary, inherit); }
[data-dsh-workspace-tabs-toggle]:focus-visible { outline: 2px solid var(--dsw-alias-label-primary, currentColor); outline-offset: -2px; }
[data-dsh-workspace-tabs-toggle] svg { width: 11px; height: 11px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
[data-dsh-workspace-tabs-toggle] svg[data-current-view] { width: 13px; height: 13px; }
[data-dsh-workspace-tabs]::before {
  content: ''; position: absolute; z-index: -1; left: 3px; top: 3px; bottom: 3px;
  width: calc((100% - 6px) / 3); border-radius: 6px;
  background: var(--dsw-specific-sidebar-fill, rgba(150,150,150,.16));
  box-shadow: 0 1px 3px rgba(0,0,0,.10), inset 0 0 0 .5px rgba(128,128,128,.10);
  transform: translateX(calc(var(--dsh-view-index) * 100%));
  transition: transform 280ms cubic-bezier(.22,1.08,.32,1), box-shadow 180ms ease;
}
[data-dsh-workspace-tabs] > button[data-view] {
  border: 0; border-radius: 5px; background: transparent; color: var(--dsw-alias-label-secondary, inherit);
  font: inherit; line-height: 1; cursor: pointer; padding: 5px 2px; min-width: 0;
  display: flex; align-items: center; justify-content: center;
  transition: color 140ms ease, transform 150ms ease;
}
[data-dsh-workspace-tabs] > button[data-view]:hover,
[data-dsh-workspace-tabs] > button[data-view][aria-pressed="true"] { color: var(--dsw-alias-label-primary, inherit); }
[data-dsh-workspace-tabs] > button[data-view] svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
[data-dsh-workspace-tabs] > button[data-view]:active { transform: scale(.97); }
[data-dsh-workspace-tabs] > button[data-view]:focus-visible { outline: 2px solid var(--dsw-alias-label-primary, currentColor); outline-offset: -2px; }
@keyframes dshWorkspaceEnter { from { opacity: .72; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
[data-dsh-workspace-view] { padding: 2px 8px 14px; min-width: 0; overflow-y: auto; animation: dshWorkspaceEnter 180ms cubic-bezier(.16,1,.3,1) both; }
.dsh-nav-fold-session { position: relative; width: 100%; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-primary, inherit); min-width: 0; transition: background 140ms ease; }
.dsh-nav-fold-session:hover,
.dsh-nav-fold-session-selected { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10)); }
.dsh-nav-fold-session-main { display: flex; flex-direction: column; align-items: stretch; width: 100%; box-sizing: border-box; text-align: left; border: 0; border-radius: inherit; padding: 8px 10px; background: transparent; color: inherit; font: inherit; cursor: pointer; min-width: 0; }
.dsh-nav-fold-session-main:active { transform: scale(.985); }
.dsh-nav-fold-session-main:focus-visible { outline: 2px solid var(--dsw-alias-label-primary, currentColor); outline-offset: -2px; }
.dsh-nav-fold-session-title { font-size: 12px; line-height: 1.4; padding-right: 82px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-nav-fold-session-subtitle { display: flex; justify-content: space-between; gap: 8px; margin-top: 2px; color: color-mix(in srgb, currentColor 72%, transparent); font-size: 11px; line-height: 1.5; white-space: nowrap; overflow: hidden; }
.dsh-nav-fold-session-actions { position: absolute; top: 1px; right: 7px; display: flex; gap: 2px; opacity: 0; pointer-events: none; transition: opacity 120ms ease; }
.dsh-nav-fold-session:hover .dsh-nav-fold-session-actions,
.dsh-nav-fold-session:focus-within .dsh-nav-fold-session-actions { opacity: 1; pointer-events: auto; }
.dsh-nav-fold-session-actions button { width: 24px; height: 24px; padding: 4px; border: 0; border-radius: 5px; background: transparent; color: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.dsh-nav-fold-session-actions button:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.15)); }
.dsh-nav-fold-session-actions button:focus-visible { outline: 2px solid var(--dsw-alias-label-primary, currentColor); outline-offset: -2px; }
.dsh-nav-fold-session-actions button:disabled { cursor: default; opacity: .55; }
.dsh-nav-fold-session-actions svg { width: 14px; height: 14px; }
@media (hover: none) { .dsh-nav-fold-session-actions { opacity: 1; pointer-events: auto; } }
.dsh-nav-fold-session [role="alert"] { display: block; padding: 0 10px 6px; font-size: 11px; color: var(--dsw-alias-label-danger, #b94a48); }
.dsh-nav-fold-archive-error { display: block; margin-top: 8px; font-size: 12px; line-height: 1.4; color: var(--dsw-alias-label-danger, #b94a48); }
.dsh-nav-fold-session-subtitle span { overflow: hidden; text-overflow: ellipsis; }
.dsh-nav-fold-state-dot { flex: none; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; }
.dsh-nav-fold-state-dot > * { flex: none; }
@keyframes dshNavFoldRunningPulse { 0%, 100% { opacity: .58; transform: scale(.90); } 50% { opacity: 1; transform: scale(1); } }
.dsh-nav-fold-state-dot-running { animation: dshNavFoldRunningPulse 1.7s ease-in-out infinite; transform-origin: center; }
@media (prefers-reduced-motion: reduce) { .dsh-nav-fold-state-dot-running { animation: none; opacity: 1; transform: none; } }
.dsh-nav-fold-empty { padding: 22px 12px; margin: 0; color: color-mix(in srgb, currentColor 72%, transparent); font-size: 11px; text-align: center; }
@media (prefers-reduced-motion: reduce) { [data-dsh-workspace-view] { animation: none; } .dsh-nav-fold-session { transition: none; } .dsh-nav-fold-session-actions { transition: none; } .dsh-nav-fold-session-main:active { transform: none; } }
@media (prefers-reduced-motion: reduce) { [data-dsh-workspace-tabs-row] [data-dsh-workspace-tabs-toggle], [data-dsh-workspace-tabs]::before, [data-dsh-workspace-tabs] > button[data-view] { transition: none; } }
@media (prefers-reduced-motion: reduce) { nav[class*="panelList"] > [data-sidebar-nav-toggle] svg { animation: none; opacity: .75; } nav[class*="panelList"] [data-sidebar-toggle-center] { transition: none; } nav[class*="panelList"] > button[data-sidebar-drop] { transition: none; transform: none; } nav[class*="panelList"] > [data-dsh-workspace-tabs-toggle] { transition: none; } }
`;
    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.pluginCss = key;
        style.textContent = css;
        document.head.append(style);
        const managed = new Set();
        const rejected = new WeakSet();
        const remountedAt = new WeakMap();
        const originals = new WeakMap();
        const rows = (nav) => [...nav.querySelectorAll(':scope > button[class*="panelRow"]')];
        let savedOrder = [];
        try {
          const value = JSON.parse(window.localStorage.getItem(`${key}:order`) || '[]');
          if (Array.isArray(value)) savedOrder = value.filter((name) => typeof name === 'string');
        } catch {}
        // ponytail: labels identify rows; use stable slot IDs if duplicate/renamed labels need independent persistent order.
        const syncRows = (nav, restore = false) => {
          let unseen = 0;
          for (const row of rows(nav)) {
            if (!originals.has(row)) originals.set(row, { title: row.getAttribute('title'), suppressed: false, draggable: row.getAttribute('draggable'), order: row.style.order });
            const original = originals.get(row);
            const current = row.getAttribute('title');
            if (!original.suppressed || current !== null) original.title = current;
            const title = restore || !collapsed ? original.title : null;
            original.suppressed = !restore && collapsed;
            if (title === null && current !== null) row.removeAttribute('title');
            else if (current !== title) row.setAttribute('title', title);
            if (restore) {
              if (original.draggable === null) row.removeAttribute('draggable');
              else row.setAttribute('draggable', original.draggable);
              row.style.order = original.order;
              row.removeAttribute('data-sidebar-dragging');
              row.removeAttribute('data-sidebar-drop');
            } else {
              if (!row.draggable) row.draggable = true;
              const position = savedOrder.indexOf(row.getAttribute('aria-label'));
              const order = String(position < 0 ? savedOrder.length + ++unseen : position + 1);
              if (row.style.order !== order) row.style.order = order;
            }
          }
        };
        let collapsed = true;
        try { collapsed = window.localStorage.getItem(key) !== 'expanded'; } catch {}
        let hovered = null, pointerRow = null, focusedRow = null;
        const paint = () => {
          hovered = pointerRow = focusedRow = null;
          for (const nav of managed) {
            nav.dataset.sidebarNavCollapsed = String(collapsed);
            const button = nav.querySelector(':scope > [data-sidebar-nav-toggle]');
            if (!button) continue;
            button.setAttribute('aria-expanded', String(!collapsed));
            button.setAttribute('aria-label', collapsed ? '展开全局面板 / Expand global panels' : '折叠全局面板 / Collapse global panels');
            button.innerHTML = `<span data-sidebar-toggle-center><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${collapsed ? 'M5 9l7 7 7-7' : 'M5 15l7-7 7 7'}"/></svg><span data-sidebar-label aria-hidden="true"></span><span data-sidebar-label aria-hidden="true"></span></span>`;
            syncRows(nav);
          }
        };
        const showLabel = (row) => {
          if (!collapsed || !managed.has(row?.parentElement)) row = null;
          hovered = row;
          for (const nav of managed) {
            if (row?.parentElement === nav) syncRows(nav);
            const button = nav.querySelector(':scope > [data-sidebar-nav-toggle]');
            if (!button) continue;
            const labels = [...button.querySelectorAll('[data-sidebar-label]')];
            const active = labels.find((label) => label.hasAttribute('data-sidebar-label-active'));
            if (!row || row.parentElement !== nav) {
              active?.removeAttribute('data-sidebar-label-active');
              button.querySelector('[data-sidebar-toggle-center]').style.width = '28px';
              button.removeAttribute('data-sidebar-show-label');
              continue;
            }
            const name = row.getAttribute('aria-label') || row.textContent.trim();
            const center = button.querySelector('[data-sidebar-toggle-center]');
            if (active?.textContent === name) {
              center.style.width = `${Math.max(28, Number(active.dataset.sidebarFullWidth) + 16)}px`;
              continue;
            }
            const next = labels.find((label) => label !== active);
            next.textContent = name;
            next.style.maxWidth = 'none';
            const labelWidth = next.getBoundingClientRect().width;
            next.style.maxWidth = '';
            next.dataset.sidebarFullWidth = String(labelWidth);
            center.style.width = `${Math.max(28, labelWidth + 16)}px`;
            next.dataset.sidebarLabelActive = '';
            active?.removeAttribute('data-sidebar-label-active');
            button.dataset.sidebarShowLabel = '';
          }
        };
        const panelRow = (element) => {
          const row = element?.closest?.('button[class*="panelRow"]');
          return managed.has(row?.parentElement) ? row : null;
        };
        const onPointerOver = (event) => { pointerRow = panelRow(event.target); if (pointerRow) showLabel(pointerRow); };
        const onPointerOut = (event) => {
          const row = panelRow(event.target);
          if (row && !row.contains(event.relatedTarget)) {
            pointerRow = panelRow(event.relatedTarget);
            showLabel(pointerRow || (focusedRow?.isConnected && focusedRow));
          }
        };
        const onFocusIn = (event) => { focusedRow = panelRow(event.target); if (focusedRow) showLabel(pointerRow || focusedRow); };
        const onFocusOut = (event) => {
          if (panelRow(event.target)) {
            focusedRow = panelRow(event.relatedTarget);
            showLabel(pointerRow || focusedRow);
          }
        };
        const animations = new Set();
        const animateLayout = (update) => {
          if (typeof document.body.animate !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            for (const animation of animations) animation.cancel();
            animations.clear();
            update();
            return;
          }
          const before = [...managed].map((nav) => ({
            nav, height: window.getComputedStyle(nav).height,
            items: rows(nav).map((row) => [row, row.getBoundingClientRect()]),
          }));
          for (const animation of animations) animation.cancel();
          animations.clear();
          update();
          const after = before.map(({ nav, height, items }) => ({
            nav, height, items, targetHeight: window.getComputedStyle(nav).height,
            targets: new Map(rows(nav).map((row) => [row, row.getBoundingClientRect()])),
          }));
          const play = (element, frames) => {
            const animation = element.animate(frames, { duration: 280, easing: 'cubic-bezier(.4,0,.2,1)' });
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
            animation.oncancel = () => animations.delete(animation);
          };
          for (const { nav, height, items, targetHeight, targets } of after) {
            if (height !== targetHeight) play(nav, [{ height }, { height: targetHeight }]);
            for (const [row, rect] of items) {
              const target = targets.get(row);
              if (!target) continue;
              const dx = rect.left - target.left, dy = rect.top - target.top;
              if (dx || dy) play(row, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }]);
            }
          }
        };
        const clear = (nav) => {
          syncRows(nav, true);
          nav.querySelector('[data-sidebar-nav-toggle]')?.remove();
          delete nav.dataset.sidebarNavCollapsed;
          managed.delete(nav);
        };
        let dragging = null;
        const visualRows = (nav) => rows(nav).sort((a, b) => Number(a.style.order) - Number(b.style.order));
        const saveOrder = (ordered) => {
          savedOrder = ordered.map((row) => row.getAttribute('aria-label') || '');
          try { window.localStorage.setItem(`${key}:order`, JSON.stringify(savedOrder)); } catch {}
          for (const item of managed) syncRows(item);
        };
        const clearDrag = () => {
          if (!dragging) return;
          dragging.nav.querySelector('[data-sidebar-drop]')?.removeAttribute('data-sidebar-drop');
          dragging.row.removeAttribute('data-sidebar-dragging');
          dragging = null;
        };
        const dragRow = (event) => {
          const row = event.target.closest?.('button[class*="panelRow"]');
          return row?.parentElement === dragging?.nav ? row : null;
        };
        const onDragStart = (event) => {
          const row = event.target.closest?.('button[class*="panelRow"]');
          if (!row || !managed.has(row.parentElement)) return;
          dragging = { row, nav: row.parentElement };
          row.dataset.sidebarDragging = '';
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', row.getAttribute('aria-label') || '');
          }
        };
        const onDragOver = (event) => {
          const row = dragRow(event);
          if (!row || row === dragging.row) return;
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
          const rect = row.getBoundingClientRect();
          const before = dragging.nav.dataset.sidebarNavCollapsed === 'true'
            ? event.clientX < (rect.left + rect.right) / 2
            : event.clientY < (rect.top + rect.bottom) / 2;
          dragging.nav.querySelector('[data-sidebar-drop]')?.removeAttribute('data-sidebar-drop');
          row.dataset.sidebarDrop = before ? 'before' : 'after';
        };
        const onDrop = (event) => {
          const row = dragRow(event);
          if (!row || row === dragging.row) return;
          event.preventDefault();
          const nav = dragging.nav;
          const side = row.dataset.sidebarDrop || 'before';
          const ordered = visualRows(nav).filter((item) => item !== dragging.row);
          ordered.splice(ordered.indexOf(row) + (side === 'after' ? 1 : 0), 0, dragging.row);
          clearDrag();
          animateLayout(() => saveOrder(ordered));
        };
        const onKeyDown = (event) => {
          if (!event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
          const row = event.target.closest?.('button[class*="panelRow"]');
          const nav = row?.parentElement;
          if (!managed.has(nav)) return;
          const ordered = visualRows(nav);
          const index = ordered.indexOf(row);
          const next = index + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1);
          if (next < 0 || next >= ordered.length) return;
          event.preventDefault();
          ordered.splice(index, 1);
          ordered.splice(next, 0, row);
          animateLayout(() => saveOrder(ordered));
        };
        // ponytail: native grid follows sidebar width; restore animated resize only after host-safe ResizeObserver validation.
        const sync = () => {
          let sidebarMounted = false;
          for (const nav of managed) if (!nav.isConnected || rejected.has(nav)) clear(nav);
          for (const nav of document.querySelectorAll('nav[class*="panelList"]')) {
            if (rejected.has(nav) || !/^(全局面板|Global panels)$/.test(nav.getAttribute('aria-label') || '')) continue;
            if (!managed.has(nav)) { managed.add(nav); sidebarMounted = true; }
            const existing = nav.querySelector(':scope > [data-sidebar-nav-toggle]');
            if (existing) {
              if (nav.lastElementChild !== existing) nav.append(existing);
              continue;
            }
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.sidebarNavToggle = '';
            button.addEventListener('click', () => animateLayout(() => {
              collapsed = !collapsed;
              try { window.localStorage.setItem(key, collapsed ? 'collapsed' : 'expanded'); } catch {}
              paint();
            }));
            nav.append(button);
            paint();
          }
          for (const nav of managed) syncRows(nav);
          if (hovered) showLabel(hovered.isConnected ? hovered : null);
          if (sidebarMounted) window.dispatchEvent(new window.Event('dsh-nav-fold:sidebar-ready'));
        };
        sync();
        let pendingSync = null;
        const navSelector = 'nav[class*="panelList"]', rowSelector = 'button[class*="panelRow"]';
        const observer = new window.MutationObserver((records) => {
          const contains = (node, selector) => node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector));
          const rowChanges = new Set(records.filter((record) => record.type === 'childList' && record.target.matches?.(navSelector)
            && [...record.addedNodes, ...record.removedNodes].some((node) => contains(node, rowSelector))).map((record) => record.target));
          let relevant = false;
          for (const record of records) {
            const target = record.target;
            if (record.type === 'attributes') {
              if (target.matches?.(navSelector) || (target.matches?.(rowSelector) && managed.has(target.parentElement))) relevant = true;
              continue;
            }
            if (target.closest?.('[data-sidebar-nav-toggle]')) continue;
            const changed = [...record.addedNodes, ...record.removedNodes];
            if (target.matches?.(navSelector) && managed.has(target)) {
              const removed = [...record.removedNodes].some((node) => node.hasAttribute?.('data-sidebar-nav-toggle') && node.parentElement !== target);
              if (removed) {
                const now = Date.now();
                // ponytail: one quick host rebuild is allowed; repeated removal within 1s falls back to native nav.
                if (!rowChanges.has(target) || now - (remountedAt.get(target) || 0) < 1000) rejected.add(target);
                else remountedAt.set(target, now);
                relevant = true;
              } else if (changed.some((node) => contains(node, rowSelector))) relevant = true;
            } else if (changed.some((node) => contains(node, navSelector))) relevant = true;
          }
          if (relevant && pendingSync === null) pendingSync = window.setTimeout(() => { pendingSync = null; sync(); }, 0);
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label'] });
        document.body.addEventListener('pointerover', onPointerOver);
        document.body.addEventListener('pointerout', onPointerOut);
        document.body.addEventListener('focusin', onFocusIn);
        document.body.addEventListener('focusout', onFocusOut);
        document.body.addEventListener('dragstart', onDragStart);
        document.body.addEventListener('dragover', onDragOver);
        document.body.addEventListener('drop', onDrop);
        document.body.addEventListener('dragend', clearDrag);
        document.body.addEventListener('keydown', onKeyDown);
        return () => {
          observer.disconnect();
          if (pendingSync !== null) window.clearTimeout(pendingSync);
          for (const animation of animations) animation.cancel();
          animations.clear();
          clearDrag();
          document.body.removeEventListener('pointerover', onPointerOver);
          document.body.removeEventListener('pointerout', onPointerOut);
          document.body.removeEventListener('focusin', onFocusIn);
          document.body.removeEventListener('focusout', onFocusOut);
          document.body.removeEventListener('dragstart', onDragStart);
          document.body.removeEventListener('dragover', onDragOver);
          document.body.removeEventListener('drop', onDrop);
          document.body.removeEventListener('dragend', clearDrag);
          document.body.removeEventListener('keydown', onKeyDown);
          for (const nav of managed) clear(nav);
          style.remove();
        };
      }, 'dsh-nav-fold: global navigation');
      if (!ctx.slots?.inject) return;
      const form = ctx.configForms?.get?.('nav-fold');
      const accepted = () => form?.getSnapshot?.()?.status === 'ready' && form.getSnapshot().value?.workspaceViewsEnabled === true;
      const React = require('react');
      const { StateDot, Menu, MenuItemButton, IconEllipsisOutlineRegular, IconPinOutlineRegular, IconPinFillRegular, IconArchiveOutlineRegular, Modal, Button } = require('@deepseek-ai/dsh-client-ui-primitives');
      let explicitRetryApproved = false;
      let recheckApprovedRetry = () => {};
      if (form) ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
        name: 'plugins.bundle.config', key: 'dsh-nav-fold'
      }, function WorkspaceSettings({ view }) {
        const snapshot = React.useSyncExternalStore((listener) => form.subscribe(listener), () => form.getSnapshot(), () => form.getSnapshot());
        const saved = snapshot.status === 'ready' && snapshot.value?.workspaceViewsEnabled === true;
        const [draft, setDraft] = React.useState(saved);
        const [message, setMessage] = React.useState('');
        React.useEffect(() => { setDraft(saved); setMessage(''); }, [saved, snapshot.revision]);
        if (view !== 'page') return null;
        return React.createElement('section', { 'data-dsh-nav-fold-settings': '' },
          React.createElement('h3', null, '工作区筛选视图 / Workspace views'),
          React.createElement('p', null, '默认关闭。仅在这里保存开启；检测到侧栏冲突时自动撤出，原生工作区保持原状。'),
          React.createElement('label', null,
            React.createElement('input', { type: 'checkbox', checked: draft, disabled: snapshot.status !== 'ready' || !snapshot.writable, onChange: (event) => setDraft(event.target.checked) }),
            ' 启用工作区、活动与收藏三栏'),
          React.createElement('button', { type: 'button', disabled: snapshot.status !== 'ready' || !snapshot.writable || draft === saved,
            onClick: async () => {
              const retry = draft && !saved;
              try {
                const success = await form.set('workspaceViewsEnabled', draft);
                if (!success) { setMessage('未能保存，请重试'); return; }
                setMessage('');
                if (retry) {
                  explicitRetryApproved = true;
                  recheckApprovedRetry();
                }
              } catch {
                explicitRetryApproved = false;
                setMessage('未能保存，请重试');
              }
            } }, '保存 / Save'),
          snapshot.status !== 'ready' && React.createElement('p', { role: 'status' }, '设置尚不可用；工作区保持原生视图。'),
          message && React.createElement('p', { role: 'alert' }, message));
      }));
      ctx.slots.inject('sidebar.workspaces', () => {
        let selected = 'workspace';
        let collapsed = false;
        let enabled = accepted();
        try {
          const saved = window.localStorage.getItem('dsh-nav-fold:workspace-mode');
          if (saved === 'activity' || saved === 'favorites') selected = saved;
          collapsed = window.localStorage.getItem('dsh-nav-fold:workspace-tabs-collapsed') === 'true';
        } catch {}
        let bar = null, tabs = null, foldButton = null, observedRoot = null, observedRegion = null, observedFooter = null, observer = null, unregister = null, registeredMode = null;
        let slotMutationDepth = 0, missedSlotChange = false, disposed = false;
        const mutateOwnSlot = (action) => {
          slotMutationDepth++;
          try { return action(); }
          finally {
            slotMutationDepth--;
            if (!slotMutationDepth && missedSlotChange) {
              missedSlotChange = false;
              Promise.resolve().then(() => { if (!disposed) onSlotChange(); });
            }
          }
        };
        let quarantined = false;
        let peerSuspended = false;
        let sawSavedOffAfterConflict = false;
        const quarantine = () => {
          if (quarantined) return;
          quarantined = true;
          sawSavedOffAfterConflict = false;
          explicitRetryApproved = false;
          if (form?.getSnapshot?.()?.status === 'ready' && form.getSnapshot().writable) {
            Promise.resolve(form.set('workspaceViewsEnabled', false)).catch(() => {});
          }
        };
        const slotName = 'sidebar.workspaces';
        const ownRegistrant = 'dsh-nav-fold:workspace-views';
        // rc.5's live native WorkspaceBrowser registers as fiber `Gb` in this shipped build.
        // Unknown builds stay native-only rather than trusting peer-supplied locale/children.
        const nativeEntry = (entry) => entry?.registrant === 'Gb' && entry.locale === 'workspace'
          && entry.children?.['sidebar.workspaces.session.menu.item']
          && entry.children?.['sidebar.workspaces.session.row.action'];
        const slotSafe = (ours = false) => {
          const spec = ctx.slots.spec?.(slotName);
          if (spec?.kind !== 'single' || spec.scope !== 'root') return false;
          const entries = ctx.slots.entries?.(slotName);
          if (!Array.isArray(entries) || entries.length !== (ours ? 2 : 1) || entries.filter(nativeEntry).length !== 1) return false;
          if (entries.some((entry) => entry?.options?.name !== undefined && entry.options.name !== slotName)) return false;
          if (ours && (entries.filter((entry) => entry.registrant === ownRegistrant).length !== 1
            || ctx.slots.entriesOfSlot?.(slotName)?.[0]?.registrant !== ownRegistrant)) return false;
          return true;
        };
        const temporarilyEmptySlot = () => {
          const spec = ctx.slots.spec?.(slotName);
          const entries = ctx.slots.entries?.(slotName);
          return spec?.kind === 'single' && spec.scope === 'root' && Array.isArray(entries) && entries.length === 0;
        };
        const peerOnlyConflict = (ours = false) => {
          const spec = ctx.slots.spec?.(slotName);
          if (spec?.kind !== 'single' || spec.scope !== 'root') return false;
          const entries = ctx.slots.entries?.(slotName);
          if (!Array.isArray(entries) || entries.filter(nativeEntry).length !== 1) return false;
          if (entries.some((entry) => (entry?.options?.name !== undefined && entry.options.name !== slotName)
            || typeof entry?.registrant !== 'string' || !entry.registrant)) return false;
          if (entries.filter((entry) => entry.registrant === ownRegistrant).length !== Number(ours)) return false;
          return entries.filter((entry) => !nativeEntry(entry) && entry.registrant !== ownRegistrant).length > 0;
        };
        const labels = [['workspace', '工作区', 'Workspaces'], ['activity', '活动', 'Activity'], ['favorites', '收藏', 'Favorites']];
        const icons = {
          workspace: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h7l2 2H21v9.5H3z"/></svg>',
          activity: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h5l2-4 4 8 2-5 2 1h5"/></svg>',
          favorites: '<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(-24 12 12)"><path d="M8.5 5.5h7l-1 4 2 3v1H7.5v-1l2-3-1-4Z"/><path d="M12 13.5v7"/></g></svg>'
        };
        const identity = (value) => value;
        function SessionRow({ row, currentId, kindText, dotState, english }) {
          const [busy, setBusy] = React.useState(false);
          const busyRef = React.useRef(false);
          const [error, setError] = React.useState('');
          const [archiveRequest, setArchiveRequest] = React.useState(false);
          const [menuOpen, setMenuOpen] = React.useState(false);
          const pin = async () => {
            if (busyRef.current || archiveRequest) return;
            const action = row.pinned ? 'unpinSession' : 'pinSession';
            if (typeof ctx.uiWorkspace?.[action] !== 'function') { setError(english ? 'Pin action unavailable' : '收藏操作不可用'); return; }
            busyRef.current = true; setBusy(true); setError('');
            try { await ctx.uiWorkspace[action](row.id); }
            catch { setError(english ? 'Could not update favorite. Try again.' : '收藏未更新，请重试'); }
            finally { busyRef.current = false; setBusy(false); }
          };
          const archive = async () => {
            setMenuOpen(false);
            if (busyRef.current || archiveRequest) return;
            if (typeof ctx.uiWorkspace?.archiveSession !== 'function') { setError(english ? 'Archive action unavailable' : '归档操作不可用'); return; }
            busyRef.current = true; setBusy(true); setError('');
            try { await ctx.uiWorkspace.archiveSession(row.id); }
            catch (reason) {
              if (reason instanceof Error && reason.name === 'WorkspaceArchiveError' && reason.rpcError?.code === 'workspace/session-active') setArchiveRequest(true);
              else setError(english ? 'Could not archive session. Try again.' : '归档失败，请重试');
            } finally { busyRef.current = false; setBusy(false); }
          };
          const closeArchive = () => { if (!busyRef.current) { setArchiveRequest(false); setError(''); } };
          const confirmArchive = async () => {
            if (busyRef.current || !archiveRequest) return;
            busyRef.current = true; setBusy(true); setError('');
            try { await ctx.uiWorkspace.archiveSession(row.id, { stopActivity: true }); setArchiveRequest(false); }
            catch { setError(english ? 'Could not stop and archive. Try again.' : '停止并归档失败，请重试'); }
            finally { busyRef.current = false; setBusy(false); }
          };
          const pinLabel = row.pinned ? (english ? 'Unpin session' : '取消收藏会话') : (english ? 'Pin session' : '收藏会话');
          const copyId = async () => {
            setMenuOpen(false); setError('');
            try { await window.navigator.clipboard.writeText(row.id); }
            catch { setError(english ? 'Could not copy session ID. Try again.' : '复制会话 ID 失败，请重试'); }
          };
          return React.createElement('div', { className: `dsh-nav-fold-session${row.id === currentId ? ' dsh-nav-fold-session-selected' : ''}`,
            onContextMenu: (event) => { event.preventDefault(); setMenuOpen(true); } },
            React.createElement('button', { type: 'button', className: 'dsh-nav-fold-session-main',
              onClick: () => ctx.uiWorkspace?.openSession?.(row.id), 'aria-current': row.id === currentId ? 'page' : undefined,
              'aria-label': [row.title || row.id, row.workspace, kindText[row.kind]].filter(Boolean).join(' · ') },
              React.createElement('span', { className: 'dsh-nav-fold-session-title' }, row.title || row.id),
              React.createElement('span', { className: 'dsh-nav-fold-session-subtitle' },
                React.createElement('span', null, row.workspace),
                dotState[row.kind] && React.createElement('span', { className: `dsh-nav-fold-state-dot${row.kind === 'running' ? ' dsh-nav-fold-state-dot-running' : ''}`, role: 'img', 'aria-label': kindText[row.kind], title: kindText[row.kind] },
                  React.createElement(StateDot, { state: dotState[row.kind] })))),
            React.createElement('span', { className: 'dsh-nav-fold-session-actions' },
              React.createElement(Menu, { open: menuOpen, onClose: () => setMenuOpen(false), portal: true, closeOnPointerLeave: true,
                anchor: React.createElement('button', { type: 'button', 'data-session-menu': '',
                  'aria-label': english ? `Actions for ${row.title || row.id}` : `${row.title || row.id}的操作`,
                  'aria-haspopup': 'menu', 'aria-expanded': menuOpen,
                  onClick: () => setMenuOpen((value) => !value) }, React.createElement(IconEllipsisOutlineRegular, { size: 14 })) },
                React.createElement(MenuItemButton, { onSelect: () => { setMenuOpen(false); ctx.uiWorkspace?.openSession?.(row.id); } }, english ? 'Open session' : '打开会话'),
                React.createElement(MenuItemButton, { onSelect: () => { setMenuOpen(false); void pin(); },
                  icon: row.pinned ? React.createElement(IconPinFillRegular, {}) : React.createElement(IconPinOutlineRegular, {}) }, pinLabel),
                React.createElement(MenuItemButton, { onSelect: archive, icon: React.createElement(IconArchiveOutlineRegular, { size: 14 }) }, english ? 'Archive session' : '归档会话'),
                window.navigator?.clipboard?.writeText && React.createElement(MenuItemButton, { onSelect: copyId }, english ? 'Copy session ID' : '复制会话 ID')),
              React.createElement('button', { type: 'button', 'data-session-archive': '', disabled: busy || archiveRequest || typeof ctx.uiWorkspace?.archiveSession !== 'function',
                'aria-label': english ? 'Archive session' : '归档会话', title: english ? 'Archive session' : '归档会话',
                onClick: archive }, React.createElement(IconArchiveOutlineRegular, { size: 14 })),
              React.createElement('button', { type: 'button', 'data-session-pin': '', disabled: busy || archiveRequest || typeof ctx.uiWorkspace?.[row.pinned ? 'unpinSession' : 'pinSession'] !== 'function',
                'aria-pressed': row.pinned, 'aria-label': pinLabel, title: pinLabel,
                onClick: pin }, React.createElement(row.pinned ? IconPinFillRegular : IconPinOutlineRegular, { size: 14 }))),
            archiveRequest && React.createElement(Modal, { open: true, onClose: closeArchive,
              closeLabel: english ? 'Close' : '关闭', title: english ? 'Stop work and archive session?' : '停止任务并归档会话？',
              description: english ? `Archiving ${row.title || row.id} will stop its running work. Continue?` : `归档${row.title || row.id}将停止该会话正在运行的任务。是否继续？`,
              footer: React.createElement(React.Fragment, null,
                React.createElement(Button, { variant: 'outline', disabled: busy, onClick: closeArchive }, english ? 'Cancel' : '取消'),
                React.createElement(Button, { variant: 'outline', disabled: busy, onClick: confirmArchive }, english ? 'Stop and archive' : '归档并停止')) },
              error && React.createElement('span', { role: 'alert', className: 'dsh-nav-fold-archive-error' }, error)),
            !archiveRequest && error && React.createElement('span', { role: 'alert' }, error));
        }
        function WorkspaceView(props) {
          const list = props.useSessions?.(identity) || {};
          const statuses = props.useSessionStatus?.(identity) || new Map();
          const workspaces = props.useWorkspaces?.(identity) || {};
          const panelActive = props.usePanelInfo?.((info) => info.activePanelId !== null) === true;
          const currentId = panelActive ? null : Object.values(list.byId || {}).find((session) => (session.retainedBy?.mainView ?? 0) > 0)?.id;
          const views = selectWorkspaceViews(list, statuses, workspaces, new Set());
          const rows = selected === 'favorites' ? views.favorites : views.activity;
          const english = document.documentElement.lang.toLowerCase().startsWith('en');
          const kindText = { waiting: english ? 'Waiting' : '待处理', running: english ? 'Running' : '运行中', unread: english ? 'Completed, unread' : '完成未读', error: english ? 'Error stopped' : '错误停止' };
          const dotState = { waiting: 'warning', running: 'ongoing', unread: 'done', error: 'error' };
          const loading = list.phase === 'pending' || workspaces.phase === 'pending';
          return React.createElement('section', { 'data-dsh-workspace-view': selected, 'aria-busy': loading, 'aria-label': selected === 'favorites' ? (english ? 'Favorites' : '收藏') : (english ? 'Activity' : '活动') },
            rows.length ? rows.map((row) => React.createElement(SessionRow, { row, currentId, kindText, dotState, english, key: row.id }))
              : React.createElement('p', { className: 'dsh-nav-fold-empty' }, loading ? (english ? 'Loading sessions…' : '正在加载会话…') : selected === 'favorites' ? (english ? 'No pinned sessions' : '暂无收藏会话') : (english ? 'No recent sessions' : '暂无近期会话')));
        }
        const syncSelection = () => {
          if (unregister && (!enabled || peerSuspended || !bar || selected === 'workspace' || registeredMode !== selected)) {
            const dispose = unregister; unregister = null; registeredMode = null;
            mutateOwnSlot(dispose);
          }
          if (enabled && !quarantined && !peerSuspended && bar && selected !== 'workspace' && !unregister) {
            if (!slotSafe()) { if (!peerOnlyConflict()) quarantine(); ensure(); return; }
            unregister = mutateOwnSlot(() => ctx.slots.register({ name: slotName, priority: -100, registrant: ownRegistrant }, WorkspaceView));
            registeredMode = selected;
            if (!slotSafe(true)) { if (!peerOnlyConflict(true)) quarantine(); ensure(); return; }
          }
          if (!bar) return;
          const current = labels.find(([mode]) => mode === selected);
          bar.dataset.collapsed = String(collapsed);
          tabs.hidden = collapsed;
          tabs.style.setProperty('--dsh-view-index', String(labels.findIndex(([mode]) => mode === selected)));
          foldButton.setAttribute('aria-expanded', String(!collapsed));
          foldButton.setAttribute('aria-label', `${current[1]} · ${collapsed ? '展开' : '折叠'}工作区视图切换 / ${collapsed ? 'Expand' : 'Collapse'} workspace view tabs`);
          foldButton.title = document.documentElement.lang.toLowerCase().startsWith('en') ? (collapsed ? 'Expand workspace view tabs' : 'Collapse workspace view tabs') : (collapsed ? '展开工作区视图切换' : '折叠工作区视图切换');
          foldButton.innerHTML = `${collapsed ? icons[selected].replace('<svg ', `<svg data-current-view="${selected}" `) : ''}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${collapsed ? 'm4 6 4 4 4-4' : 'm4 10 4-4 4 4'}"/></svg>`;
          for (const button of tabs.querySelectorAll('button[data-view]')) {
            button.setAttribute('aria-pressed', String(button.dataset.view === selected));
          }
        };
        const ensure = () => {
          const nav = document.querySelector('nav[class*="panelList"][data-sidebar-nav-collapsed]');
          const root = nav?.closest('.kB3qhq_root');
          const regions = root ? [...root.children].filter((node) => node.classList.contains('kB3qhq_regionArea')) : [];
          const footers = root ? [...root.children].filter((node) => node.classList.contains('kB3qhq_footArea')) : [];
          const region = regions.length === 1 && footers.length === 1 && [...root.children].indexOf(regions[0]) < [...root.children].indexOf(footers[0]) ? regions[0] : null;
          if (enabled && bar && observedRoot?.isConnected && (!bar.isConnected || bar.children.length !== 2 || bar.firstElementChild !== tabs || bar.lastElementChild !== foldButton
            || bar.parentNode !== observedRoot || bar.nextElementSibling !== (region || (observedRegion?.parentNode === observedRoot ? observedRegion : observedFooter?.parentNode === observedRoot ? observedFooter : null)))) quarantine();
          if (enabled && !quarantined && !slotSafe(Boolean(unregister))) {
            if (peerOnlyConflict(Boolean(unregister))) peerSuspended = true;
            else if (!temporarilyEmptySlot()) quarantine();
          }
          if (peerSuspended && slotSafe(Boolean(unregister))) peerSuspended = false;
          if (!enabled || quarantined || peerSuspended || !region || !slotSafe(Boolean(unregister))) {
            if (peerSuspended) syncSelection();
            bar?.remove(); bar = null; tabs = null; foldButton = null;
            if (enabled && !quarantined && !region && observedRoot?.isConnected) {
              // Keep observing the host root so a missing region/footer can restore itself.
              observedRegion = null; observedFooter = null;
            } else {
              observer?.disconnect(); observer = null; observedRoot = null; observedRegion = null; observedFooter = null;
            }
            syncSelection();
            return;
          }
          if (!bar) {
            bar = document.createElement('div');
            bar.dataset.dshWorkspaceTabsRow = '';
            tabs = document.createElement('div');
            tabs.dataset.dshWorkspaceTabs = '';
            tabs.setAttribute('role', 'group');
            tabs.setAttribute('aria-label', '工作区视图 / Workspace views');
            for (const [value, zh, en] of labels) {
              const button = document.createElement('button');
              button.type = 'button'; button.dataset.view = value;
              button.setAttribute('aria-label', `${zh} / ${en}`);
              button.innerHTML = icons[value];
              button.title = document.documentElement.lang.toLowerCase().startsWith('en') ? en : zh;
              button.addEventListener('click', () => {
                if (selected === value) return;
                selected = value;
                try { window.localStorage.setItem('dsh-nav-fold:workspace-mode', selected); } catch {}
                syncSelection();
              });
              tabs.append(button);
            }
            foldButton = document.createElement('button');
            foldButton.type = 'button';
            foldButton.dataset.dshWorkspaceTabsToggle = '';
            foldButton.addEventListener('click', () => {
              collapsed = !collapsed;
              try { window.localStorage.setItem('dsh-nav-fold:workspace-tabs-collapsed', String(collapsed)); } catch {}
              syncSelection();
            });
            bar.append(tabs, foldButton);
          }
          if (bar.parentNode && (bar.parentNode !== root || bar.nextElementSibling !== region)) {
            quarantine(); ensure(); return;
          }
          // Keep newly created controls detached until our Activity/Favorites entry wins the singleton.
          if (!bar.parentNode) {
            syncSelection();
            if (quarantined || peerSuspended || !slotSafe(Boolean(unregister))) { ensure(); return; }
            root.insertBefore(bar, region);
          }
          if (observedRoot !== root || observedRegion !== region || observedFooter !== footers[0]) {
            observer?.disconnect(); observedRoot = root; observedRegion = region; observedFooter = footers[0];
            observer = new window.MutationObserver(() => {
              if (enabled) ensure(); // Revalidate unique region and footer before retaining a singleton override.
            });
            observer.observe(root, { childList: true });
            observer.observe(bar, { childList: true });
            observer.observe(region, { attributes: true, attributeFilter: ['class'] });
            observer.observe(footers[0], { attributes: true, attributeFilter: ['class'] });
          }
          syncSelection();
        };
        const onAcceptedChange = () => {
          const snapshot = form?.getSnapshot?.();
          const next = accepted();
          if (quarantined && snapshot?.status === 'ready') {
            if (!next) sawSavedOffAfterConflict = true;
            else if (sawSavedOffAfterConflict && explicitRetryApproved) {
              quarantined = false;
              sawSavedOffAfterConflict = false;
            }
          }
          if (!quarantined) explicitRetryApproved = false;
          enabled = next;
          ensure();
        };
        const onSlotChange = () => {
          if (disposed) return;
          if (slotMutationDepth) { missedSlotChange = true; return; } // Reconcile once after our transition finishes.
          if (unregister && !slotSafe(true) && !peerOnlyConflict(true) && !temporarilyEmptySlot()) quarantine();
          ensure();
        };
        recheckApprovedRetry = onAcceptedChange;
        const unsubscribeForm = form?.subscribe?.(onAcceptedChange);
        const unsubscribeSlot = ctx.slots.subscribe?.(slotName, onSlotChange);
        window.addEventListener('dsh-nav-fold:sidebar-ready', ensure);
        ensure();
        return () => {
          disposed = true;
          if (recheckApprovedRetry === onAcceptedChange) recheckApprovedRetry = () => {};
          unsubscribeForm?.(); unsubscribeSlot?.();
          window.removeEventListener('dsh-nav-fold:sidebar-ready', ensure);
          observer?.disconnect(); bar?.remove();
          unregister?.();
        };
      });
    }
    module.exports.inject = ['slots', 'sessions', 'uiWorkspace', 'configForms'];
    module.exports.apply = apply;
    module.exports.__test__ = { selectWorkspaceViews };
    module.exports.name = 'dsh-nav-fold-client';
    return module.exports;
  }
});
