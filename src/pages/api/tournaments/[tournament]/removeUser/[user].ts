import { banUserFromTournament } from "../../../../../components/tournament/getTournaments";

export const handler = async (req, res) => {
    const name = req.url.replace("/api/tournaments/", "");

    const [tournamentName, , user] = name.split("/");

    const result = await banUserFromTournament(tournamentName, user);

    res.status(200).json(result);
};

export default handler;
