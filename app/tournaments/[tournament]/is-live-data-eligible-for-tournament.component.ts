import { LiveRun } from "~app/live/live.types";
import { Tournament } from "~src/components/tournament/tournament-info";
import { equalsCaseInsensitive } from "~src/utils/string";
import { includesCaseInsensitive } from "~src/utils/array";

export const isLiveDataEligibleForTournament = (
    data: LiveRun,
    tournament: Tournament
): boolean => {
    if (!data || !data.game || !data.category || !data.user) return false;

    if (!equalsCaseInsensitive(data.game, tournament.game)) return false;
    if (!equalsCaseInsensitive(data.category, tournament.category))
        return false;

    if (
        tournament.ineligibleUsers &&
        tournament.ineligibleUsers?.length > 0 &&
        includesCaseInsensitive(tournament.ineligibleUsers, data.user)
    ) {
        return false;
    }

    if (tournament.eligibleUsers && tournament.eligibleUsers.length > 0) {
        return includesCaseInsensitive(tournament.eligibleUsers, data.user);
    }

    return true;
};

export const isLiveDataEligibleForTournaments = (
    data: LiveRun,
    tournaments: Tournament[]
): boolean => {
    return !!tournaments
        .map((tournament) => isLiveDataEligibleForTournament(tournament, data))
        .find((bool) => bool);
};
