import { describe, expect, it } from 'vitest';
import {
    degradedSourcesOf,
    formatSourceList,
    parseKindFilter,
    resolveSource,
    shortDetail,
} from './attention-model';

describe('resolveSource', () => {
    it('resolves ok:true with the data on success', async () => {
        const result = await resolveSource(
            Promise.resolve(['a', 'b']),
            'flags',
        );
        expect(result).toEqual({ ok: true, data: ['a', 'b'] });
    });

    it('resolves ok:false with the source name on rejection', async () => {
        const result = await resolveSource(
            Promise.reject(new Error('boom')),
            'flags',
        );
        expect(result).toEqual({ ok: false, source: 'flags' });
    });
});

describe('degradedSourcesOf', () => {
    it('returns an empty list when every source loaded', () => {
        const degraded = degradedSourcesOf([
            { ok: true, data: [] },
            { ok: true, data: [] },
        ]);
        expect(degraded).toEqual([]);
    });

    it('collects the source names of every failed result, in order', () => {
        const degraded = degradedSourcesOf([
            { ok: true, data: [] },
            { ok: false, source: 'reports' },
            { ok: false, source: 'manual times' },
        ]);
        expect(degraded).toEqual(['reports', 'manual times']);
    });
});

describe('formatSourceList', () => {
    it('formats a single source', () => {
        expect(formatSourceList(['flags'])).toBe('flags');
    });

    it('formats two sources with "and"', () => {
        expect(formatSourceList(['flags', 'reports'])).toBe(
            'flags and reports',
        );
    });

    it('formats three or more sources as an Oxford-comma list', () => {
        expect(formatSourceList(['flags', 'reports', 'manual times'])).toBe(
            'flags, reports, and manual times',
        );
    });

    it('returns an empty string for an empty list', () => {
        expect(formatSourceList([])).toBe('');
    });
});

describe('shortDetail', () => {
    it('returns null for an empty details map', () => {
        expect(shortDetail({})).toBeNull();
    });

    it('humanizes a snake_case key and renders a boolean as Yes/No', () => {
        expect(shortDetail({ likely_bot: true })).toBe('Likely Bot: Yes');
        expect(shortDetail({ likely_bot: false })).toBe('Likely Bot: No');
    });

    it('humanizes a snake_case string value too', () => {
        expect(shortDetail({ deviation_source: 'video_gap' })).toBe(
            'Deviation Source: Video Gap',
        );
    });

    it('leaves numbers as plain numbers', () => {
        expect(shortDetail({ deviation_pct: 42 })).toBe('Deviation Pct: 42');
    });

    it('never leaves a raw key=value snake_case dump in the output', () => {
        const result = shortDetail({ likely_bot: true, deviation_pct: 5 });
        expect(result).not.toContain('likely_bot');
        expect(result).not.toContain('deviation_pct');
    });

    it('limits to the first two entries, joined by the middle dot', () => {
        const result = shortDetail({ a: 1, b: 2, c: 3 });
        expect(result).toBe('A: 1 · B: 2');
    });
});

describe('parseKindFilter', () => {
    it('returns null for a missing param', () => {
        expect(parseKindFilter(null)).toBeNull();
    });

    it('returns null for an empty string', () => {
        expect(parseKindFilter('')).toBeNull();
    });

    it('returns null for an unrecognized value', () => {
        expect(parseKindFilter('bogus')).toBeNull();
    });

    it('accepts each valid attention source', () => {
        expect(parseKindFilter('flag')).toBe('flag');
        expect(parseKindFilter('report')).toBe('report');
        expect(parseKindFilter('appeal')).toBe('appeal');
        expect(parseKindFilter('self_claim')).toBe('self_claim');
    });
});
