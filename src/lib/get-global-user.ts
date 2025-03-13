"use server";
import { type UserData } from "./get-session-data";

export const getGlobalUser = async (user: string) => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/users/global/${user}`;

    const res = await fetch(url, {
        cache: "force-cache",
        next: {
            revalidate: 3600,
        },
    });
    const json = await res.json();

    return json.result as UserData;
};
