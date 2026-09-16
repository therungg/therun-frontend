'use client';

import { useEffect } from 'react';
import { InlineError } from '~app/(new-layout)/games-v2/[game]/manage/shared/form-kit';
import type { GameOrder } from '../../../../../types/leaderboards-profile.types';
import { useShowcase } from '../../../leaderboards/[name]/showcase-provider';
import styles from './leaderboards.module.scss';

const ORDER_LABELS: Record<GameOrder, string> = {
    placement: 'Best placements',
    runners: 'Most runners',
    rank: 'Best rank',
    recent: 'Most recent',
    name: 'Name',
    manual: 'My own order',
};

/**
 * Edit mode's controls, floating over the bottom of the page so they stay in
 * reach while the runner pins runs further down.
 */
export function SectionEditBar() {
    const { draft, setDraft, editing, dirty, saving, error, save, setEditing } =
        useShowcase();

    useEffect(() => {
        if (!editing || !dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [editing, dirty]);

    if (!editing) return null;

    const cancel = () => {
        if (dirty && !window.confirm('Discard your changes?')) return;
        setEditing(false);
    };

    return (
        <div className={styles.editBar} role="region" aria-label="Customize">
            <span className={styles.editTitle}>Customizing</span>
            <label className={styles.editField}>
                <span>Games in</span>
                <select
                    value={draft.gameOrder}
                    onChange={(e) =>
                        setDraft((d) => ({
                            ...d,
                            gameOrder: e.target.value as GameOrder,
                        }))
                    }
                >
                    {(Object.keys(ORDER_LABELS) as GameOrder[]).map((o) => (
                        <option key={o} value={o}>
                            {ORDER_LABELS[o]}
                        </option>
                    ))}
                </select>
            </label>
            {error ? <InlineError>{error}</InlineError> : null}
            <span className={styles.editActions}>
                <button
                    type="button"
                    className={styles.editCancel}
                    onClick={cancel}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={styles.editSave}
                    disabled={saving || !dirty}
                    onClick={save}
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </span>
        </div>
    );
}
