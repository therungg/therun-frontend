"use server";

import { cacheLife } from "next/cache";
import { type UserData } from "./get-session-data";

export const getGlobalUser = async (user: string) => {
    'use cache';
    cacheLife('days');
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/users/global/${user}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result as UserData;
};
