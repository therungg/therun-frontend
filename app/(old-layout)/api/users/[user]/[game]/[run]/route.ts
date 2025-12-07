import { NextRequest } from "next/server";
import { apiResponse } from "~app/(old-layout)/api/response";
import { safeDecodeURI, safeEncodeURI } from "~src/utils/uri";
import { getRun } from "~src/lib/get-run";
import { revalidateTag } from "next/cache";

export const revalidate = 60;

export async function PUT(
    request: NextRequest,
    props: {
        params: Promise<{ user: string; game: string; run: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;
    const game = safeDecodeURI(params.game);
    const category = safeDecodeURI(params.run);

    const body = await request.json();

    if (body.description) {
        if (body.description.length > 250) {
            return apiResponse({
                body: { result: "Description too long" },
                status: 400,
            });
        }
    } else {
        body.description = "";
    }

    if (body.vod) {
        if (body.vod.length > 100) {
            return apiResponse({
                body: { result: "Vod too long" },
                status: 400,
            });
        }

        if (!body.vod.includes("youtu") && !body.vod.includes("twitch")) {
            return apiResponse({
                body: { result: "Youtube or Twitch url please" },
                status: 400,
            });
        }
    } else {
        body.vod = "";
    }

    const runData = await edit(user, game, category, JSON.stringify(body));

    return apiResponse({ body: runData });
}

export async function GET(
    _request: NextRequest,
    props: {
        params: Promise<{ user: string; game: string; run: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;
    const game = safeDecodeURI(params.game);
    const category = safeDecodeURI(params.run);

    const gameData = await getRun(user, game, category);

    return apiResponse({
        body: { meta: gameData },
        cache: { maxAge: revalidate, swr: revalidate },
    });
}

export async function DELETE(
    _request: NextRequest,
    props: {
        params: Promise<{ user: string; game: string; run: string }>;
    },
) {
    const params = await props.params;
    const { user } = params;
    const game = safeDecodeURI(params.game);
    const category = safeDecodeURI(params.run);

    const result = await remove(user, game, category);

    const username = user.split("-")[1];

    revalidateTag(`/users/${username}`);

    return apiResponse({ body: result });
}

const remove = async (user: string, game: string, category: string) => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${user}/${safeEncodeURI(game)}/${safeEncodeURI(category)}`;

    const res = await fetch(url, {
        method: "DELETE",
    });

    return res.json();
};

const edit = async (
    user: string,
    game: string,
    category: string,
    body: string,
) => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${user}/${safeEncodeURI(game)}/${safeEncodeURI(category)}`;
    const res = await fetch(url, {
        method: "PUT",
        body,
    });

    return res.json();
};
