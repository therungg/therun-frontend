import { encodeURI } from "~src/utils/uri";

export const config = {
    api: {
        bodyParser: { sizeLimit: "50mb" },
    },
};

export const handler = async (req, res) => {
    const urlBase = process.env.NEXT_PUBLIC_UPLOAD_URL;
    const url = `${urlBase}?filename=${encodeURI(
        req.headers.filename
    )}&sessionId=${req.headers.sessionid}`;

    const presignedUrl = await fetch(url, {
        method: "GET",
    });

    const result = await presignedUrl.json();

    const postUrl = result.url;

    await fetch(postUrl, {
        method: "PUT",
        body: req.body,
    });

    res.status(200).json({ ok: "ok" });
};

export default handler;
