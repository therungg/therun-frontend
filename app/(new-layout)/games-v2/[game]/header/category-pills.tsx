'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useTransition } from 'react';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import { CategoryOverflow } from './category-overflow';
import { computeCategoryVisibility } from './category-visibility';

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
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const onSelect = (name: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set('category', name);
        sp.delete('page');
        sp.delete('combined');
        for (const k of variableKeys) sp.delete(k);
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    const renderPill = (c: ResolvedCategory) => {
        const active = c.name === selectedCategoryName;
        return (
            <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.name)}
                disabled={isPending}
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
        <nav aria-label="Category">
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
                                isPending={isPending}
                                onSelect={onSelect}
                            />
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
