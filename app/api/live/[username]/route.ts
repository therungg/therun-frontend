import { NextRequest } from "next/server";
import { getLiveRunForUser } from "~src/lib/client/live-runs";
import { apiResponse } from "~app/api/response";

export const revalidate = 0;

export async function GET(
    _request: NextRequest,
    props: { params: Promise<{ username: string }> },
) {
    const params = await props.params;
    const result = await getLiveRunForUser(params.username);

    return apiResponse({ body: result });
}
