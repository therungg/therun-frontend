'use client';

import { useEffect, useMemo, useState } from 'react';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { MergeCategory } from '../../../../../../types/reassignments.types';
import styles from './merge.module.scss';
import {
    listMergeCategoriesAction,
    mergeCategoriesAction,
} from './merge-actions';
import { MergeCategoryList } from './merge-category-list';

interface Props {
    gameId: number;
    gameDisplay: string;
}

/**
 * Two questions, stacked, and the second one only once the first is
 * answered. The order carries the meaning: the board you pick first is the
 * one that stays, and everything picked below it folds into that.
 */
export function MergePane({ gameId, gameDisplay }: Props) {
    const [all, setAll] = useState<MergeCategory[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [targetId, setTargetId] = useState<number | null>(null);
    const [sourceIds, setSourceIds] = useState<number[]>([]);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let live = true;
        listMergeCategoriesAction(gameId)
            .then((rows) => {
                if (live) setAll(rows);
            })
            .catch((e) => {
                if (live) {
                    setLoadError(
                        e instanceof Error
                            ? e.message
                            : 'Could not load the boards.',
                    );
                }
            });
        return () => {
            live = false;
        };
    }, [gameId]);

    // A board that has already been merged away is listed, not hidden, so
    // "where did that board go" is answered on screen. It can be neither a
    // target nor a source.
    const live = useMemo(
        () => (all ?? []).filter((c) => c.mergedInto === null),
        [all],
    );
    const target = live.find((c) => c.id === targetId) ?? null;
    const sources = live.filter((c) => sourceIds.includes(c.id));

    // A subcategory the destination does not split by is dropped from every
    // moved run's key by the rebuild that follows the merge. Say so before
    // the merge, not after.
    const lostSplits = useMemo(() => {
        if (!target) return [];
        const kept = new Set(target.subcategories);
        return sources
            .map((s) => ({
                display: s.display,
                lost: s.subcategories.filter((v) => !kept.has(v)),
            }))
            .filter((s) => s.lost.length > 0);
    }, [target, sources]);

    const movingRuns = sources.reduce((sum, s) => sum + s.runs, 0);

    async function submit() {
        if (!target || sources.length === 0) return;
        setBusy(true);
        setError(null);
        try {
            await mergeCategoriesAction({
                targetCategoryId: target.id,
                sourceCategoryIds: sources.map((s) => s.id),
            });
            setDone(
                sources.length === 1
                    ? `${sources[0].display} is merging into ${target.display}.`
                    : `${sources.length} boards are merging into ${target.display}.`,
            );
            setSourceIds([]);
            // The runs move on a queue, so the counts on screen are already
            // out of date. Re-read rather than guess at the new numbers, and
            // leave the old ones up if the re-read fails: stale counts beat a
            // list that empties itself.
            listMergeCategoriesAction(gameId)
                .then(setAll)
                .catch(() => setAll(all));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The merge was refused.');
        } finally {
            setBusy(false);
        }
    }

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

            <div className={styles.pane}>
                {loadError ? <p className={styles.error}>{loadError}</p> : null}

                <section className={styles.step}>
                    <h3 className={styles.question}>
                        What is the category you want to merge a different
                        category into?
                    </h3>
                    <p className={styles.hint}>
                        This category stays. Only featured categories are
                        listed: the one that survives has to be a board the game
                        shows.
                    </p>
                    <MergeCategoryList
                        categories={all}
                        mode="single"
                        selected={targetId === null ? [] : [targetId]}
                        onToggle={(id) => {
                            setTargetId(id === targetId ? null : id);
                            setSourceIds((prev) =>
                                prev.filter((s) => s !== id),
                            );
                            setDone(null);
                        }}
                        disabledIds={sourceIds}
                        disabledReason="Merging into this one"
                        featuredOnly
                        busy={busy}
                    />
                </section>

                {target ? (
                    <section className={styles.step}>
                        <h3 className={styles.question}>
                            Which categories would you like to merge into{' '}
                            {target.display}?
                        </h3>
                        <p className={styles.hint}>
                            Their runs move to {target.display} and their old
                            addresses point there. {target.display} keeps its
                            own rules and subcategories.
                        </p>
                        <MergeCategoryList
                            categories={all}
                            mode="multiple"
                            selected={sourceIds}
                            onToggle={(id) => {
                                setSourceIds((prev) =>
                                    prev.includes(id)
                                        ? prev.filter((s) => s !== id)
                                        : [...prev, id],
                                );
                                setDone(null);
                            }}
                            disabledIds={[target.id]}
                            disabledReason="Stays"
                            busy={busy}
                        />
                    </section>
                ) : null}

                {target && sources.length > 0 ? (
                    <section className={styles.confirm}>
                        <p className={styles.summary}>
                            {movingRuns.toLocaleString()}{' '}
                            {movingRuns === 1 ? 'run moves' : 'runs move'} to{' '}
                            <strong>{target.display}</strong>.{' '}
                            {sources.length === 1
                                ? `${sources[0].display} becomes a redirect.`
                                : `${sources.length} boards become redirects.`}
                        </p>

                        {lostSplits.length > 0 ? (
                            <ul className={styles.warnings}>
                                {lostSplits.map((s) => (
                                    <li key={s.display}>
                                        {target.display} does not have the{' '}
                                        {s.lost.join(' or ')} subcategor
                                        {s.lost.length === 1 ? 'y' : 'ies'}.{' '}
                                        {s.display}&rsquo;s runs will land
                                        without{' '}
                                        {s.lost.length === 1 ? 'it' : 'them'}.
                                    </li>
                                ))}
                            </ul>
                        ) : null}

                        {error ? <p className={styles.error}>{error}</p> : null}

                        <button
                            type="button"
                            className={styles.submit}
                            onClick={submit}
                            disabled={busy}
                        >
                            {busy
                                ? 'Merging…'
                                : sources.length === 1
                                  ? `Merge into ${target.display}`
                                  : `Merge ${sources.length} into ${target.display}`}
                        </button>
                    </section>
                ) : null}

                {done ? (
                    <p className={styles.done}>
                        {done} It can be taken back from History.
                    </p>
                ) : null}

                <p className={styles.footnote}>
                    Merging only moves runs. {gameDisplay}&rsquo;s own rules,
                    subcategories and minimum times stay as they are.
                </p>
            </div>
        </div>
    );
}
