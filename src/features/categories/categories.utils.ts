import type { AdminCategory, AttributeDef, CategoryNode } from './categories.types';

export interface FlatCategory<T> {
  node: T;
  depth: number;
}

/** Depth-first flatten of the public tree (parents before children, tree order kept). */
export function flattenTree(nodes: CategoryNode[], depth = 0): FlatCategory<CategoryNode>[] {
  return nodes.flatMap((n) => [{ node: n, depth }, ...flattenTree(n.children, depth + 1)]);
}

export function findById(nodes: CategoryNode[], id: string): CategoryNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findById(n.children, id);
    if (hit) return hit;
  }
  return undefined;
}

export function findBySlug(nodes: CategoryNode[], slug: string): CategoryNode | undefined {
  for (const n of nodes) {
    if (n.slug === slug) return n;
    const hit = findBySlug(n.children, slug);
    if (hit) return hit;
  }
  return undefined;
}

/** Root to node chain for `id` (empty when not found). */
export function pathTo(nodes: CategoryNode[], id: string): CategoryNode[] {
  for (const n of nodes) {
    if (n.id === id) return [n];
    const sub = pathTo(n.children, id);
    if (sub.length) return [n, ...sub];
  }
  return [];
}

export interface PickerLevel {
  options: CategoryNode[];
  /** Selected node id at this level, '' when none yet. */
  value: string;
}

/**
 * Cascading picker model: one level per step from the root down to the selected category,
 * plus one more level (nothing chosen) when the selected category has children.
 */
export function pickerLevels(tree: CategoryNode[], selectedId: string): PickerLevel[] {
  const path = selectedId ? pathTo(tree, selectedId) : [];
  const levels: PickerLevel[] = [{ options: tree, value: path[0]?.id ?? '' }];
  path.forEach((n, i) => {
    if (n.children.length > 0) levels.push({ options: n.children, value: path[i + 1]?.id ?? '' });
  });
  return levels;
}

/** The attribute schema of the chosen category (empty when unknown). */
export function attributeSchemaFor(tree: CategoryNode[], id: string): AttributeDef[] {
  return findById(tree, id)?.attributeSchema ?? [];
}

/** Flat admin rows to tree order with depth (siblings by sortOrder, then name). */
export function adminTreeRows(rows: AdminCategory[]): FlatCategory<AdminCategory>[] {
  const byParent = new Map<string | null, AdminCategory[]>();
  const ids = new Set(rows.map((r) => r.id));
  for (const r of rows) {
    const key = r.parentId && ids.has(r.parentId) ? r.parentId : null; // orphans surface as roots
    byParent.set(key, [...(byParent.get(key) ?? []), r]);
  }
  const walk = (parent: string | null, depth: number): FlatCategory<AdminCategory>[] =>
    (byParent.get(parent) ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .flatMap((node) => [{ node, depth }, ...walk(node.id, depth + 1)]);
  return walk(null, 0);
}

/** Ids of `id` and everything below it (the admin parent select must exclude these). */
export function selfAndDescendantIds(rows: AdminCategory[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) {
      if (r.parentId && out.has(r.parentId) && !out.has(r.id)) {
        out.add(r.id);
        grew = true;
      }
    }
  }
  return out;
}

/** URL-safe slug suggestion from a name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
