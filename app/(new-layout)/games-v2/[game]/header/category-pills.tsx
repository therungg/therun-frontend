'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CaretDownFill, CaretRightFill } from 'react-bootstrap-icons';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { useBoardNav } from '../filters/use-board-nav';
import styles from '../game-page.module.scss';
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

    const { sections } = useMemo(
        () => computeCategoryVisibility(categories, groups),
        [categories, groups],
    );

    // Which collapsed groups the reader has opened this visit. Not persisted:
    // "hidden by default" is the moderator's call about the default state, so
    // every visit starts from it again.
    const [opened, setOpened] = useState<Set<number>>(new Set());
    const toggle = (id: number) =>
        setOpened((prev) => {
            const next = new Set(prev);
            if (!next.delete(id)) next.add(id);
            return next;
        });

    if (sections.length === 0) return null;
    if (sections.length === 1 && sections[0].pills.length <= 1) {
        return null;
    }

    return (
        <nav aria-label="Category" aria-busy={isPending || undefined}>
            {sections.map((section, idx) => {
                // A collapsed group holding the category you're looking at
                // opens regardless — otherwise the active pill is invisible.
                const holdsSelection = section.pills.some(
                    (c) => c.name === optimisticSelectedName,
                );
                const collapsible =
                    section.collapsedByDefault &&
                    section.id !== null &&
                    !holdsSelection;
                const open = !collapsible || opened.has(section.id as number);

                return (
                    <div
                        key={section.id ?? `ungrouped-${idx}`}
                        className={styles.bandRow}
                    >
                        {section.name &&
                            (collapsible ? (
                                <button
                                    type="button"
                                    className={styles.groupToggle}
                                    aria-expanded={open}
                                    onClick={() => toggle(section.id as number)}
                                >
                                    {open ? (
                                        <CaretDownFill size={9} aria-hidden />
                                    ) : (
                                        <CaretRightFill size={9} aria-hidden />
                                    )}
                                    {section.name}
                                    <span className={styles.groupCount}>
                                        {section.pills.length}
                                    </span>
                                </button>
                            ) : (
                                <span className={styles.groupLabel}>
                                    {section.name}
                                </span>
                            ))}
                        {section.pills.length === 0 ? (
                            <small className="text-muted">
                                No categories enabled for this group.
                            </small>
                        ) : (
                            open && section.pills.map(renderPill)
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
