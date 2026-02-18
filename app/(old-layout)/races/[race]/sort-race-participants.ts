import { substitutePercentageWithLiveData } from '~app/(old-layout)/races/[race]/set-race-participant-percentages';
import {
    Race,
    RaceParticipantWithLiveData,
} from '~app/(old-layout)/races/races.types';

const compareBySplitProgress = (
    a: RaceParticipantWithLiveData,
    b: RaceParticipantWithLiveData,
): number => {
    const aLive = a.liveData!;
    const bLive = b.liveData!;

    if (aLive.currentSplitIndex !== bLive.currentSplitIndex) {
        return bLive.currentSplitIndex - aLive.currentSplitIndex;
    }

    return aLive.currentTime - bLive.currentTime;
};

export const sortRaceParticipants = (
    race: Race,
): RaceParticipantWithLiveData[] => {
    const participants = race.participants?.map((participant) =>
        substitutePercentageWithLiveData(participant),
    ) as RaceParticipantWithLiveData[];

    if (!participants) return [];

    return participants.sort((a, b) => {
        // Finished runners first, by final time ascending
        if (a.finalTime || b.finalTime) {
            if (!a.finalTime) return 1;
            if (!b.finalTime) return -1;
            return a.finalTime - b.finalTime;
        }

        // Abandoned runners last, by abandonment time
        if (a.status === 'abandoned' || b.status === 'abandoned') {
            if (a.status !== 'abandoned') return -1;
            if (b.status !== 'abandoned') return 1;
            return (
                new Date(b.abandondedAtDate as string).getTime() -
                new Date(a.abandondedAtDate as string).getTime()
            );
        }

        // Active runners — compare by estimated finish time and split progress
        const aLive = a.liveData;
        const bLive = b.liveData;

        if (!aLive && !bLive) {
            return (
                new Date(a.joinedAtDate as string).getTime() -
                new Date(b.joinedAtDate as string).getTime()
            );
        }
        if (!aLive) return 1;
        if (!bLive) return -1;

        // Filter out runners who started before the race
        if (race.startTime) {
            if (
                aLive.startedAt <
                new Date(race.startTime).getTime() - 1000 * 60
            ) {
                return 1;
            }
            if (
                bLive.startedAt <
                new Date(race.startTime).getTime() - 1000 * 60
            ) {
                return -1;
            }
        }

        // Category 602 special case
        if (race.category.includes('602')) {
            if (aLive.totalSplits < 400 && bLive.totalSplits < 400) {
                return a.user < b.user ? -1 : 1;
            }
            if (aLive.totalSplits < 400) {
                return 1;
            }
            if (bLive.totalSplits < 400) {
                return -1;
            }
        }

        const aEst = aLive.estimatedFinishTime;
        const bEst = bLive.estimatedFinishTime;

        // Both have estimates — lower wins
        if (aEst && bEst) {
            return aEst - bEst;
        }

        // One has estimate, one doesn't
        if (aEst || bEst) {
            if (aLive.totalSplits === bLive.totalSplits) {
                return compareBySplitProgress(a, b);
            }
            if (!aEst) return 1;
            return -1;
        }

        // Neither has estimate
        if (aLive.totalSplits === bLive.totalSplits) {
            return compareBySplitProgress(a, b);
        }

        // Not comparable — join order
        return (
            new Date(a.joinedAtDate as string).getTime() -
            new Date(b.joinedAtDate as string).getTime()
        );
    });
};
