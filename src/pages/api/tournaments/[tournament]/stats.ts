import { getTournamentStatsByName } from "../../../../components/tournament/getTournaments";

export const handler = async (req, res) => {
    const name = req.url.replace("/api/tournaments/", "").replace("/stats", "");

    const result = await getTournamentStatsByName(name);

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=1500");

    res.status(200).json(result);
};

export default handler;
