import { describe, expect, it } from 'vitest';
import { buildLiveWebsocketUrl } from '../websocket-url';

const BASE = 'wss://ws.therun.gg';

describe('buildLiveWebsocketUrl', () => {
    it('returns the bare firehose url without a game', () => {
        expect(buildLiveWebsocketUrl(BASE)).toBe(BASE);
        expect(buildLiveWebsocketUrl(BASE, null)).toBe(BASE);
    });

    it('subscribes to a game bucket', () => {
        expect(buildLiveWebsocketUrl(BASE, 'Super Mario 64')).toBe(
            'wss://ws.therun.gg?game=Super%20Mario%2064',
        );
    });

    it('subscribes to a game and category bucket', () => {
        expect(buildLiveWebsocketUrl(BASE, 'Super Mario 64', '120 Star')).toBe(
            'wss://ws.therun.gg?game=Super%20Mario%2064&category=120%20Star',
        );
    });

    it('encodes special characters', () => {
        expect(
            buildLiveWebsocketUrl(BASE, 'Pokémon Red/Blue', 'Any% Glitchless'),
        ).toBe(
            'wss://ws.therun.gg?game=Pok%C3%A9mon%20Red%2FBlue&category=Any%25%20Glitchless',
        );
    });

    it('ignores a category without a game', () => {
        expect(buildLiveWebsocketUrl(BASE, null, '120 Star')).toBe(BASE);
    });
});
