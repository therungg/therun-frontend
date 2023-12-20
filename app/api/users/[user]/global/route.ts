import { NextRequest } from "next/server";
import getGlobalUser from "~src/lib/get-global-user";
import { apiResponse } from "~app/api/response";

export const revalidate = 60;

export async function GET(
    _request: NextRequest,
    {
        params,
    }: {
        params: { user: string };
    },
) {
    const { user } = params;
    const userData = await getGlobalUser(user);

    return apiResponse({
        body: userData,
        cache: {
            maxAge: revalidate,
            swr: 15000,
        },
    });
}
