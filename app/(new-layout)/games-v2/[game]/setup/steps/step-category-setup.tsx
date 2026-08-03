'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
    ArrowDownShort,
    ArrowLeft,
    ArrowUpShort,
    Check2,
    Dot,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import { sectionsFor } from '~src/lib/console/category-sections';
import { categorySetupStatus } from '~src/lib/setup/category-status';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { CategoryEditor } from '../../manage/category/category-editor';
import { reorderCategoriesAction } from '../../manage/game-tab/actions/reorder-categories.action';
import { computeReorderChanges } from '../../manage/game-tab/reorder-changes';
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
 * The hub doubles as the board-order surface: rows split into the same group
 * sections the public band renders (sectionsFor, flatten-when-trivial), and
 * ↑/↓ nudges write sortOrder through the console's reorder action, scoped to
 * the row's section — the same semantics as the console table and
 * BoardCuration's reorder mode.
 *
 * Which category is open lives in the URL (`?step=category-setup&cat=<id>`) so
 * a deep link — including the retired `?step=exceptions&cat=<id>` shape, which
 * LEGACY_STEP_MAP folds onto this step — lands straight on that category.
 */
export function StepCategorySetup({ data, onAdvance }: StepProps) {
    const router = useRouter();
    const params = useSearchParams();
    const catId = Number(params.get('cat')) || null;
    const [isReordering, startReorder] = useTransition();

    // Board order, so the hub reads the way the leaderboard does.
    const mains = data.categories
        .filter((c) => !c.archived && (c.isMain ?? false))
        .sort(compareByBoardOrder);
    const sections = sectionsFor(mains, data.groups);
    const grouped = sections.length > 1;

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

    const nudge = (items: ResolvedCategory[], idx: number, dir: -1 | 1) => {
        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= items.length) return;
        const scopeRows = items.map((c) => ({
            id: c.id,
            sortOrder: c.sortOrder,
        }));
        const { changes } = computeReorderChanges(scopeRows, idx, targetIdx);
        if (changes.length === 0) return;
        startReorder(async () => {
            const res = await reorderCategoriesAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                changes,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            router.refresh();
        });
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
            <StepHeader step="category-setup" title="Set up each category" />

            {mains.length === 0 ? (
                <div className={styles.infoNote}>
                    No categories are featured yet. Go back to Categories and
                    feature the ones that belong on the board — they show up
                    here to configure.
                </div>
            ) : (
                sections.map((section, sectionIdx) => (
                    <div key={section.id ?? `ungrouped-${sectionIdx}`}>
                        {grouped && (
                            <h3 className={styles.hubGroupHead}>
                                {section.name ?? 'Ungrouped'}
                            </h3>
                        )}
                        <ul className={styles.rows}>
                            {section.items.map((c, idx) => {
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
                                            {s.ok
                                                ? 'Set up: '
                                                : 'Needs attention: '}
                                        </span>
                                        <span className={styles.hubMain}>
                                            <strong>{c.display}</strong>
                                            <span className={styles.hubParts}>
                                                {s.parts.join(' · ')}
                                                {s.missing.length > 0 && (
                                                    <span
                                                        className={
                                                            styles.textWarning
                                                        }
                                                    >
                                                        {` · no ${s.missing.join(', ')}`}
                                                    </span>
                                                )}
                                            </span>
                                        </span>
                                        {section.items.length > 1 && (
                                            <span
                                                className={`${styles.hubAction} ${styles.nudgeGroup}`}
                                            >
                                                <button
                                                    type="button"
                                                    className={styles.nudgeBtn}
                                                    aria-label={`Move ${c.display} up`}
                                                    disabled={
                                                        isReordering ||
                                                        idx === 0
                                                    }
                                                    onClick={() =>
                                                        nudge(
                                                            section.items,
                                                            idx,
                                                            -1,
                                                        )
                                                    }
                                                >
                                                    <ArrowUpShort
                                                        size={18}
                                                        aria-hidden
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.nudgeBtn}
                                                    aria-label={`Move ${c.display} down`}
                                                    disabled={
                                                        isReordering ||
                                                        idx ===
                                                            section.items
                                                                .length -
                                                                1
                                                    }
                                                    onClick={() =>
                                                        nudge(
                                                            section.items,
                                                            idx,
                                                            1,
                                                        )
                                                    }
                                                >
                                                    <ArrowDownShort
                                                        size={18}
                                                        aria-hidden
                                                    />
                                                </button>
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            className={`${
                                                section.items.length > 1
                                                    ? ''
                                                    : styles.hubAction
                                            } ${styles.backAction}`}
                                            onClick={() => openCategory(c.id)}
                                        >
                                            {s.ok ? 'Edit' : 'Set up'}
                                        </button>
                                    </li>
                                );
                            })}
                            {section.items.length === 0 && (
                                <li className={`${styles.rowItem} text-muted`}>
                                    No featured categories in this group.
                                </li>
                            )}
                        </ul>
                    </div>
                ))
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
