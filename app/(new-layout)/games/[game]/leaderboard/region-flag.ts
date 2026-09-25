// A board's Region column holds labels like "USA / NTSC", "EUR / PAL" or
// "JPN / NTSC": the region code first, then the video standard. The code is
// what gets a flag; a label that doesn't start with a known one gets none.
const REGION_FLAGS: Record<string, { code: string; name: string }> = {
    USA: { code: 'US', name: 'USA' },
    US: { code: 'US', name: 'USA' },
    NA: { code: 'US', name: 'North America' },
    EUR: { code: 'EU', name: 'Europe' },
    EU: { code: 'EU', name: 'Europe' },
    PAL: { code: 'EU', name: 'Europe' },
    JPN: { code: 'JP', name: 'Japan' },
    JP: { code: 'JP', name: 'Japan' },
    JAP: { code: 'JP', name: 'Japan' },
    KOR: { code: 'KR', name: 'Korea' },
    KR: { code: 'KR', name: 'Korea' },
    CHN: { code: 'CN', name: 'China' },
    CN: { code: 'CN', name: 'China' },
    BRA: { code: 'BR', name: 'Brazil' },
    BR: { code: 'BR', name: 'Brazil' },
    AUS: { code: 'AU', name: 'Australia' },
    AU: { code: 'AU', name: 'Australia' },
};

/** True for the board's Region variable, whatever case it was named in. */
export function isRegionColumn(key: string): boolean {
    return key === 'region';
}

export function regionFlag(
    label: string,
): { code: string; name: string } | null {
    const head = label
        .trim()
        .split(/[\s/,(-]+/)[0]
        ?.toUpperCase();
    return head ? (REGION_FLAGS[head] ?? null) : null;
}
