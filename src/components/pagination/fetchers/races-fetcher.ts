import { Race, RaceParticipant } from "~app/races/races.types";
import {
    PaginatedData,
    PaginationFetcher,
} from "~src/components/pagination/pagination.types";
import { getRacesByIds } from "~src/lib/races";

export const racesFetcher: PaginationFetcher<Race> = async (
    page: number,
    pageSize: number,
    query?: string,
    initialData?: Race[],
    params?: RaceParticipant[],
): Promise<PaginatedData<Race>> => {
    const newRaceIds = params?.slice(
        (page - 1) * pageSize,
        page * pageSize,
    ) as RaceParticipant[];

    const newRaces = await getRacesByIds(newRaceIds.map((id) => id.raceId));

    return {
        items: newRaces,
        page,
        pageSize,
        totalItems: params?.length as number,
        totalPages: Math.ceil((params?.length as number) / pageSize),
    };
};
