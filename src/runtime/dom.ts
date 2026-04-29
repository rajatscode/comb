// dom.ts — Fine-grained DOM rendering driven by reactive effects

import { createEffect, batch } from './signals.js';

export function createElement(
  tag: string,
  attrs?: Record<string, any>,
  children?: any[]
): HTMLElement {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, (e: Event) => batch(() => value(e)));
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (typeof value === 'function') {
        // Reactive attribute — bind it
        bindAttr(el, key, value);
      } else if (key === 'class') {
        el.className = String(value);
      } else if (key === 'disabled' || key === 'checked' || key === 'selected') {
        (el as any)[key] = !!value;
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }

  if (children) {
    for (const child of children) {
      appendChildContent(el, child);
    }
  }

  return el;
}

function appendChildContent(parent: HTMLElement, child: any): void {
  if (child == null || child === false) return;

  if (child instanceof Node) {
    parent.appendChild(child);
  } else if (typeof child === 'function') {
    // Reactive text — bind it
    bindText(child, parent);
  } else if (Array.isArray(child)) {
    for (const c of child) appendChildContent(parent, c);
  } else {
    parent.appendChild(document.createTextNode(String(child)));
  }
}

export function bindText(getter: () => any, parent: HTMLElement): Text {
  const text = document.createTextNode(String(getter()));
  parent.appendChild(text);
  createEffect(() => {
    text.textContent = String(getter());
  }, 'text-binding', '');
  return text;
}

export function bindAttr(el: HTMLElement, attr: string, getter: () => any): void {
  createEffect(() => {
    const val = getter();
    if (attr === 'class' || attr === 'className') {
      el.className = String(val);
    } else if (attr === 'disabled' || attr === 'checked' || attr === 'selected') {
      (el as any)[attr] = !!val;
    } else if (attr === 'value') {
      (el as any).value = val;
    } else if (attr === 'style' && typeof val === 'object') {
      Object.assign(el.style, val);
    } else if (val === false || val == null) {
      el.removeAttribute(attr);
    } else {
      el.setAttribute(attr, String(val));
    }
  }, `attr:${attr}`, '');
}

export function renderList<T>(
  parent: HTMLElement,
  items: () => T[],
  renderItem: (item: T, index: number) => HTMLElement,
  key?: (item: T) => string | number
): void {
  let prevNodes: HTMLElement[] = [];
  const marker = document.createComment('list');
  parent.appendChild(marker);

  createEffect(() => {
    const list = items();

    // Remove old nodes
    for (const node of prevNodes) {
      node.remove();
    }

    // Render new nodes after the marker
    const newNodes: HTMLElement[] = [];
    const insertionPoint = marker.nextSibling;
    for (let i = 0; i < list.length; i++) {
      const el = renderItem(list[i], i);
      newNodes.push(el);
      parent.insertBefore(el, insertionPoint);
    }
    prevNodes = newNodes;
  }, 'list-render', '');
}

export function bindInput(
  input: HTMLInputElement,
  getter: () => string,
  setter: (v: string) => void
): void {
  input.addEventListener('input', () => batch(() => setter(input.value)));
  createEffect(() => {
    const val = getter();
    if (input.value !== val) input.value = val;
  }, 'input-binding', '');
}

export function renderConditional(
  parent: HTMLElement,
  condition: () => boolean,
  thenBlock: () => HTMLElement,
  elseBlock?: () => HTMLElement
): void {
  let current: HTMLElement | null = null;

  createEffect(() => {
    if (current) {
      current.remove();
      current = null;
    }
    if (condition()) {
      current = thenBlock();
      parent.appendChild(current);
    } else if (elseBlock) {
      current = elseBlock();
      parent.appendChild(current);
    }
  }, 'conditional-render', '');
}
