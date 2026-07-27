'use client';

import { useMemo, useState } from 'react';
import { VariablesSection } from '../../manage/variables/variables-section';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

/**
 * Variables, in wizard clothes. The editor itself is the console's
 * VariablesSection — one implementation of a fiddly form, not two. What this
 * step adds is the part the console assumes you already know: what a variable
 * is, the difference between the two roles, and which category you're editing.
 */
export function StepVariables({ data, onAdvance }: StepProps) {
    const mains = useMemo(
        () => data.categories.filter((c) => !c.archived && (c.isMain ?? false)),
        [data.categories],
    );
    const [categoryId, setCategoryId] = useState<number | null>(
        mains[0]?.id ?? null,
    );
    const selected = mains.find((c) => c.id === categoryId) ?? null;

    if (mains.length === 0) {
        return (
            <section>
                <StepHeader
                    step="variables"
                    title="Nothing to split yet"
                    lede="Variables split a category into several boards. Pick the categories you're showing first and this step has something to work with."
                />
                <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={onAdvance}
                >
                    Continue
                </button>
            </section>
        );
    }

    return (
        <section>
            <StepHeader
                step="variables"
                title="Does a category need splitting?"
                lede="A variable is a question every run answers — “which platform?”, “which version?”. Depending on what you do with the answer, it either splits the category into separate boards or narrows the one board you're looking at."
            />

            <div className={styles.section}>
                <h3 className="h6">The two kinds</h3>
                <dl className={styles.defList}>
                    <dt>Subcategory — makes separate boards</dt>
                    <dd>
                        Each answer gets its own leaderboard with its own world
                        record. Runners pick one row of buttons under the
                        category name, exactly like{' '}
                        <em>Platform: N64 / Emulator / Virtual Console</em>. Use
                        this when a run on one answer isn&apos;t comparable to a
                        run on another — different platform, different game
                        version, different rules. One answer is the default:
                        that&apos;s the board people land on.
                    </dd>
                    <dt>Filter — narrows one board</dt>
                    <dd>
                        All the answers share a single leaderboard and one world
                        record; the answer is extra information on a run that
                        readers can filter by from the Filters menu. Use this
                        for things that describe a run without changing what
                        it&apos;s competing against.
                    </dd>
                </dl>
                <p className={`${styles.previewNote} mb-0`}>
                    Rule of thumb: if two runs shouldn&apos;t share a world
                    record, that&apos;s a subcategory. If they should, it&apos;s
                    a filter. The role is locked once a variable exists — to
                    change it you delete and recreate.
                </p>
            </div>

            <div className={styles.section}>
                <h3 className="h6">Scope</h3>
                <p className="text-muted small mb-0">
                    A variable set on the game applies to every category. Set it
                    on one category and only that category gets it — handy when
                    only your main run splits by platform. Pick which category
                    the editor below is scoped to:
                </p>
                <label className="form-label mt-3" htmlFor="var-category">
                    Editing category
                </label>
                <select
                    id="var-category"
                    className="form-select w-auto"
                    value={categoryId ?? ''}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                >
                    {mains.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.display}
                        </option>
                    ))}
                </select>
            </div>

            <VariablesSection
                gameSlug={data.game.name}
                gameId={data.game.id}
                selectedCategory={selected}
            />

            <button
                type="button"
                className={`${styles.primaryAction} mt-3`}
                onClick={onAdvance}
            >
                Save &amp; continue
            </button>
        </section>
    );
}
