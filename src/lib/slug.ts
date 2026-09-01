export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}

/** Appends -2, -3, ... until `exists` reports no collision. */
export async function uniqueSlug(base: string, exists: (candidate: string) => Promise<boolean>) {
  const root = slugify(base);
  let candidate = root;
  let attempt = 2;
  while (await exists(candidate)) {
    candidate = `${root}-${attempt++}`;
  }
  return candidate;
}
