export const CATEGORIES = [
  { slug: "guides", label: "Guides" },
  { slug: "concepts", label: "Concepts" },
  { slug: "product", label: "Product" },
  { slug: "engineering", label: "Engineering" },
] as const;

export type Category = (typeof CATEGORIES)[number]["slug"];

const SLUGS = new Set<string>(CATEGORIES.map((category) => category.slug));

export function isCategory(value: string): value is Category {
  return SLUGS.has(value);
}
