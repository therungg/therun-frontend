'use client';

import moment from 'moment/moment';
import { useMemo, useState } from 'react';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { FlagSeverity } from '../../../../../../../types/moderation.types';
import type { ModVerb, RunActionTarget } from '../shared/action-model';
import { RunActionDialog } from '../shared/run-action-dialog';
import {
    type AttentionItem,
    type AttentionSource,
    groupByRunner,
} from './attention-model';
import { ManualTimeVerdictRow } from './manual-time-verdict-row';

type SourceFilter = 'all' | AttentionSource;
type CategoryFilter = 'any' | number;

interface Props {
    gameSlug: string;
    gameDisplay: string;
    items: AttentionItem[];
    categories: Array<{ id: number; display: string }>;
}

const SEVERITY_BADGE: Record<FlagSeverity, string> = {
    high: 'text-bg-danger',
    medium: 'text-bg-warning',
    low: 'text-bg-secondary',
};

const SOURCE_PILL: Record<AttentionSource, { label: string; icon: string }> = {
    flag: { label: 'flag', icon: '⚙' },
    report: { label: 'reported', icon: '🚩' },
    appeal: { label: 'appeal', icon: '⚖' },
    self_claim: { label: 'self-claim', icon: '✋' },
};

/** An active run-action invocation against one or more items. */
interface RunAction {
    verb: ModVerb;
    target: RunActionTarget;
    // keys removed from the local list when the dialog reports done.
    affectedKeys: string[];
}

export function NeedsAttention({
    gameSlug,
    gameDisplay,
    items: initialItems,
    categories,
}: Props) {
    const [items, setItems] = useState<AttentionItem[]>(initialItems);
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('any');
    const [runAction, setRunAction] = useState<RunAction | null>(null);

    const filtered = useMemo(() => {
        return items.filter((it) => {
            if (sourceFilter !== 'all' && !it.sources.includes(sourceFilter)) {
                return false;
            }
            if (categoryFilter !== 'any' && it.categoryId !== categoryFilter) {
                return false;
            }
            return true;
        });
    }, [items, sourceFilter, categoryFilter]);

    const groups = useMemo(() => groupByRunner(filtered), [filtered]);

    const removeKeys = (keys: string[]) => {
        const drop = new Set(keys);
        setItems((prev) => prev.filter((it) => !drop.has(it.key)));
    };

    return (
        <div>
            <div className="d-flex flex-wrap align-items-end gap-2 mb-4">
                <div>
                    <label
                        htmlFor="attention-source"
                        className="form-label small text-muted mb-1"
                    >
                        Source
                    </label>
                    <select
                        id="attention-source"
                        className="form-select form-select-sm"
                        value={sourceFilter}
                        onChange={(e) =>
                            setSourceFilter(e.target.value as SourceFilter)
                        }
                    >
                        <option value="all">All sources</option>
                        <option value="flag">Flags</option>
                        <option value="report">Reports</option>
                        <option value="appeal">Appeals</option>
                        <option value="self_claim">Self-claims</option>
                    </select>
                </div>
                <div>
                    <label
                        htmlFor="attention-category"
                        className="form-label small text-muted mb-1"
                    >
                        Category
                    </label>
                    <select
                        id="attention-category"
                        className="form-select form-select-sm"
                        value={categoryFilter === 'any' ? '' : categoryFilter}
                        onChange={(e) => {
                            const v = e.target.value;
                            setCategoryFilter(
                                v === '' ? 'any' : Number.parseInt(v, 10),
                            );
                        }}
                    >
                        <option value="">Any category</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.display}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="ms-auto text-muted small align-self-center">
                    {filtered.length} item{filtered.length === 1 ? '' : 's'}
                </div>
            </div>

            {groups.length === 0 ? (
                <div className="text-center text-muted py-5">
                    <p className="h5 mb-1">All clear</p>
                    <p className="mb-0">Nothing needs attention.</p>
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {groups.map((g) =>
                        g.items.length > 1 ? (
                            <RunnerGroupCard
                                key={`u:${g.userId}`}
                                gameSlug={gameSlug}
                                gameDisplay={gameDisplay}
                                runnerName={g.runnerName}
                                userId={g.userId}
                                items={g.items}
                                onAct={setRunAction}
                                onItemDone={(keys) => removeKeys(keys)}
                            />
                        ) : (
                            <SingleItemCard
                                key={g.items[0].key}
                                gameSlug={gameSlug}
                                gameDisplay={gameDisplay}
                                item={g.items[0]}
                                onAct={setRunAction}
                                onDone={() => removeKeys([g.items[0].key])}
                            />
                        ),
                    )}
                </div>
            )}

            {runAction && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={runAction.verb}
                    target={runAction.target}
                    onDone={() => {
                        removeKeys(runAction.affectedKeys);
                        setRunAction(null);
                    }}
                    onClose={() => setRunAction(null)}
                />
            )}
        </div>
    );
}

/** Build a runner ban target from an item (caller guarantees userId != null). */
function banTarget(
    item: AttentionItem,
    gameDisplay: string,
): RunActionTarget | null {
    if (item.userId == null || item.categoryId == null) return null;
    return {
        kind: 'runner',
        runnerId: item.userId,
        runnerName: item.runnerName,
        categoryId: item.categoryId,
        categoryDisplay: item.categoryName,
        gameDisplay,
    };
}

function ItemMeta({ item }: { item: AttentionItem }) {
    const isGuest = item.userId == null;
    return (
        <div className="small mb-2">
            <span className="me-3">
                {isGuest ? (
                    <span>
                        {item.runnerName}{' '}
                        <span className="badge text-bg-secondary">guest</span>
                    </span>
                ) : (
                    <UserLink username={item.runnerName} />
                )}
            </span>
            <span className="text-muted me-3">{item.categoryName}</span>
            {item.subcategoryKey && (
                <span className="text-muted me-3">{item.subcategoryKey}</span>
            )}
            <span className="me-3">
                RT <DurationToFormatted duration={item.timeMs} />
            </span>
            {item.gameTimeMs != null && (
                <span className="me-3">
                    GT <DurationToFormatted duration={item.gameTimeMs} />
                </span>
            )}
            {item.vodUrl ? (
                <a
                    className="me-3"
                    href={item.vodUrl}
                    target="_blank"
                    rel="noreferrer"
                >
                    VOD
                </a>
            ) : (
                <span className="text-muted me-3">No VOD</span>
            )}
            {item.verificationStatus && (
                <span className="text-muted">{item.verificationStatus}</span>
            )}
        </div>
    );
}

function SourcePills({ sources }: { sources: AttentionSource[] }) {
    return (
        <>
            {sources.map((s) => (
                <span
                    key={s}
                    className="badge rounded-pill text-bg-light border text-muted fw-normal"
                >
                    {SOURCE_PILL[s].icon} {SOURCE_PILL[s].label}
                </span>
            ))}
        </>
    );
}

interface SingleItemCardProps {
    gameSlug: string;
    gameDisplay: string;
    item: AttentionItem;
    onAct: (a: RunAction) => void;
    onDone: () => void;
}

function SingleItemCard({
    gameSlug,
    gameDisplay,
    item,
    onAct,
    onDone,
}: SingleItemCardProps) {
    const isSelfClaim = item.runId == null && item.manualTimeId != null;

    const runIds = item.runId != null ? [item.runId] : [];
    const runsTarget: RunActionTarget = {
        kind: 'runs',
        runIds,
        label: `${item.runnerName} · ${item.categoryName}`,
    };

    const act = (verb: ModVerb, target: RunActionTarget) =>
        onAct({ verb, target, affectedKeys: [item.key] });

    return (
        <div className="border rounded p-3">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className={`badge ${SEVERITY_BADGE[item.severity]}`}>
                    {item.severity}
                </span>
                <SourcePills sources={item.sources} />
                <span className="text-muted small ms-auto">
                    <abbr title={moment(item.createdAt).format('LLLL')}>
                        {moment(item.createdAt).fromNow()}
                    </abbr>
                </span>
            </div>

            <ItemMeta item={item} />

            {item.note && (
                <div className="small text-muted mb-2">{item.note}</div>
            )}

            {isSelfClaim && item.manualTimeId != null ? (
                <ManualTimeVerdictRow
                    gameSlug={gameSlug}
                    manualTimeId={item.manualTimeId}
                    onDone={onDone}
                />
            ) : (
                <div className="d-flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() => act('approve', runsTarget)}
                    >
                        Approve
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => act('remove', runsTarget)}
                    >
                        Remove…
                    </button>
                    {item.verificationStatus === 'rejected' && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => act('restore', runsTarget)}
                        >
                            Restore
                        </button>
                    )}
                    {item.userId != null && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger ms-auto"
                            onClick={() => {
                                const t = banTarget(item, gameDisplay);
                                if (t) act('ban', t);
                            }}
                        >
                            Ban runner…
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

interface RunnerGroupCardProps {
    gameSlug: string;
    gameDisplay: string;
    runnerName: string;
    userId: number | null;
    items: AttentionItem[];
    onAct: (a: RunAction) => void;
    onItemDone: (keys: string[]) => void;
}

function RunnerGroupCard({
    gameSlug,
    gameDisplay,
    runnerName,
    userId,
    items,
    onAct,
    onItemDone,
}: RunnerGroupCardProps) {
    const [open, setOpen] = useState(false);

    const allKeys = items.map((it) => it.key);
    const runIds = items
        .map((it) => it.runId)
        .filter((id): id is number => id != null);
    const firstWithCat = items.find((it) => it.categoryId != null);

    const banAll = () => {
        if (
            userId == null ||
            !firstWithCat ||
            firstWithCat.categoryId == null
        ) {
            return;
        }
        onAct({
            verb: 'ban',
            target: {
                kind: 'runner',
                runnerId: userId,
                runnerName,
                categoryId: firstWithCat.categoryId,
                categoryDisplay: firstWithCat.categoryName,
                gameDisplay,
            },
            // A ban removes the runner's runs; clear all this runner's items.
            affectedKeys: allKeys,
        });
    };

    const removeAll = () => {
        if (runIds.length === 0) return;
        const runKeys = items
            .filter((it) => it.runId != null)
            .map((it) => it.key);
        onAct({
            verb: 'remove',
            target: {
                kind: 'runs',
                runIds,
                label: `${runnerName} · ${runIds.length} runs`,
            },
            affectedKeys: runKeys,
        });
    };

    return (
        <div className="border rounded">
            <div className="d-flex flex-wrap align-items-center gap-2 p-3">
                <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none p-0 text-reset"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                >
                    <span className="me-2">{open ? '▾' : '▸'}</span>
                    {userId != null ? (
                        <UserLink username={runnerName} />
                    ) : (
                        <strong>{runnerName}</strong>
                    )}
                </button>
                <span className="text-muted small">
                    {items.length} items needing attention
                </span>
                <div className="ms-auto d-flex flex-wrap gap-2">
                    {runIds.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={removeAll}
                        >
                            Remove all
                        </button>
                    )}
                    {userId != null && firstWithCat && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={banAll}
                        >
                            Ban runner…
                        </button>
                    )}
                </div>
            </div>

            {open && (
                <div className="border-top p-3 d-flex flex-column gap-3">
                    {items.map((it) => (
                        <SingleItemCard
                            key={it.key}
                            gameSlug={gameSlug}
                            gameDisplay={gameDisplay}
                            item={it}
                            onAct={onAct}
                            onDone={() => onItemDone([it.key])}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
