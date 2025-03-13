"use server";

import { UserSummary, UserSummaryType } from "~src/types/summary.types";

export const getUserSummary = async (
    user: string,
    type: UserSummaryType = "week",
    offset: number = 0,
): Promise<UserSummary | undefined> => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/summary/${user}/${type}?offset=${offset}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result as UserSummary | undefined;
};
