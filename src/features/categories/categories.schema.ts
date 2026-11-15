import { z } from '@/lib/zod';
import type { AdminCategory, AttributeDef, CategoryWritePayload } from './categories.types';

// ---- Seller side: validate attribute values against a category's schema ------------------------------

/** Attribute values as the form holds them: everything is a string. */
export type AttributeValues = Record<string, string>;

/** Zod object built from the definitions (text <= 200 chars, number finite, select one of the options). */
export function buildAttributesSchema(defs: AttributeDef[]) {
  const shape: Record<string, z.ZodType<string>> = {};
  for (const d of defs) {
    const req = d.required ? `${d.label} is required` : null;
    let s: z.ZodType<string>;
    if (d.type === 'number') {
      s = z
        .string()
        .trim()
        .refine((v) => v === '' || Number.isFinite(Number(v)), `${d.label} must be a number`);
    } else if (d.type === 'select') {
      s = z
        .string()
        .trim()
        .refine((v) => v === '' || (d.options ?? []).includes(v), `Choose a valid ${d.label}`);
    } else {
      s = z.string().trim().max(200, `${d.label} is too long (max 200 characters)`);
    }
    if (req) s = s.refine((v) => v.trim() !== '', req);
    shape[d.key] = s;
  }
  return z.object(shape);
}

/** Issues for `values` as `{ key: message }` (empty object when valid). */
export function attributeErrors(defs: AttributeDef[], values: AttributeValues | undefined): Record<string, string> {
  const r = buildAttributesSchema(defs).safeParse(
    Object.fromEntries(defs.map((d) => [d.key, values?.[d.key] ?? ''])),
  );
  if (r.success) return {};
  const out: Record<string, string> = {};
  for (const i of r.error.issues) {
    const k = String(i.path[0] ?? '');
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

/** Form strings to the API shape: empty values dropped, numbers sent as numbers, unknown keys dropped. */
export function attributesToPayload(defs: AttributeDef[], values: AttributeValues | undefined): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const d of defs) {
    const v = (values?.[d.key] ?? '').trim();
    if (v === '') continue;
    out[d.key] = d.type === 'number' ? Number(v) : v;
  }
  return out;
}

/** API `specs` (or any key/value list) to form strings, keeping only keys the schema defines (all keys when `defs` is omitted). */
export function specsToValues(defs: AttributeDef[] | undefined, specs: { key: string; value: string | number }[] | undefined): AttributeValues {
  const out: AttributeValues = {};
  for (const s of specs ?? []) {
    if (!defs || defs.some((d) => d.key === s.key)) out[s.key] = String(s.value);
  }
  return out;
}

// ---- Admin side: category dialog + attribute schema editor --------------------------------------------

const KEY_RE = /^[a-z][a-z0-9_]*$/;

export const attributeRowSchema = z
  .object({
    key: z.string().trim().min(1, 'Key is required').max(40, 'At most 40 characters').regex(KEY_RE, 'Lowercase letters, digits and underscores, starting with a letter'),
    label: z.string().trim().min(1, 'Label is required').max(60, 'At most 60 characters'),
    type: z.enum(['text', 'number', 'select']),
    /** Comma-separated list, `select` only. */
    options: z.string(),
    required: z.boolean(),
    unit: z.string().trim().max(20, 'At most 20 characters'),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'select') {
      const opts = parseOptions(v.options);
      if (opts.length < 2) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Add at least 2 options, separated by commas' });
      if (opts.length > 50) ctx.addIssue({ code: 'custom', path: ['options'], message: 'At most 50 options' });
      if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Options must be unique' });
    }
  });
export type AttributeRowValues = z.infer<typeof attributeRowSchema>;

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(60, 'At most 60 characters'),
  slug: z
    .string()
    .trim()
    .max(60, 'At most 60 characters')
    .refine((v) => v === '' || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), 'Lowercase letters, digits and single hyphens'),
  /** '' = top level. */
  parentId: z.string(),
  sortOrder: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 9999), 'A whole number from 0 to 9999'),
  isActive: z.boolean(),
  description: z.string().trim().max(300, 'At most 300 characters'),
  attributes: z
    .array(attributeRowSchema)
    .max(20, 'At most 20 attributes')
    .refine((rows) => new Set(rows.map((r) => r.key.trim())).size === rows.length, 'Attribute keys must be unique'),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export function parseOptions(csv: string): string[] {
  return csv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export const emptyAttributeRow = (): AttributeRowValues => ({ key: '', label: '', type: 'text', options: '', required: false, unit: '' });

export function categoryDefaults(c?: AdminCategory, parentId = ''): CategoryFormValues {
  return {
    name: c?.name ?? '',
    slug: c?.slug ?? '',
    parentId: c?.parentId ?? parentId,
    sortOrder: c ? String(c.sortOrder) : '',
    isActive: c?.isActive ?? true,
    description: c?.description ?? '',
    attributes: (c?.attributeSchema ?? []).map((a) => ({
      key: a.key,
      label: a.label,
      type: a.type,
      options: (a.options ?? []).join(', '),
      required: !!a.required,
      unit: a.unit ?? '',
    })),
  };
}

export function toAttributeSchema(rows: AttributeRowValues[]): AttributeDef[] {
  return rows.map((r) => ({
    key: r.key.trim(),
    label: r.label.trim(),
    type: r.type,
    ...(r.type === 'select' ? { options: parseOptions(r.options) } : {}),
    ...(r.required ? { required: true } : {}),
    ...(r.unit.trim() ? { unit: r.unit.trim() } : {}),
  }));
}

export function toCategoryPayload(v: CategoryFormValues): CategoryWritePayload {
  return {
    name: v.name.trim(),
    ...(v.slug.trim() ? { slug: v.slug.trim() } : {}),
    parentId: v.parentId || null,
    ...(v.sortOrder.trim() ? { sortOrder: Number(v.sortOrder) } : {}),
    isActive: v.isActive,
    description: v.description.trim() || null,
    attributeSchema: toAttributeSchema(v.attributes),
  };
}
