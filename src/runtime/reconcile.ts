// reconcile.ts — Keyed list reconciliation for @for directives

export interface KeyedState {
  keyMap: Map<any, { node: Node; item: any; index: number }>;
  disposers: Map<any, () => void>;
}

/**
 * Keyed reconciliation: efficiently update a DOM list by reusing, creating,
 * and removing nodes based on a key function, rather than clearing and
 * recreating everything on each update.
 *
 * @param container  The parent DOM node
 * @param anchor     A comment node marking the start of the list
 * @param items      The new items array
 * @param keyFn      Extracts a unique key from each item
 * @param createFn   Creates a new DOM node for an item
 * @param updateFn   Updates an existing DOM node with new item data
 * @param state      Persistent state across renders (keyMap + disposers)
 */
export function reconcileKeyed<T>(
  container: Node,
  anchor: Comment,
  items: T[],
  keyFn: (item: T, index: number) => any,
  createFn: (item: T, index: number) => Node,
  updateFn: (node: Node, item: T, index: number) => void,
  state: KeyedState,
): void {
  const newKeys = new Set<any>();
  const newEntries: { key: any; item: T; index: number }[] = [];

  // Build new key list
  for (let i = 0; i < items.length; i++) {
    const key = keyFn(items[i], i);
    newKeys.add(key);
    newEntries.push({ key, item: items[i], index: i });
  }

  // Remove old entries not in new list
  for (const [key, entry] of state.keyMap) {
    if (!newKeys.has(key)) {
      entry.node.parentNode?.removeChild(entry.node);
      state.disposers.get(key)?.();
      state.disposers.delete(key);
      state.keyMap.delete(key);
    }
  }

  // Add/update/reorder
  let prevNode: Node = anchor;
  for (const { key, item, index } of newEntries) {
    const existing = state.keyMap.get(key);
    if (existing) {
      // Update existing node with new data
      updateFn(existing.node, item, index);
      existing.item = item;
      existing.index = index;
      // Reorder if needed: ensure this node comes right after prevNode
      const nextSibling = prevNode.nextSibling;
      if (nextSibling !== existing.node) {
        container.insertBefore(existing.node, nextSibling);
      }
      prevNode = existing.node;
    } else {
      // Create new node
      const node = createFn(item, index);
      const nextSibling = prevNode.nextSibling;
      container.insertBefore(node, nextSibling);
      state.keyMap.set(key, { node, item, index });
      prevNode = node;
    }
  }
}
