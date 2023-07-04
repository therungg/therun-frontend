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

    const baseUrl = process.env.NEXT_PUBLIC_UPLOAD_URL;

    const url = `${baseUrl}?filename=${encodeURIComponent(
        file.name
    )}&sessionId=${sessionId}`;

    const presignedUrl = await fetch(url, {
        next: { revalidate: 60 },
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
