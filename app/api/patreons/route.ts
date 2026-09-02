import { connection } from 'next/server';
import { apiResponse } from '../response';
import { getAllPatrons } from './get-all-patrons.action';

export async function GET() {
    // Render per request. Without this the handler has no request-time API
    // in it, so cacheComponents prerenders it as a static route; every ISR
    // regeneration then aborts with "couldn't be rendered statically because
    // it used Date.now()" (the remote cache handler reads the clock, which
    // the prerender tracks as dynamic), Vercel serves the build-time
    // snapshot as STALE indefinitely, and patron changes never reach the
    // client. Remote caching only works outside the static shell — see the
    // 'use cache: remote' docs, whose examples all pair it with connection().
    await connection();
    const result = await getAllPatrons();
    // Per-request rendering would otherwise make every client mount of
    // usePatreons() a function invocation. The remote cache already holds
    // the data for hours (webhook-revalidated), so a short CDN window only
    // delays a new patron's perks by at most a minute.
    return apiResponse({
        body: result,
        cache: { maxAge: 60, swr: 300 },
    });
}
