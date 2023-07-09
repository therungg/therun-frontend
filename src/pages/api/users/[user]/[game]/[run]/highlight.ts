import { safeEncodeURI } from "~src/utils/uri";

export const handler = async (req: any, res: any) => {
    const data = req.url.replace("/api/users/", "");
    const [user, game, category] = data.split("/");
    // Encoding like this to make sure that the decodeURIComponent doesn't throw
    const encodedGame = safeEncodeURI(game);
    const encodedCategory = safeEncodeURI(category);
    const decodedGame = decodeURIComponent(encodedGame);
    const decodedCategory = decodeURIComponent(encodedCategory);

    if (req.method === "PUT") {
        const result = await highlight(user, decodedGame, decodedCategory);
        res.status(200).json(result);
    }
};

const highlight = async (user, game, category) => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${user}/${safeEncodeURI(game)}/${safeEncodeURI(
        category
    )}/highlight`;
    const res = await fetch(url, {
        method: "PUT",
    });

    return res.json();
};

export default handler;
