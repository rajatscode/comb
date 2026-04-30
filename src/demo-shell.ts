// demo-shell.ts — Shared layout shell for all demos
// Two modes: 'split' (horizontal app + circuit) and 'stacked' (vertical sections)

export interface DemoShellOptions {
  layout: 'split' | 'stacked';
  title?: string;
  description?: string;
}

export interface DemoShell {
  app: HTMLDivElement;
  circuit: HTMLDivElement;
  dispose: () => void;
}

export function createDemoShell(root: HTMLElement, options: DemoShellOptions): DemoShell {
  root.innerHTML = '';

  const app = document.createElement('div');
  const circuitPane = document.createElement('div');
  circuitPane.className = 'pane pane-circuit';

  if (options.layout === 'split') {
    root.style.display = 'flex';
    root.style.flexDirection = 'row';
    app.className = 'pane pane-app';
    root.appendChild(app);
    root.appendChild(circuitPane);
  } else {
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.overflow = 'auto';
    app.style.flex = '1';
    app.style.display = 'flex';
    app.style.flexDirection = 'column';
    circuitPane.style.minHeight = '250px';
    circuitPane.style.flexShrink = '0';
    root.appendChild(app);
    root.appendChild(circuitPane);
  }

  if (options.title) {
    const h2 = document.createElement('h2');
    h2.textContent = options.title;
    h2.style.cssText = 'margin: 0 0 0.5rem; color: #e0e0e0; font-size: 1.2rem; padding: 0 1rem;';
    app.prepend(h2);
  }

  if (options.description) {
    const desc = document.createElement('p');
    desc.textContent = options.description;
    desc.style.cssText = 'margin: 0 0 1rem; color: #888; font-size: 0.85rem; padding: 0 1rem;';
    const firstChild = app.firstChild;
    if (firstChild?.nextSibling) {
      app.insertBefore(desc, firstChild.nextSibling);
    } else {
      app.appendChild(desc);
    }
  }

  function dispose() {
    root.innerHTML = '';
    root.removeAttribute('style');
  }

  return { app, circuit: circuitPane, dispose };
}
