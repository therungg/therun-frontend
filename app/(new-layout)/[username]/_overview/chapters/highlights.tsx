import type { LeaderboardsProfileGame } from '../../../../../types/leaderboards-profile.types';
import type {
    ResolvedPin,
    RunnerProfileHead,
} from '../../../../../types/runner-profile.types';
import pinStyles from '../../../leaderboards/[name]/leaderboards-profile.module.scss';
import { PinCard } from '../../../leaderboards/[name]/pinned-runs';
import type { Pinned } from '../../../leaderboards/[name]/showcase-rules';
import { Chapter } from '../chapter';
import styles from '../overview.module.scss';
import { TimerPbCard } from './timer-pb-card';

type BoardPin = Extract<ResolvedPin, { type: 'board' }>;

/** PinCard wants a full game; a pin only carries identity and art. */
const asPinned = (pin: BoardPin): Pinned => ({
    entry: pin.entry,
    game: {
        ...pin.game,
        theme: null,
        bestRank: null,
        lastRanAt: null,
        attempts: null,
        playtimeMs: null,
        entries: [],
        archived: [],
    } satisfies LeaderboardsProfileGame,
});

/**
 * The runner's pins as the backend resolved them; every pin with a video
 * plays it.
 *
 * Board links are drawn for everyone: `canSeeBoards` has returned true
 * unconditionally since the boards launched, so resolving it per request only
 * ever produced a constant — and cost this chapter a cookie read, which is
 * what made it dynamic.
 */
const BOARDS_VISIBLE = true;

export function HighlightsChapter({ head }: { head: RunnerProfileHead }) {
    const name = head.runner.name;
    // Level runs stay on the Leaderboards tab; the overview is full game only.
    const pins = head.pins.filter(
        (p) => p.type !== 'board' || p.entry.level === null,
    );
    if (pins.length === 0) return null;

    const boardsVisible = BOARDS_VISIBLE;

    return (
        <Chapter id="highlights" name={name}>
            <div className={styles.highlights}>
                <div className={pinStyles.pins}>
                    {pins.map((pin) =>
                        pin.type === 'board' ? (
                            <PinCard
                                key={`${pin.ref.kind}-${pin.ref.id}`}
                                pin={asPinned(pin)}
                                boardsVisible={boardsVisible}
                            />
                        ) : (
                            <TimerPbCard
                                key={`timerPb-${pin.ref.runId}`}
                                timer={pin.timer}
                                username={name}
                            />
                        ),
                    )}
                </div>
            </div>
        </Chapter>
    );
}
