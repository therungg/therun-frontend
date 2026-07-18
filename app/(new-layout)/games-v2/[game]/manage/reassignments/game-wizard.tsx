'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { type GameSearchResult, searchGames } from '~src/lib/game-search';
import { resolveGame } from '~src/lib/games-v1';
import type {
    CategoryMappingEntry,
    CategorySettingsDiffs,
    PreviewError,
} from '../../../../../../types/reassignments.types';
import { applyOverride, mappingIsComplete } from './mapping-reducer';
import {
    createGameAction,
    getGameStatusAction,
    previewGameAction,
} from './reassignment-actions';
import { ReassignmentStatus } from './reassignment-status';
import styles from './reassignments.module.scss';

interface Props {
    sourceGameId: number;
    sourceGameDisplay: string;
    sourceCategoryNames: Record<number, string>;
}

type Step = 'target' | 'mapping' | 'diffs' | 'impact' | 'status';

const STEPS: { id: Step; label: string }[] = [
    { id: 'target', label: 'Target' },
    { id: 'mapping', label: 'Mapping' },
    { id: 'diffs', label: 'Diffs' },
    { id: 'impact', label: 'Impact' },
    { id: 'status', label: 'Run' },
];

export function GameWizard({
    sourceGameId,
    sourceGameDisplay,
    sourceCategoryNames,
}: Props) {
    const [step, setStep] = useState<Step>('target');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GameSearchResult[]>([]);
    const [target, setTarget] = useState<GameSearchResult | null>(null);
    const [mapping, setMapping] = useState<CategoryMappingEntry[]>([]);
    const [diffs, setDiffs] = useState<CategorySettingsDiffs[]>([]);
    const [ackedPairs, setAckedPairs] = useState<Set<number>>(new Set());
    const [previewErrors, setPreviewErrors] = useState<PreviewError[]>([]);
    const [createdId, setCreatedId] = useState<number | null>(null);
    const [isPending, startPending] = useTransition();

    const stepIndex = STEPS.findIndex((s) => s.id === step);

    const runSearch = (q: string) => {
        setQuery(q);
        if (q.length < 2) {
            setResults([]);
            return;
        }
        startPending(async () => {
            const found = await searchGames(q);
            setResults(found.filter((g) => g.id !== sourceGameId));
        });
    };

    const pickTarget = (g: GameSearchResult) => {
        startPending(async () => {
            try {
                // Search results (Algolia) carry only the slug, not the numeric
                // game id the reassignment API needs — resolve it first.
                const resolved = await resolveGame(g.game);
                if (!resolved) {
                    toast.error('Could not resolve target game.');
                    return;
                }
                setTarget({ ...g, id: resolved.id });
                const preview = await previewGameAction(
                    sourceGameId,
                    resolved.id,
                );
                if (!preview.valid) {
                    setPreviewErrors(preview.errors);
                    return;
                }
                setPreviewErrors([]);
                setMapping(preview.mapping);
                setDiffs(preview.diffs);
                setStep('mapping');
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Preview failed',
                );
            }
        });
    };

    const setRowDecision = (
        sourceCategoryId: number,
        decision: CategoryMappingEntry['decision'],
        targetCategoryId: number | null,
    ) => {
        setMapping((m) =>
            applyOverride(m, { sourceCategoryId, decision, targetCategoryId }),
        );
    };

    const allAcked = diffs.every((d) => ackedPairs.has(d.sourceCategoryId));

    const submit = () => {
        if (!target) return;
        startPending(async () => {
            try {
                const res = await createGameAction({
                    sourceGameId,
                    targetGameId: target.id,
                    categoryMapping: mapping,
                    settingsDiffsAcknowledged: diffs,
                });
                setCreatedId(res.id);
                setStep('status');
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Failed to start',
                );
            }
        });
    };

    return (
        <div className={styles.surface}>
            <div className={styles.header}>
                <p className={styles.eyebrow}>Game merge</p>
                <h3 className={styles.title}>
                    Merge game: {sourceGameDisplay}
                </h3>
                <p className={styles.subtitle}>
                    Merge this entire game — its runs and categories — into
                    another game.
                </p>
            </div>

            <div className={styles.stepper}>
                {STEPS.map((s, i) => (
                    <span
                        key={s.id}
                        className={`${styles.stepDot} ${
                            i === stepIndex
                                ? styles.stepCurrent
                                : i < stepIndex
                                  ? styles.stepDone
                                  : ''
                        }`}
                    >
                        <span className={styles.stepNum}>{i + 1}</span>
                        {s.label}
                        {i < STEPS.length - 1 && (
                            <span className={styles.stepSep} aria-hidden />
                        )}
                    </span>
                ))}
            </div>

            {step === 'target' && (
                <div className={styles.step}>
                    <label htmlFor="target-game" className={styles.label}>
                        Merge into game
                    </label>
                    <input
                        id="target-game"
                        className={styles.input}
                        value={query}
                        onChange={(e) => runSearch(e.target.value)}
                        placeholder="Search target game…"
                    />
                    {previewErrors.length > 0 && (
                        <div
                            className={`${styles.callout} ${styles.calloutError}`}
                        >
                            <ul className={styles.errorList}>
                                {previewErrors.map((er) => (
                                    <li key={er.code}>{er.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {results.length > 0 && (
                        <ul className={styles.results}>
                            {results.map((g) => (
                                <li key={g.id}>
                                    <button
                                        type="button"
                                        className={styles.resultItem}
                                        disabled={isPending}
                                        onClick={() => pickTarget(g)}
                                    >
                                        {g.display}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {step === 'mapping' && (
                <>
                    <p className={styles.muted}>
                        Decide what happens to each source category.
                    </p>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Source category</th>
                                <th>Decision</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mapping.map((row) => (
                                <tr key={row.sourceCategoryId}>
                                    <td>
                                        {sourceCategoryNames[
                                            row.sourceCategoryId
                                        ] ?? row.sourceCategoryId}
                                    </td>
                                    <td>
                                        <select
                                            className={styles.rowSelect}
                                            value={row.decision}
                                            onChange={(e) =>
                                                setRowDecision(
                                                    row.sourceCategoryId,
                                                    e.target
                                                        .value as CategoryMappingEntry['decision'],
                                                    row.targetCategoryId,
                                                )
                                            }
                                        >
                                            <option value="merge">Merge</option>
                                            <option value="create">
                                                Create on target
                                            </option>
                                            <option value="drop">Drop</option>
                                        </select>
                                        {row.decision === 'merge' && (
                                            <span className={styles.targetHint}>
                                                → target #
                                                {row.targetCategoryId ?? '?'}
                                            </span>
                                        )}
                                        {row.autoCreated && (
                                            <span
                                                className={styles.decisionPill}
                                            >
                                                auto-created
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className={styles.actions}>
                        <span className={styles.spacer} />
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            disabled={!mappingIsComplete(mapping)}
                            onClick={() => setStep('diffs')}
                        >
                            Next: settings diffs
                        </button>
                    </div>
                </>
            )}

            {step === 'diffs' && (
                <>
                    {diffs.length === 0 ? (
                        <div className={styles.callout}>
                            No conflicting settings to acknowledge.
                        </div>
                    ) : (
                        diffs.map((pair) => (
                            <div
                                key={pair.sourceCategoryId}
                                className={styles.diffPair}
                            >
                                <h4 className={styles.diffTitle}>
                                    {sourceCategoryNames[
                                        pair.sourceCategoryId
                                    ] ?? pair.sourceCategoryId}{' '}
                                    → #{pair.targetCategoryId}
                                </h4>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Field</th>
                                            <th>Source</th>
                                            <th>Target</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pair.diffs.map((d) => (
                                            <tr key={d.field}>
                                                <td>{d.field}</td>
                                                <td className={styles.cellMono}>
                                                    {String(d.source)}
                                                </td>
                                                <td className={styles.cellMono}>
                                                    {String(d.target)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <label
                                    className={styles.ack}
                                    style={{ marginTop: '0.75rem' }}
                                >
                                    <input
                                        type="checkbox"
                                        className={styles.ackBox}
                                        checked={ackedPairs.has(
                                            pair.sourceCategoryId,
                                        )}
                                        onChange={(e) =>
                                            setAckedPairs((prev) => {
                                                const next = new Set(prev);
                                                if (e.target.checked)
                                                    next.add(
                                                        pair.sourceCategoryId,
                                                    );
                                                else
                                                    next.delete(
                                                        pair.sourceCategoryId,
                                                    );
                                                return next;
                                            })
                                        }
                                    />
                                    <span>I understand these differences</span>
                                </label>
                            </div>
                        ))
                    )}
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.btnGhost}
                            onClick={() => setStep('mapping')}
                        >
                            Back
                        </button>
                        <span className={styles.spacer} />
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            disabled={!allAcked}
                            onClick={() => setStep('impact')}
                        >
                            Next: impact
                        </button>
                    </div>
                </>
            )}

            {step === 'impact' && (
                <>
                    <div className={styles.impact}>
                        <div className={styles.impactRow}>
                            <span className={styles.statMoved}>
                                {mapping.length}
                            </span>
                            <span>
                                source categories will be processed, merging
                                into <strong>{target?.display}</strong>.
                            </span>
                        </div>
                    </div>
                    <div className={`${styles.callout} ${styles.calloutWarn}`}>
                        This runs a hard merge. It can only be reversed via the
                        audit log.
                    </div>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.btnGhost}
                            onClick={() => setStep('diffs')}
                        >
                            Back
                        </button>
                        <span className={styles.spacer} />
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            disabled={isPending}
                            onClick={submit}
                        >
                            {isPending ? 'Starting…' : 'Confirm merge'}
                        </button>
                    </div>
                </>
            )}

            {step === 'status' && createdId !== null && (
                <ReassignmentStatus
                    id={createdId}
                    fetcher={getGameStatusAction}
                    targetGameSlug={target?.game}
                    onRestart={() => {
                        setCreatedId(null);
                        setStep('target');
                        setTarget(null);
                        setMapping([]);
                        setDiffs([]);
                        setAckedPairs(new Set());
                    }}
                />
            )}
        </div>
    );
}
