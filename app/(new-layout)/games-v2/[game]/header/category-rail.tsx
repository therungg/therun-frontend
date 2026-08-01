'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CaretRightFill } from 'react-bootstrap-icons';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { useBoardNav } from '../filters/use-board-nav';
import { groupShowsEmblems } from './board-identity';
import { computeCategoryVisibility } from './category-visibility';
import styles from './masthead.module.scss';

const PENDING_PREFIX = 'category:';

interface Props {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    selectedCategoryName: string;
    variableKeys: string[];
}

export function CategoryRail({
    categories,
    groups,
    selectedCategoryName,
    variableKeys,
}: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending, pendingKey } = useBoardNav();

    // Which collapsed groups the reader opened this visit. Not persisted:
    // "hidden by default" is the moderator's call about the default state,
    // so every visit starts from it again.
    const [opened, setOpened] = useState<Set<number>>(new Set());

    const { sections } = useMemo(
        () => computeCategoryVisibility(categories, groups),
        [categories, groups],
    );

    const onSelect = (name: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set('category', name);
        sp.delete('page');
        sp.delete('combined');
        for (const k of variableKeys) sp.delete(k);
        navigate(`${pathname}?${sp.toString()}`, `${PENDING_PREFIX}${name}`);
    };

    // Optimistic selection: while a category nav is in flight the clicked
    // chip reads active immediately rather than waiting for the RSC payload.
    const optimisticSelectedName =
        isPending && pendingKey?.startsWith(PENDING_PREFIX)
            ? pendingKey.slice(PENDING_PREFIX.length)
            : selectedCategoryName;

    const toggle = (id: number) =>
        setOpened((prev) => {
            const next = new Set(prev);
            if (!next.delete(id)) next.add(id);
            return next;
        });

    if (sections.length === 0) return null;
    if (sections.length === 1 && sections[0].pills.length <= 1) return null;

    // A collapsed group holding the board you're looking at expands
    // regardless — otherwise the active chip is invisible.
    const isOpen = (section: (typeof sections)[number]) =>
        !section.collapsedByDefault ||
        section.id === null ||
        section.pills.some((c) => c.name === optimisticSelectedName) ||
        opened.has(section.id);

    const open = sections.filter(isOpen);
    const collapsed = sections.filter((s) => !isOpen(s));

    // Collapsed groups render as ghost chips appended to the LAST open row
    // (density: one dashed chip must not own a whole plate row). They sit in
    // their own well, outside the row's labeled group semantics.
    const ghostWell =
        collapsed.length > 0 ? (
            <div className={styles.ghostWell}>
                <div className={styles.chips}>
                    {collapsed.map((section) => (
                        <button
                            key={`collapsed-${section.id}`}
                            type="button"
                            aria-expanded={false}
                            onClick={() => toggle(section.id as number)}
                            className={`${styles.chip} ${styles.chipGhost}`}
                        >
                            <CaretRightFill size={9} aria-hidden />
                            {section.name}
                            <span aria-hidden className={styles.chipCount}>
                                {section.pills.length}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        ) : null;

    return (
        <nav
            aria-label="Category"
            aria-busy={isPending || undefined}
            className={styles.rail}
        >
            {open.map((section, idx) => {
                const capId = `rail-group-${section.id ?? `ungrouped-${idx}`}`;
                const withEmblems = groupShowsEmblems(section.pills);
                return (
                    <div key={capId} className={styles.block}>
                        {section.name && (
                            <span className={styles.endcap} id={capId}>
                                {section.name}
                            </span>
                        )}
                        <div
                            className={`${styles.well} ${section.name ? '' : styles.wellSolo}`}
                            role={section.name ? 'group' : undefined}
                            aria-labelledby={section.name ? capId : undefined}
                        >
                            <div className={styles.chips}>
                                {section.pills.length === 0 ? (
                                    <span className={styles.emptyGroup}>
                                        No categories enabled for this group.
                                    </span>
                                ) : (
                                    section.pills.map((c) => {
                                        const active =
                                            c.name === optimisticSelectedName;
                                        const runners = c.uniqueRunners ?? null;
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => onSelect(c.name)}
                                                aria-pressed={active}
                                                aria-label={
                                                    runners == null
                                                        ? undefined
                                                        : `${c.display}, ${runners} runners`
                                                }
                                                // The count's unit differs
                                                // from the plate's run
                                                // count — name it on hover.
                                                title={
                                                    runners == null
                                                        ? undefined
                                                        : `${runners.toLocaleString()} runners`
                                                }
                                                className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                                            >
                                                {withEmblems && c.imageUrl && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={c.imageUrl}
                                                        alt=""
                                                        aria-hidden
                                                        width={17}
                                                        height={17}
                                                        loading="lazy"
                                                        className={
                                                            styles.chipEmblem
                                                        }
                                                    />
                                                )}
                                                {c.display}
                                                {runners != null && (
                                                    <span
                                                        aria-hidden
                                                        className={
                                                            styles.chipCount
                                                        }
                                                    >
                                                        {runners.toLocaleString()}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                        {idx === open.length - 1 && ghostWell}
                    </div>
                );
            })}

            {/* No open rows at all (every group collapsed): the ghosts still
                need somewhere to live. */}
            {open.length === 0 && collapsed.length > 0 && (
                <div className={styles.block}>{ghostWell}</div>
            )}
        </nav>
    );
}
