// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoverCardAnchor } from '../hover-card-anchor';
import { OPEN_DELAY } from '../hover-intent';
import { __resetUserCardCache, __setUserCardFetcher } from '../user-card-store';

const profile = {
    user: 'joey',
    username: 'joey',
    createdAt: '2021-03-04T00:00:00.000Z',
    pronouns: 'they/them',
    picture: '',
    card: {
        runCount: 142,
        gameCount: 38,
        playtime: 7_862_400_000,
        attemptCount: 9000,
        finishedAttemptCount: 400,
        topRuns: [
            {
                game: 'Super Mario 64',
                gameSlug: 'supermario64',
                category: '120 Star',
                personalBest: 5_902_000,
                playtime: 144_000_000,
            },
        ],
        latestPb: {
            game: 'Super Mario 64',
            gameSlug: 'supermario64',
            category: '16 Star',
            time: 900_000,
            achievedAt: '2026-08-14T12:00:00.000Z',
        },
    },
};

const renderAnchor = () =>
    render(
        <HoverCardAnchor username="joey">
            {(handlers) => (
                <a
                    href="/joey"
                    ref={handlers.ref as React.Ref<HTMLAnchorElement>}
                    onPointerEnter={handlers.onPointerEnter}
                    onPointerLeave={handlers.onPointerLeave}
                    onFocus={handlers.onFocus}
                    onBlur={handlers.onBlur}
                >
                    joey
                </a>
            )}
        </HoverCardAnchor>,
    );

const hover = (pointerType = 'mouse') =>
    fireEvent.pointerEnter(screen.getByRole('link'), { pointerType });

describe('HoverCardAnchor', () => {
    let fetcher: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        __resetUserCardCache();
        fetcher = vi.fn(
            async () => ({ ok: true, json: async () => profile }) as Response,
        );
        __setUserCardFetcher(fetcher as never);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('fetches nothing until the pointer settles', () => {
        renderAnchor();

        hover();
        vi.advanceTimersByTime(OPEN_DELAY - 50);

        expect(fetcher).not.toHaveBeenCalled();
        expect(screen.queryByText('runs')).toBeNull();
    });

    it('shows the runner once the card opens', async () => {
        renderAnchor();

        hover();
        vi.advanceTimersByTime(OPEN_DELAY);

        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
        await waitFor(() => {
            expect(screen.getByText('142')).toBeTruthy();
            expect(screen.getByText('38')).toBeTruthy();
            expect(screen.getByText('they/them')).toBeTruthy();
            expect(screen.getByText('Runner since Mar 2021')).toBeTruthy();
            expect(screen.getByText('Super Mario 64')).toBeTruthy();
            expect(screen.getByText('120 Star')).toBeTruthy();
            expect(screen.getByText('1:38:22')).toBeTruthy();
        });
    });

    it('opens no card for a touch tap', () => {
        renderAnchor();

        hover('touch');
        vi.advanceTimersByTime(2000);

        expect(fetcher).not.toHaveBeenCalled();
    });

    it('opens immediately on keyboard focus and closes on Escape', async () => {
        renderAnchor();

        fireEvent.focus(screen.getByRole('link'));
        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

        fireEvent.keyDown(window, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByText('142')).toBeNull());
    });

    it('closes when the page scrolls out from under it', async () => {
        renderAnchor();

        hover();
        vi.advanceTimersByTime(OPEN_DELAY);
        await waitFor(() => expect(screen.getByText('142')).toBeTruthy());

        fireEvent.scroll(window);
        await waitFor(() => expect(screen.queryByText('142')).toBeNull());
    });
});
