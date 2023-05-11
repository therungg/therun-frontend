import useSWR from "swr";
import { fetcher } from "../../pages";

export const usePatreons = () => {
    const { data } = useSWR("/api/patreons", fetcher);

    return data;
};
