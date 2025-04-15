import { PatronMap } from "types/patreon.types";
import { fetcher } from "~src/utils/fetcher";

export const getAllPatrons = async (): Promise<PatronMap> => {
    const patreonApiUrl = process.env.NEXT_PUBLIC_PATREON_API_URL as string;

    return fetcher(patreonApiUrl);
};
