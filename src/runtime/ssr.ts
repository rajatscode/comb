// ssr.ts — Server-side rendering for compiled Comb modules
// Provides a minimal DOM shim so compiled module factories can run in Node.js
// and produce an HTML string without a real DOM.

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SELF_CLOSING = new Set(['input', 'br', 'hr', 'img', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);

class SSRText {
  data: string;
  parentNode: SSRElement | null = null;
  constructor(text: string) { this.data = text; }
  toHTML(): string { return escapeHtml(this.data); }
  get nextSibling(): SSRElement | SSRText | SSRComment | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.children.indexOf(this);
    return idx >= 0 && idx < this.parentNode.children.length - 1
      ? this.parentNode.children[idx + 1]
      : null;
  }
}

class SSRComment {
  data: string;
  parentNode: SSRElement | null = null;
  constructor(text: string) { this.data = text; }
  toHTML(): string { return `<!--${this.data}-->`; }
  get nextSibling(): SSRElement | SSRText | SSRComment | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.children.indexOf(this);
    return idx >= 0 && idx < this.parentNode.children.length - 1
      ? this.parentNode.children[idx + 1]
      : null;
  }
}

type SSRChild = SSRElement | SSRText | SSRComment;

class SSRElement {
  tag: string;
  attrs: Map<string, string> = new Map();
  children: SSRChild[] = [];
  parentNode: SSRElement | null = null;
  private _style: Record<string, string> = {};

  constructor(tag: string) { this.tag = tag; }

  setAttribute(name: string, value: string) { this.attrs.set(name, value); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  removeAttribute(name: string) { this.attrs.delete(name); }

  appendChild(child: SSRChild): SSRChild {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child: SSRChild, ref: SSRChild | null): SSRChild {
    child.parentNode = this;
    if (ref === null) {
      this.children.push(child);
    } else {
      const idx = this.children.indexOf(ref);
      if (idx >= 0) {
        this.children.splice(idx, 0, child);
      } else {
        this.children.push(child);
      }
    }
    return child;
  }

  remove(): void {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx >= 0) this.parentNode.children.splice(idx, 1);
      this.parentNode = null;
    }
  }

  set textContent(text: string) {
    this.children = [new SSRText(text)];
    this.children[0].parentNode = this;
  }

  get textContent(): string {
    return this.children.map(c => {
      if (c instanceof SSRText) return c.data;
      if (c instanceof SSRElement) return c.textContent;
      return '';
    }).join('');
  }

  set value(v: any) { this.attrs.set('value', String(v)); }
  get value(): string { return this.attrs.get('value') ?? ''; }

  get nextSibling(): SSRChild | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.children.indexOf(this);
    return idx >= 0 && idx < this.parentNode.children.length - 1
      ? this.parentNode.children[idx + 1]
      : null;
  }

  toHTML(): string {
    // Fragment wrapper — emit children only
    if (this.tag === '__fragment') {
      return this.children.map(c => c.toHTML()).join('');
    }

    let attrStr = '';
    for (const [k, v] of this.attrs) {
      attrStr += ` ${k}="${escapeHtml(v)}"`;
    }

    // Collect inline styles
    const styleEntries = Object.entries(this._style);
    if (styleEntries.length > 0) {
      const existing = this.attrs.get('style') ?? '';
      const styleParts = styleEntries.map(([prop, val]) => {
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssProp}: ${val}`;
      });
      const combined = existing ? `${existing}; ${styleParts.join('; ')}` : styleParts.join('; ');
      // Replace existing style attr in attrStr or append
      if (this.attrs.has('style')) {
        attrStr = attrStr.replace(/ style="[^"]*"/, ` style="${escapeHtml(combined)}"`);
      } else {
        attrStr += ` style="${escapeHtml(combined)}"`;
      }
    }

    if (SELF_CLOSING.has(this.tag)) {
      return `<${this.tag}${attrStr} />`;
    }
    const childHTML = this.children.map(c => c.toHTML()).join('');
    return `<${this.tag}${attrStr}>${childHTML}</${this.tag}>`;
  }

  // No-ops for event handling on server
  addEventListener(_event: string, _handler: any, _options?: any) {}
  removeEventListener(_event: string, _handler: any) {}

  // Style proxy that collects inline styles
  get style(): any {
    const styles = this._style;
    return new Proxy(styles, {
      set(_target, prop: string, value: string) {
        styles[prop] = value;
        return true;
      },
      get(_target, prop: string) {
        if (prop === 'setProperty') {
          return (name: string, val: string) => { styles[name] = val; };
        }
        return styles[prop] ?? '';
      },
    });
  }
}

/**
 * Create a fake `document` object for server-side rendering.
 * It supports the subset of the DOM API that compiled Comb modules use.
 */
function createSSRDocument() {
  return {
    createElement: (tag: string) => new SSRElement(tag),
    createTextNode: (text: string) => new SSRText(text),
    createComment: (text: string) => new SSRComment(text),
    createDocumentFragment: () => new SSRElement('__fragment'),
    documentElement: new SSRElement('html'),
    head: new SSRElement('head'),
    body: new SSRElement('body'),
  };
}

/**
 * Render a compiled Comb module factory to an HTML string.
 *
 * The factory is the exported function from a compiled `.comb` file
 * (e.g. `Counter` from `counter.js`). It expects a root DOM element
 * and appends children to it.
 *
 * Usage:
 * ```ts
 * import { renderToString } from './ssr.js';
 * import { Counter } from '../generated/counter.js';
 * const html = renderToString(Counter);
 * ```
 */
export function renderToString(moduleFactory: (root: any) => any): string {
  const origDoc = (globalThis as any).document;
  const ssrDoc = createSSRDocument();
  (globalThis as any).document = ssrDoc;

  try {
    const root = new SSRElement('div');
    const instance = moduleFactory(root);
    const html = root.children.map(c => c.toHTML()).join('');

    // Clean up the scope to avoid leaking effects
    if (instance && typeof instance.dispose === 'function') {
      instance.dispose();
    }

    return html;
  } finally {
    if (origDoc !== undefined) {
      (globalThis as any).document = origDoc;
    } else {
      delete (globalThis as any).document;
    }
  }
}
