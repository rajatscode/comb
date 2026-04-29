// Minimal syntax highlighter for .comb source code
// Produces HTML spans with CSS classes for coloring

const KEYWORDS = new Set([
  'module', 'signal', 'comb', 'always', 'view', 'enum', 'fsm',
  'clock', 'state', 'on', 'input', 'output', 'true', 'false',
]);

const DIRECTIVES = new Set(['@if', '@else', '@for', '@bind']);

const TYPES = new Set(['int', 'float', 'string', 'bool']);

export function highlightComb(source: string): string {
  let result = '';
  let i = 0;

  while (i < source.length) {
    // Comments (// to end of line)
    if (source[i] === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i);
      const comment = end === -1 ? source.slice(i) : source.slice(i, end);
      result += `<span class="hl-comment">${esc(comment)}</span>`;
      i += comment.length;
      continue;
    }

    // Strings
    if (source[i] === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== '"') {
        if (source[j] === '\\') j++;
        j++;
      }
      const str = source.slice(i, j + 1);
      result += `<span class="hl-string">${esc(str)}</span>`;
      i = j + 1;
      continue;
    }

    // Directives (@if, @else, @for, @bind, @click, etc.)
    if (source[i] === '@') {
      let j = i + 1;
      while (j < source.length && /[a-zA-Z_]/.test(source[j])) j++;
      const dir = source.slice(i, j);
      const cls = DIRECTIVES.has(dir) ? 'hl-directive' : 'hl-event';
      result += `<span class="${cls}">${esc(dir)}</span>`;
      i = j;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(source[i]) && (i === 0 || !/[a-zA-Z_]/.test(source[i - 1]))) {
      let j = i;
      while (j < source.length && /[0-9.]/.test(source[j])) j++;
      result += `<span class="hl-number">${esc(source.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(source[i])) {
      let j = i;
      while (j < source.length && /[a-zA-Z_0-9]/.test(source[j])) j++;
      const word = source.slice(i, j);
      if (KEYWORDS.has(word)) {
        result += `<span class="hl-keyword">${esc(word)}</span>`;
      } else if (TYPES.has(word)) {
        result += `<span class="hl-type">${esc(word)}</span>`;
      } else if (word[0] === word[0].toUpperCase() && /[a-z]/.test(word)) {
        result += `<span class="hl-module">${esc(word)}</span>`;
      } else {
        result += `<span class="hl-ident">${esc(word)}</span>`;
      }
      i = j;
      continue;
    }

    // Operators
    if ('<>=!+-*/%&|?:'.includes(source[i])) {
      let j = i;
      while (j < source.length && '<>=!+-*/%&|?:'.includes(source[j])) j++;
      const op = source.slice(i, j);
      result += `<span class="hl-operator">${esc(op)}</span>`;
      i = j;
      continue;
    }

    // HTML-like tags in view blocks
    if (source[i] === '<' && source[i + 1] !== '=' && /[a-zA-Z\/]/.test(source[i + 1] || '')) {
      let j = i;
      while (j < source.length && source[j] !== '>') j++;
      const tag = source.slice(i, j + 1);
      result += `<span class="hl-tag">${esc(tag)}</span>`;
      i = j + 1;
      continue;
    }

    // Braces/brackets
    if ('{}[]()'.includes(source[i])) {
      result += `<span class="hl-bracket">${esc(source[i])}</span>`;
      i++;
      continue;
    }

    // Everything else (whitespace, semicolons, etc.)
    result += esc(source[i]);
    i++;
  }

  return result;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
