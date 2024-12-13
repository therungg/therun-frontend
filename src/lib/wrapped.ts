import { Wrapped } from "~app/[username]/wrapped/wrapped-types";

export const getWrappedForUser = async (user: string): Promise<Wrapped> => {
    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/wrapped/${encodeURIComponent(user)}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result as Wrapped;
};
