import { cacheLife, cacheTag } from 'next/cache';
import type {
    LeaderboardsProfile,
    LeaderboardsProfileEntry,
} from '../../types/leaderboards-profile.types';
import { ApiError, apiFetch } from './api-client';

export const leaderboardsProfileTag = (name: string) =>
    `leaderboards-profile:${name.toLowerCase()}`;

export async function getLeaderboardsProfile(
    name: string,
): Promise<LeaderboardsProfile | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(leaderboardsProfileTag(name));
    try {
        const profile = await apiFetch<LeaderboardsProfile>(
            `/users/global/${encodeURIComponent(name)}?profile=1`,
        );
        return profile ? withEarnedPlaces(profile) : profile;
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
    }
}

// A placing counts once it is earned: verified, on a board with someone
// else on it. The page draws pending runs and lone runners without medals,
// so the counts beside them leave those out too.
const earned = (e: LeaderboardsProfileEntry, maxRank: number) =>
    !e.archived &&
    e.status === 'verified' &&
    e.rank !== null &&
    e.rank <= maxRank &&
    (e.totalRunners ?? 0) > 1;

function withEarnedPlaces(profile: LeaderboardsProfile): LeaderboardsProfile {
    const entries = profile.games.flatMap((g) => g.entries);
    const places = (maxRank: number) =>
        entries.filter((e) => earned(e, maxRank)).length;
    return {
        ...profile,
        standing: {
            ...profile.standing,
            first: places(1),
            podiums: places(3),
            topTen: places(10),
        },
    };
}
