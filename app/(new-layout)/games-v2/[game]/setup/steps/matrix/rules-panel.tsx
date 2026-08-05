'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import { bulkUpdateCategoriesAction } from '../../actions/bulk-update-categories.action';
import styles from './matrix.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory;
    /** Board rules template, offered as a one-click fill. */
    template: string | null;
    onClose: () => void;
}

/**
 * Rules for one category, expanded in place under its matrix row.
 *
 * Deliberately not a screen takeover: losing the list was the core complaint
 * about the old step 4, and a moderator working down a board needs to keep
 * their place. The matrix stays rendered above and below this panel.
 */
export function RulesPanel({
    gameSlug,
    gameId,
    category,
    template,
    onClose,
}: Props) {
    const router = useRouter();
    const [text, setText] = useState(category.rules ?? '');
    const [isSaving, startSave] = useTransition();

    const dirty = text !== (category.rules ?? '');

    const save = () => {
        startSave(async () => {
            const res = await bulkUpdateCategoriesAction({
                gameSlug,
                gameId,
                categoryIds: [category.id],
                // Empty text clears the rules rather than storing whitespace,
                // so the matrix chip reads "none" instead of a false "custom".
                fields: { rules: text.trim() || null },
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(`Rules saved for ${category.display}.`);
            router.refresh();
            onClose();
        });
    };

    return (
        <div className={styles.rulesPanel}>
            <div className={styles.rulesHead}>
                <span className={styles.rulesTitle}>
                    {category.display} · rules
                </span>
                <span className={styles.rulesActions}>
                    {template && (
                        <button
                            type="button"
                            className={styles.rulesChip}
                            disabled={
                                isSaving || text.trim() === template.trim()
                            }
                            onClick={() => setText(template)}
                        >
                            Use board template
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.rulesChip}
                        disabled={isSaving || !dirty}
                        onClick={save}
                    >
                        {isSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                        type="button"
                        className={styles.rulesChip}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </span>
            </div>
            <textarea
                className={styles.rulesTextarea}
                value={text}
                disabled={isSaving}
                aria-label={`Rules for ${category.display}`}
                placeholder={
                    template
                        ? 'Empty — the board template is one click away.'
                        : 'No rules set for this category.'
                }
                onChange={(e) => setText(e.target.value)}
            />
        </div>
    );
}
