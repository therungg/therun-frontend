/** Deterministic hue (0–359) from a runner name — FNV-1a over UTF-16. */
export function nameHue(name: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) {
        h ^= name.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) % 360;
}
