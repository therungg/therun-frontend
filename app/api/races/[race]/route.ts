import { NextRequest } from "next/server";
import { apiResponse } from "~app/api/response";
import { getSession } from "~src/actions/session.action";
import { getApiKey } from "~src/actions/api-key.action";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function DELETE(
    request: NextRequest,
    { params }: { params: { race: string } },
) {
    const session = await getSession();
    const apiKey = getApiKey();

    if (!session.id) {
        return apiResponse({
            body: "You must be logged in to delete a race",
            status: 400,
        });
    }

    const url = `${racesApiUrl}/${params.race}`;

    const postResult = await fetch(url, {
        method: "DELETE",
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
