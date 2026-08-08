'use client';

import { useEffect, useRef, useState } from 'react';
import { PlayBtn } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type { LeaderboardEntry } from '../../../../../types/leaderboards.types';
import { usePopoverFocus } from '../shared/use-popover-focus';
import { CountryFlag } from './country-flag';
import type { DisplayRank } from './display-rank';
import styles from './leaderboard.module.scss';
import { QuickVerifyButton } from './quick-verify-button';
import { relativeDate } from './relative-date';
import { RowActionsMenu } from './row-actions-menu';
import { RunnerAvatar } from './runner-avatar';
import { type BoardSelectionKey, entrySelectionKey } from './selection';
import {
    type TimingKey,
    timingColumnHidden,
    timingColumns,
} from './timing-columns';

/**
 * "Set time" pill that opens a small info popover on click/tap
 * instead of relying on a hover-only `title` tooltip (inaccessible to touch
 * and keyboard-only users). The panel is `position: fixed`, positioned from
 * the trigger's bounding rect on open, and closes on scroll/resize rather
 * than tracking — see the `.infoPopoverPanel` comment in
 * leaderboard.module.scss for why (escaping the table wrapper's
 * `overflow-y: hidden`).
 */
function InfoPill({
    label,
    explanation,
}: {
    label: string;
    explanation: string;
}) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(
        null,
    );
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const close = () => setOpen(false);

    usePopoverFocus({ open, onClose: close, panelRef });

    useEffect(() => {
        if (!open) return;
        const rect = btnRef.current?.getBoundingClientRect();
        if (rect) {
            setCoords({ top: rect.bottom + 6, left: rect.left });
        }
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (
                !btnRef.current?.contains(e.target as Node) &&
                !panelRef.current?.contains(e.target as Node)
            ) {
                close();
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    return (
        <span className={styles.infoPopoverWrap}>
            <button
                ref={btnRef}
                type="button"
                className={styles.setPill}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                {label}
            </button>
            {open && coords && (
                <div
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={label}
                    className={styles.infoPopoverPanel}
                    style={{
                        position: 'fixed',
                        top: coords.top,
                        left: coords.left,
                    }}
                >
                    {explanation}
                </div>
            )}
        </span>
    );
}

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
    sessionUsername: string | null;
    /** category.showMilliseconds ?? true — precision the board is configured for. */
    showMilliseconds: boolean;
    /** Active category slug — this row's own category (a board is single-category). */
    categorySlug: string;
    /** Subcategory-role variable names, for building this row's own subcategory key from `entry.variables`. */
    subcategoryDefKeys: string[];
    /** category.rtaFallback — an entry with no game time on a GT board is
     * ranked by its real time; the ranked cell shows it with an RTA marker. */
    rtaFallback?: boolean;
    /** Checkbox column — only rendered when `canManage`, for rows with a
     * run or a manual set time (see selection.ts for the key scheme). */
    selected?: boolean;
    /** Shift-click extends a range — the click handler forwards the native event's shiftKey. */
    onToggleSelect?: (key: BoardSelectionKey, shiftKey: boolean) => void;
    /** Kebab's "Moderate…" — opens the run inspector drawer on this entry. */
    onModerate?: (entry: LeaderboardEntry) => void;
    /** Board page refetch for row-level mutations (quick Verify + its undo). */
    onBoardRefresh?: () => void;
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
    sessionUsername,
    showMilliseconds,
    categorySlug,
    subcategoryDefKeys,
    rtaFallback = false,
    selected = false,
    onToggleSelect,
    onModerate,
    onBoardRefresh,
}: Props) {
    // Anonymized rows arrive already redacted from the backend: placeholder
    // name, `userId`/`picture`/`country` nulled, `isGuest: false`. Always key
    // the treatment off this flag, never off the name string.
    const isAnonymous = entry.anonymized === true;
    const selectionKey = entrySelectionKey(entry);
    // One-click Verify for the queue-clearing common case; every other mod
    // verb goes through the inspector drawer (kebab → Moderate…).
    const showQuickVerify =
        canManage &&
        entry.runId != null &&
        entry.source !== 'manual' &&
        entry.verificationStatus === 'pending' &&
        onBoardRefresh != null;
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
    const time = (
        value: number | null,
        dimmed: boolean,
        stretched: boolean,
        rtaTag = false,
    ) => (
        <td className={dimmed ? styles.timeSecondary : styles.time}>
            {value != null ? (
                <>
                    {detailHref ? (
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
            className={`${styles.row} ${podiumClass} ${isCurrentUser ? styles.youRow : ''} ${selected ? styles.rowSelected : ''} ${isAnonymous ? styles.anonRow : ''}`}
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
                {displayRank.label.replace(/^=/, '')}
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
                            />
                            <CountryFlag country={entry.country} />
                        </>
                    )}
                    {/* No rank-1 chip: the gold spine and gold rank numeral
                        already mark the row, and any label here overclaims —
                        we only know the board's best submitted time. */}
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
            <td
                className={`${styles.meta} ${styles.when}`}
                title={entry.runDate ? formatRunDate(entry.runDate) : undefined}
            >
                {entry.runDate ? relativeDate(entry.runDate) : '—'}
            </td>
            <td className={styles.trailing}>
                {entry.source === 'manual' && (
                    <InfoPill
                        label="set time"
                        explanation="A moderator-set leaderboard time"
                    />
                )}
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
                <span className={styles.reveal}>
                    {showQuickVerify && (
                        <QuickVerifyButton
                            gameSlug={gameSlug}
                            runId={entry.runId as number}
                            runnerName={entry.runnerName}
                            onMutated={onBoardRefresh as () => void}
                        />
                    )}
                    {canManage && onModerate && (
                        <button
                            type="button"
                            className={styles.moderateBtn}
                            onClick={() => onModerate(entry)}
                        >
                            Moderate
                        </button>
                    )}
                    <RowActionsMenu
                        entry={entry}
                        sessionUsername={sessionUsername}
                        gameSlug={gameSlug}
                        categorySlug={categorySlug}
                        subcategoryDefKeys={subcategoryDefKeys}
                    />
                </span>
            </td>
        </tr>
    );
}
