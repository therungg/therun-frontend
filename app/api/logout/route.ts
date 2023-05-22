import { NextResponse } from "next/server";
import { getBaseUrl } from "../../../src/actions/base-url.action";
import { revalidatePath } from "next/cache";

export async function POST() {
    const baseUrl = getBaseUrl();
    const response = new NextResponse(null, {
        status: 200,
        headers: {
            "Set-Cookie":
                "session_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        },
    });
    revalidatePath(baseUrl);
    return response;
}
