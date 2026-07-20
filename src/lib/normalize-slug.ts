export function normalizeSlug(slug: string): string {
    return slug.toLowerCase().replace(/[\s-]+/g, '');
}
