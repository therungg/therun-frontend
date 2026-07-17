import { describe, expect, it } from 'vitest';
import {
    formatSubcategoryKey,
    formatVariableList,
    timingMethodLabel,
} from './labels';

describe('formatSubcategoryKey', () => {
    it('returns empty string for empty key', () => {
        expect(formatSubcategoryKey('')).toBe('');
    });

    it('returns empty string for blank/whitespace key', () => {
        expect(formatSubcategoryKey('   ')).toBe('');
    });

    it('humanizes without defs, prefixing non-alphabetic values with the name', () => {
        expect(formatSubcategoryKey('platform=pc|patch=1.0')).toBe(
            'Pc · Patch 1.0',
        );
    });

    it('maps to canonical display values via defs', () => {
        const defs = [
            {
                name: 'Platform',
                nameNormalized: 'platform',
                values: [
                    ['PC', 'pc'],
                    ['PS4', 'ps4'],
                ],
            },
            {
                name: 'Patch',
                nameNormalized: 'patch',
                values: [['Patch 1.0', '1.0']],
            },
        ];
        expect(formatSubcategoryKey('platform=pc|patch=1.0', defs)).toBe(
            'PC · Patch 1.0',
        );
    });

    it('matches alias values case-insensitively against def buckets', () => {
        const defs = [
            {
                name: 'Console',
                nameNormalized: 'console',
                values: [['N64', 'n64', 'nintendo64']],
            },
        ];
        expect(formatSubcategoryKey('console=N64', defs)).toBe('N64');
    });

    it('falls back to humanized value when defs are provided but no def matches the key', () => {
        const defs = [
            {
                name: 'Platform',
                nameNormalized: 'platform',
                values: [['PC', 'pc']],
            },
        ];
        expect(formatSubcategoryKey('region=ntsc', defs)).toBe('Ntsc');
    });

    it('falls back to humanized value when a def matches but the value has no matching bucket', () => {
        const defs = [
            {
                name: 'Platform',
                nameNormalized: 'platform',
                values: [['PC', 'pc']],
            },
        ];
        expect(formatSubcategoryKey('platform=xbox', defs)).toBe('Xbox');
    });

    it('joins multiple pairs with the middle dot separator', () => {
        expect(formatSubcategoryKey('console=n64|region=ntsc')).toBe(
            'N64 · Ntsc',
        );
    });

    it('skips malformed segments without an equals sign', () => {
        expect(formatSubcategoryKey('platform=pc|garbage')).toBe('Pc');
    });
});

describe('timingMethodLabel', () => {
    it('maps rt-family values to Real time', () => {
        expect(timingMethodLabel('rt')).toBe('Real time');
        expect(timingMethodLabel('realtime')).toBe('Real time');
        expect(timingMethodLabel('realTime')).toBe('Real time');
        expect(timingMethodLabel('RTA')).toBe('Real time');
    });

    it('maps gt-family values to Game time', () => {
        expect(timingMethodLabel('gt')).toBe('Game time');
        expect(timingMethodLabel('gametime')).toBe('Game time');
        expect(timingMethodLabel('gameTime')).toBe('Game time');
        expect(timingMethodLabel('IGT')).toBe('Game time');
    });

    it('never returns the raw enum for unknown values, falls back to humanized', () => {
        const result = timingMethodLabel('some_weird_enum');
        expect(result).toBe('Some Weird Enum');
        expect(result).not.toBe('some_weird_enum');
    });

    it('returns empty string for empty input', () => {
        expect(timingMethodLabel('')).toBe('');
    });
});

describe('formatVariableList', () => {
    it('returns empty string for no variables', () => {
        expect(formatVariableList({})).toBe('');
    });

    it('renders display values without = signs, separated by middle dot', () => {
        expect(formatVariableList({ platform: 'pc', patch: '1.0' })).toBe(
            'Pc · Patch 1.0',
        );
    });

    it('uses defs to resolve canonical display names', () => {
        const defs = [
            {
                name: 'Platform',
                nameNormalized: 'platform',
                values: [['PC', 'pc']],
            },
        ];
        expect(formatVariableList({ platform: 'pc' }, defs)).toBe('PC');
    });

    it('never leaves a raw key=value pair in the output', () => {
        const result = formatVariableList({ console: 'n64', region: 'ntsc' });
        expect(result).not.toContain('=');
        expect(result).toBe('N64 · Ntsc');
    });
});
