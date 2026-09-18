'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { MergeCategoryOption } from '../../../../../../types/reassignments.types';
import { CategoryWizard } from './category-wizard';
import { MergeCategoryPicker } from './merge-category-picker';
import { listMergeCategoriesAction } from './reassignment-actions';
import styles from './reassignments.module.scss';

interface Props {
    gameId: number;
    gameSlug: string;
}

/**
 * Reassign pane: merge one category into another on this game. Merging whole
 * games is not offered — the backend refuses it — so there is no mode to pick
 * and the pane is the category merge itself.
 *
 * Two clicks: the board to merge away, then the board its runs join. The list
 * is loaded here rather than taken from the console's category props, which
 * come through an activity floor that hides unfeatured and empty boards.
 */
export function ReassignPane({ gameId, gameSlug }: Props) {
    const [categories, setCategories] = useState<MergeCategoryOption[] | null>(
        null,
    );
    const [loadFailed, setLoadFailed] = useState(false);
    const [source, setSource] = useState<MergeCategoryOption | null>(null);
    const [target, setTarget] = useState<MergeCategoryOption | null>(null);

    useEffect(() => {
        let live = true;
        listMergeCategoriesAction(gameId)
            .then((rows) => {
                if (live) setCategories(rows);
            })
            .catch((err) => {
                if (!live) return;
                setLoadFailed(true);
                toast.error(
                    err instanceof Error
                        ? err.message
                        : 'Could not load categories',
                );
            });
        return () => {
            live = false;
        };
    }, [gameId]);

    const restart = () => {
        setSource(null);
        setTarget(null);
    };

    return (
        <div className={consoleStyles.surface}>
            <div className={consoleStyles.paneHeader}>
                <div>
                    <div className={consoleStyles.paneEyebrow}>Game</div>
                    <h2 className={consoleStyles.paneTitle}>
                        {CONCEPT_LABEL.reassign}
                    </h2>
                </div>
            </div>
            <div className={styles.wizard}>
                {source && target ? (
                    <CategoryWizard
                        key={`${source.id}-${target.id}`}
                        source={source}
                        target={target}
                        targetGameSlug={gameSlug}
                        onRestart={restart}
                    />
                ) : (
                    <div className={styles.surface}>
                        <div className={styles.header}>
                            <p className={styles.eyebrow}>Category merge</p>
                            <h3 className={styles.title}>
                                {source
                                    ? `Merge ${source.display} into…`
                                    : 'Pick the category to merge away'}
                            </h3>
                            <p className={styles.subtitle}>
                                {source
                                    ? 'Its runs move to the category you pick, and it becomes a redirect.'
                                    : 'Every category on this game, including ones that are not featured.'}
                            </p>
                        </div>

                        {loadFailed && (
                            <p className={styles.pickerEmpty}>
                                Could not load this game&rsquo;s categories.
                            </p>
                        )}
                        {!loadFailed && categories === null && (
                            <p className={styles.pickerEmpty}>Loading…</p>
                        )}
                        {categories !== null && (
                            <MergeCategoryPicker
                                categories={categories}
                                excludeId={source?.id}
                                onPick={(c) =>
                                    source ? setTarget(c) : setSource(c)
                                }
                            />
                        )}

                        {source && (
                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    className={styles.btnGhost}
                                    onClick={restart}
                                >
                                    Pick a different category
                                </button>
                                <span className={styles.spacer} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
