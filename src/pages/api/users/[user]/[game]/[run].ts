import { safeEncodeURI } from "~src/utils/uri";
import { getRun } from "../../../../../lib/get-run";

export const handler = async (req: any, res: any) => {
    const data = req.url.replace("/api/users/", "");
    // eslint-disable-next-line prefer-const
    let [user, game, category] = data.split("/");

    game = decodeURIComponent(game);
    category = decodeURIComponent(category);

    if (req.method === "DELETE") {
        const result = await remove(user, game, category);
        res.status(200).json({ result });
    } else if (req.method === "PUT") {
        const body = JSON.parse(req.body);
        if (body.description) {
            if (body.description.length > 250)
                res.status(400).json({ result: "Description too long" });
        } else {
            body.description = "";
        }

        if (body.vod) {
            if (body.vod.length > 100)
                res.status(400).json({ result: "Vod too long" });

            if (!body.vod.includes("youtu") && !body.vod.includes("twitch")) {
                res.status(400).json({
                    result: "Twitch or youtube url please",
                });
                return;
            }
        } else {
            body.vod = "";
        }

        const runData = await edit(user, game, category, JSON.stringify(body));
        res.status(200).json(runData);
    } else {
        const gameData = await getRun(user, game, category);
        res.status(200).json({ meta: gameData });
    }
};

const remove = async (user: string, game: string, category: string) => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${user}/${safeEncodeURI(game)}/${safeEncodeURI(category)}`;

    const res = await fetch(url, {
        method: "DELETE",
    });

    return res.json();
};

const edit = async (user, game, category, body) => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${user}/${safeEncodeURI(game)}/${safeEncodeURI(category)}`;
    const res = await fetch(url, {
        method: "PUT",
        body,
    });

    return res.json();
};

export default handler;
