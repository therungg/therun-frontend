// Seeds for the game-details form: the mod-editable columns (releaseYear,
// platforms) start empty — IGDB sync fills sibling fields instead
// (firstReleaseDate, normalized igdbPlatforms). These derive form defaults
// from the IGDB data so "pre-filled from IGDB" is actually true.

export function igdbPrefillYear(
    firstReleaseDate: string | null,
): number | null {
    if (!firstReleaseDate) return null;
    const t = new Date(firstReleaseDate).getTime();
    if (!Number.isFinite(t)) return null;
    return new Date(t).getUTCFullYear();
}

export function igdbPrefillPlatforms(
    igdbPlatforms: { name: string; abbreviation: string | null }[],
): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of igdbPlatforms) {
        const label = (p.abbreviation ?? p.name).trim();
        if (!label || seen.has(label)) continue;
        seen.add(label);
        out.push(label);
    }
    return out;
}
