import { getTournamentByName } from "../../../components/tournament/getTournaments";

export const handler = async (req, res) => {
    const name = req.url.replace("/api/tournaments/", "");

    const result = await getTournamentByName(name);

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=1500");

    res.status(200).json(result);
};

export default handler;
