// waveform/search.ts — Pattern search across waveform data
// Supports: "signal > value", "signal == true", "signal rises"
// Compound: "A rises AND B == false", "A == true OR B == true"
// Temporal: "A rises WITHIN 5 OF B rises"

import type { SearchMatch } from './types.js';

type WaveformData = Map<string, Array<{ t: number; v: any }>>;

interface SearchPredicate {
  signalName: string;
  op: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'rises' | 'falls';
  value?: any;
}

type PredicateTree =
  | SearchPredicate
  | { kind: 'and' | 'or'; left: PredicateTree; right: PredicateTree }
  | { kind: 'within'; left: SearchPredicate; right: SearchPredicate; count: number };

function parseSinglePredicate(query: string): SearchPredicate | null {
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

function parsePredicateTree(query: string): PredicateTree | null {
  query = query.trim();
  if (!query) return null;

  // Check for WITHIN (temporal correlation) first
  const withinMatch = query.match(/^(.+)\s+WITHIN\s+(\d+)\s+OF\s+(.+)$/i);
  if (withinMatch) {
    const left = parseSinglePredicate(withinMatch[1]);
    const right = parseSinglePredicate(withinMatch[3]);
    const count = parseInt(withinMatch[2], 10);
    if (left && right && count > 0) {
      return { kind: 'within', left, right, count };
    }
    return null;
  }

  // Check for AND (case-insensitive, whole word)
  const andIdx = query.search(/\s+AND\s+/i);
  if (andIdx !== -1) {
    const andMatch = query.match(/\s+AND\s+/i)!;
    const leftStr = query.slice(0, andIdx);
    const rightStr = query.slice(andIdx + andMatch[0].length);
    const left = parsePredicateTree(leftStr);
    const right = parsePredicateTree(rightStr);
    if (left && right) {
      return { kind: 'and', left, right };
    }
    return null;
  }

  // Check for OR (case-insensitive, whole word)
  const orIdx = query.search(/\s+OR\s+/i);
  if (orIdx !== -1) {
    const orMatch = query.match(/\s+OR\s+/i)!;
    const leftStr = query.slice(0, orIdx);
    const rightStr = query.slice(orIdx + orMatch[0].length);
    const left = parsePredicateTree(leftStr);
    const right = parsePredicateTree(rightStr);
    if (left && right) {
      return { kind: 'or', left, right };
    }
    return null;
  }

  // Single predicate
  return parseSinglePredicate(query);
}

function isSinglePredicate(tree: PredicateTree): tree is SearchPredicate {
  return 'signalName' in tree;
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

/** Resolve signal IDs matching a predicate's signalName */
function resolveSignalIds(pred: SearchPredicate, signalIds: string[]): string[] {
  return signalIds.filter(id => {
    const name = id.split('.').pop() ?? id;
    return name.toLowerCase() === pred.signalName.toLowerCase();
  });
}

/** Check if a single predicate matches at a given timestamp across the waveform data */
function predicateMatchesAtTimestamp(
  pred: SearchPredicate,
  timestamp: number,
  data: WaveformData,
  signalIds: string[],
): boolean {
  const ids = resolveSignalIds(pred, signalIds);
  for (const id of ids) {
    const buf = data.get(id);
    if (!buf || buf.length === 0) continue;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i].t === timestamp) {
        const prevValue = i > 0 ? buf[i - 1].v : undefined;
        if (matchesPredicate(pred, buf[i].v, prevValue)) return true;
      }
    }
  }
  return false;
}

/** Evaluate a full predicate tree at a given timestamp */
function treeMatchesAtTimestamp(
  tree: PredicateTree,
  timestamp: number,
  data: WaveformData,
  signalIds: string[],
): boolean {
  if (isSinglePredicate(tree)) {
    return predicateMatchesAtTimestamp(tree, timestamp, data, signalIds);
  }
  if (tree.kind === 'and') {
    return treeMatchesAtTimestamp(tree.left, timestamp, data, signalIds)
      && treeMatchesAtTimestamp(tree.right, timestamp, data, signalIds);
  }
  if (tree.kind === 'or') {
    return treeMatchesAtTimestamp(tree.left, timestamp, data, signalIds)
      || treeMatchesAtTimestamp(tree.right, timestamp, data, signalIds);
  }
  // 'within' should not be evaluated this way — handled separately
  return false;
}

/** Collect all unique timestamps across the waveform data */
function allTimestamps(data: WaveformData, signalIds: string[]): number[] {
  const tsSet = new Set<number>();
  for (const id of signalIds) {
    const buf = data.get(id);
    if (buf) {
      for (const entry of buf) tsSet.add(entry.t);
    }
  }
  return Array.from(tsSet).sort((a, b) => a - b);
}

/** Search for a single predicate against its signal buffers (fast path) */
function searchSinglePredicate(
  pred: SearchPredicate,
  data: WaveformData,
  signalIds: string[],
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const ids = resolveSignalIds(pred, signalIds);
  for (const id of ids) {
    const buf = data.get(id);
    if (!buf || buf.length === 0) continue;
    for (let i = 0; i < buf.length; i++) {
      const prevValue = i > 0 ? buf[i - 1].v : undefined;
      if (matchesPredicate(pred, buf[i].v, prevValue)) {
        matches.push({ timestamp: buf[i].t, signalId: id, value: buf[i].v });
      }
    }
  }
  return matches;
}

/** Search for temporal correlation (WITHIN) */
function searchWithin(
  tree: { kind: 'within'; left: SearchPredicate; right: SearchPredicate; count: number },
  data: WaveformData,
  signalIds: string[],
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const leftIds = resolveSignalIds(tree.left, signalIds);
  const rightIds = resolveSignalIds(tree.right, signalIds);

  // For each left signal, find matching indices, then check right signal within count entries
  for (const leftId of leftIds) {
    const leftBuf = data.get(leftId);
    if (!leftBuf || leftBuf.length === 0) continue;

    // Collect all right-side match indices per right signal
    const rightMatchIndices = new Map<string, Set<number>>();
    for (const rightId of rightIds) {
      const rightBuf = data.get(rightId);
      if (!rightBuf || rightBuf.length === 0) continue;
      const idxSet = new Set<number>();
      for (let j = 0; j < rightBuf.length; j++) {
        const prevVal = j > 0 ? rightBuf[j - 1].v : undefined;
        if (matchesPredicate(tree.right, rightBuf[j].v, prevVal)) {
          idxSet.add(j);
        }
      }
      if (idxSet.size > 0) rightMatchIndices.set(rightId, idxSet);
    }

    // For each left match, check if any right match is within count entries
    for (let i = 0; i < leftBuf.length; i++) {
      const prevValue = i > 0 ? leftBuf[i - 1].v : undefined;
      if (!matchesPredicate(tree.left, leftBuf[i].v, prevValue)) continue;

      let correlated = false;
      for (const [rightId, idxSet] of rightMatchIndices) {
        const rightBuf = data.get(rightId)!;
        // Find the closest right buffer index by timestamp proximity
        // Use buffer index proximity: find where leftBuf[i].t falls in rightBuf
        let closestIdx = 0;
        let closestDist = Infinity;
        for (let j = 0; j < rightBuf.length; j++) {
          const dist = Math.abs(rightBuf[j].t - leftBuf[i].t);
          if (dist < closestDist) { closestDist = dist; closestIdx = j; }
        }
        // Check entries within count of closestIdx
        const lo = Math.max(0, closestIdx - tree.count);
        const hi = Math.min(rightBuf.length - 1, closestIdx + tree.count);
        for (let j = lo; j <= hi; j++) {
          if (idxSet.has(j)) { correlated = true; break; }
        }
        if (correlated) break;
      }

      if (correlated) {
        matches.push({ timestamp: leftBuf[i].t, signalId: leftId, value: leftBuf[i].v });
      }
    }
  }

  return matches;
}

export function searchWaveform(
  query: string,
  data: WaveformData,
  signalIds: string[],
): SearchMatch[] {
  const tree = parsePredicateTree(query);
  if (!tree) return [];

  let matches: SearchMatch[];

  if (isSinglePredicate(tree)) {
    // Fast path: single predicate
    matches = searchSinglePredicate(tree, data, signalIds);
  } else if (tree.kind === 'within') {
    // Temporal correlation
    matches = searchWithin(tree, data, signalIds);
  } else {
    // AND / OR compound — scan all timestamps
    const timestamps = allTimestamps(data, signalIds);
    matches = [];
    for (const ts of timestamps) {
      if (treeMatchesAtTimestamp(tree, ts, data, signalIds)) {
        // Report the match with the first signal involved
        matches.push({ timestamp: ts, signalId: '', value: undefined });
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
  input.placeholder = 'Search: signal > value, A rises AND B == false...';
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
