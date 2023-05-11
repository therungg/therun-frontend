import { getTournaments } from "../../components/tournament/getTournaments";

export const handler = async (req, res) => {
    if (req.method !== "GET" || !req.query.q) res.status(500);

    const result = await getTournaments();

    res.setHeader(
        "Cache-Control",
        "s-maxage=300, stale-while-revalidate=12000"
    );

    res.status(200).json(result);
};

export default handler;
