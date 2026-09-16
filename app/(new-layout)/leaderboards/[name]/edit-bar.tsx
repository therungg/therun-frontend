'use client';

import { useEffect } from 'react';
import { InlineError } from '~app/(new-layout)/games-v2/[game]/manage/shared/form-kit';
import styles from './leaderboards-profile.module.scss';
import { useShowcase } from './showcase-provider';

export function EditBar() {
    const {
        games,
        draft,
        setDraft,
        editing,
        dirty,
        saving,
        error,
        save,
        setEditing,
    } = useShowcase();

    // Unsaved changes prompt on navigation away.
    useEffect(() => {
        if (!editing || !dirty) return;
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
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
            <label className={styles.ledgerSort}>
                <span>Main game</span>
                <select
                    value={draft.mainGameId ?? ''}
                    onChange={(e) =>
                        setDraft((d) => ({
                            ...d,
                            mainGameId: e.target.value
                                ? Number(e.target.value)
                                : null,
                        }))
                    }
                >
                    <option value="">Auto</option>
                    {games.map((g) => (
                        <option key={g.gameId} value={g.gameId}>
                            {g.game}
                        </option>
                    ))}
                </select>
            </label>
            <label className={styles.ledgerSort}>
                <span>Game order</span>
                <select
                    value={draft.gameOrder}
                    onChange={(e) =>
                        setDraft((d) => ({
                            ...d,
                            gameOrder: e.target.value as typeof d.gameOrder,
                        }))
                    }
                >
                    <option value="placement">Best placements</option>
                    <option value="runners">Most runners</option>
                    <option value="rank">Best rank</option>
                    <option value="recent">Most recent</option>
                    <option value="name">Name</option>
                    <option value="manual">Custom</option>
                </select>
            </label>
            <label className={styles.ledgerSort}>
                <input
                    type="checkbox"
                    checked={draft.showActivity}
                    onChange={(e) =>
                        setDraft((d) => ({
                            ...d,
                            showActivity: e.target.checked,
                        }))
                    }
                />
                <span>Show activity</span>
            </label>
            <span className={styles.editBarActions}>
                <button
                    type="button"
                    className={`${styles.tab} ${styles.tabActive}`}
                    disabled={saving || !dirty}
                    onClick={save}
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className={styles.tab} onClick={cancel}>
                    Cancel
                </button>
                {error ? <InlineError>{error}</InlineError> : null}
            </span>
        </div>
    );
}
