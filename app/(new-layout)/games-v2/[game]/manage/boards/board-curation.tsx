'use client';

import { useMemo, useState } from 'react';
import { PinAngleFill } from 'react-bootstrap-icons';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import { formatRunDate } from '~src/lib/format-run-date';
import {
    findCategoryMinPolicy,
    findGameMinPolicy,
    minMsFromPolicy,
} from '~src/lib/setup/game-minimum';
import { toEffective } from '~src/lib/variables/effective';
import { buildSubcategoryKey } from '~src/lib/variables/keys';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type {
    BoardPolicyRow,
    LeaderboardRosterRow,
} from '../../../../../../types/moderation.types';
import { relativeDate } from '../../leaderboard/relative-date';
import styles from './board-curation.module.scss';
import { useBoardData } from './use-board-data';

export interface BoardCurationProps {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    variables: VariableRow[];
    policies: BoardPolicyRow[];
    canConfigure: boolean;
    context: 'wizard' | 'console';
}

interface CategorySection {
    id: number | null;
    name: string | null;
    items: ResolvedCategory[];
}

/** Groups featured categories into labeled sections, same shape as the
 * public masthead's rail — but ordered by `compareByBoardOrder` (the
 * admin-side comparator) rather than the public read's playtime tiebreak. */
function sectionsFor(
    featured: ResolvedCategory[],
    groups: ResolvedGroup[],
): CategorySection[] {
    const usedGroupIds = new Set(
        featured.map((c) => c.groupId ?? null).filter((id) => id != null),
    );
    const trivial =
        groups.length === 0 || (groups.length <= 1 && usedGroupIds.size <= 1);
    if (trivial) {
        return [{ id: null, name: null, items: featured }];
    }

    const byGroup = new Map<number, ResolvedCategory[]>();
    const ungrouped: ResolvedCategory[] = [];
    for (const c of featured) {
        if (c.groupId == null) {
            ungrouped.push(c);
        } else {
            const arr = byGroup.get(c.groupId) ?? [];
            arr.push(c);
            byGroup.set(c.groupId, arr);
        }
    }

    const sections: CategorySection[] = [...groups]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((g) => ({
            id: g.id,
            name: g.name,
            items: byGroup.get(g.id) ?? [],
        }));
    if (ungrouped.length > 0) {
        sections.push({ id: null, name: null, items: ungrouped });
    }
    return sections;
}

function canonicalOf(v: VariableRow, idx: number): string {
    return v.values[idx]?.[0] ?? '';
}

function defaultCanonicalOf(v: VariableRow): string {
    return v.defaultValueIndex != null
        ? canonicalOf(v, v.defaultValueIndex)
        : '';
}

/** Published subcategory-role variables in scope for a category, honoring
 * shadowing so a category-scoped variable that replaces a shared one
 * doesn't render two bands for the same name (see `toEffective`). Mirrors
 * `effectiveVariableCount` in `src/lib/setup/category-status.ts`, but needs
 * the rows themselves rather than just a count. */
function subcategoryVariablesFor(categoryId: number, variables: VariableRow[]) {
    const gameWide = variables.filter((v) => v.categoryId === null);
    const categoryScoped = variables.filter((v) => v.categoryId === categoryId);
    const tagged = toEffective([...gameWide, ...categoryScoped], gameWide);
    const shadowedNames = new Set(
        tagged
            .filter((v) => v.source === 'category-overrides-shared')
            .map((v) => v.nameNormalized),
    );
    return tagged.filter(
        (v) =>
            v.role === 'subcategory' &&
            v.published &&
            !(v.source === 'shared' && shadowedNames.has(v.nameNormalized)),
    );
}

function primaryTimeOf(
    row: LeaderboardRosterRow,
    timing: 'rt' | 'gt',
): number | null {
    return timing === 'gt' ? row.gameTime : row.time;
}

/** Whether a roster row is the runner's current leaderboard entry for the
 * category's primary timing — this is what makes "the real board" real
 * rather than every eligible run in the category. */
function isOnBoard(row: LeaderboardRosterRow, timing: 'rt' | 'gt'): boolean {
    return timing === 'gt' ? row.isLeaderboardEntryGt : row.isLeaderboardEntry;
}

interface RankedRow {
    row: LeaderboardRosterRow;
    rank: number;
    timeMs: number | null;
    belowMinimum: boolean;
}

/**
 * The real board, rendered for curation: category switcher, subcategory
 * bands, and a ranked table sourced from the mod roster endpoint. This is
 * the scaffold — row actions (mark for later, remove, ban, fix time, move,
 * add runner, bulk) land in Tasks 10-12 on top of it.
 */
export function BoardCuration({
    game,
    categories,
    groups,
    variables,
    policies,
    canConfigure,
    context,
}: BoardCurationProps) {
    const featured = useMemo(
        () =>
            categories
                .filter((c) => !c.archived && (c.isMain ?? false))
                .sort(compareByBoardOrder),
        [categories],
    );

    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
        featured[0]?.id ?? null,
    );
    const category =
        featured.find((c) => c.id === selectedCategoryId) ??
        featured[0] ??
        null;

    const sections = useMemo(
        () => sectionsFor(featured, groups),
        [featured, groups],
    );

    const subcatVars = useMemo(
        () => (category ? subcategoryVariablesFor(category.id, variables) : []),
        [category, variables],
    );

    const [selectedValues, setSelectedValues] = useState<
        Record<string, string>
    >({});

    const subcategoryKey = useMemo(() => {
        if (subcatVars.length === 0) return '';
        return buildSubcategoryKey(
            subcatVars.map((v) => ({
                name: v.nameNormalized,
                value:
                    selectedValues[v.nameNormalized] ?? defaultCanonicalOf(v),
            })),
        );
    }, [subcatVars, selectedValues]);

    const { rows, loading, error } = useBoardData(
        game.name,
        category?.id ?? null,
        subcategoryKey,
    );

    const timing: 'rt' | 'gt' = category?.primaryTiming === 'gt' ? 'gt' : 'rt';

    const minMs = useMemo(() => {
        if (!category) return null;
        const policy =
            findCategoryMinPolicy(policies, category.id) ??
            findGameMinPolicy(policies);
        return minMsFromPolicy(policy, timing);
    }, [category, policies, timing]);

    const boardRows: RankedRow[] = useMemo(() => {
        const onBoard = rows
            .filter((r) => isOnBoard(r, timing))
            .map((row) => ({ row, timeMs: primaryTimeOf(row, timing) }));
        onBoard.sort((a, b) => {
            if (a.timeMs == null && b.timeMs == null) return 0;
            if (a.timeMs == null) return 1;
            if (b.timeMs == null) return -1;
            return a.timeMs - b.timeMs;
        });
        return onBoard.map((entry, i) => ({
            ...entry,
            rank: i + 1,
            belowMinimum:
                minMs != null && entry.timeMs != null && entry.timeMs < minMs,
        }));
    }, [rows, timing, minMs]);

    if (featured.length === 0) {
        return (
            <div className={styles.empty}>
                <p className={styles.emptyTitle}>
                    No categories are featured yet.
                </p>
                {canConfigure && (
                    <p className={styles.emptyHint}>
                        Feature at least one category to see its board here.
                    </p>
                )}
            </div>
        );
    }

    return (
        <section
            className={styles.root}
            aria-label={
                context === 'wizard' ? 'Board preview' : 'Board curation'
            }
        >
            <div className={styles.categorySwitch}>
                {sections.map((section, idx) => (
                    <div
                        key={section.id ?? `ungrouped-${idx}`}
                        className={styles.block}
                        role={section.name ? 'group' : undefined}
                        aria-labelledby={
                            section.name
                                ? `board-curation-group-${section.id ?? idx}`
                                : undefined
                        }
                    >
                        {section.name && (
                            <span
                                id={`board-curation-group-${section.id ?? idx}`}
                                className={styles.endcap}
                            >
                                {section.name}
                            </span>
                        )}
                        <div
                            className={`${styles.well} ${section.name ? '' : styles.wellSolo}`}
                        >
                            <div className={styles.chips}>
                                {section.items.map((c) => {
                                    const active = c.id === category?.id;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            aria-pressed={active}
                                            className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                                            onClick={() =>
                                                setSelectedCategoryId(c.id)
                                            }
                                        >
                                            {c.display}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {subcatVars.length > 0 && (
                <div className={styles.subcategoryBands}>
                    {subcatVars.map((v) => {
                        const active =
                            selectedValues[v.nameNormalized] ??
                            defaultCanonicalOf(v);
                        return (
                            <div
                                key={v.id}
                                className={styles.block}
                                role="group"
                                aria-labelledby={`board-curation-var-${v.id}`}
                            >
                                <span
                                    id={`board-curation-var-${v.id}`}
                                    className={styles.endcap}
                                >
                                    {v.name}
                                </span>
                                <div className={styles.well}>
                                    <div className={styles.chips}>
                                        {v.values.map((bucket, i) => {
                                            const canonical = bucket[0];
                                            const isActive =
                                                active === canonical;
                                            return (
                                                <button
                                                    key={`${v.id}-${i}`}
                                                    type="button"
                                                    aria-pressed={isActive}
                                                    className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                                                    onClick={() =>
                                                        setSelectedValues(
                                                            (prev) => ({
                                                                ...prev,
                                                                [v.nameNormalized]:
                                                                    canonical,
                                                            }),
                                                        )
                                                    }
                                                >
                                                    {canonical}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {category && (
                <div className={styles.wrapper}>
                    {error && <div className={styles.errorNote}>{error}</div>}
                    {!error && loading && rows.length === 0 && (
                        <p className={styles.loadingNote}>Loading board…</p>
                    )}
                    {!error && !loading && boardRows.length === 0 && (
                        <div className={styles.empty}>
                            <p className={styles.emptyTitle}>
                                No runs on this board yet.
                            </p>
                        </div>
                    )}
                    {boardRows.length > 0 && (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.rank}>#</th>
                                    <th>Runner</th>
                                    <th>
                                        {timing === 'gt'
                                            ? 'Game time'
                                            : 'Real time'}
                                    </th>
                                    <th className={styles.when}>When</th>
                                </tr>
                            </thead>
                            <tbody>
                                {boardRows.map(
                                    ({ row, rank, timeMs, belowMinimum }) => {
                                        const isGuest = row.userId == null;
                                        return (
                                            <tr
                                                key={row.runId}
                                                className={styles.row}
                                            >
                                                <td className={styles.rank}>
                                                    {rank}
                                                </td>
                                                <td className={styles.runner}>
                                                    {row.markedForLater && (
                                                        <PinAngleFill
                                                            size={12}
                                                            className={
                                                                styles.pin
                                                            }
                                                            aria-label="Marked for later"
                                                        />
                                                    )}
                                                    {isGuest ? (
                                                        <span>
                                                            {row.runnerName}{' '}
                                                            <span
                                                                className={
                                                                    styles.guestTag
                                                                }
                                                            >
                                                                guest
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <UserLink
                                                            username={
                                                                row.runnerName
                                                            }
                                                            url={undefined}
                                                        />
                                                    )}
                                                </td>
                                                <td className={styles.time}>
                                                    {timeMs != null ? (
                                                        <DurationToFormatted
                                                            duration={timeMs}
                                                            withMillis={
                                                                category.showMilliseconds ??
                                                                false
                                                            }
                                                        />
                                                    ) : (
                                                        '—'
                                                    )}
                                                    {belowMinimum && (
                                                        <span
                                                            className={
                                                                styles.belowMinTag
                                                            }
                                                        >
                                                            Below minimum
                                                        </span>
                                                    )}
                                                </td>
                                                <td
                                                    className={styles.when}
                                                    title={formatRunDate(
                                                        row.endedAt,
                                                    )}
                                                >
                                                    {relativeDate(row.endedAt)}
                                                </td>
                                            </tr>
                                        );
                                    },
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </section>
    );
}
