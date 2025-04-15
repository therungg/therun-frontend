import { NextRequest } from "next/server";
import { safeDecodeURI, safeEncodeURI } from "~src/utils/uri";
import { apiResponse } from "~app/(old-layout)/api/response";
import { revalidateTag } from "next/cache";

export async function PUT(
    _request: NextRequest,
    props: {
        params: Promise<{ user: string; game: string; run: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;
    const game = safeDecodeURI(params.game);
    const category = safeDecodeURI(params.run);

    const result = await highlight(user, game, category);

    return apiResponse({ body: result });
}

const highlight = async (user: string, game: string, category: string) => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${user}/${safeEncodeURI(game)}/${safeEncodeURI(
        category,
    )}/highlight`;
    const res = await fetch(url, {
        method: "PUT",
    });

    const username = user.split("-")[1];

    revalidateTag(`/users/${username}`);

    return res.json();
};
