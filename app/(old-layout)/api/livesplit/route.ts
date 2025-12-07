import { NextRequest } from "next/server";
import { apiResponse } from "~app/(old-layout)/api/response";

export async function POST(request: NextRequest) {
    const setCurrentRunApi = process.env.NEXT_PUBLIC_SET_LIVE_RUN_API_URL || "";

    const response = await fetch(setCurrentRunApi, {
        method: "post",
        body: await request.text(),
    });

    if (response.status < 300) {
        return apiResponse({ body: { response: "ok" } });
    }

    const json = await response.json();

    return apiResponse({ body: json, status: response.status });
}
