import { NextRequest } from "next/server";
import getUploadKey from "../../../../../src/lib/get-upload-key";
import { apiResponse } from "~app/api/response";

export const revalidate = 0;

export async function GET(
    _request: NextRequest,
    {
        params,
    }: {
        params: { user: string };
    }
) {
    const { user } = params;
    const userData = await getUploadKey(user);

    return apiResponse({
        body: userData,
    });
}
