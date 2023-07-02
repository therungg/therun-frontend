import { NextRequest, NextResponse } from "next/server";
import { createSession } from "~src/actions/session.action";
import { getBaseUrl } from "~src/actions/base-url.action";
import { revalidatePath } from "next/cache";

const MAX_AGE = 30 * 60 * 60 * 24;

export async function afterLoginRedirect(request: NextRequest, postfix = "") {
    const baseUrl = `${getBaseUrl()}/${postfix}`;

    const code = request.nextUrl.searchParams.get("code");
    if (code) {
        const { id } = (await createSession(code)) || {};
        const response = NextResponse.redirect(baseUrl, {
            status: 302,
            headers: {
                "Set-Cookie": `session_id=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE};`,
            },
        });
        revalidatePath(baseUrl);
        return response;
    }
}
