'use client';

import { useMemo, useState } from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { buildBoardEntryHref, buildBoardHref } from '~src/lib/board-url';
import { formatCount } from '~src/utils/format-stats';
import { CountryFlag } from '../leaderboard/country-flag';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { formatRecord, recordShowsMillis } from '../shared/format-record';
import type { LevelRow, LevelSection } from './data';
import styles from './levels.module.scss';

interface Props {
    gameSlug: string;
    sections: LevelSection[];
    /** The record fan-out's ceiling — names what the page did, not a policy. */
    probeCap: number;
}

/** A game past this many levels gets a filter box; below it the list is the list. */
const FILTER_THRESHOLD = 25;

/** Rows drawn before the list asks to be opened the rest of the way. */
const VISIBLE_CAP = 100;

/** A level with no entries is a board nobody has run — same test the record
 * fan-out uses, so an unprobed row and an empty row are never confused. */
function isEmpty(row: LevelRow): boolean {
    return (row.entries ?? 0) === 0;
}

export function LevelsView({ gameSlug, sections, probeCap }: Props) {
    const total = sections.reduce((n, s) => n + s.rows.length, 0);
    const emptyCount = sections.reduce(
        (n, s) => n + s.rows.filter(isEmpty).length,
        0,
    );
    // Hiding the empty ones is a way to cut a long list down to what has been
    // run. On a game where nothing has been run there is nothing to cut down
    // to, and hiding them would leave the page with no levels on it at all —
    // which is the one thing this page exists to show.
    const nothingRun = emptyCount === total;

    const [query, setQuery] = useState('');
    const [showEmpty, setShowEmpty] = useState(nothingRun);
    const [showAll, setShowAll] = useState(false);

    const q = query.trim().toLowerCase();
    const matched = useMemo(
        () =>
            sections
                .map((s) => ({
                    ...s,
                    rows: s.rows.filter((r) => {
                        // A search reaches the whole list: someone typing
                        // "42" wants level 42 whether or not it has runs.
                        if (q) return r.display.toLowerCase().includes(q);
                        return showEmpty || !isEmpty(r);
                    }),
                }))
                .filter((s) => s.rows.length > 0),
        [sections, q, showEmpty],
    );

    // A 650-level game is 650 rows of nothing until someone runs them, and a
    // page that long is not a list anyone reads — it is a scroll. The first
    // hundred are the page; the filter above is how you reach level 412.
    const matchedCount = matched.reduce((n, s) => n + s.rows.length, 0);
    const capped = matchedCount > VISIBLE_CAP && !showAll;
    const shown = useMemo(() => {
        if (!capped) return matched;
        let left = VISIBLE_CAP;
        const out: typeof matched = [];
        for (const s of matched) {
            if (left <= 0) break;
            const rows = s.rows.slice(0, left);
            out.push({ ...s, rows });
            left -= rows.length;
        }
        return out;
    }, [matched, capped]);

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.eyebrow}>Levels</span>
                <span className={styles.headNote}>
                    {total.toLocaleString()} {total === 1 ? 'level' : 'levels'}
                    {emptyCount > 0 &&
                        !nothingRun &&
                        ` · ${(total - emptyCount).toLocaleString()} with runs`}
                </span>
            </div>

            {total > FILTER_THRESHOLD && (
                <input
                    type="search"
                    className={styles.filter}
                    placeholder="Find a level…"
                    aria-label="Find a level"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            )}

            {shown.length === 0 ? (
                <p className={styles.note}>
                    {q
                        ? `No level matches “${query.trim()}”.`
                        : 'No levels on this game.'}
                </p>
            ) : (
                shown.map((section) => (
                    <div key={section.id} className={styles.section}>
                        {/* A game has one level group today, so its name would
                            head the whole list and say nothing. The heading
                            appears only once a game splits its levels up. */}
                        {sections.length > 1 && (
                            <h2 className={styles.sectionName}>
                                {section.name}
                            </h2>
                        )}
                        <div className={styles.table}>
                            <div
                                className={`${styles.row} ${styles.headRow}`}
                                aria-hidden
                            >
                                <span>Level</span>
                                <span className={styles.num}>Runners</span>
                                <span>Record</span>
                                <span>Held by</span>
                            </div>
                            {section.rows.map((row) => (
                                <LevelTableRow
                                    key={row.id}
                                    gameSlug={gameSlug}
                                    row={row}
                                />
                            ))}
                        </div>
                    </div>
                ))
            )}

            {capped && (
                <button
                    type="button"
                    className={styles.moreButton}
                    onClick={() => setShowAll(true)}
                >
                    Show all {matchedCount.toLocaleString()} levels
                </button>
            )}

            {/* The tail is a fact about the game, not a control to hunt for:
                it says how many empty levels there are and opens them. */}
            {!q && emptyCount > 0 && emptyCount < total && (
                <button
                    type="button"
                    className={styles.moreButton}
                    onClick={() => setShowEmpty((v) => !v)}
                >
                    {showEmpty
                        ? `Hide ${emptyCount.toLocaleString()} levels with no runs`
                        : `Show ${emptyCount.toLocaleString()} levels with no runs`}
                </button>
            )}

            {total - emptyCount > probeCap && (
                <p className={styles.note}>
                    Records shown for the first {probeCap} levels.
                </p>
            )}
        </section>
    );
}

function LevelTableRow({ gameSlug, row }: { gameSlug: string; row: LevelRow }) {
    const boardHref = buildBoardHref(gameSlug, { categorySlug: row.name });
    const wr = row.record;
    const runHref = wr ? buildBoardEntryHref(gameSlug, wr) : null;
    const time = wr
        ? formatRecord(
              wr.time as number,
              recordShowsMillis(wr.time, row.showMilliseconds),
          )
        : null;

    return (
        <div className={styles.row}>
            <span className={styles.name}>
                <Link href={boardHref}>{row.display}</Link>
            </span>
            <span className={styles.num}>
                {row.entries == null ? (
                    <span className={styles.empty}>—</span>
                ) : (
                    formatCount(row.entries)
                )}
            </span>
            <span className={styles.time}>
                {time ? (
                    runHref ? (
                        <Link href={runHref}>{time}</Link>
                    ) : (
                        time
                    )
                ) : (
                    <span className={styles.empty}>—</span>
                )}
            </span>
            <span className={styles.holder}>
                {wr ? (
                    <>
                        {/* Same redaction contract as the board row: the entry
                            arrives already masked, so the row drops the link
                            and the flag. Keyed off the flag, never the name. */}
                        <RunnerAvatar
                            name={wr.runnerName}
                            picture={wr.picture}
                            size="xs"
                            anonymous={wr.anonymized}
                        />
                        <span className={styles.holderName}>
                            {wr.anonymized ? (
                                wr.runnerName
                            ) : (
                                <UserLink
                                    username={wr.runnerName}
                                    to="leaderboards"
                                />
                            )}
                        </span>
                        {!wr.anonymized && <CountryFlag country={wr.country} />}
                    </>
                ) : (
                    <span className={styles.empty}>—</span>
                )}
            </span>
        </div>
    );
}
