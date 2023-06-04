import { encodeURI } from "~src/utils/uri";

export const handler = async (req: any, res: any) => {
    const data = req.url.replace("/api/users/", "");
    const [user, game, category] = data.split("/");
    // Encoding like this to make sure that the decodeURIComponent doesn't throw
    const encodedGame = encodeURI(game);
    const encodedCategory = encodeURI(category);
    const decodedGame = decodeURIComponent(encodedGame);
    const decodedCategory = decodeURIComponent(encodedCategory);

    if (req.method === "PUT") {
        const result = await highlight(user, decodedGame, decodedCategory);
        res.status(200).json(result);
    }
};

const highlight = async (user, game, category) => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/users/${user}/${encodeURI(
        game
    )}/${encodeURI(category)}/highlight`;
    const res = await fetch(url, {
        method: "PUT",
    });

    return res.json();
};

export default handler;
