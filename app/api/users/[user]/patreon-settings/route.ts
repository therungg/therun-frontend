import { NextRequest } from "next/server";
import { apiResponse } from "~app/api/response";
import savePatreonSettings from "~src/lib/save-patreon-settings";

export async function POST(
    request: NextRequest,
    props: {
        params: Promise<{ user: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;
    const userData = await savePatreonSettings(user, await request.json());

    return apiResponse({
        body: userData,
    });
}
