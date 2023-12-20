import { NextRequest } from "next/server";
import { apiResponse } from "~app/api/response";
import { getSession } from "~src/actions/session.action";
import { canCreateRace } from "~src/lib/races";
import { getApiKey } from "~src/actions/api-key.action";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function POST(request: NextRequest) {
    const session = await getSession();
    const apiKey = getApiKey();

    if (!session.id) {
        return apiResponse({
            body: "You must be logged in to create a race",
            status: 400,
        });
    }

    if (!(await canCreateRace(session.id))) {
        return apiResponse({
            body: "You cannot create a race right now",
            status: 401,
        });
    }

    const url = `${racesApiUrl}`;

    const body = await request.text();

    const postResult = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.id}`,
            "x-api-key": apiKey,
        },
        body,
    });

    if (postResult.status !== 200) {
        return apiResponse({
            body: await postResult.json(),
            status: postResult.status,
        });
    }

    return apiResponse({ body: await postResult.json() });
}