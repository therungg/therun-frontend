import { NextRequest } from "next/server";
import { apiResponse } from "~app/api/response";
import savePatreonSettings from "~src/lib/save-patreon-settings";

export async function POST(
    request: NextRequest,
    {
        params,
    }: {
        params: { user: string };
    }
) {
    const { user } = params;
    const userData = await savePatreonSettings(user, await request.json());

    return apiResponse({
        body: userData,
    });
}
