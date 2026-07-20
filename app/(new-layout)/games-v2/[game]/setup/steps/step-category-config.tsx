'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Check2 } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import { suggestMinTimeMs } from '~src/lib/setup/suggestions';
import { parseTimeInput } from '~src/lib/time-input';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { PolicyType } from '../../../../../../types/moderation.types';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import { createPolicyAction } from '../../manage/moderation/policies/actions/policies-actions.action';
import { updateTimingSettingsAction } from '../../manage/timing/actions/update-timing-settings.action';
import { createVariableAction } from '../../manage/variables/actions/create-variable.action';
import { deleteVariableAction } from '../../manage/variables/actions/delete-variable.action';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import {
    CategoryLeaderboardPreview,
    type PreviewDraft,
} from '../category-leaderboard-preview';
import styles from '../setup.module.scss';
import type { StepProps, WizardData } from '../types';

const STARTER_TEMPLATE = `Timing starts on [first input / cutscene end].
Timing ends on [final hit / last input].

- Video proof is [required / recommended] for all submissions.
- Allowed platforms and versions: [list them].
- No cheating, game modifications, or macros. Emulator: [allowed / banned].
`;

function toPrimaryTiming(short: 'rt' | 'gt'): PrimaryTiming {
    return short === 'gt' ? 'gametime' : 'realtime';
}

function formatMs(ms: number): string {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
}

function urlFor(gameSlug: string, catId: number): string {
    return `/games-v2/${gameSlug}/setup?step=category-config&cat=${catId}`;
}

export function StepCategoryConfig({ data, onAdvance }: StepProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const mains = data.categories
        .filter((c) => !c.archived && (c.isMain ?? false))
        .sort(
            (a, b) =>
                (b.totalFinishedAttemptCount ?? 0) -
                (a.totalFinishedAttemptCount ?? 0),
        );

    if (mains.length === 0) {
        return (
            <section>
                <h2 className="h4">Category configuration</h2>
                <p className="text-muted">
                    Pick your featured categories first — timing, rules,
                    variables, and standards are configured per featured
                    category.
                </p>
                <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={() => {
                        router.replace(
                            `/games-v2/${data.game.name}/setup?step=categories`,
                            { scroll: true },
                        );
                        router.refresh();
                    }}
                >
                    Choose categories
                </button>
            </section>
        );
    }

    const catParam = searchParams.get('cat');
    const catId = catParam ? Number(catParam) : Number.NaN;
    const current = mains.find((c) => c.id === catId) ?? mains[0];

    return (
        <CategoryConfigBody
            key={current.id}
            data={data}
            mains={mains}
            current={current}
            onAdvance={onAdvance}
        />
    );
}

function CategoryConfigBody({
    data,
    mains,
    current,
    onAdvance,
}: {
    data: WizardData;
    mains: ResolvedCategory[];
    current: ResolvedCategory;
    onAdvance: () => void;
}) {
    const router = useRouter();
    const index = mains.findIndex((c) => c.id === current.id);
    const isLast = index === mains.length - 1;

    const [previewDraft, setPreviewDraft] = useState<PreviewDraft>({
        primaryTiming: toPrimaryTiming(current.primaryTiming),
        hideRealTime: current.hideRealTime ?? false,
        hideGameTime: current.hideGameTime ?? false,
        showMilliseconds: current.showMilliseconds ?? true,
        minTimeMs: null,
        minGameTimeMs: null,
        requireVideo: current.requireVideo ?? false,
    });
    const updatePreviewDraft = useCallback(
        (partial: Partial<PreviewDraft>) =>
            setPreviewDraft((d) => ({ ...d, ...partial })),
        [],
    );

    const goToCategory = (id: number) => {
        router.replace(urlFor(data.game.name, id), { scroll: true });
        router.refresh();
    };

    const handleNext = () => {
        if (isLast) {
            onAdvance();
        } else {
            goToCategory(mains[index + 1].id);
        }
    };

    return (
        <section>
            <h2 className="h4">
                Category {index + 1} of {mains.length} — {current.display}
            </h2>
            <div className="d-flex gap-2 flex-wrap mb-3">
                {mains.map((c, i) => (
                    <button
                        key={c.id}
                        type="button"
                        className={`btn btn-sm ${
                            c.id === current.id
                                ? 'btn-primary'
                                : 'btn-outline-secondary'
                        }`}
                        onClick={() => goToCategory(c.id)}
                    >
                        {i + 1}. {c.display}
                    </button>
                ))}
            </div>

            <div className="row">
                <div className="col-lg-7">
                    <TimingSection
                        data={data}
                        category={current}
                        onDraftChange={updatePreviewDraft}
                    />
                    <RulesSection data={data} category={current} />
                    <VariablesSection data={data} category={current} />
                    <StandardsSection
                        data={data}
                        category={current}
                        onDraftChange={updatePreviewDraft}
                    />
                </div>
                <div className="col-lg-5">
                    <div className="position-sticky" style={{ top: '1rem' }}>
                        <CategoryLeaderboardPreview
                            gameSlug={data.game.name}
                            categorySlug={current.name}
                            draft={previewDraft}
                        />
                    </div>
                </div>
            </div>

            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                onClick={handleNext}
            >
                {isLast
                    ? 'Continue to all-categories settings'
                    : 'Next category →'}
            </button>
        </section>
    );
}

// ── Timing ───────────────────────────────────────────────────────────────

function TimingSection({
    data,
    category,
    onDraftChange,
}: {
    data: WizardData;
    category: ResolvedCategory;
    onDraftChange?: (partial: Partial<PreviewDraft>) => void;
}) {
    const [primaryTiming, setPrimaryTiming] = useState<PrimaryTiming>(
        toPrimaryTiming(category.primaryTiming),
    );
    const [hideRealTime, setHideRealTime] = useState(
        category.hideRealTime ?? false,
    );
    const [hideGameTime, setHideGameTime] = useState(
        category.hideGameTime ?? false,
    );
    const [showMilliseconds, setShowMilliseconds] = useState(
        category.showMilliseconds ?? true,
    );
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [isSaving, startSaving] = useTransition();

    const bothHidden = hideRealTime && hideGameTime;

    useEffect(() => {
        onDraftChange?.({
            primaryTiming,
            hideRealTime,
            hideGameTime,
            showMilliseconds,
        });
    }, [
        primaryTiming,
        hideRealTime,
        hideGameTime,
        showMilliseconds,
        onDraftChange,
    ]);

    const save = () => {
        setSaved(false);
        startSaving(async () => {
            setError(null);
            const timingRes = await updateTimingSettingsAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: category.id,
                primaryTiming,
                hideRealTime,
                hideGameTime,
            });
            const msRes = await updateCategorySettingsAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: category.id,
                showMilliseconds,
            });
            if ('error' in timingRes || 'error' in msRes) {
                const msg =
                    ('error' in timingRes && timingRes.error) ||
                    ('error' in msRes && msRes.error) ||
                    'Save failed';
                setError(msg);
                return;
            }
            setSaved(true);
            toast.success('Timing saved');
        });
    };

    return (
        <section className={styles.section}>
            <h3 className="h6">
                Timing {saved && <Check2 size={14} aria-label="saved" />}
            </h3>
            <div className="row g-3 align-items-end">
                <div className="col-auto">
                    <label
                        className="form-label small mb-1"
                        htmlFor={`primary-${category.id}`}
                    >
                        Primary
                    </label>
                    <select
                        id={`primary-${category.id}`}
                        className="form-select form-select-sm"
                        value={primaryTiming}
                        onChange={(e) =>
                            setPrimaryTiming(e.target.value as PrimaryTiming)
                        }
                    >
                        <option value="realtime">RTA</option>
                        <option value="gametime">IGT</option>
                    </select>
                </div>
                <div className="col-auto form-check">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        id={`showrt-${category.id}`}
                        checked={!hideRealTime}
                        onChange={(e) => setHideRealTime(!e.target.checked)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor={`showrt-${category.id}`}
                    >
                        Show RT
                    </label>
                </div>
                <div className="col-auto form-check">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        id={`showigt-${category.id}`}
                        checked={!hideGameTime}
                        onChange={(e) => setHideGameTime(!e.target.checked)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor={`showigt-${category.id}`}
                    >
                        Show IGT
                    </label>
                </div>
                <div className="col-auto form-check">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        id={`ms-${category.id}`}
                        checked={showMilliseconds}
                        onChange={(e) => setShowMilliseconds(e.target.checked)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor={`ms-${category.id}`}
                    >
                        Milliseconds
                    </label>
                </div>
            </div>
            {bothHidden && (
                <div className={`${styles.errorNote} mt-2 mb-0`}>
                    A category can’t hide both RT and IGT.
                </div>
            )}
            {error && (
                <div className={`${styles.errorNote} mt-2 mb-0`}>{error}</div>
            )}
            <button
                type="button"
                className="btn btn-sm btn-outline-primary mt-2"
                disabled={isSaving || bothHidden}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save timing'}
            </button>
        </section>
    );
}

// ── Rules ────────────────────────────────────────────────────────────────

function RulesSection({
    data,
    category,
}: {
    data: WizardData;
    category: ResolvedCategory;
}) {
    const [rules, setRules] = useState(
        category.rules?.trim() ? category.rules : STARTER_TEMPLATE,
    );
    const [saved, setSaved] = useState(
        (category.rules ?? '').trim().length > 0,
    );
    const [isSaving, startSaving] = useTransition();

    const save = () => {
        startSaving(async () => {
            const res = await updateCategorySettingsAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: category.id,
                rules,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setSaved(true);
            toast.success('Rules saved');
        });
    };

    return (
        <section className={styles.section}>
            <h3 className="h6">
                Rules {saved && <Check2 size={14} aria-label="saved" />}
            </h3>
            <p className="text-muted small mb-2">
                Replace the [bracketed] parts. Nothing is saved until you click
                Save rules.
            </p>
            <textarea
                className="form-control font-monospace"
                rows={8}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
            />
            <button
                type="button"
                className="btn btn-sm btn-outline-primary mt-2"
                disabled={isSaving}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save rules'}
            </button>
        </section>
    );
}

// ── Variables ────────────────────────────────────────────────────────────

interface VariableTemplate {
    name: string;
    role: 'subcategory' | 'filter';
    values: string[];
    blurb: string;
}

const TEMPLATES: VariableTemplate[] = [
    {
        name: 'Platform',
        role: 'filter',
        values: ['PC', 'Switch', 'PS5', 'Xbox'],
        blurb: 'One board, viewers can narrow by platform',
    },
    {
        name: 'Version',
        role: 'filter',
        values: ['1.0', 'Latest'],
        blurb: 'Filter by game version or patch',
    },
    {
        name: 'Difficulty',
        role: 'subcategory',
        values: ['Easy', 'Normal', 'Hard'],
        blurb: 'Each difficulty gets its own rankings',
    },
    {
        name: 'Character',
        role: 'subcategory',
        values: ['Character 1', 'Character 2'],
        blurb: 'Each character gets its own rankings',
    },
];

interface VariableEditorState {
    name: string;
    role: 'subcategory' | 'filter';
    valuesText: string;
}

function VariablesSection({
    data,
    category,
}: {
    data: WizardData;
    category: ResolvedCategory;
}) {
    const [variables, setVariables] = useState<VariableRow[]>(
        data.variables.filter((v) => v.categoryId === category.id),
    );
    const [editor, setEditor] = useState<VariableEditorState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();
    const [confirmDelete, setConfirmDelete] = useState<VariableRow | null>(
        null,
    );
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const openTemplate = (t: VariableTemplate) =>
        setEditor({
            name: t.name,
            role: t.role,
            valuesText: t.values.join(', '),
        });

    const saveVariable = () => {
        if (!editor) return;
        startSaving(async () => {
            setError(null);
            const values = editor.valuesText
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
                .map((v) => [v]);
            if (values.length < 2) {
                setError('A variable needs at least two values.');
                return;
            }
            const res = await createVariableAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                body: {
                    categoryId: category.id,
                    name: editor.name.trim(),
                    role: editor.role,
                    values,
                },
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setVariables((vs) => [...vs, res.result]);
            setEditor(null);
            toast.success(`Variable "${res.result.name}" created`);
            // No router.refresh() here: it would remount the step (renderedAt
            // key) and wipe unsaved sibling-section drafts. Local state covers
            // this mount; navigation refreshes re-sync server data.
        });
    };

    const removeVariable = (v: VariableRow) => {
        setConfirmDelete(v);
    };

    const closeConfirmDelete = () => {
        setConfirmDelete(null);
        setDeleteError(null);
    };

    const doRemoveVariable = (v: VariableRow) => {
        startSaving(async () => {
            setDeleteError(null);
            const res = await deleteVariableAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: v.categoryId,
                name: v.name,
            });
            if ('error' in res) {
                setDeleteError(res.error);
                return;
            }
            setVariables((vs) => vs.filter((x) => x.id !== v.id));
            // No router.refresh() — see saveVariable.
            setConfirmDelete(null);
        });
    };

    return (
        <section className={styles.section}>
            <h3 className="h6">Variables</h3>
            <p className="small text-muted mb-2">
                <strong>Subcategory</strong> splits this category into separate
                boards per value (e.g. Difficulty). <strong>Filter</strong>{' '}
                keeps one board that viewers can narrow (e.g. Platform).
            </p>

            <p className="mb-1">Start from a template:</p>
            <div className="d-flex gap-2 flex-wrap mb-3">
                {TEMPLATES.map((t) => (
                    <button
                        key={t.name}
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        title={t.blurb}
                        onClick={() => openTemplate(t)}
                    >
                        {t.name}
                    </button>
                ))}
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() =>
                        setEditor({
                            name: '',
                            role: 'filter',
                            valuesText: '',
                        })
                    }
                >
                    + Custom variable
                </button>
            </div>

            {editor && (
                <div className={styles.section}>
                    <label
                        className="form-label"
                        htmlFor={`var-name-${category.id}`}
                    >
                        Name
                    </label>
                    <input
                        id={`var-name-${category.id}`}
                        className="form-control"
                        value={editor.name}
                        onChange={(e) =>
                            setEditor({ ...editor, name: e.target.value })
                        }
                    />
                    <div className="mt-2">
                        <label className="form-check-label me-3">
                            <input
                                type="radio"
                                className="form-check-input me-1"
                                checked={editor.role === 'subcategory'}
                                onChange={() =>
                                    setEditor({
                                        ...editor,
                                        role: 'subcategory',
                                    })
                                }
                            />
                            Subcategory — separate boards per value
                        </label>
                        <label className="form-check-label">
                            <input
                                type="radio"
                                className="form-check-input me-1"
                                checked={editor.role === 'filter'}
                                onChange={() =>
                                    setEditor({ ...editor, role: 'filter' })
                                }
                            />
                            Filter — one board, narrowable
                        </label>
                    </div>
                    <label
                        className="form-label mt-2"
                        htmlFor={`var-values-${category.id}`}
                    >
                        Values (comma-separated)
                    </label>
                    <input
                        id={`var-values-${category.id}`}
                        className="form-control"
                        value={editor.valuesText}
                        onChange={(e) =>
                            setEditor({
                                ...editor,
                                valuesText: e.target.value,
                            })
                        }
                        placeholder="PC, Switch, PS5"
                    />
                    {error && (
                        <div className={`${styles.errorNote} mt-2 mb-0`}>
                            {error}
                        </div>
                    )}
                    <div className="d-flex gap-2 mt-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={isSaving || !editor.name.trim()}
                            onClick={saveVariable}
                        >
                            {isSaving ? 'Saving…' : 'Save variable'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditor(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {variables.length > 0 && (
                <ul className={`${styles.rows} mb-0`}>
                    {variables.map((v) => (
                        <li key={v.id} className={styles.rowItem}>
                            <strong>{v.name}</strong>
                            <span className={styles.pendingPill}>{v.role}</span>
                            <span className="text-muted small">
                                {v.values.map((bucket) => bucket[0]).join(', ')}
                            </span>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger ms-auto"
                                disabled={isSaving}
                                onClick={() => removeVariable(v)}
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <ConfirmDialog
                open={confirmDelete != null}
                onClose={closeConfirmDelete}
                onConfirm={() => {
                    if (confirmDelete) doRemoveVariable(confirmDelete);
                }}
                labelledBy={`delete-variable-title-${category.id}`}
                title="Delete variable?"
                message={`Delete variable "${confirmDelete?.name}"? Existing finished runs keep their resolved values until a re-resolve worker runs.`}
                confirmLabel="Delete"
                pending={isSaving}
                error={deleteError}
            />
        </section>
    );
}

// ── Standards ────────────────────────────────────────────────────────────

function StandardsSection({
    data,
    category,
    onDraftChange,
}: {
    data: WizardData;
    category: ResolvedCategory;
    onDraftChange?: (partial: Partial<PreviewDraft>) => void;
}) {
    const [requireVideo, setRequireVideo] = useState(
        category.requireVideo ?? false,
    );
    const [topNOnly, setTopNOnly] = useState(
        (category.requireVideoTopN ?? null) !== null,
    );
    const [topN, setTopN] = useState(String(category.requireVideoTopN ?? 5));
    const [minTimeEnabled, setMinTimeEnabled] = useState(false);
    const [minTimeText, setMinTimeText] = useState('');
    const [minGameTimeEnabled, setMinGameTimeEnabled] = useState(false);
    const [minGameTimeText, setMinGameTimeText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const [createdPolicies, setCreatedPolicies] = useState<Set<string>>(
        new Set(),
    );

    useEffect(() => {
        const parsedMinTime = minTimeEnabled
            ? parseTimeInput(minTimeText)
            : null;
        const parsedMinGameTime = minGameTimeEnabled
            ? parseTimeInput(minGameTimeText)
            : null;
        onDraftChange?.({
            requireVideo,
            minTimeMs:
                parsedMinTime && parsedMinTime > 0 ? parsedMinTime : null,
            minGameTimeMs:
                parsedMinGameTime && parsedMinGameTime > 0
                    ? parsedMinGameTime
                    : null,
        });
    }, [
        requireVideo,
        minTimeEnabled,
        minTimeText,
        minGameTimeEnabled,
        minGameTimeText,
        onDraftChange,
    ]);

    const policyExists = (type: PolicyType) =>
        data.policies.some(
            (p) => p.policyType === type && p.categoryId === category.id,
        ) || createdPolicies.has(`${type}:${category.id ?? 'null'}`);

    const wr = data.wrTimes[category.id] ?? null;
    const suggestion = suggestMinTimeMs(
        wr,
        category.totalFinishedAttemptCount ?? 0,
    );

    const save = () => {
        setSaved(false);
        setError(null);

        if (
            requireVideo &&
            topNOnly &&
            (!Number.isInteger(Number(topN)) || Number(topN) <= 0)
        ) {
            setError('Top N must be a positive whole number.');
            return;
        }

        startSaving(async () => {
            setError(null);

            const videoRes = await updateCategorySettingsAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: category.id,
                requireVideo,
                requireVideoTopN:
                    requireVideo && topNOnly ? Number(topN) : null,
            });
            if ('error' in videoRes) {
                setError(videoRes.error);
                return;
            }

            let skippedExisting = false;
            if (minTimeEnabled || minGameTimeEnabled) {
                if (policyExists('min_time')) {
                    skippedExisting = true;
                } else {
                    const value: {
                        minTimeMs?: number;
                        minGameTimeMs?: number;
                    } = {};
                    if (minTimeEnabled) {
                        const ms = parseTimeInput(minTimeText);
                        if (!ms || ms <= 0) {
                            setError(
                                'Enter the minimum time as h:mm:ss, m:ss, or seconds.',
                            );
                            return;
                        }
                        value.minTimeMs = ms;
                    }
                    if (minGameTimeEnabled) {
                        const gtMs = parseTimeInput(minGameTimeText);
                        if (!gtMs || gtMs <= 0) {
                            setError(
                                'Enter the in-game time minimum as h:mm:ss, m:ss, or seconds.',
                            );
                            return;
                        }
                        value.minGameTimeMs = gtMs;
                    }
                    const res = await createPolicyAction(data.game.name, {
                        policyType: 'min_time',
                        value,
                        categoryId: category.id,
                    });
                    if ('error' in res) {
                        setError(res.error);
                        return;
                    }
                    setCreatedPolicies((prev) =>
                        new Set(prev).add(`min_time:${category.id ?? 'null'}`),
                    );
                }
            }

            if (skippedExisting) {
                toast.info(
                    'A minimum-time policy already exists for this category — edit it in Manage → Minimum time.',
                );
            }
            setSaved(true);
            toast.success('Standards saved');
        });
    };

    return (
        <section className={styles.section}>
            <h3 className="h6">
                Standards {saved && <Check2 size={14} aria-label="saved" />}
            </h3>

            <div className={styles.section}>
                <label className="form-check-label">
                    <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={requireVideo}
                        onChange={(e) => setRequireVideo(e.target.checked)}
                    />
                    <strong>Require video proof</strong>
                </label>
                {requireVideo && (
                    <div className="mt-2 ms-4">
                        <label className="form-check-label">
                            <input
                                type="checkbox"
                                className="form-check-input me-2"
                                checked={topNOnly}
                                onChange={(e) => setTopNOnly(e.target.checked)}
                            />
                            Only for top
                        </label>{' '}
                        <input
                            className="form-control form-control-sm d-inline-block"
                            style={{ width: '4rem' }}
                            inputMode="numeric"
                            value={topN}
                            disabled={!topNOnly}
                            onChange={(e) => setTopN(e.target.value)}
                        />{' '}
                        places
                    </div>
                )}
            </div>

            <div className={styles.section}>
                <label className="form-check-label">
                    <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={minTimeEnabled}
                        onChange={(e) => setMinTimeEnabled(e.target.checked)}
                    />
                    <strong>Minimum time</strong>{' '}
                    <span className="text-muted small">
                        auto-flags impossibly fast submissions
                    </span>
                </label>
                {minTimeEnabled && (
                    <div className="mt-2 ms-4">
                        <input
                            className="form-control w-auto d-inline-block"
                            value={minTimeText}
                            onChange={(e) => setMinTimeText(e.target.value)}
                            placeholder="e.g. 10:00"
                        />
                        {suggestion !== null && wr !== null && (
                            <button
                                type="button"
                                className="btn btn-link btn-sm"
                                onClick={() =>
                                    setMinTimeText(formatMs(suggestion))
                                }
                            >
                                Fastest verified run is {formatMs(wr)} — suggest{' '}
                                {formatMs(suggestion)}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.section}>
                <label className="form-check-label">
                    <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={minGameTimeEnabled}
                        onChange={(e) =>
                            setMinGameTimeEnabled(e.target.checked)
                        }
                    />
                    <strong>In-game time minimum</strong>{' '}
                    <span className="text-muted small">
                        optional, only for categories that track IGT
                    </span>
                </label>
                {minGameTimeEnabled && (
                    <div className="mt-2 ms-4">
                        <input
                            className="form-control w-auto d-inline-block"
                            value={minGameTimeText}
                            onChange={(e) => setMinGameTimeText(e.target.value)}
                            placeholder="e.g. 10:00"
                        />
                    </div>
                )}
            </div>

            {error && <div className={styles.errorNote}>{error}</div>}
            <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                disabled={isSaving}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save standards'}
            </button>
        </section>
    );
}
