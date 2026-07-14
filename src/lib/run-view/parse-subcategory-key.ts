// Parses a board slice key ('name=value|name=value') into ordered pairs for display.
export function parseSubcategoryKey(
    key: string,
): Array<{ name: string; value: string }> {
    if (!key) return [];
    return key
        .split('|')
        .map((segment) => {
            const eq = segment.indexOf('=');
            if (eq <= 0) return null;
            return { name: segment.slice(0, eq), value: segment.slice(eq + 1) };
        })
        .filter((p): p is { name: string; value: string } => p !== null);
}
