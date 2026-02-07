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

    result.runs = result.runs
        .filter((run) => !!run.pb || !!run.pbgt)
        .sort((a, b) => {
            if (a.pbgt || b.pbgt) {
                if (!a.pbgt) return 1;
                if (!b.pbgt) return -1;
                return parseFloat(a.pbgt) - parseFloat(b.pbgt);
            }
            if (!a.pb) return 1;
            if (!b.pb) return -1;
            return parseFloat(a.pb) - parseFloat(b.pb);
        });

    return apiResponse({
        body: result,
        cache: { maxAge: 60, swr: 60 },
    });
}
