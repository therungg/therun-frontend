import { describe, expect, it } from 'vitest';
import { nameHue } from './avatar-hue';

describe('nameHue', () => {
    it('is deterministic', () => {
        expect(nameHue('Nindo')).toBe(nameHue('Nindo'));
    });
    it('stays in 0..359', () => {
        for (const n of ['a', 'Zx9', 'longer name here', '游戏']) {
            const h = nameHue(n);
            expect(h).toBeGreaterThanOrEqual(0);
            expect(h).toBeLessThan(360);
        }
    });
    it('differs for typical names', () => {
        expect(nameHue('alice')).not.toBe(nameHue('bob'));
    });
});
