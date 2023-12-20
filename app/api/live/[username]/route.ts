import { NextRequest } from "next/server";
import { getLiveRunForUser } from "~src/lib/live-runs";
import { apiResponse } from "~app/api/response";

export const revalidate = 0;

export async function GET(
    request: NextRequest,
    { params }: { params: { username: string } },
) {
    const result = await getLiveRunForUser(params.username);

    return apiResponse({ body: result });
}
