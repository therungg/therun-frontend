import { describe, expect, it, vi } from 'vitest';
import { CLOSE_DELAY, createHoverIntent, OPEN_DELAY } from '../hover-intent';

const withFakeTimers = () => {
    const changes: boolean[] = [];
    const intent = createHoverIntent((open) => changes.push(open));
    return { changes, intent };
};

describe('createHoverIntent', () => {
    it('opens only after the pointer settles', () => {
        vi.useFakeTimers();
        const { changes, intent } = withFakeTimers();

        intent.enter();
        vi.advanceTimersByTime(OPEN_DELAY - 1);
        expect(changes).toEqual([]);

        vi.advanceTimersByTime(1);
        expect(changes).toEqual([true]);

        vi.useRealTimers();
    });

    it('fetches nothing for a pointer crossing the page', () => {
        vi.useFakeTimers();
        const { changes, intent } = withFakeTimers();

        // Five links passed over in quick succession.
        for (let i = 0; i < 5; i++) {
            intent.enter();
            vi.advanceTimersByTime(40);
            intent.leave();
        }
        vi.advanceTimersByTime(1000);

        expect(changes).toEqual([false]);

        vi.useRealTimers();
    });

    it('grants a grace period for travelling into the card', () => {
        vi.useFakeTimers();
        const { changes, intent } = withFakeTimers();

        intent.enter();
        vi.advanceTimersByTime(OPEN_DELAY);
        intent.leave();
        vi.advanceTimersByTime(CLOSE_DELAY - 1);

        // Pointer reached the card in time.
        intent.cancel();
        vi.advanceTimersByTime(1000);

        expect(changes).toEqual([true]);

        vi.useRealTimers();
    });

    it('opens immediately on keyboard focus', () => {
        vi.useFakeTimers();
        const { changes, intent } = withFakeTimers();

        intent.openNow();

        expect(changes).toEqual([true]);

        vi.useRealTimers();
    });

    it('closes immediately on escape, cancelling a pending open', () => {
        vi.useFakeTimers();
        const { changes, intent } = withFakeTimers();

        intent.enter();
        intent.closeNow();
        vi.advanceTimersByTime(1000);

        expect(changes).toEqual([false]);

        vi.useRealTimers();
    });
});
