import { getTournaments } from "~src/components/tournament/getTournaments";
import { apiResponse } from "~app/(old-layout)/api/response";

export const revalidate = 300;

export async function GET() {
    const result = await getTournaments();

    return apiResponse({
        body: result,
        cache: { maxAge: revalidate, swr: 12000 },
    });
}
