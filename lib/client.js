window.__ModuleLoader__.load({
  id: 'dsh-nav-fold',
  factory: () => {
    const module = { exports: {} };
    const key = 'dsh-sidebar-nav-collapse'; // Preserve existing fold and order settings across the rename.
    const css = `
nav[class*="panelList"][data-sidebar-nav-collapsed] { position: relative; padding-bottom: 24px; }
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] {
  display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; align-content: flex-start; min-width: 0;
}
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[class*="panelRow"] {
  flex: 0 0 36px; width: 36px; min-width: 36px; padding-inline: 8px;
  justify-content: center;
}
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[class*="panelRow"] [class*="panelTitle"] { display: none; }
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[class*="panelRow"] [class*="panelGlyph"] { flex: none; }
nav[class*="panelList"] > [data-sidebar-nav-toggle] {
  position: absolute; bottom: 0; left: 0; width: 100%; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border: 0; background: transparent; color: inherit; cursor: pointer;
}
nav[class*="panelList"] > [data-sidebar-nav-toggle]::before,
nav[class*="panelList"] > [data-sidebar-nav-toggle]::after {
  content: ""; position: absolute; top: 50%; width: calc(50% - 14px);
  height: 1px; background: currentColor; opacity: .3;
}
nav[class*="panelList"] > [data-sidebar-nav-toggle]::before { left: 0; }
nav[class*="panelList"] > [data-sidebar-nav-toggle]::after { right: 0; }
nav[class*="panelList"] > [data-sidebar-nav-toggle]:hover::before,
nav[class*="panelList"] > [data-sidebar-nav-toggle]:hover::after { opacity: .7; }
nav[class*="panelList"] > [data-sidebar-nav-toggle]:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
nav[class*="panelList"] > [data-sidebar-nav-toggle] svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
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
@media (prefers-reduced-motion: reduce) { nav[class*="panelList"] > button[data-sidebar-drop] { transition: none; transform: none; } }
`;
    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.pluginCss = key;
        style.textContent = css;
        document.head.append(style);
        const managed = new Set();
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
            if (!originals.has(row)) originals.set(row, { title: row.getAttribute('title'), injected: null, draggable: row.getAttribute('draggable'), order: row.style.order });
            const original = originals.get(row);
            const current = row.getAttribute('title');
            if (original.injected === null || current !== original.injected) original.title = current;
            const title = restore || !collapsed ? original.title : row.getAttribute('aria-label');
            original.injected = restore || !collapsed ? null : title;
            if (title === null) row.removeAttribute('title');
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
        const paint = () => {
          for (const nav of managed) {
            nav.dataset.sidebarNavCollapsed = String(collapsed);
            const button = nav.querySelector(':scope > [data-sidebar-nav-toggle]');
            if (!button) continue;
            button.setAttribute('aria-expanded', String(!collapsed));
            button.setAttribute('aria-label', collapsed ? '展开全局面板 / Expand global panels' : '折叠全局面板 / Collapse global panels');
            button.title = button.getAttribute('aria-label');
            button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${collapsed ? 'M5 9l7 7 7-7' : 'M5 15l7-7 7 7'}"/></svg>`;
            syncRows(nav);
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
        const sync = () => {
          for (const nav of managed) if (!nav.isConnected) clear(nav);
          for (const nav of document.querySelectorAll('nav[class*="panelList"]')) {
            if (!/^(全局面板|Global panels)$/.test(nav.getAttribute('aria-label') || '')) continue;
            if (!managed.has(nav)) managed.add(nav);
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
        };
        sync();
        const observer = new window.MutationObserver(sync);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label'] });
        document.body.addEventListener('dragstart', onDragStart);
        document.body.addEventListener('dragover', onDragOver);
        document.body.addEventListener('drop', onDrop);
        document.body.addEventListener('dragend', clearDrag);
        document.body.addEventListener('keydown', onKeyDown);
        return () => {
          observer.disconnect();
          for (const animation of animations) animation.cancel();
          animations.clear();
          clearDrag();
          document.body.removeEventListener('dragstart', onDragStart);
          document.body.removeEventListener('dragover', onDragOver);
          document.body.removeEventListener('drop', onDrop);
          document.body.removeEventListener('dragend', clearDrag);
          document.body.removeEventListener('keydown', onKeyDown);
          for (const nav of managed) clear(nav);
          style.remove();
        };
      }, 'dsh-nav-fold: global navigation');
    }
    module.exports.apply = apply;
    module.exports.name = 'dsh-nav-fold-client';
    return module.exports;
  }
});
