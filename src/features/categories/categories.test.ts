import { describe, expect, it } from 'vitest';
import { parseAdminCategories, parseCategoryTree } from './categories.parse';
import {
  attributeErrors,
  attributesToPayload,
  buildAttributesSchema,
  categoryDefaults,
  categoryFormSchema,
  emptyAttributeRow,
  specsToValues,
  toCategoryPayload,
} from './categories.schema';
import type { AdminCategory, AttributeDef, CategoryNode } from './categories.types';
import { adminTreeRows, attributeSchemaFor, findById, findBySlug, flattenTree, pathTo, pickerLevels, selfAndDescendantIds, slugify } from './categories.utils';

const node = (id: string, children: CategoryNode[] = [], attributeSchema: AttributeDef[] = []): CategoryNode => ({
  id,
  slug: id,
  name: id.toUpperCase(),
  description: null,
  parentId: null,
  sortOrder: 0,
  attributeSchema,
  liveCount: 1,
  children,
});
const TREE = [node('a', [node('a1', [node('a1x')]), node('a2')]), node('b', [], [{ key: 'size', label: 'Size', type: 'select', options: ['S', 'M'] }])];

describe('tree helpers', () => {
  it('flattens depth-first with depth', () => {
    expect(flattenTree(TREE).map((f) => `${f.depth}:${f.node.id}`)).toEqual(['0:a', '1:a1', '2:a1x', '1:a2', '0:b']);
  });
  it('finds by id / slug and builds the path', () => {
    expect(findById(TREE, 'a1x')?.id).toBe('a1x');
    expect(findBySlug(TREE, 'b')?.id).toBe('b');
    expect(findById(TREE, 'zz')).toBeUndefined();
    expect(pathTo(TREE, 'a1x').map((n) => n.id)).toEqual(['a', 'a1', 'a1x']);
    expect(pathTo(TREE, 'zz')).toEqual([]);
  });
  it('picker levels: root only, then one level per selected step plus the next', () => {
    expect(pickerLevels(TREE, '').map((l) => l.value)).toEqual(['']);
    const l = pickerLevels(TREE, 'a1');
    expect(l.map((x) => x.value)).toEqual(['a', 'a1', '']);
    expect(l[2].options.map((o) => o.id)).toEqual(['a1x']);
    expect(pickerLevels(TREE, 'b')).toHaveLength(1);
  });
  it('attribute schema of the chosen category', () => {
    expect(attributeSchemaFor(TREE, 'b')).toHaveLength(1);
    expect(attributeSchemaFor(TREE, 'a')).toEqual([]);
  });
  it('slugify', () => expect(slugify('  Watches & Clocks! ')).toBe('watches-clocks'));
});

const row = (id: string, parentId: string | null, sortOrder = 0): AdminCategory => ({
  id,
  slug: id,
  name: id,
  description: null,
  parentId,
  sortOrder,
  isActive: true,
  attributeSchema: [],
  auctionCount: 0,
});
describe('admin tree helpers', () => {
  const rows = [row('c2', 'a', 2), row('a', null, 1), row('c1', 'a', 1), row('b', null, 0), row('g', 'c1')];
  it('orders by parent, sortOrder then depth', () => {
    expect(adminTreeRows(rows).map((r) => `${r.depth}:${r.node.id}`)).toEqual(['0:b', '0:a', '1:c1', '2:g', '1:c2']);
  });
  it('self and descendants (parent select exclusion)', () => {
    expect([...selfAndDescendantIds(rows, 'a')].sort()).toEqual(['a', 'c1', 'c2', 'g']);
    expect([...selfAndDescendantIds(rows, 'g')]).toEqual(['g']);
  });
});

describe('parsers', () => {
  it('parses the tree, tolerating junk', () => {
    const t = parseCategoryTree({
      data: { items: [{ id: '1', slug: 's', name: 'N', attributeSchema: [{ key: 'k', label: 'K', type: 'select', options: ['x', 3] }, { nope: 1 }], children: [{ id: '2', slug: 't', name: 'M' }] }, {}] },
    });
    expect(t).toHaveLength(1);
    expect(t[0].attributeSchema).toEqual([{ key: 'k', label: 'K', type: 'select', options: ['x'] }]);
    expect(t[0].children[0].id).toBe('2');
    expect(parseCategoryTree(null)).toEqual([]);
  });
  it('parses admin rows (isActive defaults true)', () => {
    const r = parseAdminCategories({ data: { items: [{ id: '1', slug: 's', name: 'N', auctionCount: 4, isActive: false }, { id: '2', slug: 't', name: 'M' }] } });
    expect(r.map((x) => [x.isActive, x.auctionCount])).toEqual([
      [false, 4],
      [true, 0],
    ]);
  });
});

describe('dynamic attribute schema builder', () => {
  const DEFS: AttributeDef[] = [
    { key: 'brand', label: 'Brand', type: 'text', required: true },
    { key: 'weight', label: 'Weight', type: 'number', unit: 'g' },
    { key: 'metal', label: 'Metal', type: 'select', options: ['Gold', 'Silver'], required: true },
  ];
  it('required, number and select rules', () => {
    expect(attributeErrors(DEFS, { brand: 'X', metal: 'Gold' })).toEqual({});
    expect(attributeErrors(DEFS, {})).toEqual({ brand: 'Brand is required', metal: 'Metal is required' });
    expect(attributeErrors(DEFS, { brand: 'X', metal: 'Tin', weight: 'heavy' })).toEqual({ weight: 'Weight must be a number', metal: 'Choose a valid Metal' });
    expect(attributeErrors(DEFS, { brand: 'x'.repeat(201), metal: 'Gold' }).brand).toMatch(/too long/);
  });
  it('builds a zod object with one key per definition', () => {
    expect(Object.keys(buildAttributesSchema(DEFS).shape)).toEqual(['brand', 'weight', 'metal']);
  });
  it('payload: numbers typed, blanks and unknown keys dropped', () => {
    expect(attributesToPayload(DEFS, { brand: ' X ', weight: '2.5', metal: '', other: 'y' })).toEqual({ brand: 'X', weight: 2.5 });
  });
  it('specs to values', () => {
    expect(specsToValues(DEFS, [{ key: 'weight', value: 2.5 }, { key: 'zzz', value: 1 }])).toEqual({ weight: '2.5' });
    expect(specsToValues(undefined, [{ key: 'zzz', value: 1 }])).toEqual({ zzz: '1' });
  });
});

describe('category form schema (admin dialog)', () => {
  const ok = { ...categoryDefaults(), name: 'Watches' };
  const msgs = (v: unknown) => {
    const r = categoryFormSchema.safeParse(v);
    return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  };
  it('accepts a minimal category', () => expect(msgs(ok)).toEqual([]));
  it('validates name, slug and sort order', () => {
    expect(msgs({ ...ok, name: 'a' })).toContain('name: At least 2 characters');
    expect(msgs({ ...ok, slug: 'Bad Slug' })).toContain('slug: Lowercase letters, digits and single hyphens');
    expect(msgs({ ...ok, sortOrder: '-1' })).toContain('sortOrder: A whole number from 0 to 9999');
  });
  it('attribute rows: key format, label, select options, unique keys', () => {
    const attrs = (rows: object[]) => msgs({ ...ok, attributes: rows.map((r) => ({ ...emptyAttributeRow(), ...r })) });
    expect(attrs([{ key: 'Bad Key', label: 'L' }])).toContain('attributes.0.key: Lowercase letters, digits and underscores, starting with a letter');
    expect(attrs([{ key: 'k', label: '' }])).toContain('attributes.0.label: Label is required');
    expect(attrs([{ key: 'k', label: 'L', type: 'select', options: 'one' }])).toContain('attributes.0.options: Add at least 2 options, separated by commas');
    expect(attrs([{ key: 'k', label: 'L', type: 'select', options: 'a, A' }])).toContain('attributes.0.options: Options must be unique');
    expect(attrs([{ key: 'k', label: 'L' }, { key: 'k', label: 'M' }])).toContain('attributes: Attribute keys must be unique');
    expect(attrs([{ key: 'k', label: 'L', type: 'select', options: 'a, b' }])).toEqual([]);
  });
  it('payload converts rows to the schema (options list, required, unit) and parent null', () => {
    const p = toCategoryPayload({
      ...ok,
      slug: 'watches',
      sortOrder: '3',
      attributes: [
        { key: 'size', label: 'Size', type: 'select', options: 'S, M , L', required: true, unit: '' },
        { key: 'w', label: 'W', type: 'number', options: 'ignored', required: false, unit: 'g' },
      ],
    });
    expect(p).toEqual({
      name: 'Watches',
      slug: 'watches',
      parentId: null,
      sortOrder: 3,
      isActive: true,
      description: null,
      attributeSchema: [
        { key: 'size', label: 'Size', type: 'select', options: ['S', 'M', 'L'], required: true },
        { key: 'w', label: 'W', type: 'number', unit: 'g' },
      ],
    });
  });
  it('defaults pre-fill from an existing category', () => {
    const d = categoryDefaults({ ...row('x', 'p', 4), attributeSchema: [{ key: 'k', label: 'K', type: 'select', options: ['a', 'b'], required: true }] });
    expect(d).toMatchObject({ parentId: 'p', sortOrder: '4', attributes: [{ key: 'k', options: 'a, b', required: true }] });
  });
});
