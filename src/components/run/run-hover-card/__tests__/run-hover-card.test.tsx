// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { RunHoverCard } from '../run-hover-card';

const base: LeaderboardEntry = {
    rank: 3,
    runnerName: 'joey',
    isGuest: false,
    time: 3_600_000,
    realTime: 3_600_000,
    gameTime: null,
    runDate: '2026-08-01',
    vodUrl: 'https://twitch.tv/x',
    verificationStatus: 'verified',
};

describe('RunHoverCard', () => {
    it('shows rank, video indicator and verified badge', () => {
        render(<RunHoverCard entry={base} showMilliseconds={false} />);
        expect(screen.getByText(/#?3/)).toBeInTheDocument();
        expect(screen.getByText(/verified/i)).toBeInTheDocument();
        expect(screen.getByText(/video/i)).toBeInTheDocument();
    });

    it('omits video indicator when no vod', () => {
        render(
            <RunHoverCard
                entry={{ ...base, vodUrl: null }}
                showMilliseconds={false}
            />,
        );
        expect(screen.queryByText(/video/i)).not.toBeInTheDocument();
    });
});
