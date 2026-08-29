'use client';

import { useMemo, useState, useTransition } from 'react';
import { createLevelAction } from '~src/actions/levels/create-level.action';
import { createLevelBoardAction } from '~src/actions/levels/create-level-board.action';
import { createLevelTemplateAction } from '~src/actions/levels/create-level-template.action';
import { levelOpAction } from '~src/actions/levels/level-op.action';
import { normalizeSlug } from '~src/lib/normalize-slug';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import { curateCategoryAction } from '../actions/curate-category.action';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { CategoryBandPreview } from './category-band-preview';
import {
    buildLevelSetupPlan,
    type ExistingLevels,
    type LevelPlanOp,
} from './level-plan';
import { StepHeader } from './step-header';

const slug = (s: string) => normalizeSlug(s.trim());

/** Splits a textarea's raw value into trimmed, de-duplicated (by slug) names,
 *  preserving first-seen order. */
function parseNameList(raw: string): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const key = slug(trimmed);
        if (seen.has(key)) continue;
        seen.add(key);
        names.push(trimmed);
    }
    return names;
}

/** Duplicate slugs dropped by parseNameList, for the warning note. */
function duplicateNames(raw: string): string[] {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const key = slug(trimmed);
        if (seen.has(key)) dupes.add(trimmed);
        seen.add(key);
    }
    return [...dupes];
}

export function StepLevels({ data, onAdvance }: StepProps) {
    const gameSlug = data.game.name;
    const gameId = data.game.id;

    const levelGroups = useMemo(
        () =>
            data.groups
                .filter((g) => g.kind === 'level')
                .map((g) => ({ id: g.id, name: g.name })),
        [data.groups],
    );
    const templates = useMemo(
        () =>
            data.levelTemplates.map((t) => ({ id: t.id, display: t.display })),
        [data.levelTemplates],
    );
    const categories = useMemo(
        () =>
            data.categories
                .filter((c) => !c.archived)
                .map((c) => ({ id: c.id, name: c.name })),
        [data.categories],
    );
    // Pass one doesn't pre-load existing exclusions — the matrix defaults
    // all-on, so a first save only ever writes the cells a mod actually
    // unchecks.
    const existing: ExistingLevels = useMemo(
        () => ({ levelGroups, templates, categories, exclusions: [] }),
        [levelGroups, templates, categories],
    );

    const [hasLevels, setHasLevels] = useState(levelGroups.length > 0);
    const [levelNamesRaw, setLevelNamesRaw] = useState(
        levelGroups.map((g) => g.name).join('\n'),
    );
    const [hasSubcategories, setHasSubcategories] = useState(
        templates.length > 0,
    );
    const [subcategoryNamesRaw, setSubcategoryNamesRaw] = useState(
        templates.map((t) => t.display).join('\n'),
    );
    const [excluded, setExcluded] = useState<
        Array<{ levelName: string; subcategoryName: string }>
    >([]);
    const [progress, setProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const levelNames = useMemo(
        () => parseNameList(levelNamesRaw),
        [levelNamesRaw],
    );
    const levelDupes = useMemo(
        () => duplicateNames(levelNamesRaw),
        [levelNamesRaw],
    );
    const subcategoryNames = useMemo(
        () => parseNameList(subcategoryNamesRaw),
        [subcategoryNamesRaw],
    );
    const subcategoryDupes = useMemo(
        () => duplicateNames(subcategoryNamesRaw),
        [subcategoryNamesRaw],
    );

    const isExcluded = (levelName: string, subcategoryName: string) =>
        excluded.some(
            (e) =>
                slug(e.levelName) === slug(levelName) &&
                slug(e.subcategoryName) === slug(subcategoryName),
        );

    const toggleExclusion = (
        levelName: string,
        subcategoryName: string,
        checked: boolean,
    ) => {
        setExcluded((prev) => {
            const without = prev.filter(
                (e) =>
                    !(
                        slug(e.levelName) === slug(levelName) &&
                        slug(e.subcategoryName) === slug(subcategoryName)
                    ),
            );
            // Checked = included, so unchecking is what adds an exclusion.
            return checked
                ? without
                : [...without, { levelName, subcategoryName }];
        });
    };

    // Preview-only synthetic groups/boards for the typed (unsaved) levels, so
    // the band preview shows a Levels dropdown before anything is saved.
    // Negative ids keep them out of the way of any real id.
    const previewLevelGroups: ResolvedGroup[] = useMemo(
        () =>
            levelNames.map((name, i) => ({
                id: -(i + 1),
                name,
                sortOrder: i,
                hiddenByDefault: false,
                kind: 'level' as const,
                rules: null,
            })),
        [levelNames],
    );
    const previewLevelBoards: ResolvedCategory[] = useMemo(
        () =>
            previewLevelGroups.map((g, i) => ({
                id: -(i + 1001),
                name: `preview-level-${slug(g.name)}`,
                display: g.name,
                primaryTiming: 'rt' as const,
                archived: false,
                isMain: true,
                sortOrder: 1,
                groupId: g.id,
                totalRunTime: 0,
            })),
        [previewLevelGroups],
    );

    const runPlan = async (plan: LevelPlanOp[]): Promise<string | null> => {
        const groupIdByLevelSlug = new Map<string, number>(
            levelGroups.map((g) => [slug(g.name), g.id]),
        );
        const templateIdBySubSlug = new Map<string, number>(
            templates.map((t) => [slug(t.display), t.id]),
        );
        for (let i = 0; i < plan.length; i++) {
            const op = plan[i];
            setProgress(`Saving ${i + 1} / ${plan.length}…`);
            if (op.kind === 'create-level') {
                const res = await createLevelAction({
                    gameSlug,
                    gameId,
                    name: op.levelName,
                });
                if ('error' in res) return op.levelName;
                groupIdByLevelSlug.set(slug(op.levelName), res.result.id);
            } else if (op.kind === 'create-subcategory') {
                const res = await createLevelTemplateAction({
                    gameSlug,
                    gameId,
                    display: op.display,
                });
                if ('error' in res) return op.display;
                templateIdBySubSlug.set(slug(op.display), res.result.id);
            } else if (op.kind === 'move-category') {
                const groupId = groupIdByLevelSlug.get(slug(op.levelName))!;
                const res = await curateCategoryAction({
                    gameSlug,
                    gameId,
                    categoryId: op.categoryId,
                    groupId,
                });
                if ('error' in res) return op.levelName;
            } else if (op.kind === 'create-level-only-board') {
                const groupId = groupIdByLevelSlug.get(slug(op.levelName))!;
                const res = await createLevelBoardAction({
                    gameSlug,
                    gameId,
                    display: op.display,
                    groupId,
                });
                if ('error' in res) return op.display;
            } else if (op.kind === 'set-exclusion') {
                const groupId = groupIdByLevelSlug.get(slug(op.levelName))!;
                const templateId = templateIdBySubSlug.get(
                    slug(op.subcategoryName),
                )!;
                const res = await levelOpAction({
                    gameSlug,
                    gameId,
                    op: {
                        op: 'level-exclusion',
                        groupId,
                        templateId,
                        excluded: op.excluded,
                    },
                });
                if ('error' in res) return op.subcategoryName;
            }
        }
        return null;
    };

    const save = () => {
        startSaving(async () => {
            setError(null);
            const plan = buildLevelSetupPlan(
                {
                    hasLevels,
                    levelNames,
                    hasSubcategories,
                    subcategoryNames,
                    excluded,
                },
                existing,
            );
            const failedName = await runPlan(plan);
            setProgress(null);
            if (failedName) {
                setError(`Failed to save "${failedName}".`);
                return;
            }
            onAdvance();
        });
    };

    if (!hasLevels) {
        return (
            <section>
                <StepHeader
                    step="levels"
                    title="Does this game have individual levels?"
                />
                <label className={styles.section}>
                    <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={hasLevels}
                        onChange={(e) => setHasLevels(e.target.checked)}
                    />
                    This game has individual levels
                </label>
                <p className="text-muted small">
                    Most games don&apos;t need this — skip it unless runners
                    race individual levels or stages separately from the full
                    game.
                </p>
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
                step="levels"
                title="Does this game have individual levels?"
            />

            <label className={styles.section}>
                <input
                    type="checkbox"
                    className="form-check-input me-2"
                    checked={hasLevels}
                    onChange={(e) => setHasLevels(e.target.checked)}
                />
                This game has individual levels
            </label>

            <div className={styles.section}>
                <label className={styles.fieldLabel} htmlFor="level-names">
                    Your levels
                </label>
                <textarea
                    id="level-names"
                    aria-label="Your levels"
                    className="form-control"
                    rows={5}
                    placeholder={'E1M1\nE1M2\nE1M3'}
                    value={levelNamesRaw}
                    onChange={(e) => setLevelNamesRaw(e.target.value)}
                />
                <p className="text-muted small mt-1 mb-0">
                    One level per line.
                </p>
                {levelDupes.length > 0 && (
                    <div className={`${styles.warnNote} mt-2`}>
                        Duplicate level{levelDupes.length === 1 ? '' : 's'}{' '}
                        ignored: {levelDupes.join(', ')}
                    </div>
                )}
            </div>

            <CategoryBandPreview
                categories={previewLevelBoards}
                groups={previewLevelGroups}
            />

            <label className={styles.section}>
                <input
                    type="checkbox"
                    className="form-check-input me-2"
                    checked={hasSubcategories}
                    onChange={(e) => setHasSubcategories(e.target.checked)}
                />
                These levels have subcategories
            </label>

            {hasSubcategories && (
                <div className={styles.section}>
                    <label
                        className={styles.fieldLabel}
                        htmlFor="subcategory-names"
                    >
                        Your subcategories
                    </label>
                    <textarea
                        id="subcategory-names"
                        aria-label="Your subcategories"
                        className="form-control"
                        rows={4}
                        placeholder={'Any%\n100%'}
                        value={subcategoryNamesRaw}
                        onChange={(e) => setSubcategoryNamesRaw(e.target.value)}
                    />
                    <p className="text-muted small mt-1 mb-0">
                        One subcategory per line — applies to every level.
                    </p>
                    {subcategoryDupes.length > 0 && (
                        <div className={`${styles.warnNote} mt-2`}>
                            Duplicate subcategor
                            {subcategoryDupes.length === 1 ? 'y' : 'ies'}{' '}
                            ignored: {subcategoryDupes.join(', ')}
                        </div>
                    )}

                    {levelNames.length > 0 && subcategoryNames.length > 0 && (
                        <div className={`${styles.tableScroll} mt-3`}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Level</th>
                                        {subcategoryNames.map((sub) => (
                                            <th
                                                key={sub}
                                                className={styles.colCenter}
                                            >
                                                {sub}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {levelNames.map((lvl) => (
                                        <tr key={lvl}>
                                            <td>{lvl}</td>
                                            {subcategoryNames.map((sub) => (
                                                <td
                                                    key={sub}
                                                    className={styles.colCenter}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input mt-0"
                                                        aria-label={`${sub} for ${lvl}`}
                                                        checked={
                                                            !isExcluded(
                                                                lvl,
                                                                sub,
                                                            )
                                                        }
                                                        onChange={(e) =>
                                                            toggleExclusion(
                                                                lvl,
                                                                sub,
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {error && <div className={`${styles.errorNote} mt-2`}>{error}</div>}
            {progress && <div className="text-muted small">{progress}</div>}
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                disabled={isSaving}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save & continue'}
            </button>
        </section>
    );
}
