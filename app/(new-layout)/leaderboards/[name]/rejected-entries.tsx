import type { LeaderboardsProfileGame } from '../../../../types/leaderboards-profile.types';

export async function RejectedEntries(_props: {
    name: string;
    sessionId: string;
    games: LeaderboardsProfileGame[];
}) {
    return null;
}
