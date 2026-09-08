'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { createLevelAction } from '~src/actions/levels/create-level.action';
import { createLevelTemplateAction } from '~src/actions/levels/create-level-template.action';
import type { LevelOverview } from '../../../../../../types/levels.types';
import styles from '../setup.module.scss';

interface Props {
    mode: 'setup' | 'manage';
    gameSlug: string;
    gameId: number;
    /** The server's reading of the game's levels; null while it loads. */
    overview: LevelOverview | null;
    /** Re-read after a write — the server decides what exists. */
    onSaved: () => void | Promise<void>;
    /** Setup only: leave the step without adding levels. */
    onSkip?: () => void;
}

/**
 * Add a level, add a variant.
 *
 * A level is a category and a variant is a value on it, so everything else a
 * level has — its rules, minimum, timing, which runs it takes — is edited in
 * the levels table above, exactly as for any other category. This is only the
 * two structural writes that table has no row for yet.
 */
export function LevelsEditor({
    mode,
    gameSlug,
    gameId,
    overview,
    onSaved,
    onSkip,
}: Props) {
    const [levelName, setLevelName] = useState('');
    const [variantName, setVariantName] = useState('');
    const [pending, startTransition] = useTransition();

    const levels = overview?.levels ?? [];
    const variants = overview?.templates ?? [];

    const submit = (
        label: string,
        run: () => Promise<{ error?: string } | { result: unknown }>,
        clear: () => void,
    ) => {
        startTransition(async () => {
            const res = await run();
            if ('error' in res && res.error) {
                toast.error(res.error);
                return;
            }
            clear();
            toast.success(label);
            await onSaved();
        });
    };

    const addLevel = () => {
        const display = levelName.trim();
        if (!display) return;
        submit(
            `Added ${display}`,
            () => createLevelAction({ gameSlug, gameId, display }),
            () => setLevelName(''),
        );
    };

    const addVariant = () => {
        const display = variantName.trim();
        if (!display) return;
        submit(
            `Added ${display} to every level`,
            () => createLevelTemplateAction({ gameSlug, gameId, display }),
            () => setVariantName(''),
        );
    };

    return (
        <>
            <div className={styles.section}>
                <div className={styles.fieldLabel}>Levels</div>
                {levels.length === 0 ? (
                    <p className="text-muted small">
                        No levels yet. A level is a board like any other — it
                        just lives in this section.
                    </p>
                ) : (
                    <ul className="list-unstyled mb-2">
                        {levels.map((l) => (
                            <li key={l.categoryId}>
                                {l.display}
                                {l.variants.length > 0 && (
                                    <span className="text-muted small">
                                        {' — '}
                                        {l.variants.join(', ')}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                <div className={styles.addRow}>
                    <input
                        className="form-control"
                        placeholder="Level name (E1M1)"
                        value={levelName}
                        onChange={(e) => setLevelName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addLevel();
                            }
                        }}
                    />
                    <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={addLevel}
                        disabled={pending || !levelName.trim()}
                    >
                        <Plus /> Add level
                    </button>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.fieldLabel}>Subcategories</div>
                <p className="text-muted small">
                    What every level splits into. Adding one adds a value to
                    each level, not a new level.
                </p>
                {variants.length > 0 && (
                    <ul className="list-unstyled mb-2">
                        {variants.map((t) => (
                            <li key={t.id}>{t.display}</li>
                        ))}
                    </ul>
                )}
                <div className={styles.addRow}>
                    <input
                        className="form-control"
                        placeholder="Subcategory name (Any%)"
                        value={variantName}
                        onChange={(e) => setVariantName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addVariant();
                            }
                        }}
                    />
                    <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={addVariant}
                        disabled={pending || !variantName.trim()}
                    >
                        <Plus /> Add subcategory
                    </button>
                </div>
            </div>

            {mode === 'setup' && onSkip && (
                <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={onSkip}
                    disabled={pending}
                >
                    {levels.length > 0 ? 'Continue' : 'This game has no levels'}
                </button>
            )}
        </>
    );
}
