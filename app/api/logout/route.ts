import { apiResponse } from '~app/api/response';

export async function POST() {
    // Nothing to revalidate: the rendered shell never reads the session cookie
    // (see SessionProvider), so clearing the cookie is the whole logout.
    return apiResponse({
        body: null,
        headers: {
            'Set-Cookie':
                'session_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
        },
    });
}
