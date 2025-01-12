"use client";
import useSWR from "swr";
import { fetcher } from "../../utils/fetcher";
import { PatronMap } from "../../../types/patreon.types";

export const usePatreons = () => {
    return useSWR<PatronMap>("/api/patreons", fetcher);
};
