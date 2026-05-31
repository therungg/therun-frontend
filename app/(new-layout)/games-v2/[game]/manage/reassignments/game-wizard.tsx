'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { type GameSearchResult, searchGames } from '~src/lib/game-search';
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
        setTarget(g);
        startPending(async () => {
            try {
                const preview = await previewGameAction(sourceGameId, g.id);
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
        <div className={styles.wizard}>
            <h3>Reassign game: {sourceGameDisplay}</h3>

            {step === 'target' && (
                <div className={styles.step}>
                    <label htmlFor="target-game">Merge into game</label>
                    <input
                        id="target-game"
                        value={query}
                        onChange={(e) => runSearch(e.target.value)}
                        placeholder="Search target game…"
                    />
                    {previewErrors.length > 0 && (
                        <ul className={styles.error}>
                            {previewErrors.map((er) => (
                                <li key={er.code}>{er.message}</li>
                            ))}
                        </ul>
                    )}
                    <ul>
                        {results.map((g) => (
                            <li key={g.id}>
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => pickTarget(g)}
                                >
                                    {g.display}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {step === 'mapping' && (
                <div className={styles.step}>
                    <p>Decide what happens to each source category.</p>
                    <table>
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
                                            <span className={styles.muted}>
                                                {' '}
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
                    <button
                        type="button"
                        disabled={!mappingIsComplete(mapping)}
                        onClick={() => setStep('diffs')}
                    >
                        Next: settings diffs
                    </button>
                </div>
            )}

            {step === 'diffs' && (
                <div className={styles.step}>
                    {diffs.length === 0 ? (
                        <p className={styles.muted}>
                            No conflicting settings to acknowledge.
                        </p>
                    ) : (
                        diffs.map((pair) => (
                            <div key={pair.sourceCategoryId}>
                                <h4>
                                    {sourceCategoryNames[
                                        pair.sourceCategoryId
                                    ] ?? pair.sourceCategoryId}{' '}
                                    → #{pair.targetCategoryId}
                                </h4>
                                <table>
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
                                                <td>{String(d.source)}</td>
                                                <td>{String(d.target)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <label>
                                    <input
                                        type="checkbox"
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
                                    />{' '}
                                    I understand
                                </label>
                            </div>
                        ))
                    )}
                    <div>
                        <button
                            type="button"
                            onClick={() => setStep('mapping')}
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            disabled={!allAcked}
                            onClick={() => setStep('impact')}
                        >
                            Next: impact
                        </button>
                    </div>
                </div>
            )}

            {step === 'impact' && (
                <div className={styles.step}>
                    <p>
                        {mapping.length} source categories will be processed.
                        Merging into <strong>{target?.display}</strong>.
                    </p>
                    <p className={styles.muted}>
                        This can only be undone via the audit log.
                    </p>
                    <button type="button" onClick={() => setStep('diffs')}>
                        Back
                    </button>
                    <button type="button" disabled={isPending} onClick={submit}>
                        {isPending ? 'Starting…' : 'Confirm reassignment'}
                    </button>
                </div>
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
