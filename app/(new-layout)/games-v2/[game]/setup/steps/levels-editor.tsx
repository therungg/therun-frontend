'use client';

import { useMemo, useState, useTransition } from 'react';
import { deleteGroupAction } from '~src/actions/category-group/delete-group.action';
import { createLevelAction } from '~src/actions/levels/create-level.action';
import { createLevelBoardAction } from '~src/actions/levels/create-level-board.action';
import { createLevelTemplateAction } from '~src/actions/levels/create-level-template.action';
import { levelOpAction } from '~src/actions/levels/level-op.action';
import { updateLevelAction } from '~src/actions/levels/update-level.action';
import { normalizeSlug } from '~src/lib/normalize-slug';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import { updateVisibilityAction } from '../../manage/visibility/actions/update-visibility.action';
import { curateCategoryAction } from '../actions/curate-category.action';
import styles from '../setup.module.scss';
import { CategoryBandPreview } from './category-band-preview';
import type { CategorySeed } from './category-seed';
import {
    buildLevelSetupPlan,
    destructiveOps,
    type ExistingLevels,
    type LevelDraft,
    type LevelPlanOp,
    type SubcategoryDraft,
} from './level-plan';

const slug = (s: string) => normalizeSlug(s.trim());

/** Splits a textarea into trimmed names, de-duplicated by slug against each
 *  other and against `taken`, preserving first-seen order. */
function parseNameList(raw: string, taken: Set<string>): string[] {
    const seen = new Set(taken);
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

interface Props {
    /** setup: the wizard step (band preview, "Continue" when there are no
     * levels). manage: the console pane (always saves, never advances). */
    mode: 'setup' | 'manage';
    gameSlug: string;
    gameId: number;
    /** Timing seed for a full-game category adopted as a level board
     * (wizard only; the pane never adopts). */
    seed?: CategorySeed;
    existing: ExistingLevels;
    /** After a successful save. The wizard advances; the pane reloads. */
    onSaved: () => void;
    /** Wizard only: leave the step without saving. */
    onSkip?: () => void;
}

/**
 * Levels as two small tables and a matrix: the levels (name + rules), the
 * subcategories every level carries, and which level has which. Both the
 * wizard step and the console pane render this; the plan builder turns the
 * drafted tables into ordered writes against what already exists.
 */
export function LevelsEditor({
    mode,
    gameSlug,
    gameId,
    seed,
    existing,
    onSaved,
    onSkip,
}: Props) {
    const [hasLevels, setHasLevels] = useState(existing.levelGroups.length > 0);
    const [levels, setLevels] = useState<LevelDraft[]>(() =>
        existing.levelGroups.map((g) => ({
            key: `id:${g.id}`,
            id: g.id,
            name: g.name,
            rules: g.rules ?? '',
        })),
    );
    const [hasSubcategories, setHasSubcategories] = useState(
        existing.templates.length > 0,
    );
    const [subcategories, setSubcategories] = useState<SubcategoryDraft[]>(() =>
        existing.templates.map((t) => ({
            key: `id:${t.id}`,
            id: t.id,
            name: t.display,
        })),
    );
    const [excluded, setExcluded] = useState<Set<string>>(() => {
        const cells = new Set<string>();
        for (const e of existing.exclusions) {
            cells.add(`id:${e.groupId}|id:${e.templateId}`);
        }
        return cells;
    });
    const [nextKey, setNextKey] = useState(1);
    const [addLevelsRaw, setAddLevelsRaw] = useState('');
    const [addSubsRaw, setAddSubsRaw] = useState('');
    const [openRules, setOpenRules] = useState<Set<string>>(new Set());
    const [confirming, setConfirming] = useState<LevelPlanOp[] | null>(null);
    const [progress, setProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const state = useMemo(
        () => ({
            hasLevels,
            levels,
            hasSubcategories,
            subcategories,
            excluded: [...excluded].map((cell) => {
                const [levelKey, subcategoryKey] = cell.split('|');
                return { levelKey, subcategoryKey };
            }),
        }),
        [hasLevels, levels, hasSubcategories, subcategories, excluded],
    );
    const plan = useMemo(
        () => buildLevelSetupPlan(state, existing),
        [state, existing],
    );
    const destructive = useMemo(() => destructiveOps(plan), [plan]);

    const takenLevelSlugs = new Set(levels.map((l) => slug(l.name)));
    const takenSubSlugs = new Set(subcategories.map((s) => slug(s.name)));

    const addLevels = () => {
        const names = parseNameList(addLevelsRaw, takenLevelSlugs);
        if (names.length === 0) return;
        let k = nextKey;
        setLevels((prev) => [
            ...prev,
            ...names.map((name) => ({
                key: `new:${k++}`,
                id: null,
                name,
                rules: '',
            })),
        ]);
        setNextKey(k);
        setAddLevelsRaw('');
    };

    const addSubcategories = () => {
        const names = parseNameList(addSubsRaw, takenSubSlugs);
        if (names.length === 0) return;
        let k = nextKey;
        setSubcategories((prev) => [
            ...prev,
            ...names.map((name) => ({ key: `new:${k++}`, id: null, name })),
        ]);
        setNextKey(k);
        setAddSubsRaw('');
    };

    const removeLevel = (key: string) =>
        setLevels((prev) => prev.filter((l) => l.key !== key));
    const removeSubcategory = (key: string) =>
        setSubcategories((prev) => prev.filter((s) => s.key !== key));

    const setCell = (levelKey: string, subKey: string, included: boolean) =>
        setExcluded((prev) => {
            const next = new Set(prev);
            const cell = `${levelKey}|${subKey}`;
            if (included) next.delete(cell);
            else next.add(cell);
            return next;
        });

    // Preview-only synthetic groups/boards for the wizard's band preview.
    // Negative ids keep them out of the way of any real id.
    const previewLevelGroups: ResolvedGroup[] = useMemo(
        () =>
            levels.map((l, i) => ({
                id: -(i + 1),
                name: l.name,
                sortOrder: i,
                hiddenByDefault: false,
                kind: 'level' as const,
                rules: null,
            })),
        [levels],
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

    /** Runs the plan in order; returns the name of the first failed op. */
    const runPlan = async (ops: LevelPlanOp[]): Promise<string | null> => {
        const groupIdByKey = new Map<string, number>(
            levels.flatMap((l) =>
                l.id == null ? [] : [[l.key, l.id] as const],
            ),
        );
        const templateIdByKey = new Map<string, number>(
            subcategories.flatMap((s) =>
                s.id == null ? [] : [[s.key, s.id] as const],
            ),
        );
        for (let i = 0; i < ops.length; i++) {
            const op = ops[i];
            setProgress(`Saving ${i + 1} / ${ops.length}…`);
            switch (op.kind) {
                case 'delete-level': {
                    const res = await deleteGroupAction({
                        gameSlug,
                        gameId,
                        groupId: op.groupId,
                    });
                    if ('error' in res) return op.levelName;
                    break;
                }
                case 'archive-subcategory': {
                    const res = await updateVisibilityAction({
                        gameSlug,
                        gameId,
                        categoryId: op.templateId,
                        active: false,
                    });
                    if ('error' in res) return op.display;
                    break;
                }
                case 'create-level': {
                    const res = await createLevelAction({
                        gameSlug,
                        gameId,
                        name: op.levelName,
                    });
                    if ('error' in res) return op.levelName;
                    groupIdByKey.set(op.levelKey, res.result.id);
                    break;
                }
                case 'rename-level': {
                    const res = await updateLevelAction({
                        gameSlug,
                        gameId,
                        groupId: op.groupId,
                        name: op.levelName,
                    });
                    if ('error' in res) return op.levelName;
                    break;
                }
                case 'set-rules': {
                    const groupId = groupIdByKey.get(op.levelKey);
                    if (groupId === undefined) return op.levelName;
                    const res = await updateLevelAction({
                        gameSlug,
                        gameId,
                        groupId,
                        rules: op.rules,
                    });
                    if ('error' in res) return op.levelName;
                    break;
                }
                case 'create-subcategory': {
                    const res = await createLevelTemplateAction({
                        gameSlug,
                        gameId,
                        display: op.display,
                    });
                    if ('error' in res) return op.display;
                    templateIdByKey.set(op.subcategoryKey, res.result.id);
                    break;
                }
                case 'move-category': {
                    const groupId = groupIdByKey.get(op.levelKey);
                    if (groupId === undefined) return op.levelName;
                    const res = await curateCategoryAction({
                        gameSlug,
                        gameId,
                        categoryId: op.categoryId,
                        groupId,
                        isMain: true,
                        seed,
                    });
                    if ('error' in res) return op.levelName;
                    break;
                }
                case 'create-level-only-board': {
                    const groupId = groupIdByKey.get(op.levelKey);
                    if (groupId === undefined) return op.display;
                    const res = await createLevelBoardAction({
                        gameSlug,
                        gameId,
                        display: op.display,
                        groupId,
                        // Fresh level-only boards must appear on the public
                        // board immediately (createCategory defaults false).
                        isMain: true,
                    });
                    if ('error' in res) return op.display;
                    break;
                }
                case 'materialise': {
                    const res = await levelOpAction({
                        gameSlug,
                        gameId,
                        op: { op: 'level-materialise' },
                    });
                    if ('error' in res) return 'missing boards';
                    break;
                }
                case 'set-exclusion': {
                    const groupId = groupIdByKey.get(op.levelKey);
                    if (groupId === undefined) return op.levelName;
                    const templateId = templateIdByKey.get(op.subcategoryKey);
                    if (templateId === undefined) return op.subcategoryName;
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
                    break;
                }
                case 'resync-instance': {
                    const res = await levelOpAction({
                        gameSlug,
                        gameId,
                        op: { op: 'level-resync', categoryId: op.categoryId },
                    });
                    if ('error' in res) return 'a level board';
                    break;
                }
            }
        }
        return null;
    };

    const execute = (ops: LevelPlanOp[]) => {
        setConfirming(null);
        startSaving(async () => {
            setError(null);
            const failedName = await runPlan(ops);
            setProgress(null);
            if (failedName) {
                setError(`Failed to save "${failedName}".`);
                return;
            }
            onSaved();
        });
    };

    const save = () => {
        if (mode === 'setup' && plan.length === 0) {
            onSaved();
            return;
        }
        if (destructive.length > 0) {
            setConfirming(plan);
            return;
        }
        execute(plan);
    };

    const saveLabel = isSaving
        ? 'Saving…'
        : mode === 'setup'
          ? 'Save & continue'
          : 'Save changes';
    const nothingToSave = mode === 'manage' && plan.length === 0;

    const hasLevelsToggle = (
        <label className={styles.section}>
            <input
                type="checkbox"
                className="form-check-input me-2"
                checked={hasLevels}
                onChange={(e) => setHasLevels(e.target.checked)}
            />
            This game has individual levels
        </label>
    );

    if (!hasLevels && existing.levelGroups.length === 0) {
        return (
            <div>
                {hasLevelsToggle}
                <p className="text-muted small">
                    Most games don&apos;t need this — skip it unless runners
                    race individual levels or stages separately from the full
                    game.
                </p>
                {mode === 'setup' && (
                    <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={onSkip ?? onSaved}
                    >
                        Continue
                    </button>
                )}
            </div>
        );
    }

    return (
        <div>
            {hasLevelsToggle}

            {!hasLevels && (
                <div className={`${styles.warnNote} mb-3`}>
                    Saving removes every level and archives its boards.
                </div>
            )}

            {hasLevels && (
                <div className={styles.section}>
                    <div className={styles.fieldLabel}>Levels</div>
                    {levels.length > 0 && (
                        <div className={styles.tableScroll}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Level</th>
                                        <th>Rules</th>
                                        <th className={styles.colActions}>
                                            <span className="visually-hidden">
                                                Actions
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {levels.map((l) => (
                                        <tr key={l.key}>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    aria-label={`Level name: ${l.name}`}
                                                    value={l.name}
                                                    onChange={(e) =>
                                                        setLevels((prev) =>
                                                            prev.map((x) =>
                                                                x.key === l.key
                                                                    ? {
                                                                          ...x,
                                                                          name: e
                                                                              .target
                                                                              .value,
                                                                      }
                                                                    : x,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td>
                                                {openRules.has(l.key) ? (
                                                    <textarea
                                                        className="form-control form-control-sm"
                                                        rows={3}
                                                        aria-label={`Rules for ${l.name}`}
                                                        placeholder="Level-specific rules, shown above the category rules."
                                                        value={l.rules}
                                                        onChange={(e) =>
                                                            setLevels((prev) =>
                                                                prev.map((x) =>
                                                                    x.key ===
                                                                    l.key
                                                                        ? {
                                                                              ...x,
                                                                              rules: e
                                                                                  .target
                                                                                  .value,
                                                                          }
                                                                        : x,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.skipAction
                                                        }
                                                        onClick={() =>
                                                            setOpenRules(
                                                                (prev) =>
                                                                    new Set(
                                                                        prev,
                                                                    ).add(
                                                                        l.key,
                                                                    ),
                                                            )
                                                        }
                                                    >
                                                        {l.rules.trim()
                                                            ? 'Edit rules'
                                                            : 'Add rules'}
                                                    </button>
                                                )}
                                            </td>
                                            <td className={styles.colActions}>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.dangerAction
                                                    }
                                                    aria-label={`Remove ${l.name}`}
                                                    onClick={() =>
                                                        removeLevel(l.key)
                                                    }
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <label className={styles.fieldLabel} htmlFor="add-levels">
                        {levels.length > 0 ? 'Add levels' : 'Your levels'}
                    </label>
                    <textarea
                        id="add-levels"
                        className="form-control"
                        rows={4}
                        placeholder={'E1M1\nE1M2\nE1M3'}
                        value={addLevelsRaw}
                        onChange={(e) => setAddLevelsRaw(e.target.value)}
                    />
                    <p className="text-muted small mt-1 mb-2">
                        One level per line. Names already in the table are
                        skipped.
                    </p>
                    <button
                        type="button"
                        className={styles.secondaryAction}
                        disabled={!addLevelsRaw.trim()}
                        onClick={addLevels}
                    >
                        Add to table
                    </button>
                </div>
            )}

            {hasLevels && mode === 'setup' && (
                <CategoryBandPreview
                    categories={previewLevelBoards}
                    groups={previewLevelGroups}
                />
            )}

            {hasLevels && (
                <label className={styles.section}>
                    <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={hasSubcategories}
                        onChange={(e) => setHasSubcategories(e.target.checked)}
                    />
                    These levels have subcategories
                </label>
            )}

            {hasLevels &&
                !hasSubcategories &&
                existing.templates.length > 0 && (
                    <div className={`${styles.warnNote} mb-3`}>
                        Saving archives every level subcategory and its boards;
                        each level gets a single board instead.
                    </div>
                )}

            {hasLevels && hasSubcategories && (
                <div className={styles.section}>
                    <div className={styles.fieldLabel}>Subcategories</div>
                    {subcategories.length > 0 && (
                        <div className={styles.tableScroll}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Subcategory</th>
                                        <th className={styles.colActions}>
                                            <span className="visually-hidden">
                                                Actions
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subcategories.map((s) => (
                                        <tr key={s.key}>
                                            <td>
                                                {s.id == null ? (
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        aria-label={`Subcategory name: ${s.name}`}
                                                        value={s.name}
                                                        onChange={(e) =>
                                                            setSubcategories(
                                                                (prev) =>
                                                                    prev.map(
                                                                        (x) =>
                                                                            x.key ===
                                                                            s.key
                                                                                ? {
                                                                                      ...x,
                                                                                      name: e
                                                                                          .target
                                                                                          .value,
                                                                                  }
                                                                                : x,
                                                                    ),
                                                            )
                                                        }
                                                    />
                                                ) : (
                                                    s.name
                                                )}
                                            </td>
                                            <td className={styles.colActions}>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.dangerAction
                                                    }
                                                    aria-label={`Remove ${s.name}`}
                                                    onClick={() =>
                                                        removeSubcategory(s.key)
                                                    }
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <label
                        className={styles.fieldLabel}
                        htmlFor="add-subcategories"
                    >
                        {subcategories.length > 0
                            ? 'Add subcategories'
                            : 'Your subcategories'}
                    </label>
                    <textarea
                        id="add-subcategories"
                        className="form-control"
                        rows={3}
                        placeholder={'Any%\n100%'}
                        value={addSubsRaw}
                        onChange={(e) => setAddSubsRaw(e.target.value)}
                    />
                    <p className="text-muted small mt-1 mb-2">
                        One subcategory per line — applies to every level unless
                        unchecked below.
                    </p>
                    <button
                        type="button"
                        className={styles.secondaryAction}
                        disabled={!addSubsRaw.trim()}
                        onClick={addSubcategories}
                    >
                        Add to table
                    </button>

                    {levels.length > 0 && subcategories.length > 0 && (
                        <div className={`${styles.tableScroll} mt-3`}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Level</th>
                                        {subcategories.map((s) => (
                                            <th
                                                key={s.key}
                                                className={styles.colCenter}
                                            >
                                                {s.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {levels.map((l) => (
                                        <tr key={l.key}>
                                            <td>{l.name}</td>
                                            {subcategories.map((s) => (
                                                <td
                                                    key={s.key}
                                                    className={styles.colCenter}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input mt-0"
                                                        aria-label={`${s.name} for ${l.name}`}
                                                        checked={
                                                            !excluded.has(
                                                                `${l.key}|${s.key}`,
                                                            )
                                                        }
                                                        onChange={(e) =>
                                                            setCell(
                                                                l.key,
                                                                s.key,
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

            {confirming && (
                <div
                    className={`${styles.warnNote} mb-3`}
                    role="alertdialog"
                    aria-label="Confirm removals"
                >
                    <p className="mb-2">
                        This save archives boards. Runs stay on the archived
                        boards but leave the public page:
                    </p>
                    <ul className="mb-2">
                        {destructiveOps(confirming).map((op) =>
                            op.kind === 'delete-level' ? (
                                <li key={`l${op.groupId}`}>
                                    Delete level <strong>{op.levelName}</strong>{' '}
                                    and archive its boards
                                </li>
                            ) : op.kind === 'archive-subcategory' ? (
                                <li key={`t${op.templateId}`}>
                                    Archive subcategory{' '}
                                    <strong>{op.display}</strong> on every level
                                </li>
                            ) : null,
                        )}
                    </ul>
                    <button
                        type="button"
                        className={`${styles.primaryAction} me-2`}
                        onClick={() => execute(confirming)}
                    >
                        Archive and save
                    </button>
                    <button
                        type="button"
                        className={styles.secondaryAction}
                        onClick={() => setConfirming(null)}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {error && <div className={`${styles.errorNote} mt-2`}>{error}</div>}
            {progress && <div className="text-muted small">{progress}</div>}
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                disabled={isSaving || nothingToSave || confirming !== null}
                onClick={save}
            >
                {saveLabel}
            </button>
        </div>
    );
}
