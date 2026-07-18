'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import { createPolicyAction } from '../../manage/moderation/policies/actions/policies-actions.action';
import { updateTimingSettingsAction } from '../../manage/timing/actions/update-timing-settings.action';
import { createVariableAction } from '../../manage/variables/actions/create-variable.action';
import { deleteVariableAction } from '../../manage/variables/actions/delete-variable.action';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import styles from '../setup.module.scss';
import type { StepProps, WizardData } from '../types';

export function StepDefaults({ data, onAdvance }: StepProps) {
    return (
        <section>
            <h2 className="h4">Settings for all categories</h2>
            <p className="text-muted small">
                Optional bulk pass — apply the same defaults across every
                featured category, set a game-wide review policy, and add
                variables that aren’t tied to a single category. Nothing here is
                required.
            </p>
            <BulkApplySection data={data} />
            <GameWideVariablesSection data={data} />
            <button
                type="button"
                className="btn btn-primary mt-2"
                onClick={onAdvance}
            >
                Continue
            </button>
        </section>
    );
}

// ── Zone 1 + 1b: bulk apply to all main categories ──────────────────────────

function BulkApplySection({ data }: { data: WizardData }) {
    const mains = data.categories.filter(
        (c) => (c.active ?? true) && (c.isMain ?? false),
    );

    const [enablePrimary, setEnablePrimary] = useState(false);
    const [primaryTiming, setPrimaryTiming] =
        useState<PrimaryTiming>('realtime');

    const [enableShowRt, setEnableShowRt] = useState(false);
    const [showRt, setShowRt] = useState(true);

    const [enableShowIgt, setEnableShowIgt] = useState(false);
    const [showIgt, setShowIgt] = useState(true);

    const [enableMs, setEnableMs] = useState(false);
    const [showMilliseconds, setShowMilliseconds] = useState(true);

    const [enableRequireVideo, setEnableRequireVideo] = useState(false);
    const [requireVideo, setRequireVideo] = useState(true);
    const [topN, setTopN] = useState('');

    const [enablePolicy, setEnablePolicy] = useState(false);

    const [guardError, setGuardError] = useState<string | null>(null);
    const [policyError, setPolicyError] = useState<string | null>(null);
    const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
    const [progress, setProgress] = useState<string | null>(null);
    const [isApplying, startApplying] = useTransition();
    const [createdPolicies, setCreatedPolicies] = useState<Set<string>>(
        new Set(),
    );

    const anyMainRowEnabled =
        enablePrimary ||
        enableShowRt ||
        enableShowIgt ||
        enableMs ||
        enableRequireVideo;
    const anyEnabled = anyMainRowEnabled || enablePolicy;

    const apply = () => {
        setGuardError(null);
        setPolicyError(null);

        if (enableShowRt && enableShowIgt && !showRt && !showIgt) {
            setGuardError(
                'A category can’t hide both real time and in-game time — turn at least one back on.',
            );
            return;
        }

        if (enableShowRt !== enableShowIgt) {
            const offender = mains.find(
                (c) =>
                    (enableShowRt && !showRt && (c.hideGameTime ?? false)) ||
                    (enableShowIgt && !showIgt && (c.hideRealTime ?? false)),
            );
            if (offender) {
                setGuardError(
                    `Turning this off would leave ${offender.display} with no time shown — enable the other toggle too or adjust that category first.`,
                );
                return;
            }
        }

        if (
            enableRequireVideo &&
            requireVideo &&
            topN.trim() &&
            (!Number.isInteger(Number(topN)) || Number(topN) <= 0)
        ) {
            setGuardError('Top N must be a positive whole number.');
            return;
        }

        startApplying(async () => {
            const newErrors: Record<number, string> = {};

            if (anyMainRowEnabled) {
                for (let i = 0; i < mains.length; i++) {
                    const cat = mains[i];
                    setProgress(`Applying ${i + 1} / ${mains.length}…`);

                    if (enablePrimary || enableShowRt || enableShowIgt) {
                        const hideRt = enableShowRt
                            ? !showRt
                            : (cat.hideRealTime ?? false);
                        const hideGt = enableShowIgt
                            ? !showIgt
                            : (cat.hideGameTime ?? false);
                        const res = await updateTimingSettingsAction({
                            gameSlug: data.game.name,
                            gameId: data.game.id,
                            categoryId: cat.id,
                            ...(enablePrimary ? { primaryTiming } : {}),
                            ...(enableShowRt || enableShowIgt
                                ? {
                                      hideRealTime: hideRt,
                                      hideGameTime: hideGt,
                                  }
                                : {}),
                        });
                        if ('error' in res) {
                            newErrors[cat.id] = res.error;
                        }
                    }

                    if (enableMs || enableRequireVideo) {
                        const res = await updateCategorySettingsAction({
                            gameSlug: data.game.name,
                            gameId: data.game.id,
                            categoryId: cat.id,
                            ...(enableMs ? { showMilliseconds } : {}),
                            ...(enableRequireVideo
                                ? {
                                      requireVideo,
                                      requireVideoTopN:
                                          requireVideo && topN.trim()
                                              ? Number(topN)
                                              : null,
                                  }
                                : {}),
                        });
                        if ('error' in res) {
                            newErrors[cat.id] = newErrors[cat.id]
                                ? `${newErrors[cat.id]}; ${res.error}`
                                : res.error;
                        }
                    }
                }
                setProgress(null);
            }
            setRowErrors(newErrors);

            let policyFailed = false;
            if (enablePolicy) {
                const policyKey = 'auto_flag_faster_than_wr_pct:null';
                const alreadyConfigured =
                    data.policies.some(
                        (p) =>
                            p.policyType === 'auto_flag_faster_than_wr_pct' &&
                            p.categoryId === null,
                    ) || createdPolicies.has(policyKey);
                if (alreadyConfigured) {
                    toast.info(
                        'The world-record review policy is already configured for this game.',
                    );
                } else {
                    const res = await createPolicyAction(data.game.name, {
                        policyType: 'auto_flag_faster_than_wr_pct',
                        value: { pct: 5 },
                        categoryId: null,
                    });
                    if ('error' in res) {
                        setPolicyError(res.error);
                        policyFailed = true;
                    } else {
                        setCreatedPolicies((prev) =>
                            new Set(prev).add(policyKey),
                        );
                    }
                }
            }

            if (Object.keys(newErrors).length === 0 && !policyFailed) {
                toast.success('Applied to all featured categories');
            }
        });
    };

    return (
        <section className={styles.section}>
            <h3 className="h6">
                Apply to all {mains.length} featured categor
                {mains.length === 1 ? 'y' : 'ies'}
            </h3>
            <p className="text-muted small mb-2">
                Turn on the rows you want to set everywhere. Anything left off
                stays as-is per category.
            </p>

            <div className="d-flex flex-column">
                <div className="row g-2 align-items-center border-bottom py-2">
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-enable-primary"
                            checked={enablePrimary}
                            onChange={(e) => setEnablePrimary(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-enable-primary"
                        >
                            Primary timing
                        </label>
                    </div>
                    <div className="col-auto">
                        <select
                            className="form-select form-select-sm"
                            disabled={!enablePrimary}
                            value={primaryTiming}
                            onChange={(e) =>
                                setPrimaryTiming(
                                    e.target.value as PrimaryTiming,
                                )
                            }
                        >
                            <option value="realtime">RTA</option>
                            <option value="gametime">IGT</option>
                        </select>
                    </div>
                </div>

                <div className="row g-2 align-items-center border-bottom py-2">
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-enable-showrt"
                            checked={enableShowRt}
                            onChange={(e) => setEnableShowRt(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-enable-showrt"
                        >
                            Show real time
                        </label>
                    </div>
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-showrt"
                            disabled={!enableShowRt}
                            checked={showRt}
                            onChange={(e) => setShowRt(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-showrt"
                        >
                            Shown
                        </label>
                    </div>
                </div>

                <div className="row g-2 align-items-center border-bottom py-2">
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-enable-showigt"
                            checked={enableShowIgt}
                            onChange={(e) => setEnableShowIgt(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-enable-showigt"
                        >
                            Show in-game time
                        </label>
                    </div>
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-showigt"
                            disabled={!enableShowIgt}
                            checked={showIgt}
                            onChange={(e) => setShowIgt(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-showigt"
                        >
                            Shown
                        </label>
                    </div>
                </div>

                <div className="row g-2 align-items-center border-bottom py-2">
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-enable-ms"
                            checked={enableMs}
                            onChange={(e) => setEnableMs(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-enable-ms"
                        >
                            Milliseconds
                        </label>
                    </div>
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-ms"
                            disabled={!enableMs}
                            checked={showMilliseconds}
                            onChange={(e) =>
                                setShowMilliseconds(e.target.checked)
                            }
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-ms"
                        >
                            Shown
                        </label>
                    </div>
                </div>

                <div className="row g-2 align-items-center py-2">
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-enable-video"
                            checked={enableRequireVideo}
                            onChange={(e) =>
                                setEnableRequireVideo(e.target.checked)
                            }
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-enable-video"
                        >
                            Require video proof
                        </label>
                    </div>
                    <div className="col-auto form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="defaults-video"
                            disabled={!enableRequireVideo}
                            checked={requireVideo}
                            onChange={(e) => setRequireVideo(e.target.checked)}
                        />
                        <label
                            className="form-check-label"
                            htmlFor="defaults-video"
                        >
                            Required
                        </label>
                    </div>
                    <div className="col-auto">
                        <input
                            className="form-control form-control-sm"
                            style={{ width: '8rem' }}
                            inputMode="numeric"
                            placeholder="Top N (optional)"
                            disabled={!enableRequireVideo || !requireVideo}
                            value={topN}
                            onChange={(e) => setTopN(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {guardError && (
                <div className={`${styles.errorNote} mt-2 mb-0`}>
                    {guardError}
                </div>
            )}

            <hr />

            <div className="form-check">
                <input
                    type="checkbox"
                    className="form-check-input"
                    id="defaults-enable-policy"
                    checked={enablePolicy}
                    onChange={(e) => setEnablePolicy(e.target.checked)}
                />
                <label
                    className="form-check-label"
                    htmlFor="defaults-enable-policy"
                >
                    Hold runs that beat the world record by 5%+ for manual
                    review
                </label>
            </div>
            {policyError && (
                <div className={`${styles.errorNote} mt-2 mb-0`}>
                    {policyError}
                </div>
            )}

            {Object.keys(rowErrors).length > 0 && (
                <div className={`${styles.errorNote} mt-2 mb-0`}>
                    <div>Some categories failed to update:</div>
                    <ul className="mb-0">
                        {mains
                            .filter((m) => rowErrors[m.id])
                            .map((m) => (
                                <li key={m.id}>
                                    {m.display}: {rowErrors[m.id]}
                                </li>
                            ))}
                    </ul>
                </div>
            )}
            {progress && (
                <div className="text-muted small mt-2">{progress}</div>
            )}

            <button
                type="button"
                className="btn btn-outline-primary mt-2"
                disabled={isApplying || !anyEnabled}
                onClick={apply}
            >
                {isApplying
                    ? (progress ?? 'Applying…')
                    : `Apply to all ${mains.length} featured categor${
                          mains.length === 1 ? 'y' : 'ies'
                      }`}
            </button>
        </section>
    );
}

// ── Zone 2: game-wide variables (recovered from deleted step-variables) ────

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

function GameWideVariablesSection({ data }: { data: WizardData }) {
    const [variables, setVariables] = useState<VariableRow[]>(
        data.variables.filter((v) => v.categoryId === null),
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
                    categoryId: null, // game-wide; scope per-category later in the console
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
            // key) and wipe the zone-1 bulk-apply draft state above. Local
            // state covers this mount; navigation refreshes re-sync server
            // data.
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
            <h3 className="h6">Game-wide variables</h3>
            <div className="row g-3 mb-3">
                <div className="col-md-6">
                    <div
                        className={styles.section}
                        style={{ height: '100%', marginBottom: 0 }}
                    >
                        <strong>Subcategory</strong>
                        <p className="mb-0 small text-muted">
                            Splits your leaderboard into separate boards — e.g.
                            Difficulty: Easy and Hard each get their own
                            rankings.
                        </p>
                    </div>
                </div>
                <div className="col-md-6">
                    <div
                        className={styles.section}
                        style={{ height: '100%', marginBottom: 0 }}
                    >
                        <strong>Filter</strong>
                        <p className="mb-0 small text-muted">
                            One board, viewers can narrow it — e.g. Platform.
                            Everyone still competes together.
                        </p>
                    </div>
                </div>
            </div>

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
                    <label className="form-label" htmlFor="defaults-var-name">
                        Name
                    </label>
                    <input
                        id="defaults-var-name"
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
                        htmlFor="defaults-var-values"
                    >
                        Values (comma-separated)
                    </label>
                    <input
                        id="defaults-var-values"
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
                labelledBy="delete-gamewide-variable-title"
                title="Delete variable?"
                message={`Delete variable "${confirmDelete?.name}"? Existing finished runs keep their resolved values until a re-resolve worker runs.`}
                confirmLabel="Delete"
                pending={isSaving}
                error={deleteError}
            />
        </section>
    );
}
