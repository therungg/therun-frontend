import { describe, expect, it } from 'vitest';
import { normaliseHandle, profileSchema } from '../profile-schema';

describe('profileSchema', () => {
    it('accepts a full valid payload', () => {
        const r = profileSchema.safeParse({
            pronouns: 'they/them',
            aka: 'J',
            country: 'NL',
            timezone: 'Europe/Amsterdam',
            bio: 'hi',
            socials: {
                youtube: 'joey',
                twitter: 'joey',
                bluesky: 'joey.bsky.social',
            },
        });
        expect(r.success).toBe(true);
    });

    it('rejects a bio over 100 characters', () => {
        expect(profileSchema.safeParse({ bio: 'x'.repeat(101) }).success).toBe(
            false,
        );
    });

    it('rejects an aka over 25 characters', () => {
        expect(profileSchema.safeParse({ aka: 'x'.repeat(26) }).success).toBe(
            false,
        );
    });

    it('maps the "no country" sentinel to an empty string', () => {
        const r = profileSchema.parse({ country: 'Show no country' });
        expect(r.country).toBe('');
    });

    it('rejects an unknown country code', () => {
        expect(profileSchema.safeParse({ country: 'ZZ' }).success).toBe(false);
    });
});

describe('normaliseHandle', () => {
    it('strips youtube.com/ and youtu.be/ prefixes', () => {
        expect(normaliseHandle('youtube', 'https://youtube.com/@joey')).toBe(
            '@joey',
        );
        expect(normaliseHandle('youtube', 'https://youtu.be/joey')).toBe(
            'joey',
        );
    });
    it('strips twitter.com/ prefixes', () => {
        expect(normaliseHandle('twitter', 'https://twitter.com/joey')).toBe(
            'joey',
        );
    });
    it('leaves bare handles alone', () => {
        expect(normaliseHandle('twitter', 'joey')).toBe('joey');
    });
});
