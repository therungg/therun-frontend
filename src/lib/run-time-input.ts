// Parses run-submission times losslessly. Unlike the presenter target-time
// parser (`time-input.ts`), a bare number here is SECONDS, not minutes, and
// fractional seconds are kept in full (never truncated to whole seconds).
//
// Accepted shapes:
//   h:mm:ss(.mmm)   e.g. 1:23:45.678
//   mm:ss(.mmm)     e.g. 9:05.000
//   ss(.mmm)        e.g. 45.678   — a bare number, with or without a
//                                    fraction, is always seconds
//   Courtesy units: 1h23m45s, 23m45s, 45s (case-insensitive, optional
//                                    .mmm on the seconds part)
//
// A component is rejected as out-of-range only when a higher unit is
// actually present (e.g. `1:75:00` is rejected because minutes >= 60 while
// hours are present; a bare `150` is fine — there's no higher unit to
// bound it).
export const parseRunTimeInput = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return undefined;

    if (/[hms]/i.test(trimmed)) {
        return parseCourtesyShape(trimmed);
    }
    return parseColonOrBareShape(trimmed);
};

function scaleFraction(fracStr: string | undefined): number {
    if (!fracStr) return 0;
    const digits = fracStr.slice(1); // drop leading '.'
    return Number(digits.padEnd(3, '0'));
}

function parseColonOrBareShape(trimmed: string): number | undefined {
    const match = trimmed.match(/^(\d+)(?::(\d+))?(?::(\d+))?(\.\d{1,3})?$/);
    if (!match) return undefined;
    const [, p1, p2, p3, fracStr] = match;
    const frac = scaleFraction(fracStr);

    if (p3 !== undefined) {
        // h:mm:ss(.mmm)
        const h = Number(p1);
        const m = Number(p2);
        const s = Number(p3);
        if (m >= 60 || s >= 60) return undefined;
        return ((h * 60 + m) * 60 + s) * 1000 + frac;
    }
    if (p2 !== undefined) {
        // mm:ss(.mmm)
        const m = Number(p1);
        const s = Number(p2);
        if (s >= 60) return undefined;
        return (m * 60 + s) * 1000 + frac;
    }
    // bare number: seconds, no higher unit to bound it
    return Number(p1) * 1000 + frac;
}

function parseCourtesyShape(trimmed: string): number | undefined {
    const match = trimmed.match(
        /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)(?:\.(\d{1,3}))?s)?$/i,
    );
    if (!match) return undefined;
    const [, hStr, mStr, sStr, fracStr] = match;
    if (hStr === undefined && mStr === undefined && sStr === undefined) {
        return undefined;
    }
    if (mStr !== undefined && hStr !== undefined && Number(mStr) >= 60) {
        return undefined;
    }
    if (
        sStr !== undefined &&
        (hStr !== undefined || mStr !== undefined) &&
        Number(sStr) >= 60
    ) {
        return undefined;
    }

    const h = hStr !== undefined ? Number(hStr) : 0;
    const m = mStr !== undefined ? Number(mStr) : 0;
    const s = sStr !== undefined ? Number(sStr) : 0;
    return (
        ((h * 60 + m) * 60 + s) * 1000 + scaleFraction(fracStr && `.${fracStr}`)
    );
}

// Always shows full precision: h:mm:ss.mmm, with the fraction dropped only
// when the milliseconds are exactly zero.
export const formatRunTimeEcho = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const millis = ms % 1000;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
    if (millis === 0) return base;
    return `${base}.${String(millis).padStart(3, '0')}`;
};
