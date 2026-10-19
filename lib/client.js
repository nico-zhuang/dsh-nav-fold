window.__ModuleLoader__.load({
  id: 'dsh-sidebar-nav-collapse',
  factory: () => {
    const module = { exports: {} };
    const key = 'dsh-sidebar-nav-collapse';
    const css = `
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] {
  display: flex; flex-direction: row; align-items: center; overflow-x: auto; overflow-y: hidden;
  white-space: nowrap; min-width: 0;
}
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[class*="panelRow"] {
  flex: 0 0 36px; width: 36px; min-width: 36px; padding-inline: 8px;
  justify-content: center;
}
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[class*="panelRow"] [class*="panelTitle"] { display: none; }
nav[class*="panelList"][data-sidebar-nav-collapsed="true"] > button[class*="panelRow"] [class*="panelGlyph"] { flex: none; }
nav[class*="panelList"] > [data-sidebar-nav-toggle] {
  flex: 0 0 30px; width: 30px; height: 30px; border: 0; border-radius: 6px;
  background: transparent; color: inherit; cursor: pointer;
}
nav[class*="panelList"] > [data-sidebar-nav-toggle]:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
nav[class*="panelList"][data-sidebar-nav-collapsed="false"] > [data-sidebar-nav-toggle] { display: block; margin-left: auto; }
`;
    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.pluginCss = key;
        style.textContent = css;
        document.head.append(style);
        const managed = new Set();
        let collapsed = true;
        try { collapsed = window.localStorage.getItem(key) !== 'expanded'; } catch {}
        const paint = () => {
          for (const nav of managed) {
            nav.dataset.sidebarNavCollapsed = String(collapsed);
            const button = nav.querySelector('[data-sidebar-nav-toggle]');
            button.setAttribute('aria-expanded', String(!collapsed));
            button.setAttribute('aria-label', collapsed ? '展开全局面板 / Expand global panels' : '折叠全局面板 / Collapse global panels');
            button.title = button.getAttribute('aria-label');
            button.textContent = collapsed ? '▸' : '▾';
          }
        };
        const clear = (nav) => {
          nav.querySelector('[data-sidebar-nav-toggle]')?.remove();
          delete nav.dataset.sidebarNavCollapsed;
          managed.delete(nav);
        };
        const sync = () => {
          for (const nav of managed) if (!nav.isConnected) clear(nav);
          for (const nav of document.querySelectorAll('nav[class*="panelList"]')) {
            if (!/^(全局面板|Global panels)$/.test(nav.getAttribute('aria-label') || '') || managed.has(nav)) continue;
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.sidebarNavToggle = '';
            button.addEventListener('click', () => {
              collapsed = !collapsed;
              try { window.localStorage.setItem(key, collapsed ? 'collapsed' : 'expanded'); } catch {}
              paint();
            });
            nav.prepend(button);
            managed.add(nav);
            paint();
          }
        };
        sync();
        const observer = new window.MutationObserver(sync);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => {
          observer.disconnect();
          for (const nav of managed) clear(nav);
          style.remove();
        };
      }, 'dsh-sidebar-nav-collapse: global navigation');
    }
    module.exports.apply = apply;
    module.exports.name = 'dsh-sidebar-nav-collapse-client';
    return module.exports;
  }
});
