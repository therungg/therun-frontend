'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import { bulkUpdateCategoriesAction } from '../../actions/bulk-update-categories.action';
import styles from './matrix.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory;
}

/**
 * Which time columns the board shows for one category.
 *
 * The matrix column above sets which timing *ranks*; this sets which ones are
 * visible at all. They are separate decisions — a board can rank by IGT and
 * still show RTA alongside — and only the ranking one is worth a column, so
 * the visibility pair lives here.
 *
 * Each switch writes only its own field. That matters: the backend applies a
 * forceRealTime guard to whatever it is handed, and sending an untouched
 * timing field along for the ride is what locks legacy rows out of ever
 * changing. One toggle, one field.
 */
export function TimingPanel({ gameSlug, gameId, category }: Props) {
    const router = useRouter();
    const [isSaving, startSave] = useTransition();

    const primary = category.primaryTiming === 'gt' ? 'gt' : 'rt';
    const showRealTime = !(category.hideRealTime ?? false);
    const showGameTime = !(category.hideGameTime ?? false);

    const set = (field: 'hideRealTime' | 'hideGameTime', hidden: boolean) => {
        startSave(async () => {
            const res = await bulkUpdateCategoriesAction({
                gameSlug,
                gameId,
                categoryIds: [category.id],
                fields: { [field]: hidden },
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            router.refresh();
        });
    };

    return (
        <div className={styles.panePad}>
            <p className={styles.paneNote}>
                Which time columns this leaderboard shows. The ranking timing
                cannot be hidden — it is the column the board is sorted by.
            </p>

            <div className={styles.switchRow}>
                <Toggle
                    label="Real time (RTA)"
                    checked={showRealTime}
                    // Hiding the ranking column would leave a board sorted by a
                    // number nobody can see.
                    disabled={isSaving || primary === 'rt'}
                    hint={primary === 'rt' ? 'ranks this board' : undefined}
                    onChange={(on) => set('hideRealTime', !on)}
                />
                <Toggle
                    label="In-game time (IGT)"
                    checked={showGameTime}
                    disabled={isSaving || primary === 'gt'}
                    hint={primary === 'gt' ? 'ranks this board' : undefined}
                    onChange={(on) => set('hideGameTime', !on)}
                />
            </div>
        </div>
    );
}

function Toggle({
    label,
    checked,
    disabled,
    hint,
    onChange,
}: {
    label: string;
    checked: boolean;
    disabled: boolean;
    hint?: string;
    onChange: (on: boolean) => void;
}) {
    return (
        <label className={styles.switchField}>
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span>{label}</span>
            {hint && <span className={styles.switchHint}>{hint}</span>}
        </label>
    );
}
