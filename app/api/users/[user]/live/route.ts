import { NextRequest } from 'next/server';
import type { LiveRun, Split } from '~app/(new-layout)/live/live.types';
import { apiResponse } from '~app/api/response';
import { deltaAtPast } from '~src/components/live/commentary-drawer/derive-snapshot';
import { getLiveRunForUser } from '~src/lib/live-runs';
import type { UserCardLive } from '../../../../../types/user-card.types';

/**
 * Backs the hover card's live strip. The full live run carries every split's
 * history; the card needs a handful of fields, so this trims it server-side.
 * Short CDN cache: the strip only has to be roughly now, and the live page is
 * one click away.
 */
export async function GET(
    _request: NextRequest,
    props: { params: Promise<{ user: string }> },
) {
    const { user } = await props.params;

    let body: UserCardLive | null = null;
    try {
        const run = (await getLiveRunForUser(encodeURIComponent(user))) as
            | LiveRun
            | undefined;
        body = run?.game ? slim(run) : null;
    } catch {
        body = null;
    }

    return apiResponse({ body, cache: { maxAge: 15, swr: 30 } });
}

function slim(run: LiveRun): UserCardLive {
    // Splits arrive as an array from the live endpoint, but tolerate the
    // keyed-object form too rather than reporting a zero-split run.
    const splits: Split[] = Array.isArray(run.splits)
        ? run.splits
        : Object.values((run.splits ?? {}) as Record<string, Split>);
    const current = run.currentSplitIndex ?? 0;

    return {
        game: run.game,
        category: run.category,
        currentSplitIndex: current,
        splitCount: splits.length,
        currentSplitName: run.currentSplitName ?? null,
        startedAt: run.startedAt ?? null,
        // Same measure the commentary drawer shows for a completed split:
        // the split's time against its PB split time.
        delta:
            current > 0 ? deltaAtPast({ ...run, splits }, current - 1) : null,
    };
}
