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
[data-dsh-workspace-tabs-row] { display: grid; grid-template-columns: minmax(0, 1fr); align-items: center; margin: 6px 0 8px; min-width: 0; }
.kB3qhq_root.kB3qhq_collapsed [data-dsh-workspace-tabs-row] { display: none; }
[data-dsh-workspace-tabs] {
  --dsh-view-index: 0; position: relative; z-index: 0; display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0;
  min-width: 0; margin: 0; padding: 3px; min-height: 31px;
  border-radius: 8px; background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10));
  box-sizing: border-box;
}
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
[data-dsh-nav-fold-navigation] + .kB3qhq_regionArea [role="treeitem"][data-row-key^="workspace:"][aria-expanded]:focus,
[data-dsh-nav-fold-navigation] + .kB3qhq_regionArea [role="treeitem"][data-row-key^="session:"]:focus,
[data-dsh-nav-fold-navigation] + .kB3qhq_regionArea .dsh-nav-fold-session-main:focus { outline: 2px solid var(--dsw-alias-label-primary, currentColor); outline-offset: -2px; }
.dsh-nav-fold-session-title { font-size: 12px; line-height: 1.4; padding-right: 82px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-nav-fold-session-native .dsh-nav-fold-session-title { padding-right: 32px; }
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
@media (prefers-reduced-motion: reduce) { [data-dsh-workspace-tabs]::before, [data-dsh-workspace-tabs] > button[data-view] { transition: none; } }
@media (prefers-reduced-motion: reduce) { nav[class*="panelList"] > [data-sidebar-nav-toggle] svg { animation: none; opacity: .75; } nav[class*="panelList"] [data-sidebar-toggle-center] { transition: none; } nav[class*="panelList"] > button[data-sidebar-drop] { transition: none; transform: none; } }
[data-dsh-nav-fold-settings] { display: grid; gap: 26px; max-width: 720px; min-width: 0; color: var(--dsw-alias-label-primary); }
[data-dsh-nav-fold-settings] [data-dsh-nav-fold-group] { min-width: 0; }
[data-dsh-nav-fold-settings] h3 { margin: 0 0 5px; font-size: 15px; font-weight: 600; line-height: 1.45; }
[data-dsh-nav-fold-settings] [data-dsh-nav-fold-option] { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: start; padding: 14px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); min-width: 0; }
[data-dsh-nav-fold-settings] [data-dsh-nav-fold-option] > div { min-width: 0; }
[data-dsh-nav-fold-settings] label { display: inline-flex; align-items: flex-start; gap: 8px; font-size: 13px; font-weight: 600; line-height: 1.5; cursor: pointer; }
[data-dsh-nav-fold-settings] input[type="checkbox"] { flex: none; margin: 3px 0 0; accent-color: var(--dsw-alias-brand-primary); }
[data-dsh-nav-fold-settings] p, [data-dsh-nav-fold-settings] ol { margin: 6px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.55; }
[data-dsh-nav-fold-settings] ol { padding-left: 20px; }
[data-dsh-nav-fold-settings] li + li { margin-top: 4px; }
[data-dsh-nav-fold-settings] [role="alert"] { color: var(--dsw-alias-state-error-primary); }
[data-dsh-nav-fold-settings] button { align-self: start; min-width: 92px; padding: 6px 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; cursor: pointer; }
[data-dsh-nav-fold-settings] button:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
[data-dsh-nav-fold-settings] button:disabled { opacity: .55; cursor: default; }
[data-dsh-nav-fold-settings] :is(input, button, a):focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
@media (max-width: 540px) { [data-dsh-nav-fold-settings] [data-dsh-nav-fold-option] { grid-template-columns: minmax(0, 1fr); gap: 10px; } }
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
      if (form?.subscribe && form.getSnapshot) ctx.effect(() => {
        // Adapted from stoner-byte/dsh-hide-brand (MIT): use the logoRow fragment and inject once.
        // Fold owns this scoped rule and removes only its own node when disabled.
        const cssKey = 'dsh-nav-fold/hide-brand';
        let brandStyle = null;
        const ensureBrandStyle = () => {
          if (brandStyle?.isConnected) return brandStyle;
          const root = document.head ?? document.documentElement;
          if (!root) return null;
          const style = document.createElement('style');
          style.dataset.plugin = 'dsh-nav-fold';
          style.dataset.pluginCss = cssKey;
          style.textContent = '[data-platform="darwin"] .kB3qhq_root > [class*="logoRow"] { display: none !important; }';
          root.append(style);
          brandStyle = style;
          return style;
        };
        const syncBrand = () => {
          const snapshot = form.getSnapshot();
          if (snapshot?.status === 'ready' && snapshot.value?.hideBrandEnabled === true) {
            brandStyle = ensureBrandStyle();
          } else {
            brandStyle?.remove(); brandStyle = null;
          }
        };
        const unsubscribe = form.subscribe(syncBrand);
        syncBrand();
        return () => { unsubscribe?.(); brandStyle?.remove(); brandStyle = null; };
      }, 'dsh-nav-fold: optional macOS brand row');
      const accepted = () => form?.getSnapshot?.()?.status === 'ready' && form.getSnapshot().value?.workspaceViewsEnabled === true;
      const navigationAccepted = () => accepted() && form.getSnapshot().value?.navigationEnabled !== false;
      const React = require('react');
      const { StateDot, Menu, MenuItemButton, IconEllipsisOutlineRegular, IconPinOutlineRegular, IconPinFillRegular, IconArchiveOutlineRegular, Modal, Button } = require('@deepseek-ai/dsh-client-ui-primitives');
      let explicitRetryApproved = false;
      let recheckApprovedRetry = () => {};
      if (form) ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
        name: 'plugins.bundle.config', key: 'dsh-nav-fold'
      }, function WorkspaceSettings({ view }) {
        const snapshot = React.useSyncExternalStore((listener) => form.subscribe(listener), () => form.getSnapshot(), () => form.getSnapshot());
        const saved = snapshot.status === 'ready' && snapshot.value?.workspaceViewsEnabled === true;
        const savedNavigation = snapshot.status === 'ready' && snapshot.value?.navigationEnabled !== false;
        const savedBrand = snapshot.status === 'ready' && snapshot.value?.hideBrandEnabled === true;
        const [draft, setDraft] = React.useState(saved);
        const [draftNavigation, setDraftNavigation] = React.useState(savedNavigation);
        const [draftBrand, setDraftBrand] = React.useState(savedBrand);
        const [message, setMessage] = React.useState('');
        const [navigationMessage, setNavigationMessage] = React.useState('');
        const [brandMessage, setBrandMessage] = React.useState('');
        React.useEffect(() => { setDraft(saved); setMessage(''); }, [saved, snapshot.status]);
        React.useEffect(() => { setDraftNavigation(savedNavigation); setNavigationMessage(''); }, [savedNavigation, snapshot.status]);
        React.useEffect(() => { setDraftBrand(savedBrand); setBrandMessage(''); }, [savedBrand, snapshot.status]);
        if (view !== 'page') return null;
        return React.createElement('section', { 'data-dsh-nav-fold-settings': '' },
          React.createElement('div', { 'data-dsh-nav-fold-group': 'navigation' },
            React.createElement('h3', null, '浏览与导航'),
            React.createElement('div', { 'data-dsh-nav-fold-option': 'views' },
              React.createElement('div', null,
                React.createElement('label', null,
                  React.createElement('input', { type: 'checkbox', checked: draft, disabled: snapshot.status !== 'ready' || !snapshot.writable, onChange: (event) => setDraft(event.target.checked) }),
                  ' 工作区／活动／收藏三栏'),
                React.createElement('p', null, '将工作区、待处理／运行／未读／最近会话和收藏分开显示；默认关闭。检测到侧栏冲突时恢复原生工作区。'),
                snapshot.status !== 'ready' && React.createElement('p', { role: 'status' }, '设置尚不可用；工作区保持原生视图。'),
                message && React.createElement('p', { role: 'alert' }, message)),
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
                } }, '保存三栏设置')),
            React.createElement('div', { 'data-dsh-nav-fold-option': 'session-navigation' },
              React.createElement('div', null,
                React.createElement('label', null,
                  React.createElement('input', { type: 'checkbox', 'data-dsh-nav-fold-navigation-enabled': '', checked: draftNavigation,
                    disabled: snapshot.status !== 'ready' || !snapshot.writable,
                    onChange: (event) => setDraftNavigation(event.target.checked) }),
                  ' 会话焦点导航'),
                React.createElement('p', null, '自定义入口快捷键进入侧栏导航；↑↓移动焦点，←→切换三栏，Enter 展开文件夹或打开会话，Esc 退出。'),
                !saved && React.createElement('p', { role: 'status' }, '先在上方开启并保存三栏，才能使用会话导航。'),
                React.createElement('ol', { 'data-dsh-nav-fold-guide': '' },
                  React.createElement('li', null, '开启并保存上方三栏。'),
                  React.createElement('li', null, '到 DSH 设置 → 快捷键，为「会话导航 / Navigate sessions」绑定入口组合键；没有预设按键。'),
                  React.createElement('li', null, '可选：在「无线麦」中把小米蓝牙遥控器的进入列表按键映射到同一组合键。')),
                React.createElement('p', null, 'Fold 不直接连接蓝牙设备；仅响应你绑定的入口快捷键。'),
                React.createElement('p', null, '如果按键无响应，先检查 DSH 快捷键冲突和其他插件的全局按键监听。'),
                navigationMessage && React.createElement('p', { role: 'alert' }, navigationMessage)),
              React.createElement('button', { type: 'button', 'data-dsh-nav-fold-navigation-save': '',
                disabled: snapshot.status !== 'ready' || !snapshot.writable || draftNavigation === savedNavigation,
                onClick: async () => {
                  try {
                    const success = await form.set('navigationEnabled', draftNavigation);
                    if (!success) { setNavigationMessage('导航设置未能保存，请重试'); return; }
                    setNavigationMessage('');
                  } catch { setNavigationMessage('导航设置未能保存，请重试'); }
                } }, '保存导航设置'))),
          React.createElement('div', { 'data-dsh-nav-fold-group': 'space' },
            React.createElement('h3', null, '空间整理'),
            React.createElement('div', { 'data-dsh-nav-fold-option': 'brand' },
              React.createElement('div', null,
                React.createElement('label', null,
                  React.createElement('input', { type: 'checkbox', 'data-dsh-nav-fold-brand-enabled': '', checked: draftBrand,
                    disabled: snapshot.status !== 'ready' || !snapshot.writable,
                    onChange: (event) => setDraftBrand(event.target.checked) }),
                  ' 隐藏顶部 Logo'),
                React.createElement('p', null, '仅适用于 macOS；无需开启三栏。关闭仅移除 Fold 自身的隐藏样式，其他去 Logo 插件不受影响。'),
                React.createElement('p', null, '收录并适配 ',
                  React.createElement('a', { href: 'https://github.com/stoner-byte/dsh-hide-brand', target: '_blank', rel: 'noopener noreferrer' }, 'stoner-byte 的 dsh-hide-brand'),
                  '（MIT）'),
                brandMessage && React.createElement('p', { role: 'alert' }, brandMessage)),
              React.createElement('button', { type: 'button', 'data-dsh-nav-fold-brand-save': '',
                disabled: snapshot.status !== 'ready' || !snapshot.writable || draftBrand === savedBrand,
                onClick: async () => {
                  try {
                    const success = await form.set('hideBrandEnabled', draftBrand);
                    if (!success) { setBrandMessage('品牌设置未能保存，请重试'); return; }
                    setBrandMessage('');
                  } catch { setBrandMessage('品牌设置未能保存，请重试'); }
                } }, '保存外观设置'))));
      }));
      ctx.slots.inject('sidebar.workspaces', () => {
        let selected = 'workspace';
        let enabled = accepted();
        try {
          const saved = window.localStorage.getItem('dsh-nav-fold:workspace-mode');
          if (saved === 'activity' || saved === 'favorites') selected = saved;
        } catch {}
        let bar = null, tabs = null, observedRoot = null, observedRegion = null, observedFooter = null, observer = null, unregister = null, registeredMode = null;
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
        // Exact shipped native signatures: 0.2.1-rc.5 uses `Gb` and owns menu.item;
        // 0.2.2-rc.1 uses `tk` and moves menu.item under contextMenu.content.
        // Unknown builds stay native-only rather than trusting peer-supplied locale/children.
        const nativeRc1Child = (entry, key, kind, inline = false) => entry.children?.[key]?.kind === kind
          && entry.children[key].scope === 'root'
          && (inline ? entry.children[key].inline === true : entry.children[key].inline !== true);
        const nativeEntry = (entry) => entry?.locale === 'workspace'
          && ((entry.registrant === 'Gb'
            && entry.children?.['sidebar.workspaces.session.menu.item']
            && entry.children?.['sidebar.workspaces.session.row.action'])
            || (entry.registrant === 'tk'
              && Object.keys(entry.children || {}).length === 5
              && !entry.children?.['sidebar.workspaces.session.menu.item']
              && nativeRc1Child(entry, 'sidebar.workspaces.directoryFlow', 'single')
              && nativeRc1Child(entry, 'sidebar.workspaces.session.row.action', 'list')
              && nativeRc1Child(entry, 'sidebar.session.row.leading', 'list', true)
              && nativeRc1Child(entry, 'sidebar.session.row.trailing', 'list', true)
              && nativeRc1Child(entry, 'sidebar.session.row.hover', 'list')));
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
        function SessionRow({ row, currentId, kindText, dotState, english, useContextMenu }) {
          const contextMenus = ctx.get?.('contextMenus');
          const nativeMenu = typeof useContextMenu === 'function' && typeof contextMenus?.open === 'function'
            && typeof contextMenus?.close === 'function' && typeof contextMenus?.active?.getSnapshot === 'function';
          const target = React.useMemo(() => Object.freeze({ kind: 'session', value: Object.freeze({ sessionId: row.id, displayTitle: row.title || row.id }) }), [row.id, row.title]);
          const menuHook = nativeMenu ? useContextMenu() : null;
          const triggerProps = nativeMenu ? menuHook.getTriggerProps(target) : {};
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
          return React.createElement('div', { className: `dsh-nav-fold-session${nativeMenu ? ' dsh-nav-fold-session-native' : ''}${row.id === currentId ? ' dsh-nav-fold-session-selected' : ''}`,
            ...(nativeMenu ? triggerProps : { onContextMenu: (event) => { event.preventDefault(); setMenuOpen(true); } }) },
            React.createElement('button', { type: 'button', className: 'dsh-nav-fold-session-main', 'data-dsh-nav-fold-session-id': row.id,
              onClick: () => ctx.uiWorkspace?.openSession?.(row.id), 'aria-current': row.id === currentId ? 'page' : undefined,
              'aria-label': [row.title || row.id, row.workspace, kindText[row.kind]].filter(Boolean).join(' · ') },
              React.createElement('span', { className: 'dsh-nav-fold-session-title' }, row.title || row.id),
              React.createElement('span', { className: 'dsh-nav-fold-session-subtitle' },
                React.createElement('span', null, row.workspace),
                dotState[row.kind] && React.createElement('span', { className: `dsh-nav-fold-state-dot${row.kind === 'running' ? ' dsh-nav-fold-state-dot-running' : ''}`, role: 'img', 'aria-label': kindText[row.kind], title: kindText[row.kind] },
                  React.createElement(StateDot, { state: dotState[row.kind] })))),
            React.createElement('span', { className: 'dsh-nav-fold-session-actions' },
              nativeMenu ? React.createElement('button', { type: 'button', 'data-session-menu': '', 'aria-haspopup': 'menu',
                'aria-label': english ? `Actions for ${row.title || row.id}` : `${row.title || row.id}的操作`,
                onClick: (event) => {
                  const active = contextMenus.active.getSnapshot();
                  if (active?.kind === 'session' && active.value?.sessionId === row.id) contextMenus.close();
                  else { const rect = event.currentTarget.getBoundingClientRect(); contextMenus.open(target, { x: rect.left, y: rect.bottom }); }
                } }, React.createElement(IconEllipsisOutlineRegular, { size: 14 })) : React.createElement(React.Fragment, null,
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
                onClick: pin }, React.createElement(row.pinned ? IconPinFillRegular : IconPinOutlineRegular, { size: 14 })))),
            !nativeMenu && archiveRequest && React.createElement(Modal, { open: true, onClose: closeArchive,
              closeLabel: english ? 'Close' : '关闭', title: english ? 'Stop work and archive session?' : '停止任务并归档会话？',
              description: english ? `Archiving ${row.title || row.id} will stop its running work. Continue?` : `归档${row.title || row.id}将停止该会话正在运行的任务。是否继续？`,
              footer: React.createElement(React.Fragment, null,
                React.createElement(Button, { variant: 'outline', disabled: busy, onClick: closeArchive }, english ? 'Cancel' : '取消'),
                React.createElement(Button, { variant: 'outline', disabled: busy, onClick: confirmArchive }, english ? 'Stop and archive' : '归档并停止')) },
              error && React.createElement('span', { role: 'alert', className: 'dsh-nav-fold-archive-error' }, error)),
            !nativeMenu && !archiveRequest && error && React.createElement('span', { role: 'alert' }, error));
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
            rows.length ? rows.map((row) => React.createElement(SessionRow, { row, currentId, kindText, dotState, english, useContextMenu: props.useContextMenu, key: row.id }))
              : React.createElement('p', { className: 'dsh-nav-fold-empty' }, loading ? (english ? 'Loading sessions…' : '正在加载会话…') : selected === 'favorites' ? (english ? 'No pinned sessions' : '暂无收藏会话') : (english ? 'No recent sessions' : '暂无近期会话')));
        }
        // Navigation is transient. It never changes the open Session until Enter.
        let navigating = false, previousFocus = null, temporaryTabStop = null, pendingFocus = false;
        const remembered = new Map();
        const releaseTabStop = () => {
          if (!temporaryTabStop) return;
          const [node, old] = temporaryTabStop;
          if (old === null) node.removeAttribute('tabindex');
          else node.setAttribute('tabindex', old);
          temporaryTabStop = null;
        };
        const stopNavigation = (restore = false) => {
          if (!navigating) return;
          navigating = false; pendingFocus = false;
          bar?.removeAttribute('data-dsh-nav-fold-navigation');
          releaseTabStop();
          if (restore && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
          previousFocus = null;
        };
        const visibleRows = () => {
          const region = observedRegion;
          if (!region?.isConnected) return [];
          const selector = selected === 'workspace'
            ? '[role="treeitem"][data-row-key^="workspace:"][aria-expanded], [role="treeitem"][data-row-key^="session:"]'
            : `[data-dsh-workspace-view="${selected}"] button[data-dsh-nav-fold-session-id]`;
          return [...region.querySelectorAll(selector)].filter((row) => {
            if (row.closest('[hidden], [aria-hidden="true"]')) return false;
            for (let node = row; node && node !== region.parentElement; node = node.parentElement) {
              const style = window.getComputedStyle(node);
              if (style.display === 'none' || style.visibility === 'hidden') return false;
            }
            return true;
          });
        };
        const focusRow = (row) => {
          releaseTabStop();
          if (!row) {
            tabs?.querySelector(`button[data-view="${selected}"]`)?.focus({ preventScroll: true });
            return;
          }
          if (row.tabIndex < 0) {
            temporaryTabStop = [row, row.getAttribute('tabindex')];
            row.setAttribute('tabindex', '-1');
          }
          row.focus({ preventScroll: true });
          remembered.set(selected, selected === 'workspace' ? row.dataset.rowKey : row.dataset.dshNavFoldSessionId);
          row.scrollIntoView?.({ block: 'nearest' });
        };
        const focusView = () => {
          if (!navigating || !bar?.isConnected) return;
          const rows = visibleRows();
          if (!rows.length) { pendingFocus = true; focusRow(null); return; }
          pendingFocus = false;
          const rememberedId = remembered.get(selected);
          const current = rows.find((row) => (selected === 'workspace' ? row.dataset.rowKey : row.dataset.dshNavFoldSessionId) === rememberedId)
            || rows.find((row) => row.getAttribute(selected === 'workspace' ? 'aria-selected' : 'aria-current') === (selected === 'workspace' ? 'true' : 'page')) || rows[0];
          focusRow(current);
        };
        const startNavigation = () => {
          if (!navigationAccepted() || !enabled || quarantined || peerSuspended || !bar?.isConnected || !observedRegion?.isConnected) return;
          if (navigating) { focusView(); return; }
          previousFocus = document.activeElement;
          navigating = true;
          bar.setAttribute('data-dsh-nav-fold-navigation', '');
          const root = bar.closest('.kB3qhq_root');
          if (root?.classList.contains('kB3qhq_collapsed')) ctx.layout?.toggleSidebar?.();
          if (root?.classList.contains('kB3qhq_collapsed')) {
            pendingFocus = true;
            window.setTimeout(focusView, 120);
          } else focusView();
        };
        const onNavigationKey = (event) => {
          if (!navigating || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          if (!bar?.isConnected || !observedRegion?.isConnected || document.querySelector('dialog[open], [role="dialog"], [aria-modal="true"]')) { stopNavigation(); return; }
          const target = document.activeElement;
          if (target?.closest?.('input, textarea, select, [contenteditable]')) { stopNavigation(); return; }
          if (!bar.contains(target) && !observedRegion.contains(target)) { stopNavigation(); return; }
          if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(event.key)) return;
          const rows = visibleRows();
          const index = rows.indexOf(target);
          if (event.key === 'Enter') {
            if (index < 0) return; // A focused tab keeps its native Enter action.
            event.preventDefault();
            if (selected === 'workspace' && target.matches('[role="treeitem"][data-row-key^="workspace:"][aria-expanded]')) {
              target.click(); // Let the native folder own expansion, without leaving navigation.
              return;
            }
            stopNavigation();
            const id = target.dataset.dshNavFoldSessionId;
            if (id) ctx.uiWorkspace?.openSession?.(id);
            else target.click();
            return;
          }
          event.preventDefault();
          if (event.key === 'Escape') { stopNavigation(true); return; }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            const modes = labels.map(([mode]) => mode);
            const next = Math.max(0, Math.min(modes.length - 1, modes.indexOf(selected) + (event.key === 'ArrowLeft' ? -1 : 1)));
            if (modes[next] === selected) return;
            tabs.querySelector(`button[data-view="${modes[next]}"]`)?.click();
            pendingFocus = true;
            window.setTimeout(focusView, 0);
            return;
          }
          if (!rows.length) { focusRow(null); return; }
          const next = Math.max(0, Math.min(rows.length - 1, index + (event.key === 'ArrowUp' ? -1 : 1)));
          focusRow(rows[next]);
        };
        const onNavigationMutation = () => {
          if (navigating && (pendingFocus || (!observedRegion?.contains(document.activeElement) && !bar?.contains(document.activeElement)))) {
            window.setTimeout(focusView, 0);
          }
        };
        const onNavigationFocus = (event) => {
          if (navigating && !observedRegion?.contains(event.target) && !bar?.contains(event.target)) stopNavigation();
        };
        const navObserver = new window.MutationObserver(onNavigationMutation);
        let shortcutDispose = null;
        const syncShortcut = () => {
          if (navigationAccepted() && !shortcutDispose) {
            shortcutDispose = ctx.shortcuts?.register?.({
              id: 'dsh-nav-fold.session-navigation', label: () => '会话导航 / Navigate sessions',
              aliases: ['navigate sessions', 'session navigation'], defaults: {},
              regions: ['page', 'editable'], modals: [],
              resolve: (input) => input.modal === null && navigationAccepted() && enabled && !quarantined && !peerSuspended && bar?.isConnected
                ? { status: 'handled', run: startNavigation } : { status: 'pass' },
            }) || null;
          } else if (!navigationAccepted() && shortcutDispose) {
            shortcutDispose(); shortcutDispose = null;
          }
        };
        document.addEventListener('keydown', onNavigationKey, true);
        document.addEventListener('focusin', onNavigationFocus);
        const syncSelection = () => {
          if (!enabled || quarantined || peerSuspended) stopNavigation();
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
          tabs.style.setProperty('--dsh-view-index', String(labels.findIndex(([mode]) => mode === selected)));
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
          if (enabled && bar && observedRoot?.isConnected && (!bar.isConnected || bar.children.length !== 1 || bar.firstElementChild !== tabs
            || bar.parentNode !== observedRoot || bar.nextElementSibling !== (region || (observedRegion?.parentNode === observedRoot ? observedRegion : observedFooter?.parentNode === observedRoot ? observedFooter : null)))) quarantine();
          if (enabled && !quarantined && !slotSafe(Boolean(unregister))) {
            if (peerOnlyConflict(Boolean(unregister))) peerSuspended = true;
            else if (!temporarilyEmptySlot()) quarantine();
          }
          if (peerSuspended && slotSafe(Boolean(unregister))) peerSuspended = false;
          if (!enabled || quarantined || peerSuspended || !region || !slotSafe(Boolean(unregister))) {
            stopNavigation();
            navObserver.disconnect();
            if (peerSuspended) syncSelection();
            bar?.remove(); bar = null; tabs = null;
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
            bar.append(tabs);
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
            navObserver.disconnect();
            navObserver.observe(region, { childList: true, subtree: true });
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
          if (!navigationAccepted()) stopNavigation();
          syncShortcut();
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
        syncShortcut();
        ensure();
        return () => {
          disposed = true;
          if (recheckApprovedRetry === onAcceptedChange) recheckApprovedRetry = () => {};
          unsubscribeForm?.(); unsubscribeSlot?.();
          window.removeEventListener('dsh-nav-fold:sidebar-ready', ensure);
          stopNavigation();
          navObserver.disconnect();
          document.removeEventListener('keydown', onNavigationKey, true);
          document.removeEventListener('focusin', onNavigationFocus);
          shortcutDispose?.();
          observer?.disconnect(); bar?.remove();
          unregister?.();
        };
      });
    }
    module.exports.inject = ['slots', 'sessions', 'uiWorkspace', 'configForms', 'shortcuts', 'layout'];
    module.exports.apply = apply;
    module.exports.__test__ = { selectWorkspaceViews };
    module.exports.name = 'dsh-nav-fold-client';
    return module.exports;
  }
});
