import getConfig from "next/config";

export const upload = async (
    file: File,
    contents: string,
    sessionId: string
) => {
    if (file.size > 50 * 1000 * 1000) {
        return {
            error: "File must be smaller than 50MB",
        };
    }

    const { publicRuntimeConfig } = getConfig();

    const baseUrl = publicRuntimeConfig.urls.upload;

    const url = `${baseUrl}?filename=${encodeURIComponent(
        file.name
    )}&sessionId=${sessionId}`;

    const presignedUrl = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Disposition": "attachment",
        },
    });

    const result = await presignedUrl.json();

    const postUrl = result.url;

    return await fetch(postUrl, {
        method: "PUT",
        body: contents,
        headers: {
            "Content-Disposition": "attachment",
        },
    });
};
