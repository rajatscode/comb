// Shared demo layout — app (60%) | tabbed panel (40%) with source/circuit tabs + inspector
import { circuit } from './runtime/index';
import { highlightComb } from './highlight';
import { SignalInspector } from './inspector';
import { CircuitVisualizer } from './visualizer';

interface DemoLayoutOptions {
  title: string;
  moduleId: string;
  source: string;
  mount: (appEl: HTMLElement) => void;
}

export function createDemoLayout(container: HTMLElement, opts: DemoLayoutOptions): void {
  circuit.reset();
  container.innerHTML = '';

  // Two-pane: app (left 60%) | sidebar (right 40%)
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display: grid; grid-template-columns: 3fr 2fr; gap: 1rem; min-height: 500px; padding: 1rem 0;';

  // App panel
  const appPanel = document.createElement('div');
  appPanel.className = 'app-panel';
  appPanel.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem;';
  wrapper.appendChild(appPanel);

  // Sidebar: tabs + content + inspector
  const sidebar = document.createElement('div');
  sidebar.style.cssText = 'display: flex; flex-direction: column; gap: 0; overflow: hidden; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-secondary);';

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.style.cssText = 'display: flex; border-bottom: 1px solid var(--border); padding: 0;';

  const circuitTab = makeTab('Circuit', true);
  const sourceTab = makeTab('Source', false);
  tabBar.appendChild(circuitTab);
  tabBar.appendChild(sourceTab);
  sidebar.appendChild(tabBar);

  // Tab content
  const tabContent = document.createElement('div');
  tabContent.style.cssText = 'flex: 1; overflow: auto; position: relative; min-height: 200px;';

  // Circuit panel
  const circuitPanel = document.createElement('div');
  circuitPanel.style.cssText = 'width: 100%; height: 100%; padding: 0.5rem;';

  // Source panel
  const sourcePanel = document.createElement('div');
  sourcePanel.style.cssText = 'display: none; width: 100%; height: 100%;';
  sourcePanel.innerHTML = `
    <div style="padding: 0.4rem 0.75rem; font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); border-bottom: 1px solid var(--border);">${opts.title}.comb</div>
    <pre style="padding: 0.75rem; font-size: 0.78rem; line-height: 1.7; overflow: auto; margin: 0;">${highlightComb(opts.source)}</pre>
  `;

  tabContent.appendChild(circuitPanel);
  tabContent.appendChild(sourcePanel);
  sidebar.appendChild(tabContent);

  // Tab switching
  circuitTab.addEventListener('click', () => {
    setActiveTab(circuitTab, sourceTab, circuitPanel, sourcePanel);
  });
  sourceTab.addEventListener('click', () => {
    setActiveTab(sourceTab, circuitTab, sourcePanel, circuitPanel);
  });

  // Signal inspector (always visible at bottom)
  const inspectorContainer = document.createElement('div');
  inspectorContainer.style.cssText = 'border-top: 1px solid var(--border); max-height: 180px; overflow-y: auto;';
  sidebar.appendChild(inspectorContainer);

  wrapper.appendChild(sidebar);
  container.appendChild(wrapper);

  // Mount the app
  opts.mount(appPanel);

  // Attach inspector
  const inspector = new SignalInspector(inspectorContainer);
  inspector.attach(circuit);

  // Build circuit viz from live graph
  const viz = new CircuitVisualizer(circuitPanel);
  const graphData = circuit.getModule(opts.moduleId);
  if (graphData.nodes.length > 0) {
    viz.renderStatic({
      modules: [{
        name: opts.moduleId,
        nodes: graphData.nodes.map(n => ({
          id: n.id, name: n.name, type: n.type,
          deps: Array.from(n.dependencies),
        })),
        wires: graphData.wires.map(w => ({ from: w.from, to: w.to })),
      }],
    });

    circuit.subscribe((event) => {
      if (event.type === 'signal-change' || event.type === 'comb-recompute') {
        viz.onSignalChange(event.nodeId, event.newValue);
      }
    });
  }
}

function makeTab(label: string, active: boolean): HTMLElement {
  const tab = document.createElement('button');
  tab.textContent = label;
  tab.style.cssText = `
    flex: 1; padding: 0.5rem; border: none; background: ${active ? 'var(--bg-tertiary)' : 'transparent'};
    color: ${active ? 'var(--text-primary)' : 'var(--text-muted)'}; font-size: 0.75rem;
    font-family: var(--font-mono); cursor: pointer; border-bottom: 2px solid ${active ? 'var(--accent)' : 'transparent'};
    transition: all 0.15s ease;
  `;
  tab.dataset.active = active ? 'true' : 'false';
  tab.addEventListener('mouseenter', () => { if (tab.dataset.active !== 'true') tab.style.color = 'var(--text-primary)'; });
  tab.addEventListener('mouseleave', () => { if (tab.dataset.active !== 'true') tab.style.color = 'var(--text-muted)'; });
  return tab;
}

function setActiveTab(activeTab: HTMLElement, inactiveTab: HTMLElement, showPanel: HTMLElement, hidePanel: HTMLElement): void {
  activeTab.style.background = 'var(--bg-tertiary)';
  activeTab.style.color = 'var(--text-primary)';
  activeTab.style.borderBottom = '2px solid var(--accent)';
  activeTab.dataset.active = 'true';

  inactiveTab.style.background = 'transparent';
  inactiveTab.style.color = 'var(--text-muted)';
  inactiveTab.style.borderBottom = '2px solid transparent';
  inactiveTab.dataset.active = 'false';

  showPanel.style.display = 'block';
  hidePanel.style.display = 'none';
}
