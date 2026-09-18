// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import type { DisplayRank } from './display-rank';
import { LeaderboardRow } from './leaderboard-row';

const entry = (over: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
    runId: 101,
    rank: 4,
    runnerName: 'Joey',
    userId: 7,
    isGuest: false,
    time: 60_000,
    realTime: 60_000,
    gameTime: null,
    runDate: null,
    verificationStatus: 'verified',
    ...over,
});

const displayRank: DisplayRank = { label: '4', tied: false, rank: 4 };

function renderRow(props: {
    entry?: LeaderboardEntry;
    isCurrentUser: boolean;
    canManage: boolean;
    onModerate?: (e: LeaderboardEntry) => void;
}) {
    return render(
        <table>
            <tbody>
                <LeaderboardRow
                    entry={props.entry ?? entry()}
                    displayRank={displayRank}
                    isCurrentUser={props.isCurrentUser}
                    canManage={props.canManage}
                    gameSlug="celeste"
                    hideRealTime={false}
                    hideGameTime
                    primaryTiming="rt"
                    valueColumns={[]}
                    showMilliseconds={false}
                    onModerate={props.onModerate}
                />
            </tbody>
        </table>,
    );
}

const detailLink = () =>
    screen
        .getAllByRole('link')
        .find((a) => a.getAttribute('href')?.startsWith('/games/celeste/run/'));

describe('LeaderboardRow — row is a link for everyone', () => {
    it('renders the ranked time as a link to the run detail page for a non-mod viewer', () => {
        renderRow({ isCurrentUser: false, canManage: false });
        expect(detailLink()).toHaveAttribute('href', '/games/celeste/run/101');
    });

    it('renders the ranked time as a link for a moderator too — no drawer button', () => {
        renderRow({ isCurrentUser: false, canManage: true });
        expect(detailLink()).toHaveAttribute('href', '/games/celeste/run/101');
        expect(screen.queryByRole('button', { name: /Moderate/ })).toBeNull();
    });

    it('offers no Manage button on the signed-in runner’s own row', () => {
        renderRow({ isCurrentUser: true, canManage: false });
        expect(screen.queryByRole('button', { name: 'Manage' })).toBeNull();
    });
});

describe('LeaderboardRow — moderate', () => {
    it('is absent for a viewer who cannot manage the board', () => {
        renderRow({
            isCurrentUser: false,
            canManage: false,
            onModerate: vi.fn(),
        });
        expect(screen.queryByRole('button', { name: /Moderate/ })).toBeNull();
    });
});
