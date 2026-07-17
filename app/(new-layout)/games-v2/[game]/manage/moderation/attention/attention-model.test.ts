import { describe, expect, it } from 'vitest';
import {
    degradedSourcesOf,
    formatSourceList,
    resolveSource,
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
