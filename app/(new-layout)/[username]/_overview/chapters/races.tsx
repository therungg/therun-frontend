import type {
    Race,
    RaceParticipant,
} from '~app/(new-layout)/races/races.types';
import {
    getDetailedUserStats,
    getRaceParticipationsByUser,
    getRacesByIds,
} from '~src/lib/races';
import type { RunnerProfileHead } from '../../../../../types/runner-profile.types';
import ui from '../../(sections)/profile-ui.module.scss';
import racesStyles from '../../(sections)/races/races.module.scss';
import { RaceColHead, RaceRow } from '../../(sections)/races/user-race-profile';
import { StatStrip } from '../../(sections)/stat-strip';
import {
    racesLead,
    racesStrip,
    racesStripData,
} from '../../(sections)/strips/races';
import { resolveStrip } from '../../(sections)/strips/resolve';
import { Chapter, ChapterError } from '../chapter';

const SHOWN = 3;

/** The Races tab's strip and the runner's last three races. */
export async function RacesChapter({ head }: { head: RunnerProfileHead }) {
    const name = head.runner.name;
    let detailed: Awaited<ReturnType<typeof getDetailedUserStats>> | undefined;
    let recent: RaceParticipant[] = [];
    let races: Race[] | undefined;
    try {
        let participations: RaceParticipant[] | undefined;
        [detailed, participations] = await Promise.all([
            getDetailedUserStats(name),
            getRaceParticipationsByUser(name),
        ]);
        // Participations come newest first.
        recent = (participations ?? []).slice(0, SHOWN);
        races = recent.length
            ? await getRacesByIds(recent.map((p) => p.raceId))
            : [];
    } catch {
        return <ChapterError id="races" name={name} />;
    }
    // No stats body yet for runners whose race stats aren't computed.
    const global = detailed?.globalStats;
    if (!global || recent.length === 0) return null;

    const strip = resolveStrip(
        racesStrip,
        racesStripData(global),
        head.strips?.races,
    );
    const byId = new Map((races ?? []).map((r) => [r.raceId, r]));

    return (
        <Chapter id="races" name={name}>
            <StatStrip
                label="Races"
                lead={racesLead(detailed?.categoryStats ?? [])}
                tiles={strip.tiles}
            />
            <div className={ui.block}>
                <div className={`${ui.panel} ${racesStyles.recent}`}>
                    <RaceColHead />
                    {recent.map((p) => {
                        const race = byId.get(p.raceId);
                        return race ? (
                            <RaceRow
                                key={p.raceId}
                                race={race}
                                username={name}
                                participation={p}
                            />
                        ) : null;
                    })}
                </div>
            </div>
        </Chapter>
    );
}
