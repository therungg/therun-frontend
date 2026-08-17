'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { PlayBtn, XLg } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { CountryFlag } from './country-flag';
import type { DisplayRank } from './display-rank';
import styles from './leaderboard.module.scss';
import { QuickUnverifyButton } from './quick-unverify-button';
import { QuickVerifyButton } from './quick-verify-button';
import { relativeDate } from './relative-date';
import { RunnerAvatar } from './runner-avatar';
import { type BoardSelectionKey, entrySelectionKey } from './selection';
import {
    type TimingKey,
    timingColumnHidden,
    timingColumns,
} from './timing-columns';

// Find-me scrolls to and focuses this id. At most one row ever carries it
// (the current session user's own entry), so a fixed id is safe.
export const YOU_ROW_ID = 'leaderboard-you-row';

interface Props {
    entry: LeaderboardEntry;
    /** Table-derived rank label (handles ties — see display-rank.ts). */
    displayRank: DisplayRank;
    isCurrentUser: boolean;
    canManage: boolean;
    gameSlug: string;
    hideRealTime: boolean;
    hideGameTime: boolean;
    primaryTiming: TimingKey;
    /** Variables opted into a board column; `display` maps stored (normalized)
     * values to their bucket's canonical label, `altKey` is the display name
     * normalized (rawVariables may use either key). */
    valueColumns: {
        key: string;
        altKey: string;
        label: string;
        display: Record<string, string>;
    }[];
    /** category.showMilliseconds ?? true — precision the board is configured for. */
    showMilliseconds: boolean;
    /** category.rtaFallback — an entry with no game time on a GT board is
     * ranked by its real time; the ranked cell shows it with an RTA marker. */
    rtaFallback?: boolean;
    /** Checkbox column — only rendered when `canManage`, for rows with a
     * run or a manual set time (see selection.ts for the key scheme). */
    selected?: boolean;
    /** Shift-click extends a range — the click handler forwards the native event's shiftKey. */
    onToggleSelect?: (key: BoardSelectionKey, shiftKey: boolean) => void;
    /** Opens the run inspector drawer on this entry; `verb` pre-expands
     * that form in it (the row's Remove/`x` path). */
    onModerate?: (entry: LeaderboardEntry, verb?: 'remove') => void;
    /** Board page refetch for row-level mutations (quick Verify + its undo). */
    onBoardRefresh?: () => void;
    /** Curation-only additions; absent on the public board. See `RowSlots`. */
    slots?: RowSlots;
}

/**
 * Optional per-row content the moderator curation view adds and the public
 * board does not have.
 *
 * These exist so curation can render THIS row rather than a copy of it. The
 * copy drifted — different column order, different milliseconds default,
 * ranks that hid ties — so anything curation needs on top is injected here
 * instead of duplicating the row to add it.
 */
export interface RowSlots {
    /** Beside the runner name: the mark-for-later pin, the "moved here" tag. */
    runnerBadges?: (entry: LeaderboardEntry) => ReactNode;
    /** In the ranked time cell: the below-minimum tag. */
    timeBadges?: (entry: LeaderboardEntry) => ReactNode;
    /** Trailing cell, before the public controls: Remove… / Run…. */
    actions?: (entry: LeaderboardEntry) => ReactNode;
    /** Extra class on the `<tr>` — curation greys a pending-removal row. */
    rowClassName?: (entry: LeaderboardEntry) => string;
}

export function LeaderboardRow({
    entry,
    displayRank,
    isCurrentUser,
    canManage,
    gameSlug,
    hideRealTime,
    hideGameTime,
    primaryTiming,
    valueColumns,
    showMilliseconds,
    rtaFallback = false,
    selected = false,
    onToggleSelect,
    onModerate,
    onBoardRefresh,
    slots,
}: Props) {
    // Anonymized rows arrive already redacted from the backend: placeholder
    // name, `userId`/`picture`/`country` nulled, `isGuest: false`. Always key
    // the treatment off this flag, never off the name string.
    const isAnonymous = entry.anonymized === true;
    // Hover shortcuts: with the pointer on a row, `v`/`x`/`m` fire that row's
    // Verify / Remove / Moderate — same keys the inspector drawer binds to the
    // same verbs, so one vocabulary covers both surfaces. `v` and `x` go
    // through the buttons' DOM nodes rather than duplicated handlers, which
    // also inherits their render conditions: no button, no shortcut.
    const [hovered, setHovered] = useState(false);
    // Verify and Unverify are mutually exclusive (pending vs verified), so
    // they share the ref — `v` clicks whichever the row shows.
    const verifyRef = useRef<HTMLButtonElement>(null);
    const removeRef = useRef<HTMLButtonElement>(null);
    const selectionKey = entrySelectionKey(entry);
    // One-click Verify for the queue-clearing common case; every other mod
    // verb goes through the inspector drawer (the row's Moderate button).
    const showQuickVerify =
        canManage &&
        entry.runId != null &&
        entry.source !== 'manual' &&
        entry.verificationStatus === 'pending' &&
        onBoardRefresh != null;
    // Verify's mirror on already-verified rows: unset the verification
    // (back to pending) without removing the run.
    const showQuickUnverify =
        canManage &&
        entry.runId != null &&
        entry.source !== 'manual' &&
        entry.verificationStatus === 'verified' &&
        onBoardRefresh != null;
    // Unlike Verify, Remove applies at any verification status — a verified
    // run is exactly the kind that turns out to be wrong later — and to set
    // times as well as runs. The form already maps remove onto the
    // manual-time delete endpoint, so the row is just a shorter way in.
    const showQuickRemove =
        canManage &&
        (entry.runId != null || entry.manualTimeId != null) &&
        onBoardRefresh != null;
    // Bound only while this row is hovered by a moderator, so at most one
    // row's listener is live. Inert while any dialog or the inspector drawer
    // is open (they own the keyboard — the drawer binds these same keys
    // itself) and while focus sits in a text field.
    const shortcutsActive = hovered && canManage;
    useEffect(() => {
        if (!shortcutsActive) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (
                t &&
                (t.tagName === 'INPUT' ||
                    t.tagName === 'TEXTAREA' ||
                    t.tagName === 'SELECT' ||
                    t.isContentEditable)
            ) {
                return;
            }
            // An OPEN dialog owns the keyboard. Must be the aria-modal="true"
            // pair, not bare role="dialog": the topbar's MobileMenu keeps a
            // closed dialog mounted (aria-modal="false"), which the bare
            // selector matched on every page — deadening these shortcuts.
            if (
                document.querySelector('[role="dialog"][aria-modal="true"]') !=
                null
            ) {
                return;
            }
            if (e.key === 'v' && verifyRef.current != null) {
                e.preventDefault();
                verifyRef.current.click();
            } else if (e.key === 'x' && removeRef.current != null) {
                e.preventDefault();
                removeRef.current.click();
            } else if (e.key === 'm' && onModerate != null) {
                e.preventDefault();
                onModerate(entry);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [shortcutsActive, onModerate, entry]);

    const detailHref =
        entry.source === 'manual' && entry.manualTimeId != null
            ? `/games-v2/${encodeURIComponent(gameSlug)}/manual/${entry.manualTimeId}`
            : entry.runId != null
              ? `/games-v2/${encodeURIComponent(gameSlug)}/run/${entry.runId}`
              : null;

    const podiumClass =
        entry.rank === 1
            ? styles.rank1Row
            : entry.rank === 2
              ? styles.rank2Row
              : entry.rank === 3
                ? styles.rank3Row
                : '';
    const rankClass =
        entry.rank === 1
            ? styles.rank1
            : entry.rank === 2
              ? styles.rank2
              : entry.rank === 3
                ? styles.rank3
                : '';

    // The primary time cell's anchor is a real stretched link (Bootstrap's
    // `.stretched-link`, ::after inset:0 against the row's `position:
    // relative` — see `.row` in leaderboard.module.scss) — the whole row is
    // a genuine <a>, not a synthetic click handler, so status-bar preview,
    // cmd/ctrl-click, middle-click and long-press all work natively. Other
    // interactive cells (runner link, VOD link, kebab/manage) sit above it
    // via z-index — see leaderboard.module.scss.
    //
    // For a moderator the row is a button instead: clicking a row while
    // moderating means "look at this run", and the inspector is where every
    // verb lives, so routing to the read-only detail page put a navigation
    // between the mod and the thing they opened the row to do. The detail
    // page stays reachable from inside the inspector. This is the one case
    // where the row is deliberately NOT a link — a mod loses cmd-click to a
    // new tab and gains the drawer, which is the trade they want.
    const opensInspector = canManage && onModerate != null;
    const time = (
        value: number | null,
        dimmed: boolean,
        stretched: boolean,
        rtaTag = false,
        /** The ranking column — the only one curation's badges belong in. */
        ranked = false,
    ) => (
        <td className={dimmed ? styles.timeSecondary : styles.time}>
            {value != null ? (
                <>
                    {opensInspector ? (
                        <button
                            type="button"
                            className={`${styles.inspectButton} ${
                                stretched ? 'stretched-link' : ''
                            }`}
                            onClick={() => onModerate?.(entry)}
                            title={`Open the moderator view for ${entry.runnerName}'s run`}
                        >
                            <DurationToFormatted
                                duration={value}
                                withMillis={showMilliseconds}
                            />
                        </button>
                    ) : detailHref ? (
                        <Link
                            href={detailHref}
                            className={stretched ? 'stretched-link' : undefined}
                        >
                            <DurationToFormatted
                                duration={value}
                                withMillis={showMilliseconds}
                            />
                        </Link>
                    ) : (
                        <DurationToFormatted
                            duration={value}
                            withMillis={showMilliseconds}
                        />
                    )}
                    {rtaTag && (
                        <span
                            className={styles.rtaTag}
                            title="No game time — ranked by real time"
                        >
                            RTA
                        </span>
                    )}
                </>
            ) : (
                '—'
            )}
            {ranked && slots?.timeBadges?.(entry)}
        </td>
    );

    // Same primary-first order as the header (leaderboard-table.tsx), so
    // cells always line up under the column that claims them.
    const { primary, secondary } = timingColumns(primaryTiming);
    // RTA fallback: a GT-board entry with no game time is ranked by its real
    // time — surface that time in the ranked column (tagged), instead of a
    // dash above slower-but-ranked-lower rows.
    const isRtaFallbackEntry =
        rtaFallback &&
        primaryTiming === 'gt' &&
        entry.gameTime == null &&
        entry.realTime != null;
    const timingValue = (key: TimingKey) =>
        key === 'rt' ? entry.realTime : entry.gameTime;
    const timingHidden = (key: TimingKey) =>
        timingColumnHidden(key, { hideRealTime, hideGameTime });
    // The stretch normally lands on the primary (ranked) time cell; if a
    // category's configured to hide that column, fall back to the
    // secondary one so the row link never silently disappears.
    const primaryVisible = !timingHidden(primary.key);
    const secondaryVisible = !timingHidden(secondary.key);

    return (
        <tr
            id={isCurrentUser ? YOU_ROW_ID : undefined}
            // -1: focusable programmatically (Find me scrolls here and
            // focuses it) without joining the natural tab order.
            tabIndex={isCurrentUser ? -1 : undefined}
            className={`${styles.row} ${podiumClass} ${isCurrentUser ? styles.youRow : ''} ${selected ? styles.rowSelected : ''} ${isAnonymous ? styles.anonRow : ''} ${slots?.rowClassName?.(entry) ?? ''}`}
            onMouseEnter={canManage ? () => setHovered(true) : undefined}
            onMouseLeave={canManage ? () => setHovered(false) : undefined}
        >
            {canManage && (
                <td className={styles.checkCell}>
                    {selectionKey != null && (
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={selected}
                            aria-label={`Select ${entry.runnerName}'s run`}
                            onClick={(e) => {
                                // No preventDefault: it would revert the
                                // native toggle after React committed
                                // `checked`, desyncing the DOM so the
                                // checkmark appears one click late on the
                                // previous row clicked. The native toggle
                                // always matches what toggleSelect decides
                                // for the clicked row (shift-ranges included),
                                // so letting it through keeps DOM and state
                                // in agreement.
                                onToggleSelect?.(selectionKey, e.shiftKey);
                            }}
                            onChange={() => {
                                /* handled in onClick above */
                            }}
                        />
                    )}
                </td>
            )}
            <td className={`${styles.rank} ${rankClass}`}>
                {displayRank.tied && (
                    <>
                        <span className="visually-hidden">Tied for rank </span>
                        <span className={styles.tieMark} aria-hidden="true">
                            =
                        </span>
                    </>
                )}
                {/* Podium ranks get a solid medal badge — a fixed left anchor
                    that reads at a glance, where a tinted numeral didn't. */}
                {entry.rank <= 3 ? (
                    <span className={`${styles.medal} ${rankClass}`}>
                        {displayRank.label.replace(/^=/, '')}
                    </span>
                ) : (
                    displayRank.label.replace(/^=/, '')
                )}
            </td>
            <td className={styles.runner}>
                <span className={styles.runnerCell}>
                    <RunnerAvatar
                        name={entry.runnerName}
                        picture={entry.picture}
                        size={entry.rank <= 3 ? 'md' : 'sm'}
                        anonymous={isAnonymous}
                    />
                    {isAnonymous ? (
                        // No profile link, no flag: the row keeps its rank,
                        // its time and its history, and gives up every route
                        // back to a person. The name is a name — muted, but
                        // not greyed to unreadable and not italicised.
                        <span className={styles.anonName}>
                            {entry.runnerName}
                        </span>
                    ) : (
                        <>
                            <UserLink
                                username={entry.runnerName}
                                url={undefined}
                                // The row already holds everything the hover
                                // card's identity line needs, so it paints
                                // before the card's own fetch resolves.
                                cardContext={{
                                    rank: entry.rank,
                                    timeMs:
                                        timingValue(primary.key) ?? undefined,
                                    picture: entry.picture,
                                    country: entry.country,
                                }}
                            />
                            <CountryFlag country={entry.country} />
                        </>
                    )}
                    {/* No rank-1 chip: the gold spine and gold rank numeral
                        already mark the row, and any label here overclaims —
                        we only know the board's best submitted time. */}
                    {slots?.runnerBadges?.(entry)}
                </span>
            </td>
            {primaryVisible &&
                time(
                    isRtaFallbackEntry
                        ? entry.realTime
                        : timingValue(primary.key),
                    false,
                    true,
                    isRtaFallbackEntry,
                    true,
                )}
            {secondaryVisible &&
                time(
                    // The fallback entry's real time already occupies the
                    // ranked cell — repeating it under "Real time" would read
                    // as two distinct clocks agreeing by coincidence.
                    isRtaFallbackEntry ? null : timingValue(secondary.key),
                    true,
                    !primaryVisible,
                )}
            {valueColumns.map((col) => {
                const value = entry.variables?.[col.key];
                // Only show a value the runner actually submitted. A defaulted
                // subcategory appears in `variables` but not in `rawVariables`
                // (which holds the pre-default submission, keyed by either the
                // variable's key or its display name) — those cells stay
                // blank rather than claiming the runner said the default.
                const raw = entry.rawVariables;
                const runnerSetIt =
                    raw != null &&
                    (raw[col.key] !== undefined ||
                        raw[col.altKey] !== undefined);
                return (
                    <td key={col.key} className={styles.value}>
                        {value != null && runnerSetIt
                            ? // Stored values are normalized; show the
                              // bucket's canonical label when we know it.
                              (col.display[value.trim().toLowerCase()] ?? value)
                            : '—'}
                    </td>
                );
            })}
            <td
                className={`${styles.meta} ${styles.when}`}
                title={entry.runDate ? formatRunDate(entry.runDate) : undefined}
            >
                {entry.runDate ? relativeDate(entry.runDate) : '—'}
            </td>
            <td className={styles.trailing}>
                {slots?.actions?.(entry)}
                {entry.vodUrl && (
                    <a
                        href={entry.vodUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.iconLink}
                        aria-label="Watch VOD"
                        title="Watch VOD"
                    >
                        <PlayBtn size={16} />
                    </a>
                )}
                {/* The runner's own way into the same drawer, in its reduced
                    owner form. A moderator never sees this — they get
                    Moderate below, whose surface is a superset, even on their
                    own run.

                    Outside `.reveal` on purpose: that cluster is hidden until
                    the row is hovered, which is right for a moderator sweeping
                    a board full of rows and wrong for the one control a runner
                    has on the one row that is theirs.

                    `runId == null` is a pure manual set time — the owner path
                    for those is the manual-times endpoints, not this drawer.

                    `isCurrentUser` alone is NOT an ownership test: it is a
                    case-insensitive name match (see is-same-runner.ts), and a
                    guest submission carries a self-reported name that can be
                    anyone's. An anonymized row is excluded for the mirror
                    reason — its placeholder is a name a real runner may
                    legitimately have (see LeaderboardEntry.anonymized). Hence
                    the account checks: a run with no `userId`, a guest run,
                    or a redacted row never offers this, whoever is looking.
                    `openModerate` re-checks the same set.

                    Note what this cannot do: once a runner hides their
                    identity their row arrives redacted and this button
                    disappears. Un-hiding therefore lives in the pager's
                    header, not here (see leaderboard-pager.tsx). */}
                {!canManage &&
                    isCurrentUser &&
                    entry.runId != null &&
                    entry.userId != null &&
                    !entry.isGuest &&
                    entry.anonymized !== true &&
                    onModerate && (
                        <button
                            type="button"
                            className={styles.ownManageBtn}
                            onClick={() => onModerate(entry)}
                            title="Manage your entry"
                        >
                            Manage
                        </button>
                    )}
                <span className={styles.reveal}>
                    {showQuickVerify && (
                        <QuickVerifyButton
                            ref={verifyRef}
                            gameSlug={gameSlug}
                            runId={entry.runId as number}
                            runnerName={entry.runnerName}
                            onMutated={onBoardRefresh as () => void}
                        />
                    )}
                    {showQuickUnverify && (
                        <QuickUnverifyButton
                            ref={verifyRef}
                            gameSlug={gameSlug}
                            runId={entry.runId as number}
                            runnerName={entry.runnerName}
                            onMutated={onBoardRefresh as () => void}
                        />
                    )}
                    {/* The other half of the same judgement, in the same
                        cluster and the same pill — Verify green, Remove
                        red. Opens the inspector drawer with the remove form
                        already expanded, rather than a standalone dialog:
                        the board stays visible behind the judgement (the
                        cutoff and custom-time questions are answered by
                        looking at it). */}
                    {showQuickRemove && onModerate && (
                        <button
                            ref={removeRef}
                            type="button"
                            className={styles.quickRemove}
                            aria-label={`Remove ${entry.runnerName}'s ${entry.manualTimeId != null ? 'set time' : 'run'}`}
                            title={`Remove ${entry.runnerName}'s ${entry.manualTimeId != null ? 'set time' : 'run'} (x)`}
                            onClick={() => onModerate(entry, 'remove')}
                        >
                            <XLg size={14} aria-hidden />
                            Remove
                            <kbd className={styles.shortcutKey}>x</kbd>
                        </button>
                    )}
                    {canManage && onModerate && (
                        <button
                            type="button"
                            className={styles.moderateBtn}
                            onClick={() => onModerate(entry)}
                            title={`Moderate ${entry.runnerName}'s entry (m)`}
                        >
                            Moderate
                            <kbd className={styles.shortcutKey}>m</kbd>
                        </button>
                    )}
                    {/* The per-row kebab is gone. Everything it held — run
                        history, Report run, Correct this time, Hide/Restore my
                        run, Appeal rejection — lives on the run page
                        (run-view/run-actions.tsx), which this row's time
                        already links to. A second surface for the same verbs
                        cost every row a control that opened a menu to say
                        "go to the run page". */}
                </span>
            </td>
        </tr>
    );
}
