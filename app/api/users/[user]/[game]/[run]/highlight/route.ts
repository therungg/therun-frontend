import { NextRequest } from "next/server";
import { safeDecodeURI, safeEncodeURI } from "~src/utils/uri";
import { apiResponse } from "~app/api/response";

export async function PUT(
    request: NextRequest,
    {
        params,
    }: {
        params: { user: string; game: string; run: string };
    },
) {
    const { user } = params;
    const game = safeDecodeURI(params.game);
    const category = safeDecodeURI(params.run);

    const result = await highlight(user, game, category);

    return apiResponse({ body: result });
}

const highlight = async (user, game, category) => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${user}/${safeEncodeURI(game)}/${safeEncodeURI(
        category,
    )}/highlight`;
    const res = await fetch(url, {
        method: "PUT",
    });

    return res.json();
};
