import { LiveRun } from '~app/(old-layout)/live/live.types';
import { Tournament } from '~src/components/tournament/tournament-info';
import { includesCaseInsensitive } from '~src/utils/array';
import { equalsCaseInsensitive } from '~src/utils/string';

export const isLiveDataEligibleForTournament = (
    data: LiveRun,
    tournament: Tournament,
): boolean => {
    if (!data || !data.user) return false;

    if (
        !tournament.eligibleRuns.find((run) => {
            return (
                equalsCaseInsensitive(run.game, data.game) &&
                equalsCaseInsensitive(run.category, data.category)
            );
        })
    ) {
        return false;
    }

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
    tournaments: Tournament[],
): boolean => {
    return tournaments
        .map((tournament) => isLiveDataEligibleForTournament(data, tournament))
        .includes(true);
};
