'use server';

import { cookies } from 'next/headers';

const LAYOUT_PREFERENCE_COOKIE = 'layout-preference';

export async function setLayoutPreference(layout: 'old' | 'new') {
    const cookieStore = await cookies();
    cookieStore.set(LAYOUT_PREFERENCE_COOKIE, layout, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
    });
}

export async function getLayoutPreference(): Promise<'old' | 'new' | null> {
    const cookieStore = await cookies();
    return (
        (cookieStore.get(LAYOUT_PREFERENCE_COOKIE)?.value as 'old' | 'new') ||
        null
    );
}

export async function clearLayoutPreference() {
    const cookieStore = await cookies();
    cookieStore.delete(LAYOUT_PREFERENCE_COOKIE);
}
