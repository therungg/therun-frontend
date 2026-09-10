import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';
import type { RunCardDetail } from '~src/components/run/run-hover-card/run-card-store';
import { getRunById } from '~src/lib/leaderboards-v1';

/**
 * Backs the leaderboard's run hover card: the few facts about a run the board
 * row doesn't carry. Slimmed from the cached public run detail, so it never
 * holds anything the run page doesn't already show every visitor. A shorter
 * edge cache than the user card — a verification lands minutes, not days,
 * after the run.
 */
export async function GET(
    _request: NextRequest,
    props: { params: Promise<{ runId: string }> },
) {
    const { runId } = await props.params;
    const id = Number(runId);
    if (!Number.isInteger(id) || id <= 0) {
        return apiResponse({ body: null, status: 400 });
    }

    const run = await getRunById(id);
    const body: RunCardDetail | null = run
        ? {
              verifiedBy: run.verifiedBy ?? null,
              verifiedAt: run.verifiedAt ?? null,
          }
        : null;

    return apiResponse({ body, cache: { maxAge: 300, swr: 3600 } });
}
