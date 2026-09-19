import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

type Profile = 'seconds' | 'minutes' | 'hours' | 'days';

// Tags the backend may invalidate, mapped to the cacheLife profile each tag
// was cached under (revalidateTag requires the profile as second argument).
// Called by the backend Patreon webhook so a new latest patron shows up in
// the header immediately instead of after the cache lifetime.
const ALLOWED_TAGS: Record<string, Profile> = {
    'featured-patrons': 'hours',
    patrons: 'hours',
};

/**
 * Tag families the backend may invalidate, by prefix.
 *
 * `game-vars:` is the board's variables — its subcategories, its filters and
 * the rules each subcategory value carries. Only the console's own actions
 * used to drop it, so a change made by the importer (which runs in the
 * backend and has no way into Next's cache) stayed invisible for the whole
 * `cacheLife('hours')` window: the API served the newly imported rules while
 * the page kept rendering the ones from before the import.
 */
const ALLOWED_PREFIXES: [string, Profile][] = [['game-vars:', 'hours']];

function profileFor(tag: string): Profile | undefined {
    const exact = ALLOWED_TAGS[tag];
    if (exact) return exact;
    return ALLOWED_PREFIXES.find(([prefix]) => tag.startsWith(prefix))?.[1];
}

export async function POST(request: NextRequest) {
    const secret = process.env.REVALIDATE_SECRET;
    const auth = request.headers.get('authorization');

    if (!secret || auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const tag = body?.tag as string | undefined;
    const profile = tag ? profileFor(tag) : undefined;

    if (!tag || !profile) {
        return NextResponse.json({ error: 'Unknown tag' }, { status: 400 });
    }

    revalidateTag(tag, profile);

    return NextResponse.json({ revalidated: true, tag });
}
