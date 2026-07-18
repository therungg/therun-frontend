'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { useBoardNav } from '../filters/use-board-nav';
import styles from '../game-page.module.scss';
import { CategoryOverflow } from './category-overflow';
import { computeCategoryVisibility } from './category-visibility';

const PENDING_PREFIX = 'category:';

interface Props {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    selectedCategoryName: string;
    variableKeys: string[];
}

export function CategoryPills({
    categories,
    groups,
    selectedCategoryName,
    variableKeys,
}: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending, pendingKey } = useBoardNav();

    const onSelect = (name: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set('category', name);
        sp.delete('page');
        sp.delete('combined');
        for (const k of variableKeys) sp.delete(k);
        navigate(`${pathname}?${sp.toString()}`, `${PENDING_PREFIX}${name}`);
    };

    // Optimistic selection: while a category nav is in flight, the clicked
    // pill renders active immediately instead of waiting for the URL/RSC
    // payload to land.
    const optimisticSelectedName =
        isPending && pendingKey?.startsWith(PENDING_PREFIX)
            ? pendingKey.slice(PENDING_PREFIX.length)
            : selectedCategoryName;

    const renderPill = (c: ResolvedCategory) => {
        const active = c.name === optimisticSelectedName;
        return (
            <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.name)}
                aria-pressed={active}
                className={`${styles.pill} ${active ? styles.pillActive : ''}`}
            >
                {c.display}
            </button>
        );
    };

    const { sections, overflow } = useMemo(
        () =>
            computeCategoryVisibility(categories, groups, selectedCategoryName),
        [categories, groups, selectedCategoryName],
    );

    if (sections.length === 0) return null;
    if (
        sections.length === 1 &&
        sections[0].pills.length <= 1 &&
        overflow.length === 0
    ) {
        return null;
    }

    return (
        <nav aria-label="Category" aria-busy={isPending || undefined}>
            {sections.map((section, idx) => {
                const isLast = idx === sections.length - 1;
                return (
                    <div
                        key={section.id ?? `ungrouped-${idx}`}
                        className={styles.bandRow}
                    >
                        {section.name && (
                            <span className={styles.groupLabel}>
                                {section.name}
                            </span>
                        )}
                        {section.pills.length === 0 ? (
                            <small className="text-muted">
                                No categories enabled for this group.
                            </small>
                        ) : (
                            section.pills.map(renderPill)
                        )}
                        {isLast && (
                            <CategoryOverflow
                                categories={overflow}
                                onSelect={onSelect}
                            />
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
