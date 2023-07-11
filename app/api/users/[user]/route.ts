import { NextRequest } from "next/server";
import { getUserRuns } from "~src/lib/get-user-runs";
import { apiResponse } from "~app/api/response";
import { editUser } from "~src/lib/edit-user";

export const revalidate = 60;

export async function GET(
    _: NextRequest,
    {
        params,
    }: {
        params: { user: string };
    }
) {
    const { user } = params;

    const result = await getUserRuns(user);

    return apiResponse({
        body: result,
        cache: {
            maxAge: revalidate,
            swr: 1500,
        },
    });
}

export async function PUT(
    request: NextRequest,
    {
        params,
    }: {
        params: { user: string };
    }
) {
    const { user } = params;
    const result = await editUser(user, await request.text());

    return apiResponse({
        body: result,
        headers: { "Cache-Control": "no-cache" },
    });
}
