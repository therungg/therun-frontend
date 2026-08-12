// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
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

const displayRank: DisplayRank = { label: '4', tied: false };

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
                    onModerate={props.onModerate ?? vi.fn()}
                    onBoardRefresh={props.canManage ? vi.fn() : undefined}
                />
            </tbody>
        </table>,
    );
}

describe('LeaderboardRow — owner entry point', () => {
    it('offers Manage on the signed-in runner’s own row', () => {
        renderRow({ isCurrentUser: true, canManage: false });
        expect(
            screen.getByRole('button', { name: 'Manage' }),
        ).toBeInTheDocument();
    });

    it('calls onModerate with the row’s entry', () => {
        const onModerate = vi.fn();
        const own = entry();
        renderRow({
            entry: own,
            isCurrentUser: true,
            canManage: false,
            onModerate,
        });
        screen.getByRole('button', { name: 'Manage' }).click();
        expect(onModerate).toHaveBeenCalledWith(own);
    });

    it('offers nothing on another runner’s row', () => {
        renderRow({ isCurrentUser: false, canManage: false });
        expect(screen.queryByRole('button', { name: 'Manage' })).toBeNull();
        expect(screen.queryByRole('button', { name: /Moderate/ })).toBeNull();
    });

    // A pure set time has no run behind it — the owner path for those is the
    // manual-times endpoints, not the run inspector.
    it('offers nothing on the runner’s own set time (runId == null)', () => {
        renderRow({
            entry: entry({
                runId: null,
                manualTimeId: 9,
                source: 'manual',
            }),
            isCurrentUser: true,
            canManage: false,
        });
        expect(screen.queryByRole('button', { name: 'Manage' })).toBeNull();
    });

    // `isCurrentUser` is a case-insensitive NAME match. A guest submission's
    // runner name is self-reported free text, so it can carry anyone's name
    // and must never light up their owner control.
    it('offers nothing on a guest run bearing the viewer’s name', () => {
        renderRow({
            entry: entry({ isGuest: true, userId: null }),
            isCurrentUser: true,
            canManage: false,
        });
        expect(screen.queryByRole('button', { name: 'Manage' })).toBeNull();
    });

    // The mirror case: an anonymized row's placeholder is a name a real
    // runner may legitimately have (see LeaderboardEntry.anonymized).
    it('offers nothing on an anonymized row', () => {
        renderRow({
            entry: entry({ anonymized: true, userId: null }),
            isCurrentUser: true,
            canManage: false,
        });
        expect(screen.queryByRole('button', { name: 'Manage' })).toBeNull();
    });

    it('offers nothing on a row with no account behind it', () => {
        renderRow({
            entry: entry({ userId: null }),
            isCurrentUser: true,
            canManage: false,
        });
        expect(screen.queryByRole('button', { name: 'Manage' })).toBeNull();
    });

    // The mod surface is a superset of the owner's: a moderator on their own
    // row keeps Moderate and must not be downgraded to the reduced control.
    it('gives a moderator Moderate, not Manage, on their own row', () => {
        renderRow({ isCurrentUser: true, canManage: true });
        expect(
            screen.getByRole('button', { name: /Moderate/ }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Manage' })).toBeNull();
    });
});
