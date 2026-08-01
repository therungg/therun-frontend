'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { GameStandings } from '../../../../../types/leaderboards.types';
import { CategoryToggles } from './category-toggles';
import { computeStandings, decodeStandings } from './scoring';
import styles from './standings.module.scss';
import { StandingsTable } from './standings-table';

/** Top 20 only. Being on the board should read as an achievement. */
const ROW_LIMIT = 20;

interface Props {
    gameSlug: string;
    data: GameStandings;
}

/**
 * Selection lives in the URL (`?categories=any,120star`, omitted = all) so a
 * filtered standings is shareable and back-button correct. Written with
 * `replace`, not `push` — toggling four pills shouldn't bury the back button
 * under four history entries.
 */
export function StandingsView({ gameSlug, data }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Decoding builds one typed array per category. Keyed on `data` so it
    // survives every toggle — the whole point is that a toggle is a pass over
    // pre-decoded columns, not a re-parse of the payload.
    const matrix = useMemo(() => decodeStandings(data), [data]);

    const param = searchParams.get('categories');
    const selected = useMemo(() => {
        if (param === null) return data.categories.map((_, i) => i);
        // An explicit empty value is a real state (everything deselected),
        // distinct from the param being absent (everything selected).
        if (param === '') return [];
        const names = new Set(param.split(',').filter(Boolean));
        return data.categories
            .map((c, i) => (names.has(c.name) ? i : -1))
            .filter((i) => i >= 0);
    }, [param, data.categories]);

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
        if (next.length === data.categories.length) sp.delete('categories');
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

    return (
        <div className={styles.page}>
            <header className={styles.intro}>
                <h2 className={styles.head}>
                    <span className={styles.eyebrow}>Standings</span>
                </h2>
            </header>

            <CategoryToggles
                categories={data.categories}
                selected={selected}
                onToggle={toggle}
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
