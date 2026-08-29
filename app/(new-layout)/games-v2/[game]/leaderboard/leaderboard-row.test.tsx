// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import type { ModVerb } from '../manage/moderation/shared/action-model';
import type { DisplayRank } from './display-rank';
import { LeaderboardRow } from './leaderboard-row';

// The two quick-verb buttons perform their own mutations through server
// actions; this suite is about which controls a row offers to whom, so they
// are stubbed out rather than exercised.
vi.mock('./quick-verify-button', () => ({
    QuickVerifyButton: () => null,
}));
vi.mock('./quick-unverify-button', () => ({
    QuickUnverifyButton: () => null,
}));

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
    onQuickModerate?: (e: LeaderboardEntry, verb: ModVerb) => void;
    onBoardRefresh?: () => void;
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
                    onQuickModerate={props.onQuickModerate ?? vi.fn()}
                    onBoardRefresh={
                        props.onBoardRefresh ??
                        (props.canManage ? vi.fn() : undefined)
                    }
                />
            </tbody>
        </table>,
    );
}

const detailLink = () =>
    screen
        .getAllByRole('link')
        .find((a) =>
            a.getAttribute('href')?.startsWith('/games-v2/celeste/run/'),
        );

describe('LeaderboardRow — row is a link for everyone', () => {
    it('renders the ranked time as a link to the run detail page for a non-mod viewer', () => {
        renderRow({ isCurrentUser: false, canManage: false });
        expect(detailLink()).toHaveAttribute(
            'href',
            '/games-v2/celeste/run/101',
        );
    });

    it('renders the ranked time as a link for a moderator too — no drawer button', () => {
        renderRow({ isCurrentUser: false, canManage: true });
        expect(detailLink()).toHaveAttribute(
            'href',
            '/games-v2/celeste/run/101',
        );
        expect(screen.queryByRole('button', { name: /Moderate/ })).toBeNull();
    });

    it('offers no Manage button on the signed-in runner’s own row', () => {
        renderRow({ isCurrentUser: true, canManage: false });
        expect(screen.queryByRole('button', { name: 'Manage' })).toBeNull();
    });
});

describe('LeaderboardRow — quick-remove', () => {
    it('fires onQuickModerate with the remove verb', () => {
        const onQuickModerate = vi.fn();
        const own = entry();
        renderRow({
            entry: own,
            isCurrentUser: false,
            canManage: true,
            onQuickModerate,
            onBoardRefresh: vi.fn(),
        });
        screen.getByRole('button', { name: /Remove/ }).click();
        expect(onQuickModerate).toHaveBeenCalledWith(own, 'remove');
    });

    it('is absent for a viewer who cannot manage the board', () => {
        renderRow({ isCurrentUser: false, canManage: false });
        expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
    });
});
