import { NextRequest } from "next/server";
import { getUserRuns } from "~src/lib/get-user-runs";
import { apiResponse } from "~app/(old-layout)/api/response";
import { editUser } from "~src/lib/edit-user";

export const revalidate = 60;

export async function GET(
    _: NextRequest,
    props: {
        params: Promise<{ user: string }>;
    },
) {
    const params = await props.params;
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
    props: {
        params: Promise<{ user: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;
    const data = await request.text();
    const result = await editUser(user, data);

    return apiResponse({
        body: result,
        headers: { "Cache-Control": "no-cache" },
    });
}
