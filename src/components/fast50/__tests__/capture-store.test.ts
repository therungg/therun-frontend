import { describe, expect, test } from 'vitest';
import type { LiveRun } from '~app/(new-layout)/live/live.types';
import { captureKey, loadCapture, saveCapture } from '../capture/capture-store';

const fakeStorage = () => {
    const map = new Map<string, string>();
    return {
        setItem: (k: string, v: string) => void map.set(k, v),
        getItem: (k: string) => map.get(k) ?? null,
    };
};

const run = {
    user: 'Runner',
    game: 'My Game',
    category: 'Any%',
    currentTime: 123,
} as LiveRun;

describe('capture store', () => {
    test('key is normalized', () => {
        expect(captureKey(' Runner ', 'My Game', 'ANY%')).toBe(
            'fast50-capture:runner:my game:any%',
        );
    });
    test('round-trips a run', () => {
        const storage = fakeStorage();
        saveCapture(storage, run);
        const loaded = loadCapture(storage, 'runner', 'my game', 'any%');
        expect(loaded?.run.currentTime).toBe(123);
        expect(loaded?.savedAt).toBeTruthy();
    });
    test('null on corrupt json', () => {
        const storage = fakeStorage();
        storage.setItem('fast50-capture:runner:my game:any%', '{nope');
        expect(loadCapture(storage, 'runner', 'my game', 'any%')).toBeNull();
    });
});
