import { NextRequest } from 'next/server';
import { apiResponse } from '~app/(old-layout)/api/response';
import { getLiveRunForUser } from '~src/lib/live-runs';

export async function GET(
    _request: NextRequest,
    props: { params: Promise<{ username: string }> },
) {
    const params = await props.params;
    const result = await getLiveRunForUser(params.username);

    return apiResponse({ body: result });
}
