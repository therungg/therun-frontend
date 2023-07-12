import { NextRequest } from "next/server";
import { apiResponse } from "~app/api/response";
import advancedUserStats from "~src/lib/advanced-user-stats";

export const revalidate = 60;

export async function GET(
    _request: NextRequest,
    {
        params,
    }: {
        params: { user: string };
    }
) {
    const { user } = params;
    const userData = await advancedUserStats(user, "0");

    return apiResponse({
        body: userData,
        cache: {
            maxAge: revalidate,
            swr: 15000,
        },
    });
}
