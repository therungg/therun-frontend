import { cacheLife } from 'next/cache';
import { apiResponse } from '~app/(old-layout)/api/response';
import { getTournaments } from '~src/components/tournament/getTournaments';

export async function GET() {
    const result = await getTournaments();

    return apiResponse({
        body: result,
        cache: { maxAge: 60, swr: 12000 },
    });
}
