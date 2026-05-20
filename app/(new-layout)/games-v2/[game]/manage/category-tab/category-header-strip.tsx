'use client';

import { useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ManageCategoryRow } from '~src/lib/category-mgmt';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory;
    row: ManageCategoryRow | undefined;
    onVisibilityChange?: (
        categoryId: number,
        patch: { isMain?: boolean; active?: boolean },
    ) => void;
}

export function CategoryHeaderStrip({
    gameSlug,
    gameId,
    category,
    row,
    onVisibilityChange,
}: Props) {
    const [isSaving, startSave] = useTransition();

    const isMain = row?.isMain ?? false;
    const active = row?.active ?? true;

    const toggle = (field: 'isMain' | 'active', value: boolean) => {
        const prev = field === 'isMain' ? isMain : active;
        onVisibilityChange?.(category.id, { [field]: value });
        startSave(async () => {
            const res = await updateVisibilityAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                ...(field === 'isMain' ? { isMain: value } : {}),
                ...(field === 'active' ? { active: value } : {}),
            });
            if ('error' in res) {
                toast.error(res.error);
                onVisibilityChange?.(category.id, { [field]: prev });
                return;
            }
            toast.success(
                field === 'isMain'
                    ? value
                        ? 'Marked main'
                        : 'Unmarked main'
                    : value
                      ? 'Activated'
                      : 'Archived',
            );
        });
    };

    return (
        <div className="d-flex flex-wrap align-items-center gap-3 mb-3 pb-3 border-bottom">
            <div>
                <h2 className="h4 mb-1">
                    {category.display}
                    {isMain && <span className="badge bg-info ms-2">Main</span>}
                    {!active && (
                        <span className="badge bg-secondary ms-2">
                            Archived
                        </span>
                    )}
                </h2>
            </div>
            <div className="ms-auto d-flex gap-3">
                <div className="form-check">
                    <input
                        id="cat-active"
                        type="checkbox"
                        className="form-check-input"
                        checked={active}
                        disabled={isSaving}
                        onChange={(e) => toggle('active', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="cat-active">
                        Active
                    </label>
                </div>
                <div className="form-check">
                    <input
                        id="cat-main"
                        type="checkbox"
                        className="form-check-input"
                        checked={isMain}
                        disabled={isSaving || !active}
                        onChange={(e) => toggle('isMain', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="cat-main">
                        Main
                    </label>
                </div>
            </div>
        </div>
    );
}
