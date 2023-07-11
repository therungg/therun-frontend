import { apiResponse } from "~app/api/response";
import { fetcher } from "~src/utils/fetcher";

export async function GET() {
    const patreonApiUrl = process.env.NEXT_PUBLIC_PATREON_API_URL as string;

    const result = await fetcher(patreonApiUrl);

    return apiResponse({
        body: result,
        cache: {
            maxAge: 600,
            swr: 12000,
        },
    });
}
