import { encodeURI } from "~src/utils/uri";
import { Run } from "../common/types";

export const getRun = async (
    username: string,
    game: string,
    run: string
): Promise<Run> => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${username}/${encodeURI(game)}/${encodeURI(run)}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};

export const getRunByCustomUrl = async (
    username: string,
    customUrl: string
): Promise<Run> => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/users/${username}/${encodeURI(customUrl)}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};
