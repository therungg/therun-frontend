import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '~src/actions/base-url.action';
import { createSession } from '~src/actions/session.action';
import { sanitizeReturnTo } from '~src/components/twitch/twitch-oauth';

const MAX_AGE = 30 * 60 * 60 * 24;

export async function afterLoginRedirect(request: NextRequest) {
    const baseUrl = await getBaseUrl();
    const returnTo = sanitizeReturnTo(
        request.nextUrl.searchParams.get('state'),
    );
    const destination = `${baseUrl}${returnTo}`;

    const code = request.nextUrl.searchParams.get('code');

    // Secure only over HTTPS: a Secure cookie is silently dropped on plain
    // http://localhost, which would break local dev login.
    const secure = request.nextUrl.protocol === 'https:' ? ' Secure;' : '';

    const headers = new Headers();
    if (code) {
        const { id } = (await createSession(code)) || {};
        if (id) {
            headers.append(
                'Set-Cookie',
                `session_id=${id}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${MAX_AGE};`,
            );
        }
    }

    const response = NextResponse.redirect(destination, {
        status: 302,
        headers,
    });
    revalidatePath(returnTo.split('?')[0]);
    return response;
}
