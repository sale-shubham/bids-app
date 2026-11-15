export type AttributeType = 'text' | 'number' | 'select';

/** One field of a category's attribute schema (what a seller fills in for this kind of item). */
export interface AttributeDef {
  key: string;
  label: string;
  type: AttributeType;
  /** `select` only. */
  options?: string[];
  required?: boolean;
  /** Display suffix, e.g. "g" or "GB". */
  unit?: string;
}

/** Public tree node (`GET /categories`). */
export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  attributeSchema: AttributeDef[];
  liveCount: number;
  children: CategoryNode[];
}

/** Flat admin row (`GET /admin/categories`), includes inactive ones. */
export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  attributeSchema: AttributeDef[];
  auctionCount: number;
}

export interface CategoryWritePayload {
  name: string;
  slug?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  description?: string | null;
  attributeSchema?: AttributeDef[];
}

/** One breadcrumb step on an auction detail (`categoryPath`). */
export interface CategoryPathItem {
  id: string;
  slug: string;
  name: string;
}
