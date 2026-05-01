// waveform/search.ts — Pattern search across waveform data
// Supports: "signal > value", "signal == true", "signal rises"

import type { SearchMatch } from './types.js';

type WaveformData = Map<string, Array<{ t: number; v: any }>>;

interface SearchPredicate {
  signalName: string;
  op: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'rises' | 'falls';
  value?: any;
}

function parsePredicate(query: string): SearchPredicate | null {
  query = query.trim();
  if (!query) return null;

  // "signal rises" / "signal falls"
  const edgeMatch = query.match(/^(\w+)\s+(rises|falls)$/i);
  if (edgeMatch) {
    return { signalName: edgeMatch[1], op: edgeMatch[2].toLowerCase() as 'rises' | 'falls' };
  }

  // "signal op value"
  const cmpMatch = query.match(/^(\w+)\s*(>=|<=|>|<|==|=)\s*(.+)$/);
  if (cmpMatch) {
    const signalName = cmpMatch[1];
    let op: SearchPredicate['op'];
    switch (cmpMatch[2]) {
      case '>=': op = 'gte'; break;
      case '<=': op = 'lte'; break;
      case '>': op = 'gt'; break;
      case '<': op = 'lt'; break;
      default: op = 'eq'; break;
    }
    let value: any = cmpMatch[3].trim();
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (!isNaN(Number(value))) value = Number(value);
    return { signalName, op, value };
  }

  return null;
}

function matchesPredicate(pred: SearchPredicate, value: any, prevValue: any): boolean {
  switch (pred.op) {
    case 'eq': return value === pred.value || String(value) === String(pred.value);
    case 'gt': return Number(value) > Number(pred.value);
    case 'lt': return Number(value) < Number(pred.value);
    case 'gte': return Number(value) >= Number(pred.value);
    case 'lte': return Number(value) <= Number(pred.value);
    case 'rises': return !!value && !prevValue;
    case 'falls': return !value && !!prevValue;
  }
}

export function searchWaveform(
  query: string,
  data: WaveformData,
  signalIds: string[],
): SearchMatch[] {
  const pred = parsePredicate(query);
  if (!pred) return [];

  const matches: SearchMatch[] = [];

  // Find matching signal(s)
  const matchingIds = signalIds.filter(id => {
    const name = id.split('.').pop() ?? id;
    return name.toLowerCase() === pred.signalName.toLowerCase();
  });

  for (const id of matchingIds) {
    const buf = data.get(id);
    if (!buf || buf.length === 0) continue;

    for (let i = 0; i < buf.length; i++) {
      const prevValue = i > 0 ? buf[i - 1].v : undefined;
      if (matchesPredicate(pred, buf[i].v, prevValue)) {
        matches.push({ timestamp: buf[i].t, signalId: id, value: buf[i].v });
      }
    }
  }

  matches.sort((a, b) => a.timestamp - b.timestamp);
  return matches;
}

export function createSearchUI(
  container: HTMLElement,
  onSearch: (query: string) => void,
  onNext: () => void,
  onPrev: () => void,
): { updateCount: (current: number, total: number) => void; getQuery: () => string } {
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex; align-items:center; gap:6px; padding:3px 8px; font-size:0.7rem;';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search: signal > value, signal rises...';
  input.style.cssText = 'flex:1; background:var(--bg-base); border:1px solid var(--border); color:var(--text); padding:2px 6px; border-radius:3px; font-size:0.7rem; font-family:inherit; min-width:180px;';

  const countLabel = document.createElement('span');
  countLabel.style.cssText = 'color:var(--text-faint); font-family:"SF Mono",monospace; min-width:40px;';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '\u25B2';
  prevBtn.className = 'waveform-zoom-btn';
  prevBtn.style.fontSize = '0.6rem';
  prevBtn.addEventListener('click', onPrev);

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '\u25BC';
  nextBtn.className = 'waveform-zoom-btn';
  nextBtn.style.fontSize = '0.6rem';
  nextBtn.addEventListener('click', onNext);

  input.addEventListener('input', () => onSearch(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) onPrev();
      else onNext();
    }
  });

  bar.appendChild(input);
  bar.appendChild(prevBtn);
  bar.appendChild(nextBtn);
  bar.appendChild(countLabel);
  container.appendChild(bar);

  return {
    updateCount(current: number, total: number) {
      countLabel.textContent = total > 0 ? `${current + 1}/${total}` : '';
    },
    getQuery: () => input.value,
  };
}
