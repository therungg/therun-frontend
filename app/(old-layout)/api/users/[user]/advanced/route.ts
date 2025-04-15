import { NextRequest } from "next/server";
import { apiResponse } from "~app/(old-layout)/api/response";
import { getAdvancedUserStats } from "~src/lib/get-advanced-user-stats";

export const revalidate = 60;

export async function GET(
    _request: NextRequest,
    props: {
        params: Promise<{ user: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;
    const userData = await getAdvancedUserStats(user, "0");

    return apiResponse({
        body: userData,
        cache: {
            maxAge: revalidate,
            swr: 15000,
        },
    });
}
