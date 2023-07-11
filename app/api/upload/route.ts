import { safeEncodeURI } from "~src/utils/uri";
import { NextRequest } from "next/server";
import { apiResponse } from "~app/api/response";

export const config = {
    api: {
        bodyParser: { sizeLimit: "50mb" },
    },
};

export async function POST(request: NextRequest) {
    const urlBase = process.env.NEXT_PUBLIC_UPLOAD_URL;
    const url = `${urlBase}?filename=${safeEncodeURI(
        request.headers.get("filename") as string
    )}&sessionId=${request.headers.get("sessionid")}`;

    const presignedUrl = await fetch(url, {
        method: "GET",
    });

    const result = await presignedUrl.json();

    const postUrl = result.url;

    await fetch(postUrl, {
        method: "PUT",
        body: request.body,
    });

    return apiResponse({ body: { ok: "ok" } });
}
