import { LiveRun } from "~app/live/live.types";
import { Tournament } from "~src/components/tournament/tournament-info";

export const isLiveDataEligibleForTournament = (
    data: LiveRun,
    tournament: Tournament
): boolean => {
    let eligible = true;

    if (
        !data ||
        !data.game ||
        !data.category ||
        data.game.toLowerCase().trim() !==
            tournament.game?.toLowerCase().trim() ||
        data.category.toLowerCase().trim() !==
            tournament.category?.toLowerCase().trim()
    ) {
        eligible = false;
    }

    if (data.user) {
        const isUserIneligible = tournament.ineligibleUsers?.includes(
            data.user.toLowerCase()
        );
        const isUserEligible = tournament.eligibleUsers?.includes(
            data.user.toLowerCase()
        );

        if (isUserIneligible) {
            eligible = false;
        } else if (
            tournament.eligibleUsers &&
            tournament.eligibleUsers.length > 0 &&
            !isUserEligible
        ) {
            eligible = false;
        }
    }

    return eligible;
};
