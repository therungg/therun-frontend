import useSWR from "swr";
import { fetcher } from "../../utils/fetcher";
import { PatronList } from "../../../types/patreon.types";

export const usePatreons = () => {
    return useSWR<PatronList>("/api/patreons", fetcher);
};
