import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

// Tags the backend may invalidate, mapped to the cacheLife profile each tag
// was cached under (revalidateTag requires the profile as second argument).
// Called by the backend Patreon webhook so a new latest patron shows up in
// the header immediately instead of after the cache lifetime.
const ALLOWED_TAGS: Record<string, 'seconds' | 'minutes' | 'hours' | 'days'> = {
    'featured-patrons': 'hours',
    patrons: 'hours',
};

export async function POST(request: NextRequest) {
    const secret = process.env.REVALIDATE_SECRET;
    const auth = request.headers.get('authorization');

    if (!secret || auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const tag = body?.tag as string | undefined;
    const profile = tag ? ALLOWED_TAGS[tag] : undefined;

    if (!tag || !profile) {
        return NextResponse.json({ error: 'Unknown tag' }, { status: 400 });
    }

    revalidateTag(tag, profile);

    return NextResponse.json({ revalidated: true, tag });
}
