export const handler = async (req: any, res: any) => {
    const data = req.url.replace("/api/users/", "");
    // eslint-disable-next-line prefer-const
    let [user, game, category] = data.split("/");

    game = decodeURIComponent(game);
    category = decodeURIComponent(category);

    if (req.method === "PUT") {
        const result = await highlight(user, game, category);
        res.status(200).json(result);
    }
};

const highlight = async (user, game, category) => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${user}/${encodeURIComponent(game)}/${encodeURIComponent(
        category
    )}/highlight`;
    const res = await fetch(url, {
        method: "PUT",
    });

    return res.json();
};

export default handler;
