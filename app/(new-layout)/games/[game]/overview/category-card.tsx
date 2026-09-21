import type { CSSProperties } from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { buildBoardEntryHref, buildBoardHref } from '~src/lib/board-url';
import { formatRunDate } from '~src/lib/format-run-date';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import { formatCount } from '~src/utils/format-stats';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { CountryFlag } from '../leaderboard/country-flag';
import { relativeDate } from '../leaderboard/relative-date';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { RunnerIdentity } from '../leaderboard/runners';
import { CategoryIcon } from '../shared/category-icon';
import { formatRecord, recordShowsMillis } from '../shared/format-record';
import { SubmitLink } from '../submit-dialog/submit-link';
import { splitCardEntries } from './card-entries';
import type { OverviewCardData } from './data';
import styles from './overview.module.scss';

interface Props {
    gameSlug: string;
    card: OverviewCardData;
    /** Grid position — drives the entrance stagger without a CSS nth-child ceiling. */
    index: number;
}

// Ranks 2 and 3 carry the board's rank-accent signature (silver/bronze);
// rank 1's gold lives on the record numeral itself, not a numeral gutter.
const PODIUM_RANK_CLASS: Record<number, string> = {
    2: styles.rankSilver,
    3: styles.rankBronze,
};

/**
 * Who a record-wall row credits: the plain solo name (unchanged), or the
 * whole roster when the run was a team's — through `RunnerIdentity`, the one
 * renderer a runner is drawn by, so a roster here can't drift from the board
 * row it came from. Wraps rather than clipping: the plaque is a fixed-width
 * tile and a four-person team's names don't all fit one line.
 */
function RecordCredit({
    entry,
    avatarSize,
}: {
    entry: LeaderboardEntry;
    avatarSize: 'xs' | 'sm';
}) {
    const roster = entry.participants;
    if (!entry.anonymized && rendersAsRoster(roster, entry)) {
        return (
            <span className={styles.recordHolderRoster}>
                {roster.map((member, i) => (
                    <span
                        key={`${member.userId ?? 'g'}-${member.name}-${i}`}
                        className={styles.rosterMember}
                    >
                        <RunnerIdentity
                            name={member.name}
                            picture={member.picture}
                            country={member.country}
                            size={avatarSize}
                            link={member.userId != null}
                            hoverCard={member.userId != null}
                        />
                        {i < roster.length - 1 && (
                            <span className={styles.rosterSep} aria-hidden>
                                ·
                            </span>
                        )}
                    </span>
                ))}
            </span>
        );
    }

    return (
        <>
            {/* Same redaction contract as the board row: the entry arrives
                already masked, so the plaque drops the link and the flag and
                keeps the record. Keyed off the flag, never the name. */}
            <RunnerAvatar
                name={entry.runnerName}
                picture={entry.picture}
                size={avatarSize}
                anonymous={entry.anonymized}
            />
            <span className={styles.recordHolderName}>
                {entry.anonymized ? (
                    entry.runnerName
                ) : (
                    <UserLink username={entry.runnerName} to="leaderboards" />
                )}
            </span>
            {!entry.anonymized && <CountryFlag country={entry.country} />}
        </>
    );
}

export function CategoryCard({ gameSlug, card, index }: Props) {
    // The count is the board's own row count, not the category's attempt-sync
    // stats: a board whose runs were all imported has a full leaderboard and
    // no attempt data at all, and used to read "0 runners · 0 attempts" under
    // three visible runners. Attempts are gone from the card with it — they
    // describe timer uploads, which is not what this page is about.
    const { category, entries, boardRunners, sliceLabel } = card;
    const { wr, podium } = splitCardEntries(entries);
    const wrHref = wr ? buildBoardEntryHref(gameSlug, wr) : null;
    // Same rule as the board: a whole-second record (common on speedrun.com
    // imports) drops ".000".
    const wrTime = wr
        ? formatRecord(
              wr.time as number,
              recordShowsMillis(wr.time, category.showMilliseconds ?? true),
          )
        : '';
    const boardHref = buildBoardHref(gameSlug, {
        categorySlug: category.name,
        subcategoryKey: card.subcategoryKey,
    });

    return (
        <article
            className={styles.plaque}
            style={{ '--i': index } as CSSProperties}
        >
            <div className={styles.plaqueBody}>
                <div className={styles.plaqueLabel}>
                    <div className={styles.plaqueHead}>
                        <CategoryIcon imageUrl={category.imageUrl} size={36} />
                        <h3 className={styles.plaqueTitle}>
                            <Link href={boardHref} className="stretched-link">
                                {category.display}
                            </Link>
                        </h3>
                    </div>
                    {/* Full plate width, not tucked beside the emblem — the
                        spec line needs the run to stay on one line. */}
                    {(sliceLabel || boardRunners != null) && (
                        <span className={styles.plaqueStats}>
                            {sliceLabel && (
                                <span className={styles.plaqueSlice}>
                                    {sliceLabel}
                                </span>
                            )}
                            {sliceLabel && boardRunners != null && ' · '}
                            {boardRunners != null && (
                                <>
                                    {formatCount(boardRunners)} runner
                                    {boardRunners === 1 ? '' : 's'}
                                </>
                            )}
                        </span>
                    )}
                </div>
                {wr ? (
                    <div className={styles.record}>
                        <span className={styles.recordTime}>
                            {wrHref ? (
                                <Link href={wrHref} className={styles.runLink}>
                                    {wrTime}
                                </Link>
                            ) : (
                                wrTime
                            )}
                        </span>
                        <span className={styles.recordHolder}>
                            {/* Rank-1 gutter: gold numeral on the same axis
                                as the podium's silver/bronze gutter, so the
                                card reads 1-2-3 down one column. */}
                            <span
                                className={`${styles.podiumRank} ${styles.rankGoldNum}`}
                            >
                                1
                            </span>
                            <RecordCredit entry={wr} avatarSize="sm" />
                            {wr.runDate && (
                                <span
                                    className={styles.recordWhen}
                                    title={formatRunDate(wr.runDate)}
                                >
                                    {relativeDate(wr.runDate)}
                                </span>
                            )}
                        </span>
                    </div>
                ) : (
                    // Same anatomy as a held record — an em dash where the
                    // numeral goes — so an empty slot keeps the wall's rhythm
                    // instead of collapsing into a paragraph.
                    <div className={styles.record}>
                        <span className={styles.recordTimeEmpty}>—</span>
                        <span className={styles.plaqueEmpty}>
                            No runs yet ·{' '}
                            <SubmitLink
                                gameSlug={gameSlug}
                                categorySlug={category.name}
                                className={styles.plaqueEmptyLink}
                            >
                                submit the first run
                            </SubmitLink>
                        </span>
                    </div>
                )}
            </div>
            {podium.length > 0 && (
                <div className={styles.podium}>
                    {podium.map((p) => {
                        const href = buildBoardEntryHref(gameSlug, p);
                        return (
                            <div
                                key={`${p.rank}-${p.runnerName}`}
                                className={styles.podiumRow}
                            >
                                <span
                                    className={`${styles.podiumRank} ${
                                        PODIUM_RANK_CLASS[p.rank] ?? ''
                                    }`}
                                >
                                    {p.rank}
                                </span>
                                {rendersAsRoster(p.participants, p) ? (
                                    <>
                                        {/* Keeps the podium's avatar axis —
                                            a team row's own avatars live
                                            inside RecordCredit's roster list,
                                            not this fixed slot, but the slot
                                            still has to exist so every row's
                                            name starts at the same x. */}
                                        <span
                                            className={styles.podiumAvatar}
                                            aria-hidden
                                        />
                                        <RecordCredit
                                            entry={p}
                                            avatarSize="xs"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.podiumAvatar}>
                                            <RunnerAvatar
                                                name={p.runnerName}
                                                picture={p.picture}
                                                size="xs"
                                                anonymous={p.anonymized}
                                            />
                                        </span>
                                        <span className={styles.podiumName}>
                                            {p.anonymized ? (
                                                p.runnerName
                                            ) : (
                                                <UserLink
                                                    username={p.runnerName}
                                                    to="leaderboards"
                                                />
                                            )}
                                        </span>
                                    </>
                                )}
                                <span className={styles.podiumTime}>
                                    {href ? (
                                        <Link
                                            href={href}
                                            className={styles.runLink}
                                        >
                                            {formatRecord(
                                                p.time as number,
                                                false,
                                            )}
                                        </Link>
                                    ) : (
                                        formatRecord(p.time as number, false)
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </article>
    );
}
