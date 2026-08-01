'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { GameStandings } from '../../../../../types/leaderboards.types';
import { CategoryToggles, type ToggleSection } from './category-toggles';
import type { StandingsSection } from './order';
import { computeStandings, decodeStandings } from './scoring';
import styles from './standings.module.scss';
import { StandingsTable } from './standings-table';

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
 * Selection lives in the URL (`?categories=any,120star`, omitted = the
 * DEFAULT set — main groups counted, hidden-by-default groups out) so a
 * filtered standings is shareable and back-button correct. Written with
 * `replace`, not `push` — toggling four pills shouldn't bury the back button
 * under four history entries.
 */
export function StandingsView({ gameSlug, data, sections }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Decoding builds one typed array per category. Keyed on `data` so it
    // survives every toggle — the whole point is that a toggle is a pass over
    // pre-decoded columns, not a re-parse of the payload.
    const matrix = useMemo(() => decodeStandings(data), [data]);

    // Resolver sections mapped onto payload indices. Payload categories the
    // resolver doesn't know join the trailing unlabeled section — present
    // and counted, never silently dropped.
    const { uiSections, defaultSelected } = useMemo(() => {
        const nameToIdx = new Map(data.categories.map((c, i) => [c.name, i]));
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
                    // guard the same payload column lands in two rows.
                    if (i == null || used.has(i)) return false;
                    used.add(i);
                    return true;
                }),
        }));
        const leftovers = data.categories
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
        if (def.length === 0) def = data.categories.map((_, i) => i);
        return { uiSections: ui, defaultSelected: def };
    }, [data.categories, sections]);

    const param = searchParams.get('categories');
    const selected = useMemo(() => {
        if (param === null) return defaultSelected;
        // An explicit empty value is a real state (everything deselected),
        // distinct from the param being absent (the default set).
        if (param === '') return [];
        const names = new Set(param.split(',').filter(Boolean));
        return data.categories
            .map((c, i) => (names.has(c.name) ? i : -1))
            .filter((i) => i >= 0);
    }, [param, data.categories, defaultSelected]);

    const rows = useMemo(
        () => computeStandings(matrix, selected, ROW_LIMIT),
        [matrix, selected],
    );

    const columns = useMemo(
        () => selected.map((i) => data.categories[i]),
        [selected, data.categories],
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
                next.map((i) => data.categories[i].name).join(','),
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

            <CategoryToggles
                categories={data.categories}
                sections={uiSections}
                selected={selected}
                onToggle={toggle}
                onSetMany={setMany}
                onAll={() => commit(data.categories.map((_, i) => i))}
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
                        Nobody has run these categories yet.
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
