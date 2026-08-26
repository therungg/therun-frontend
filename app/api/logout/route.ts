import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';

export async function POST(request: NextRequest) {
    // Nothing to revalidate: the rendered shell never reads the session cookie
    // (see SessionProvider), so clearing the cookie is the whole logout.
    // Match the login cookie's Secure attribute (HTTPS only) so the delete
    // reliably clears the cookie set at login.
    const secure = request.nextUrl.protocol === 'https:' ? ' Secure;' : '';
    return apiResponse({
        body: null,
        headers: {
            'Set-Cookie': `session_id=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`,
        },
    });
}
