"use server";
import { type Run } from "../common/types";

export const getUserRuns = async (
    username: string,
    game?: string,
): Promise<Run[]> => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/users/${username}${
        game ? `/${game}` : ""
    }`;

    const res = await fetch(url, {
        cache: "force-cache",
        next: {
            revalidate: 600,
            tags: [`/users/${username}`],
        },
    });
    const json = await res.json();

    return json.result;
};
