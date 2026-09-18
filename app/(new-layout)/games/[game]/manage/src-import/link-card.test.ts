import { describe, expect, it } from 'vitest';
import { srcUrlFromInput } from './link-card';

describe('srcUrlFromInput', () => {
    it('turns a bare abbreviation into the canonical URL', () => {
        expect(srcUrlFromInput('sm64')).toBe('https://www.speedrun.com/sm64');
        expect(srcUrlFromInput('  sm64  ')).toBe(
            'https://www.speedrun.com/sm64',
        );
    });

    it('accepts a pasted full URL in any shape', () => {
        expect(srcUrlFromInput('https://www.speedrun.com/sm64')).toBe(
            'https://www.speedrun.com/sm64',
        );
        expect(srcUrlFromInput('speedrun.com/sm64')).toBe(
            'https://www.speedrun.com/sm64',
        );
        expect(srcUrlFromInput('http://speedrun.com/sm64/full_game')).toBe(
            'https://www.speedrun.com/sm64/full_game',
        );
    });

    it('is empty when there is nothing to send', () => {
        expect(srcUrlFromInput('')).toBe('');
        expect(srcUrlFromInput('   ')).toBe('');
        expect(srcUrlFromInput('https://www.speedrun.com/')).toBe('');
    });
});
