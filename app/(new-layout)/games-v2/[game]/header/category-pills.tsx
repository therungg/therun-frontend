'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useTransition } from 'react';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';

interface Props {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    selectedCategoryName: string;
    variableKeys: string[];
}

const FALLBACK_VISIBLE_COUNT = 5;

function byPlaytimeDesc(a: ResolvedCategory, b: ResolvedCategory): number {
    return (b.totalRunTime ?? 0) - (a.totalRunTime ?? 0);
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
                className={`btn btn-sm ${
                    active ? 'btn-primary' : 'btn-outline-secondary'
                }`}
            >
                {c.display}
            </button>
        );
    };

    const sections = useMemo(() => {
        const mains = categories.filter((c) => c.isMain);
        const usingFallback = mains.length === 0;
        const base = usingFallback
            ? [...categories]
                  .sort(byPlaytimeDesc)
                  .slice(0, FALLBACK_VISIBLE_COUNT)
            : [...mains].sort(byPlaytimeDesc);

        // Append selected-but-not-in-base, so the active pill is always visible.
        const baseIds = new Set(base.map((c) => c.id));
        const selected = categories.find(
            (c) => c.name === selectedCategoryName,
        );
        const visible =
            selected && !baseIds.has(selected.id) ? [...base, selected] : base;

        // Trivial case: no group structure to show.
        const usedGroupIds = new Set(
            visible.map((c) => c.groupId ?? null).filter((id) => id != null),
        );
        const trivial =
            usingFallback ||
            groups.length === 0 ||
            (groups.length <= 1 && usedGroupIds.size <= 1);

        if (trivial) {
            return [{ id: null, name: null, pills: visible }];
        }

        // Build labeled sections for each group in sortOrder, then trailing ungrouped.
        const byGroup = new Map<number, ResolvedCategory[]>();
        const ungrouped: ResolvedCategory[] = [];
        for (const c of visible) {
            if (c.groupId == null) ungrouped.push(c);
            else {
                const arr = byGroup.get(c.groupId) ?? [];
                arr.push(c);
                byGroup.set(c.groupId, arr);
            }
        }
        const result: {
            id: number | null;
            name: string | null;
            pills: ResolvedCategory[];
        }[] = groups.map((g) => ({
            id: g.id,
            name: g.name,
            pills: (byGroup.get(g.id) ?? []).sort(byPlaytimeDesc),
        }));
        if (ungrouped.length > 0) {
            result.push({
                id: null,
                name: null,
                pills: ungrouped.sort(byPlaytimeDesc),
            });
        }
        return result;
    }, [categories, groups, selectedCategoryName]);

    if (sections.length === 0) return null;
    if (sections.length === 1 && sections[0].pills.length <= 1) return null;

    return (
        <div aria-label="Category">
            {sections.map((section, idx) => (
                <div key={section.id ?? `ungrouped-${idx}`} className="mb-2">
                    {section.name && (
                        <small className="text-muted text-uppercase fw-bold d-block mb-1">
                            {section.name}
                        </small>
                    )}
                    {section.pills.length === 0 ? (
                        <small className="text-muted">
                            No categories enabled for this group.
                        </small>
                    ) : (
                        <nav className="d-flex gap-2 flex-wrap">
                            {section.pills.map(renderPill)}
                        </nav>
                    )}
                </div>
            ))}
        </div>
    );
}
