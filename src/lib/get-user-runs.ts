import { Run } from "../common/types";

export const getUserRuns = async (
    username: string,
    game?: string
): Promise<Run[]> => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/users/${username}${
        game ? `/${game}` : ""
    }`;

    const res = await fetch(url, { next: { revalidate: 0 } });
    const json = await res.json();

    return json.result;
};
