'use client';

import { useEffect, useState } from 'react';
import { plural } from '~src/lib/src-archive-counts';
import type {
    SrcSettingsChange,
    SrcSettingsGroup,
    SrcSettingsItemStatus,
    SrcSettingsPlan,
    SrcSettingsPreview,
    SrcSettingsSelection,
    SrcSettingsSide,
    SrcSettingsStatus,
    SrcSettingsUndone,
} from '../../../../../../types/src-board-sync.types';
import { longDate } from './copy';
import styles from './src-sync.module.scss';
import {
    applySettings,
    getSettingsPlan,
    loadSettingsPlan,
    previewSettings,
    undoSettings,
} from './src-sync-actions';

interface Side {
    name: string;
    rules?: string | null;
    values?: string[];
}

interface Item {
    srcId: string;
    status: SrcSettingsItemStatus;
    changes: SrcSettingsChange[];
    here: Side | null;
    src: Side;
    targets?: string[];
}

const GROUPS = [
    { key: 'categories', title: 'Categories' },
    { key: 'levels', title: 'Levels' },
    { key: 'variables', title: 'Variables' },
] as const;

const NONE = { categories: [], levels: [], variables: [] };

function summary(p: SrcSettingsPreview) {
    const parts = [
        p.newCategories > 0 &&
            plural(p.newCategories, 'new category', 'new categories'),
        p.newLevels > 0 && plural(p.newLevels, 'new level', 'new levels'),
        p.newVariables > 0 &&
            plural(p.newVariables, 'new variable', 'new variables'),
    ].filter((part): part is string => !!part);
    const last = parts.pop();
    const list = parts.length > 0 ? `${parts.join(', ')} and ${last}` : last;
    return [list && `${list}.`, p.changed > 0 && `${p.changed} changed.`]
        .filter(Boolean)
        .join(' ');
}

function Undone({ undone }: { undone: SrcSettingsUndone }) {
    return (
        <>
            <p className={styles.counts}>Undone.</p>
            {undone.keptBoards.length > 0 && (
                <p className={styles.muted}>
                    Kept because they have runs:{' '}
                    {undone.keptBoards.map((b) => b.name).join(', ')}
                </p>
            )}
            {undone.keptValues.length > 0 && (
                <p className={styles.muted}>
                    Kept because runs use them:{' '}
                    {undone.keptValues
                        .map((v) => `${v.value} (${v.variableName})`)
                        .join(', ')}
                </p>
            )}
            {undone.notRestored.length > 0 && (
                <p className={styles.muted}>
                    Couldn't put back:{' '}
                    {undone.notRestored.map((b) => b.name).join(', ')}
                </p>
            )}
        </>
    );
}

function SideCell({ side, changes }: { side: Side; changes: string[] }) {
    return (
        <span>
            {side.name}
            {changes.includes('rules') && side.rules && (
                <span className={styles.sideText}>{side.rules}</span>
            )}
            {changes.includes('values') && side.values && (
                <span className={styles.sideText}>
                    {side.values.join(', ')}
                </span>
            )}
        </span>
    );
}

function Planner({
    gameId,
    syncedAt,
    onChange,
}: {
    gameId: number;
    syncedAt: string | null;
    onChange: () => void;
}) {
    const [plan, setPlan] = useState<SrcSettingsPlan | null>(null);
    const [off, setOff] = useState<Record<SrcSettingsGroup, string[]>>(NONE);
    const [rules, setRules] = useState(true);
    const [choices, setChoices] = useState<SrcSettingsSelection['choices']>({
        categories: {},
        levels: {},
        variables: {},
    });
    const [preview, setPreview] = useState<SrcSettingsPreview | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let live = true;
        (async () => {
            const got = await getSettingsPlan(gameId);
            const loading = !('error' in got) && got.result === null;
            const res = loading ? await loadSettingsPlan(gameId) : got;
            if (!live) return;
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setPlan(res.result);
            if (loading) onChange();
        })();
        return () => {
            live = false;
        };
    }, [gameId, onChange]);

    if (!plan) {
        return error ? (
            <p className={styles.error} role="alert">
                {error}
            </p>
        ) : null;
    }

    const tick = (group: SrcSettingsGroup, id: string, on: boolean) => {
        setOff({
            ...off,
            [group]: on
                ? off[group].filter((o) => o !== id)
                : [...off[group], id],
        });
        setPreview(null);
    };

    const choose = (
        group: SrcSettingsGroup,
        id: string,
        side: SrcSettingsSide,
    ) => {
        setChoices({ ...choices, [group]: { ...choices[group], [id]: side } });
        setPreview(null);
    };

    const selection = (): SrcSettingsSelection => ({
        categories: plan.categories
            .map((c) => c.srcId)
            .filter((id) => !off.categories.includes(id)),
        levels: plan.levels
            .map((l) => l.srcId)
            .filter((id) => !off.levels.includes(id)),
        variables: plan.variables
            .map((v) => v.srcId)
            .filter((id) => !off.variables.includes(id)),
        rules,
        choices,
    });

    const run = async () => {
        setBusy(true);
        setError(null);
        const res = await previewSettings(gameId, selection());
        setBusy(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setPreview(res.result);
    };

    const apply = async () => {
        setBusy(true);
        setError(null);
        const res = await applySettings(gameId, selection());
        setBusy(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        onChange();
    };

    const differs = GROUPS.flatMap(({ key }) => {
        const items: Item[] = plan[key];
        return items
            .filter(
                (i) =>
                    i.status === 'differs' &&
                    !off[key].includes(i.srcId) &&
                    i.changes.some((c) => rules || c !== 'rules'),
            )
            .map((item) => ({ group: key, item }));
    });

    const text = preview && summary(preview);

    return (
        <>
            <div className={styles.lists}>
                {GROUPS.map(({ key, title }) => {
                    const items: Item[] = plan[key];
                    if (items.length === 0) return null;
                    return (
                        <div key={key}>
                            <h5 className={styles.listTitle}>{title}</h5>
                            <div className={styles.checks}>
                                {items.map((item) => (
                                    <label
                                        key={item.srcId}
                                        className={styles.check}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                !off[key].includes(item.srcId)
                                            }
                                            disabled={busy}
                                            onChange={(e) =>
                                                tick(
                                                    key,
                                                    item.srcId,
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                        {item.src.name}
                                        {item.targets &&
                                            item.targets.length > 0 && (
                                                <span
                                                    className={styles.targets}
                                                >
                                                    {item.targets.join(', ')}
                                                </span>
                                            )}
                                    </label>
                                ))}
                            </div>
                        </div>
                    );
                })}
                <label className={styles.check}>
                    <input
                        type="checkbox"
                        checked={rules}
                        disabled={busy}
                        onChange={(e) => {
                            setRules(e.target.checked);
                            setPreview(null);
                        }}
                    />
                    Rules text
                </label>
                {differs.length > 0 && (
                    <div className={styles.scroller}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Here</th>
                                    <th>speedrun.com</th>
                                </tr>
                            </thead>
                            <tbody>
                                {differs.map(({ group, item }) => (
                                    <tr key={`${group}:${item.srcId}`}>
                                        {(
                                            ['here', 'speedrun.com'] as const
                                        ).map((side) => (
                                            <td
                                                key={side}
                                                className={styles.side}
                                            >
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name={`src-side-${group}-${item.srcId}`}
                                                        checked={
                                                            (choices[group][
                                                                item.srcId
                                                            ] ?? 'here') ===
                                                            side
                                                        }
                                                        disabled={busy}
                                                        onChange={() =>
                                                            choose(
                                                                group,
                                                                item.srcId,
                                                                side,
                                                            )
                                                        }
                                                    />
                                                    <SideCell
                                                        side={
                                                            side === 'here'
                                                                ? item.here!
                                                                : item.src
                                                        }
                                                        changes={item.changes.filter(
                                                            (c) =>
                                                                rules ||
                                                                c !== 'rules',
                                                        )}
                                                    />
                                                </label>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {preview &&
                (text ? (
                    <p className={styles.counts}>{text}</p>
                ) : (
                    syncedAt && (
                        <p className={styles.counts}>
                            Everything from speedrun.com is already synced.
                        </p>
                    )
                ))}
            {preview && preview.skipped.length > 0 && (
                <>
                    <p className={styles.counts}>Failed:</p>
                    <ul className={styles.failed}>
                        {preview.skipped.map((s) => (
                            <li key={`${s.kind}:${s.srcId}`}>{s.message}</li>
                        ))}
                    </ul>
                </>
            )}
            {error && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}
            <div className={styles.footer}>
                {!preview ? (
                    <button
                        type="button"
                        className={styles.apply}
                        onClick={run}
                        disabled={busy}
                    >
                        Preview
                    </button>
                ) : (
                    (text || !syncedAt) && (
                        <button
                            type="button"
                            className={styles.apply}
                            onClick={apply}
                            disabled={busy}
                        >
                            Apply
                        </button>
                    )
                )}
            </div>
        </>
    );
}

export function SettingsPart({
    gameId,
    status,
    canEdit,
    disabled,
    onChange,
}: {
    gameId: number;
    status: SrcSettingsStatus;
    canEdit: boolean;
    disabled: boolean;
    onChange: () => void;
}) {
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const job = status.job;
    const state = job?.state;

    const undo = async () => {
        if (!job) return;
        setBusy(true);
        setError(null);
        const res = await undoSettings(gameId, job.jobId);
        setBusy(false);
        setConfirming(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        onChange();
    };

    const working = state === 'applying' || state === 'undoing';
    const done = state === 'applied' || state === 'failed';
    const open = !working && !done;
    if (open && !job?.undone && !status.syncedAt && (!canEdit || disabled)) {
        return null;
    }

    return (
        <div className={styles.part}>
            <h4 className={styles.listTitle}>Settings</h4>
            {state === 'applying' && (
                <p className={styles.muted} aria-live="polite">
                    Applying. This updates on its own.
                </p>
            )}
            {state === 'undoing' && (
                <p className={styles.muted} aria-live="polite">
                    Undoing. This updates on its own.
                </p>
            )}
            {job && done && (
                <>
                    {state === 'applied' && job.appliedAt && (
                        <p className={styles.counts}>
                            Applied {longDate(job.appliedAt)}.
                        </p>
                    )}
                    {state === 'failed' && (
                        <p className={styles.counts}>
                            Undo the last attempt before applying again.
                        </p>
                    )}
                    {error && (
                        <p className={styles.error} role="alert">
                            {error}
                        </p>
                    )}
                    {canEdit && !confirming && (
                        <div className={styles.footer}>
                            <button
                                type="button"
                                className={styles.secondary}
                                onClick={() => setConfirming(true)}
                                disabled={busy}
                            >
                                Undo
                            </button>
                        </div>
                    )}
                    {confirming && (
                        <div className={styles.confirm}>
                            <p className={styles.muted}>
                                Undo the settings sync? This will revert what it
                                added or changed
                            </p>
                            <div className={styles.footer}>
                                <button
                                    type="button"
                                    className={styles.apply}
                                    onClick={undo}
                                    disabled={busy}
                                >
                                    Undo
                                </button>
                                <button
                                    type="button"
                                    className={styles.secondary}
                                    onClick={() => setConfirming(false)}
                                    disabled={busy}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
            {open && (
                <>
                    {job?.undone && <Undone undone={job.undone} />}
                    {canEdit && !disabled ? (
                        <Planner
                            gameId={gameId}
                            syncedAt={status.syncedAt}
                            onChange={onChange}
                        />
                    ) : (
                        !job?.undone &&
                        status.syncedAt && (
                            <p className={styles.counts}>
                                Applied {longDate(status.syncedAt)}.
                            </p>
                        )
                    )}
                </>
            )}
        </div>
    );
}
