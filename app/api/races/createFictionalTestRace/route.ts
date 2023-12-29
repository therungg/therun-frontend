import { getSession } from "~src/actions/session.action";
import { getApiKey } from "~src/actions/api-key.action";
import { apiResponse } from "~app/api/response";
import { confirmPermission } from "~src/rbac/confirm-permission";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function POST() {
    const session = await getSession();
    const apiKey = getApiKey();

    if (!session.id) {
        return apiResponse({
            body: "You must be logged in to create a race",
            status: 400,
        });
    }

    try {
        confirmPermission(session, "create", "race");
    } catch (e) {
        return apiResponse({
            body: "You cannot create a race right now",
            status: 401,
        });
    }

    const url = `${racesApiUrl}/testRace`;

    const postResult = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.id}`,
            "x-api-key": apiKey,
        },
    });

    if (postResult.status !== 200) {
        return apiResponse({
            body: await postResult.json(),
            status: postResult.status,
        });
    }

    return apiResponse({ body: await postResult.json() });
}
