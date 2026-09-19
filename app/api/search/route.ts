import { NextRequest, NextResponse } from 'next/server';
import { apiResponse } from '~app/api/response';
import { findGames } from '~src/components/search/find-games';
import { findUserOrRun } from '~src/components/search/find-user-or-run';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    if (!searchParams.has('q')) {
        return NextResponse.json(
            {
                error: 'Must be GET request and supply `q` parameter',
            },
            { status: 400 },
        );
    }

    const query = searchParams.get('q') as string;

    // Games come from a different backend than users and runs, so the two
    // lookups run side by side — the slower one sets the response time, not
    // the sum of both.
    const [result, games] = await Promise.all([
        findUserOrRun(query),
        findGames(query),
    ]);

    result.runs = result.runs.filter((run) => !!run.pb || !!run.pbgt);

    // Keyed by `q`, and findUserOrRun is cached for minutes regardless — the
    // uncached response meant every keystroke re-ran the search backend.
    return apiResponse({
        body: { ...result, games },
        cache: { maxAge: 60, swr: 600 },
    });
}
