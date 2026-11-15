import type { AdminCategory, AttributeDef, AttributeType, CategoryNode } from './categories.types';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const TYPES: AttributeType[] = ['text', 'number', 'select'];

export function parseAttributeSchema(raw: unknown): AttributeDef[] {
  if (!Array.isArray(raw)) return [];
  const out: AttributeDef[] = [];
  for (const r of raw) {
    if (!isObj(r) || typeof r.key !== 'string' || !r.key) continue;
    const type = TYPES.includes(r.type as AttributeType) ? (r.type as AttributeType) : 'text';
    out.push({
      key: r.key,
      label: str(r.label, r.key),
      type,
      ...(type === 'select' ? { options: Array.isArray(r.options) ? r.options.filter((o): o is string => typeof o === 'string') : [] } : {}),
      ...(r.required === true ? { required: true } : {}),
      ...(typeof r.unit === 'string' && r.unit ? { unit: r.unit } : {}),
    });
  }
  return out;
}

function parseNode(raw: unknown): CategoryNode {
  const n = isObj(raw) ? raw : {};
  return {
    id: str(n.id),
    slug: str(n.slug),
    name: str(n.name),
    description: strOrNull(n.description),
    parentId: strOrNull(n.parentId),
    sortOrder: num(n.sortOrder),
    attributeSchema: parseAttributeSchema(n.attributeSchema),
    liveCount: num(n.liveCount),
    children: Array.isArray(n.children) ? n.children.map(parseNode) : [],
  };
}

function itemsOf(body: unknown): unknown[] {
  const d = isObj(body) && 'data' in body ? body.data : body;
  if (Array.isArray(d)) return d;
  return isObj(d) && Array.isArray(d.items) ? d.items : [];
}

/** `GET /categories` -> `{ data: { items: CategoryNode[] } }`. */
export function parseCategoryTree(body: unknown): CategoryNode[] {
  return itemsOf(body)
    .map(parseNode)
    .filter((n) => n.id);
}

/** `GET /admin/categories` -> flat rows. */
export function parseAdminCategories(body: unknown): AdminCategory[] {
  return itemsOf(body)
    .filter(isObj)
    .map((n) => ({
      id: str(n.id),
      slug: str(n.slug),
      name: str(n.name),
      description: strOrNull(n.description),
      parentId: strOrNull(n.parentId),
      sortOrder: num(n.sortOrder),
      isActive: n.isActive !== false,
      attributeSchema: parseAttributeSchema(n.attributeSchema),
      auctionCount: num(n.auctionCount),
    }))
    .filter((n) => n.id);
}
