import { type Run } from "../common/types";

export const getPersonalBestRuns = async (): Promise<Run[]> => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/runs`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};
