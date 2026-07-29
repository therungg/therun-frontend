'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check2, Dot } from 'react-bootstrap-icons';
import { categorySetupStatus } from '~src/lib/setup/category-status';
import { CategoryEditor } from '../../manage/category/category-editor';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

/**
 * Step 4 is a hub, not a form: the featured categories with their setup state,
 * and one row opens the *same* editor the console uses (CategoryEditor,
 * `context="wizard"`) full-screen inside the wizard. That is the whole point of
 * the category-centric wizard — rules, timing, minimum time and variables for
 * one category are configured together, in the screen a moderator will keep
 * using after setup, instead of being smeared across three board-wide steps.
 *
 * Which category is open lives in the URL (`?step=category-setup&cat=<id>`) so
 * a deep link — including the retired `?step=exceptions&cat=<id>` shape, which
 * LEGACY_STEP_MAP folds onto this step — lands straight on that category.
 */
export function StepCategorySetup({ data, onAdvance }: StepProps) {
    const router = useRouter();
    const params = useSearchParams();
    const catId = Number(params.get('cat')) || null;

    // Board order, so the hub reads the way the leaderboard does.
    const mains = data.categories
        .filter((c) => !c.archived && (c.isMain ?? false))
        .sort(
            (a, b) =>
                (a.sortOrder || Number.MAX_SAFE_INTEGER) -
                    (b.sortOrder || Number.MAX_SAFE_INTEGER) ||
                a.display.localeCompare(b.display),
        );

    const open = mains.find((c) => c.id === catId) ?? null;

    const base = `/games-v2/${data.game.name}/setup`;
    const openCategory = (id: number) => {
        router.replace(`${base}?step=category-setup&cat=${id}`, {
            scroll: true,
        });
    };
    const backToHub = () => {
        router.replace(`${base}?step=category-setup`, { scroll: true });
        // Pick up whatever the editor just saved, so the hub row's status is
        // right the moment the moderator returns to it.
        router.refresh();
    };

    if (open) {
        return (
            <section>
                <div className={styles.editorHead}>
                    <button
                        type="button"
                        className={styles.backAction}
                        onClick={backToHub}
                    >
                        <ArrowLeft size={14} aria-hidden />
                        All categories
                    </button>
                    <h2 className={styles.editorTitle}>{open.display}</h2>
                </div>
                <CategoryEditor
                    game={data.game}
                    category={open}
                    canConfigure
                    canModerate
                    canEditStandards={data.canEditStandards}
                    context="wizard"
                    copySources={{
                        categories: data.categories,
                        variables: data.variables,
                        policies: data.policies,
                    }}
                />
            </section>
        );
    }

    return (
        <section>
            <StepHeader
                step="category-setup"
                title="Set up each category"
                lede="Rules, timing, variables — everything one category needs, in one place. Copy from a finished category to go faster."
            />

            {mains.length === 0 ? (
                <div className={styles.infoNote}>
                    No categories are featured yet. Go back to Categories and
                    feature the ones that belong on the board — they show up
                    here to configure.
                </div>
            ) : (
                <ul className={styles.rows}>
                    {mains.map((c) => {
                        const s = categorySetupStatus(
                            c,
                            data.variables,
                            data.policies,
                        );
                        const Glyph = s.ok ? Check2 : Dot;
                        return (
                            <li key={c.id} className={styles.rowItem}>
                                <Glyph
                                    size={16}
                                    className={`${styles.railGlyph} ${
                                        s.ok
                                            ? styles.toneDone
                                            : styles.toneWarning
                                    }`}
                                    aria-hidden
                                />
                                <span className="visually-hidden">
                                    {s.ok ? 'Set up: ' : 'Needs attention: '}
                                </span>
                                <span className={styles.hubMain}>
                                    <strong>{c.display}</strong>
                                    <span className={styles.hubParts}>
                                        {s.parts.join(' · ')}
                                        {s.missing.length > 0 && (
                                            <span
                                                className={styles.textWarning}
                                            >
                                                {` · no ${s.missing.join(', ')}`}
                                            </span>
                                        )}
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    className={`${styles.hubAction} ${styles.backAction}`}
                                    onClick={() => openCategory(c.id)}
                                >
                                    {s.ok ? 'Edit' : 'Set up'}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            <button
                type="button"
                className={styles.primaryAction}
                onClick={onAdvance}
            >
                Continue to boards
            </button>
        </section>
    );
}
