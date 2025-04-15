import { apiResponse } from "../response";
import { getAllPatrons } from "./get-all-patrons.action";

export const revalidate = 600;

export async function GET() {
    const result = await getAllPatrons();
    return apiResponse({
        body: result,
        cache: {
            maxAge: revalidate,
            swr: 12000,
        },
    });
}
