import useSWR from "swr";
import { fetcher } from "../../pages";

export const usePatreons = () => {
    return useSWR("/api/patreons", fetcher);
};
