import { beforeEach, describe, expect, it } from 'vitest';
import { getTwitchOAuthURL, sanitizeReturnTo } from '../twitch-oauth';

describe('sanitizeReturnTo', () => {
    it('keeps a same-site path with its query string', () => {
        expect(sanitizeReturnTo('/games-v2/Celeste?category=Any%25')).toBe(
            '/games-v2/Celeste?category=Any%25',
        );
    });

    it('falls back to the homepage for empty input', () => {
        expect(sanitizeReturnTo(undefined)).toBe('/');
        expect(sanitizeReturnTo(null)).toBe('/');
        expect(sanitizeReturnTo('')).toBe('/');
    });

    it('rejects absolute and protocol-relative destinations', () => {
        expect(sanitizeReturnTo('https://evil.example/steal')).toBe('/');
        expect(sanitizeReturnTo('//evil.example/steal')).toBe('/');
        expect(sanitizeReturnTo('/\\evil.example')).toBe('/');
        expect(sanitizeReturnTo('games-v2/Celeste')).toBe('/');
    });
});

describe('getTwitchOAuthURL', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_BASE_URL = 'https://therun.gg';
        process.env.NEXT_PUBLIC_TWITCH_OAUTH_CLIENT_ID = 'client-id';
    });

    it('always points the redirect back at the single callback route', () => {
        const url = getTwitchOAuthURL({ returnTo: '/games-v2/Celeste' });

        expect(url.searchParams.get('redirect_uri')).toBe(
            'https://therun.gg/api',
        );
    });

    it('carries the return path in state', () => {
        const url = getTwitchOAuthURL({ returnTo: '/games-v2/Celeste' });

        expect(url.searchParams.get('state')).toBe('/games-v2/Celeste');
    });

    it('keeps a return path with its own query intact', () => {
        const url = getTwitchOAuthURL({
            returnTo: '/games-v2/Celeste?category=Any&sub=main',
        });

        expect(url.searchParams.get('state')).toBe(
            '/games-v2/Celeste?category=Any&sub=main',
        );
        expect(url.searchParams.get('category')).toBeNull();
        expect(url.searchParams.get('sub')).toBeNull();
    });

    it('drops an off-site return path', () => {
        const url = getTwitchOAuthURL({ returnTo: 'https://evil.example' });

        expect(url.searchParams.get('state')).toBe('/');
    });

    it('defaults to the homepage', () => {
        expect(getTwitchOAuthURL({}).searchParams.get('state')).toBe('/');
    });
});
