'use client';

import { PlayBtn, TrophyFill } from 'react-bootstrap-icons';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatCount } from '~src/utils/format-stats';
import type {
    LeaderboardEntry,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';
import { CountryFlag } from '../leaderboard/country-flag';
import { relativeDate } from '../leaderboard/relative-date';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { timingColumns, timingValue } from '../leaderboard/timing-columns';
import type { GamePageData } from '../types';
import styles from './category-band-header.module.scss';

interface Props {
    data: GamePageData;
}

/**
 * The board's own header: the selected category named as the subject, its
 * stats beside it, and its record holder in gold mono — the masthead
 * vocabulary's "category as the headline with its record in gold mono beside
 * it." A contained surface that sits directly above the leaderboard, under
 * the game/selector topbar. No wash, no gradient, no filled card — presence
 * from scale, type, spacing and containment (see .interface-design/system.md
 * signature #4).
 */
export function CategoryBandHeader({ data }: Props) {
    const category = data.selectedCategory;

    // A level board's category.display is the full "<Level> — <Template>".
    // When the level holds a single category, that template half is redundant
    // — the level name alone identifies the board — so the header shows just
    // the level name. (`data.activeLevel` is the level group of the selected
    // board, null off levels; its boards are the categories with its groupId.)
    const activeLevel = data.activeLevel;
    const isSingleCategoryLevel =
        activeLevel != null &&
        data.categories.filter((c) => c.groupId === activeLevel.id).length ===
            1;
    const title = isSingleCategoryLevel ? activeLevel.name : category.display;

    // The record holder: the rank-1 entry. `.find` rather than entries[0] so a
    // page ≥ 2 or a filter excluding #1 shows no record instead of crowning
    // the wrong runner.
    const wr = data.leaderboard.entries.find((e) => e.rank === 1) ?? null;

    // "Runners" — board population for this category (matches the active
    // chip's count), with the category-stat fallback when the probe was
    // skipped.
    const runnersCount =
        data.categoryBoardCounts[category.name] ??
        category.uniqueRunners ??
        null;

    const attempts = category.totalAttemptCount ?? 0;
    const finished = category.totalFinishedAttemptCount ?? 0;
    const pbs = category.totalPbs ?? 0;
    const finishRate =
        attempts > 0 ? Math.round((finished / attempts) * 100) : null;

    // One quiet facts line, omit-if-zero — not a row of stat tiles.
    const facts = [
        runnersCount != null && runnersCount > 0
            ? `${formatCount(runnersCount)} runners`
            : null,
        attempts > 0 ? `${formatCount(attempts)} attempts` : null,
        finishRate != null ? `${finishRate}% finish` : null,
        pbs > 0 ? `${formatCount(pbs)} PBs` : null,
    ].filter((f): f is string => f != null);

    return (
        <div className={styles.band}>
            <div className={styles.subject}>
                <h2 className={styles.title}>{title}</h2>
                {facts.length > 0 && (
                    <p className={styles.facts}>{facts.join(' · ')}</p>
                )}
            </div>

            {wr && <Record category={category} wr={wr} />}
        </div>
    );
}

function Record({
    category,
    wr,
}: {
    category: ResolvedCategory;
    wr: LeaderboardEntry;
}) {
    const isAnonymous = wr.anonymized === true;
    const showMilliseconds = category.showMilliseconds ?? true;

    // The ranked time — derived identically to the row's leading time cell
    // (timing-columns.ts + the rtaFallback rule) so the record and the #1 row
    // can never disagree.
    const { primary } = timingColumns(
        category.primaryTiming,
        category.gameTimeLabel,
    );
    const isRtaFallback =
        category.rtaFallback === true &&
        category.primaryTiming === 'gt' &&
        wr.gameTime == null &&
        wr.realTime != null;
    const rankedTime = isRtaFallback
        ? wr.realTime
        : timingValue(wr, primary.key);

    return (
        <div className={styles.record}>
            <span className={styles.recordLabel}>
                <TrophyFill size={11} aria-hidden />
                Record
            </span>
            <div className={styles.recordHolder}>
                <RunnerAvatar
                    name={wr.runnerName}
                    picture={wr.picture}
                    size="sm"
                    anonymous={isAnonymous}
                />
                <span className={styles.recordName}>
                    {isAnonymous ? (
                        wr.runnerName
                    ) : (
                        <>
                            <UserLink
                                username={wr.runnerName}
                                url={undefined}
                                hoverCard={!wr.isGuest}
                                cardContext={{
                                    rank: 1,
                                    timeMs: rankedTime ?? undefined,
                                    picture: wr.picture,
                                    country: wr.country,
                                }}
                            />
                            <CountryFlag country={wr.country} />
                        </>
                    )}
                </span>
                {!isAnonymous && wr.vodUrl && (
                    <a
                        href={wr.vodUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.recordVod}
                        aria-label="Watch VOD"
                        title={
                            wr.runDate
                                ? `Watch VOD · ${relativeDate(wr.runDate)}`
                                : 'Watch VOD'
                        }
                    >
                        <PlayBtn size={12} aria-hidden />
                    </a>
                )}
            </div>
            {rankedTime != null && (
                <span className={styles.recordTime}>
                    <DurationToFormatted
                        duration={rankedTime}
                        withMillis={showMilliseconds}
                    />
                </span>
            )}
        </div>
    );
}
