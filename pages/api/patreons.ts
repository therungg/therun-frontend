import { fetcher } from "../index";

export const handler = async (req, res) => {
    if (req.method !== "GET") res.status(500);

    const patreonApiUrl = process.env.NEXT_PUBLIC_PATREON_API_URL;

    const result = await fetcher(patreonApiUrl);

    res.setHeader(
        "Cache-Control",
        "s-maxage=600, stale-while-revalidate=12000"
    );
    res.status(200).json(result);
};

export default handler;
