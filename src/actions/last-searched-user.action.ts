'use server';

import { cookies } from 'next/headers';

const LAST_SEARCHED_USER_COOKIE = 'last-searched-user';

export async function setLastSearchedUser(username: string) {
    const cookieStore = await cookies();
    cookieStore.set(LAST_SEARCHED_USER_COOKIE, username, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
    });
}

export async function getLastSearchedUser(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(LAST_SEARCHED_USER_COOKIE)?.value || null;
}
