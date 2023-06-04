import { NextRequest, NextResponse } from "next/server";
import getUploadKey from "../../../../../src/lib/get-upload-key";

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

    return NextResponse.json(userData, {
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    });
}
