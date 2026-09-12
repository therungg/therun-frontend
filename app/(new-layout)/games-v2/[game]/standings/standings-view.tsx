'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import {
    pickBoardIndex,
    readSliceSelection,
    sliceLabel,
    subcategoryKeyOf,
} from '~src/lib/variables/slice-selection';
import type {
    GameStandings,
    StandingsCategory,
} from '../../../../../types/leaderboards.types';
import { SlicePicker } from '../slice/slice-picker';
import { CategoryToggles, type ToggleSection } from './category-toggles';
import type { StandingsSection } from './order';
import { computeStandings, decodeStandings } from './scoring';
import styles from './standings.module.scss';
import { type StandingsColumn, StandingsTable } from './standings-table';

/** Top 20 only. Being on the board should read as an achievement. */
const ROW_LIMIT = 20;

interface Props {
    gameSlug: string;
    data: GameStandings;
    /** Toggle-band structure + per-group default, from the resolver (order.ts). */
    sections: StandingsSection[];
}

const sameSet = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Two selections live in the URL. `?categories=any,120star` is which
 * categories count (omitted = the DEFAULT set — main groups counted,
 * hidden-by-default groups out). One param per subcategory variable
 * (`?character=mario&mode=1p`) is which BOARD of each category counts —
 * the payload holds every board, and the picker names one per category.
 * Both are written with `replace`, not `push`, so toggling pills doesn't
 * bury the back button.
 */
export function StandingsView({ gameSlug, data, sections }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // An older payload has no `variables`; memoized so it doesn't hand a
    // fresh [] to every memo below on each render.
    const variables = useMemo(() => data.variables ?? [], [data.variables]);

    // Decoding builds one typed array per BOARD. Keyed on `data` so it
    // survives every toggle and every picker change — both are passes over
    // pre-decoded columns, never a re-parse of the payload.
    const matrix = useMemo(() => decodeStandings(data), [data]);

    // The toggle band works in categories. A column is a board, and several
    // share an id, so the category list is the boards deduped by id (first
    // occurrence keeps the payload's display order).
    const categoryList = useMemo(() => {
        const seen = new Set<number>();
        const out: StandingsCategory[] = [];
        for (const c of data.categories) {
            if (seen.has(c.id)) continue;
            seen.add(c.id);
            out.push(c);
        }
        return out;
    }, [data.categories]);

    // Resolver sections mapped onto category-list indices. Categories the
    // resolver doesn't know join the trailing unlabeled section — present
    // and counted, never silently dropped.
    const { uiSections, defaultSelected } = useMemo(() => {
        const nameToIdx = new Map<string, number>();
        categoryList.forEach((c, i) => {
            if (!nameToIdx.has(c.name)) nameToIdx.set(c.name, i);
        });
        const used = new Set<number>();
        const mapped = sections.map((s, si) => ({
            key: `s${si}`,
            label: s.label,
            defaultCounted: s.defaultCounted,
            indices: s.names
                .map((n) => nameToIdx.get(n))
                .filter((i): i is number => {
                    // First section wins: the resolver can hold duplicate
                    // category names (unmerged dupes), and without this
                    // guard the same category lands in two rows.
                    if (i == null || used.has(i)) return false;
                    used.add(i);
                    return true;
                }),
        }));
        const leftovers = categoryList
            .map((_, i) => i)
            .filter((i) => !used.has(i));
        if (leftovers.length > 0) {
            const tail = mapped.find((s) => s.label === null);
            if (tail) tail.indices.push(...leftovers);
            else
                mapped.push({
                    key: 'tail',
                    label: null,
                    defaultCounted: true,
                    indices: leftovers,
                });
        }
        const ui: ToggleSection[] = mapped
            .filter((s) => s.indices.length > 0)
            .map(({ key, label, indices }) => ({ key, label, indices }));
        let def = mapped
            .filter((s) => s.defaultCounted)
            .flatMap((s) => s.indices)
            .sort((a, b) => a - b);
        // A game whose every group is hidden-by-default still needs a
        // competition: fall back to everything.
        if (def.length === 0) def = categoryList.map((_, i) => i);
        return { uiSections: ui, defaultSelected: def };
    }, [categoryList, sections]);

    const param = searchParams.get('categories');
    const selected = useMemo(() => {
        if (param === null) return defaultSelected;
        // An explicit empty value is a real state (everything deselected),
        // distinct from the param being absent (the default set).
        if (param === '') return [];
        const names = new Set(param.split(',').filter(Boolean));
        return categoryList
            .map((c, i) => (names.has(c.name) ? i : -1))
            .filter((i) => i >= 0);
    }, [param, categoryList, defaultSelected]);

    const sliceSelection = useMemo(
        () => readSliceSelection(searchParams, variables),
        [searchParams, variables],
    );

    // The picked board per category (indexed like categoryList), or null
    // when no board holds runs for the picked combination.
    const boardIdxByCategory = useMemo(
        () =>
            categoryList.map((c) =>
                pickBoardIndex(
                    data.categories,
                    c.id,
                    sliceSelection,
                    variables,
                ),
            ),
        [categoryList, data.categories, sliceSelection, variables],
    );

    // Pill counts follow the picked board, not the representative one.
    const counts = useMemo(
        () =>
            boardIdxByCategory.map((idx) =>
                idx === null ? null : data.categories[idx].entryCount,
            ),
        [boardIdxByCategory, data.categories],
    );

    // One column per counted category: the board the picker names, or a
    // placeholder when no board holds runs for that combination — the
    // category must not vanish just because the picker moved.
    const columns = useMemo<StandingsColumn[]>(
        () =>
            selected.map((ci) => {
                const category = categoryList[ci];
                const boardIdx = boardIdxByCategory[ci];
                const board =
                    boardIdx === null ? null : data.categories[boardIdx];
                const sub = board?.subcategory ?? {};
                return {
                    category: board ?? category,
                    boardIdx,
                    sliceLabel: board ? sliceLabel(sub, variables) : null,
                    subcategoryKey: subcategoryKeyOf(sub, variables),
                };
            }),
        [
            selected,
            categoryList,
            boardIdxByCategory,
            data.categories,
            variables,
        ],
    );

    const rows = useMemo(
        () =>
            computeStandings(
                matrix,
                columns.map((c) => c.boardIdx ?? -1),
                ROW_LIMIT,
            ),
        [matrix, columns],
    );

    const commit = (next: number[]) => {
        const sp = new URLSearchParams(searchParams.toString());
        // The clean URL means "the default set" now, not "everything" — an
        // explicit select-all on a game with hidden groups must be written
        // out, or a reload would quietly drop the extensions again.
        if (sameSet(next, defaultSelected)) sp.delete('categories');
        else
            sp.set(
                'categories',
                next.map((i) => categoryList[i].name).join(','),
            );
        const qs = sp.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    const toggle = (index: number) => {
        commit(
            selected.includes(index)
                ? selected.filter((i) => i !== index)
                : [...selected, index].sort((a, b) => a - b),
        );
    };

    /** Turn a whole section on or off in one commit. */
    const setMany = (indices: number[], on: boolean) => {
        const next = new Set(selected);
        for (const i of indices) {
            if (on) next.add(i);
            else next.delete(i);
        }
        commit([...next].sort((a, b) => a - b));
    };

    return (
        <div className={styles.page}>
            {/* The active view tab already says "Standings" — a second
                visible label directly under it was pure repetition. */}
            <h2 className="visually-hidden">Standings</h2>

            <SlicePicker variables={variables} selection={sliceSelection} />

            <CategoryToggles
                categories={categoryList}
                counts={counts}
                sections={uiSections}
                selected={selected}
                onToggle={toggle}
                onSetMany={setMany}
                onAll={() => commit(categoryList.map((_, i) => i))}
                onNone={() => commit([])}
            />

            {data.truncated && (
                <p className={styles.truncatedNote}>
                    This game has more ranked runners than the standings can
                    hold. Runners covering the fewest categories were left out.
                </p>
            )}

            {selected.length === 0 ? (
                <div className={styles.empty}>
                    <p className={styles.emptyTitle}>No categories counted.</p>
                    <p className={styles.emptyBody}>
                        Pick at least one category to rank runners across.
                    </p>
                </div>
            ) : rows.length === 0 ? (
                <div className={styles.empty}>
                    <p className={styles.emptyTitle}>
                        Nobody has run these boards yet.
                    </p>
                    <p className={styles.emptyBody}>
                        Once runs land on these boards, the standings fill in.
                    </p>
                </div>
            ) : (
                <StandingsTable
                    gameSlug={gameSlug}
                    rows={rows}
                    columns={columns}
                />
            )}
        </div>
    );
}
