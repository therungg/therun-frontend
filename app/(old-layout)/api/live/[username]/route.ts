import { NextRequest } from "next/server";
import { getLiveRunForUser } from "~src/lib/live-runs";
import { apiResponse } from "~app/(old-layout)/api/response";

export const revalidate = 0;

export async function GET(
    _request: NextRequest,
    props: { params: Promise<{ username: string }> },
) {
    const params = await props.params;
    const result = await getLiveRunForUser(params.username);

    return apiResponse({ body: result });
}
