import { getBaseUrl } from "../../../../src/actions/base-url.action";
import { revalidatePath } from "next/cache";
import { apiResponse } from "~app/(old-layout)/api/response";

export async function POST() {
    const baseUrl = await getBaseUrl();

    const response = apiResponse({
        body: null,
        headers: {
            "Set-Cookie":
                "session_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        },
    });

    revalidatePath(baseUrl);
    return response;
}
