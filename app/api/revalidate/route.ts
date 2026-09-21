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
const ALLOWED_PREFIXES: [string, Profile][] = [
    ['game-vars:', 'hours'],
    // `game-resolve:` answers "which game is at this URL". A game changing
    // its slug takes a URL that resolved to another game until now, and
    // nothing here could drop that answer — so the change stayed invisible
    // for hours and read as not having worked.
    ['game-resolve:', 'hours'],
    // Everything keyed by a runner's name. A rename moves an account's whole
    // history from one name to the other in the backend, where nothing can
    // reach Next's cache — so without these the old name keeps rendering a
    // profile whose data has already left it, and the new name keeps
    // rendering the empty one it was cached as. A rename job drops both names
    // when it finishes.
    //
    // Each profile is the `cacheLife` its tag is actually cached under;
    // `revalidateTag` takes it as a second argument and a mismatch is a silent
    // no-op. `profileFor` returns the FIRST matching prefix, so `user-` sits
    // below the narrower `user-*` families — above them it would swallow every
    // one of them and hand back its own profile.
    ['user-card-', 'hours'],
    ['user-dashboard-', 'minutes'],
    ['user-preferences-', 'minutes'],
    ['user-summary-', 'minutes'],
    ['user-rankings:', 'minutes'],
    ['user-', 'hours'],
    ['runner-profile:', 'minutes'],
    ['leaderboards-profile:', 'minutes'],
];

/** A ceiling on one call, so a malformed body cannot ask for unbounded work. */
const MAX_TAGS = 200;

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
    // `tags` so one write that touches many boards is one call. An import can
    // rewrite a hundred of a game's categories, and a request each would have
    // the importer spend its Lambda waiting on this route.
    const requested: string[] = Array.isArray(body?.tags)
        ? body.tags.filter((t: unknown): t is string => typeof t === 'string')
        : typeof body?.tag === 'string'
          ? [body.tag]
          : [];

    if (requested.length === 0 || requested.length > MAX_TAGS) {
        return NextResponse.json({ error: 'No tags' }, { status: 400 });
    }

    const revalidated: string[] = [];
    for (const tag of requested) {
        const profile = profileFor(tag);
        // One unknown tag among known ones is a caller bug, not a reason to
        // leave the rest of the page stale.
        if (!profile) continue;
        revalidateTag(tag, profile);
        revalidated.push(tag);
    }

    if (revalidated.length === 0) {
        return NextResponse.json({ error: 'Unknown tag' }, { status: 400 });
    }

    return NextResponse.json({ revalidated: true, tags: revalidated });
}
