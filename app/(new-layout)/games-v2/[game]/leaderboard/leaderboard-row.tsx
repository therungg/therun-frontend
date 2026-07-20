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
import { relativeDate } from './relative-date';
import { RowActionsMenu } from './row-actions-menu';
import { RunnerAvatar } from './runner-avatar';
import {
    type TimingKey,
    timingColumnHidden,
    timingColumns,
} from './timing-columns';

/**
 * "Set time"/"pending" pill that opens a small info popover on click/tap
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
}: Props) {
    const showManageButton = canManage && entry.runId != null && !entry.isGuest;
    const detailHref =
        entry.source === 'manual' && entry.manualTimeId != null
            ? `/games-v2/${gameSlug}/manual/${entry.manualTimeId}`
            : entry.runId != null
              ? `/games-v2/${gameSlug}/run/${entry.runId}`
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
    ) => (
        <td className={dimmed ? styles.timeSecondary : styles.time}>
            {value != null ? (
                detailHref ? (
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
                )
            ) : (
                '—'
            )}
        </td>
    );

    // Same primary-first order as the header (leaderboard-table.tsx), so
    // cells always line up under the column that claims them.
    const { primary, secondary } = timingColumns(primaryTiming);
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
            className={`${styles.row} ${podiumClass} ${isCurrentUser ? styles.youRow : ''}`}
        >
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
                    />
                    <UserLink username={entry.runnerName} url={undefined} />
                    <CountryFlag country={entry.country} />
                    {entry.rank === 1 &&
                        entry.verificationStatus === 'verified' && (
                            <span
                                className={styles.wrChip}
                                aria-label="World record"
                            >
                                WR
                            </span>
                        )}
                </span>
            </td>
            {primaryVisible && time(timingValue(primary.key), false, true)}
            {secondaryVisible &&
                time(timingValue(secondary.key), true, !primaryVisible)}
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
                {entry.source !== 'manual' &&
                    entry.verificationStatus === 'pending' && (
                        <InfoPill
                            label="pending"
                            explanation={
                                isCurrentUser
                                    ? "Your run is awaiting verification — you'll be notified."
                                    : 'Awaiting moderator verification'
                            }
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
                    <RowActionsMenu
                        entry={entry}
                        sessionUsername={sessionUsername}
                        canManage={canManage}
                        gameSlug={gameSlug}
                        categorySlug={categorySlug}
                        subcategoryDefKeys={subcategoryDefKeys}
                    />
                    {showManageButton && (
                        <Link
                            href={`/games-v2/${gameSlug}/manage/run/${entry.runId}`}
                            className={styles.manageLink}
                        >
                            Manage
                        </Link>
                    )}
                </span>
            </td>
        </tr>
    );
}
