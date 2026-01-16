import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '~src/actions/base-url.action';
import { createSession } from '~src/actions/session.action';

const MAX_AGE = 30 * 60 * 60 * 24;

export async function afterLoginRedirect(request: NextRequest, postfix = '') {
    const baseUrl = `${await getBaseUrl()}/${postfix}`;

    console.log('aaaaaaaaaaaaaaaa');

    const code = request.nextUrl.searchParams.get('code');
    if (code) {
        const { id } = (await createSession(code)) || {};
        const headers = new Headers();
        if (id) {
            headers.append(
                'Set-Cookie',
                `session_id=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE};`,
            );
        }
        const response = NextResponse.redirect(baseUrl, {
            status: 302,
            headers,
        });
        revalidatePath(baseUrl);
        return response;
    }
}
