'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import Link from '~src/components/link';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { CategoryTab } from './category-tab/category-tab';
import { GameTab } from './game-tab/game-tab';
import { TabStrip } from './tab-strip';
import type { ManagePageData, ManageTab } from './types';

interface Props {
    data: ManagePageData;
}

export function ManagePage({ data }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<ManageTab>(data.initialTab);
    const [selectedCategoryId, setSelectedCategoryId] = useState(
        data.initialCategoryId,
    );
    const [rows, setRows] = useState<ManageCategoryRow[]>(data.initialRows);
    const [groups, setGroups] = useState<ManageGroup[]>(data.initialGroups);

    const applyRowPatch = useCallback(
        (categoryId: number, patch: { isMain?: boolean; active?: boolean }) => {
            setRows((rs) =>
                rs.map((r) => (r.id === categoryId ? { ...r, ...patch } : r)),
            );
        },
        [],
    );

    const updateUrl = useCallback(
        (nextTab: ManageTab, nextCategoryId: number) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', nextTab);
            if (nextTab === 'category' && nextCategoryId > 0) {
                params.set('categoryId', String(nextCategoryId));
            } else {
                params.delete('categoryId');
            }
            router.replace(`${pathname}?${params.toString()}`, {
                scroll: false,
            });
        },
        [pathname, router, searchParams],
    );

    const handleTabChange = (next: ManageTab) => {
        setActiveTab(next);
        updateUrl(next, selectedCategoryId);
    };

    return (
        <div>
            <header className="d-flex align-items-center gap-3 mb-3">
                {data.game.image && (
                    <img
                        src={data.game.image}
                        alt={data.game.display}
                        width={48}
                        height={64}
                        className="rounded"
                        style={{ aspectRatio: '3 / 4' }}
                        loading="eager"
                    />
                )}
                <div>
                    <small className="text-muted d-block">Management</small>
                    <h1 className="mb-0">{data.game.display}</h1>
                </div>
                <div className="ms-auto d-flex gap-2">
                    <Link
                        href={`/games-v2/${data.game.name}`}
                        className="btn btn-sm btn-outline-secondary"
                    >
                        ← Back to leaderboards
                    </Link>
                </div>
            </header>

            <TabStrip activeTab={activeTab} onChange={handleTabChange} />

            <div hidden={activeTab !== 'game'}>
                <GameTab
                    game={data.game}
                    initialSlug={data.initialSlug}
                    initialAbbreviation={data.initialAbbreviation}
                    rows={rows}
                    groups={groups}
                    onGroupsChange={setGroups}
                    onRowChange={applyRowPatch}
                    onRowGroupChange={(categoryId, groupId, groupName) => {
                        setRows((rs) =>
                            rs.map((r) =>
                                r.id === categoryId
                                    ? { ...r, groupId, groupName }
                                    : r,
                            ),
                        );
                    }}
                    onEditCategory={(id) => {
                        setSelectedCategoryId(id);
                        setActiveTab('category');
                        updateUrl('category', id);
                    }}
                />
            </div>
            <div hidden={activeTab !== 'category'}>
                <CategoryTab
                    data={data}
                    rows={rows}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={(id) => {
                        setSelectedCategoryId(id);
                        updateUrl('category', id);
                    }}
                    onVisibilityChange={applyRowPatch}
                />
            </div>
        </div>
    );
}
