import { NextRequest } from "next/server";
import { apiResponse } from "~app/api/response";
import { getSession } from "~src/actions/session.action";

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function POST(
    request: NextRequest,
    { params }: { params: { race: string } }
) {
    const session = await getSession();

    if (!session.id) {
        return apiResponse({
            body: "You must be logged in to ready up",
            status: 400,
        });
    }

    const url = `${racesApiUrl}/${params.race}/participants/ready`;

    return fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${session.id}`,
        },
    });
}
