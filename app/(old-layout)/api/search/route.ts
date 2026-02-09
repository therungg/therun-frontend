import { NextRequest, NextResponse } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
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

    const result = await findUserOrRun(searchParams.get('q') as string);

    result.runs = result.runs.filter((run) => !!run.pb || !!run.pbgt);

    return apiResponse({
        body: result,
    });
}
