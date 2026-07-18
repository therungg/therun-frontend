'use client';

import clsx from 'clsx';
import moment from 'moment/moment';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    CameraVideo,
    CameraVideoOff,
    ChevronDown,
    ChevronRight,
    ExclamationTriangle,
    Flag,
    Hammer,
    HandIndex,
    Robot,
    ShieldCheck,
    X,
} from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { FlagSeverity } from '../../../../../../../types/moderation.types';
import type { ModVerb, RunActionTarget } from '../shared/action-model';
import { RunActionDialog } from '../shared/run-action-dialog';
import {
    type AttentionItem,
    type AttentionSource,
    formatSourceList,
    groupByRunner,
    parseKindFilter,
} from './attention-model';
import { ManualTimeVerdictRow } from './manual-time-verdict-row';
import styles from './needs-attention.module.scss';
import {
    isTriageInert,
    moveSelection,
    parseTriageKey,
} from './triage-keyboard';

/** data-triage-card attribute name shared between the selector and the query. */
const TRIAGE_CARD_ATTR = 'data-triage-card';

type SourceFilter = 'all' | AttentionSource;
type CategoryFilter = 'any' | number;

const KIND_CHIP_LABEL: Record<AttentionSource, string> = {
    flag: 'Flags',
    report: 'Reports',
    appeal: 'Appeals',
    self_claim: 'Self-claims',
};

interface Props {
    gameSlug: string;
    gameDisplay: string;
    items: AttentionItem[];
    /** Human-readable names of inbox sources that failed to load (e.g.
     * "flags", "reports", "manual times"). Non-empty means the list below
     * may be incomplete — never claim "All clear" while this is non-empty. */
    degradedSources: string[];
    categories: Array<{ id: number; display: string }>;
    /** Reports the current (unfiltered) item count upward so the sidebar
     * badge can decrement live as items get triaged. */
    onCountChange?: (count: number) => void;
}

const SEV_SPINE: Record<FlagSeverity, string> = {
    high: styles.sevHigh,
    medium: styles.sevMedium,
    low: styles.sevLow,
};
const SEV_PILL: Record<FlagSeverity, string> = {
    high: styles.sevPillHigh,
    medium: styles.sevPillMedium,
    low: styles.sevPillLow,
};

const SOURCE_META: Record<
    AttentionSource,
    { label: string; Icon: typeof Flag }
> = {
    flag: { label: 'flag', Icon: Robot },
    report: { label: 'reported', Icon: Flag },
    appeal: { label: 'appeal', Icon: Hammer },
    self_claim: { label: 'self-claim', Icon: HandIndex },
};

/** An active run-action invocation against one or more items. */
interface RunAction {
    verb: ModVerb;
    target: RunActionTarget;
    affectedKeys: string[];
}

export function NeedsAttention({
    gameSlug,
    gameDisplay,
    items: initialItems,
    degradedSources,
    categories,
    onCountChange,
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [items, setItems] = useState<AttentionItem[]>(initialItems);
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('any');
    const [kindFilter, setKindFilter] = useState<AttentionSource | null>(() =>
        parseKindFilter(searchParams.get('kind')),
    );
    const [runAction, setRunAction] = useState<RunAction | null>(null);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const isDegraded = degradedSources.length > 0;
    const degradedMessage = `Couldn't load ${formatSourceList(degradedSources)} — the queue may not be empty.`;

    // `?kind=` can change without this component remounting (the sidebar's
    // "Needs attention" and "Reports" items both land on the same pane) —
    // stay in sync with the URL rather than only reading it once.
    useEffect(() => {
        setKindFilter(parseKindFilter(searchParams.get('kind')));
    }, [searchParams]);

    // The sidebar badge tracks total open items, not the filtered view — so
    // narrowing by source/category/kind never makes the badge jump around,
    // only triaging (approve/remove/restore) does.
    useEffect(() => {
        onCountChange?.(items.length);
    }, [items, onCountChange]);

    const clearKindFilter = () => {
        setKindFilter(null);
        router.replace('?pane=attention', { scroll: false });
    };

    const filtered = useMemo(() => {
        return items.filter((it) => {
            if (sourceFilter !== 'all' && !it.sources.includes(sourceFilter)) {
                return false;
            }
            if (kindFilter && !it.sources.includes(kindFilter)) {
                return false;
            }
            if (categoryFilter !== 'any' && it.categoryId !== categoryFilter) {
                return false;
            }
            return true;
        });
    }, [items, sourceFilter, kindFilter, categoryFilter]);

    const groups = useMemo(() => groupByRunner(filtered), [filtered]);

    const removeKeys = (keys: string[]) => {
        const drop = new Set(keys);
        setItems((prev) => prev.filter((it) => !drop.has(it.key)));
    };

    const triggerApprove = (item: AttentionItem) => {
        if (item.runId == null) return; // self-claims use their own inline verdict row, not this dialog
        setRunAction({
            verb: 'approve',
            target: runsTargetFor(item),
            affectedKeys: [item.key],
        });
    };

    const triggerRemove = (item: AttentionItem) => {
        if (item.runId == null) return;
        setRunAction({
            verb: 'remove',
            target: runsTargetFor(item),
            affectedKeys: [item.key],
        });
    };

    // Fast triage: j/k (or Arrow Up/Down) move a roving selection between the
    // currently RENDERED cards (a collapsed runner group's items are simply
    // absent from the query, so they're skipped rather than requiring an
    // auto-expand); v opens approve, r opens remove for the selected card.
    // Inert while a dialog is open or focus sits in a form field — see
    // triage-keyboard.ts for the pure decision logic.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const action = parseTriageKey(e);
            if (!action) return;
            const active = document.activeElement as HTMLElement | null;
            if (
                isTriageInert({
                    activeTag: active?.tagName ?? null,
                    isContentEditable: !!active?.isContentEditable,
                    dialogOpen: runAction != null,
                })
            ) {
                return;
            }

            if (action === 'up' || action === 'down') {
                const keys = Array.from(
                    listRef.current?.querySelectorAll<HTMLElement>(
                        `[${TRIAGE_CARD_ATTR}]`,
                    ) ?? [],
                ).map((el) => el.getAttribute(TRIAGE_CARD_ATTR) as string);
                if (keys.length === 0) return;
                e.preventDefault();
                setSelectedKey((cur) => moveSelection(keys, cur, action));
                return;
            }

            if (selectedKey == null) return;
            const item = filtered.find((it) => it.key === selectedKey);
            if (!item) return;
            e.preventDefault();
            if (action === 'approve') triggerApprove(item);
            else triggerRemove(item);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
        // triggerApprove/triggerRemove close over `item`, not component state
        // beyond what's already listed — safe to omit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runAction, selectedKey, filtered]);

    // Keep the selection ring visibly focused and scrolled into view.
    useEffect(() => {
        if (selectedKey == null) return;
        const el = listRef.current?.querySelector<HTMLElement>(
            `[${TRIAGE_CARD_ATTR}="${CSS.escape(selectedKey)}"]`,
        );
        el?.focus();
        el?.scrollIntoView({ block: 'nearest' });
    }, [selectedKey]);

    return (
        <div>
            <div className={styles.toolbar}>
                <div className={styles.field}>
                    <label
                        htmlFor="attention-source"
                        className={styles.fieldLabel}
                    >
                        Source
                    </label>
                    <select
                        id="attention-source"
                        className={styles.select}
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
                <div className={styles.field}>
                    <label
                        htmlFor="attention-category"
                        className={styles.fieldLabel}
                    >
                        Category
                    </label>
                    <select
                        id="attention-category"
                        className={styles.select}
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
                {kindFilter && (
                    <span className={styles.kindChip}>
                        {KIND_CHIP_LABEL[kindFilter]} only
                        <button
                            type="button"
                            className={styles.kindChipDismiss}
                            onClick={clearKindFilter}
                            aria-label={`Clear ${KIND_CHIP_LABEL[kindFilter]} filter`}
                        >
                            <X size={12} aria-hidden="true" />
                        </button>
                    </span>
                )}
                <div className={styles.count}>
                    {filtered.length} item{filtered.length === 1 ? '' : 's'}
                </div>
            </div>

            {groups.length === 0 ? (
                isDegraded ? (
                    <div className={styles.empty}>
                        <ExclamationTriangle
                            size={40}
                            className={styles.emptyIconWarning}
                            aria-hidden="true"
                        />
                        <p className={styles.emptyTitleWarning}>
                            {degradedMessage}
                        </p>
                        <button
                            type="button"
                            className={clsx(
                                'btn btn-sm btn-outline-secondary',
                                styles.retryBtn,
                            )}
                            onClick={() => router.refresh()}
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className={styles.empty}>
                        <ShieldCheck
                            size={40}
                            className={styles.emptyIcon}
                            aria-hidden="true"
                        />
                        <p className={styles.emptyTitle}>All clear</p>
                        <p className="mb-0">
                            Nothing needs attention right now.
                        </p>
                    </div>
                )
            ) : (
                <>
                    {isDegraded && (
                        <div className={styles.degradedBanner}>
                            <ExclamationTriangle
                                size={16}
                                className={styles.degradedIcon}
                                aria-hidden="true"
                            />
                            <span className={styles.degradedText}>
                                {degradedMessage}
                            </span>
                            <button
                                type="button"
                                className={clsx(
                                    'btn btn-sm btn-outline-secondary',
                                    styles.degradedRetry,
                                )}
                                onClick={() => router.refresh()}
                            >
                                Retry
                            </button>
                        </div>
                    )}
                    <p className={styles.hint}>
                        j/k navigate · v approve · r remove
                    </p>
                    <div className={styles.stack} ref={listRef}>
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
                                    selectedKey={selectedKey}
                                />
                            ) : (
                                <SingleItemCard
                                    key={g.items[0].key}
                                    gameSlug={gameSlug}
                                    gameDisplay={gameDisplay}
                                    item={g.items[0]}
                                    onAct={setRunAction}
                                    onDone={() => removeKeys([g.items[0].key])}
                                    selected={g.items[0].key === selectedKey}
                                />
                            ),
                        )}
                    </div>
                </>
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

/** Build a single-run action target from an item — shared by the card's own
 * buttons and the keyboard triage shortcuts. */
function runsTargetFor(item: AttentionItem): RunActionTarget {
    const runIds = item.runId != null ? [item.runId] : [];
    return {
        kind: 'runs',
        runIds,
        label: `${item.runnerName} · ${item.categoryName}`,
    };
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

function SourcePills({ sources }: { sources: AttentionSource[] }) {
    return (
        <>
            {sources.map((s) => {
                const { label, Icon } = SOURCE_META[s];
                return (
                    <span key={s} className={styles.source}>
                        <Icon size={11} aria-hidden="true" />
                        {label}
                    </span>
                );
            })}
        </>
    );
}

function ItemMeta({ item }: { item: AttentionItem }) {
    const isGuest = item.userId == null;
    return (
        <div className={styles.meta}>
            <span className={styles.runner}>
                {isGuest ? (
                    <>
                        {item.runnerName}{' '}
                        <span className="badge text-bg-secondary">guest</span>
                    </>
                ) : (
                    <UserLink username={item.runnerName} />
                )}
            </span>
            <span className={styles.category}>{item.categoryName}</span>
            {item.subcategoryKey && (
                <span className={styles.sub}>{item.subcategoryKey}</span>
            )}
            <span className={styles.timeGroup}>
                <span className={styles.timeLabel}>RT</span>
                <span className={styles.time}>
                    <DurationToFormatted duration={item.timeMs} withMillis />
                </span>
            </span>
            {item.gameTimeMs != null && (
                <span className={styles.timeGroup}>
                    <span className={styles.timeLabel}>GT</span>
                    <span className={styles.time}>
                        <DurationToFormatted
                            duration={item.gameTimeMs}
                            withMillis
                        />
                    </span>
                </span>
            )}
            {item.vodUrl ? (
                <a
                    className={styles.vod}
                    href={item.vodUrl}
                    target="_blank"
                    rel="noreferrer"
                >
                    <CameraVideo size={13} aria-hidden="true" /> VOD
                </a>
            ) : (
                <span className={styles.noVod}>
                    <CameraVideoOff size={13} aria-hidden="true" /> No VOD
                </span>
            )}
            {item.verificationStatus && (
                <span className={styles.status}>{item.verificationStatus}</span>
            )}
        </div>
    );
}

interface SingleItemCardProps {
    gameSlug: string;
    gameDisplay: string;
    item: AttentionItem;
    onAct: (a: RunAction) => void;
    onDone: () => void;
    /** Whether the keyboard triage selection ring is on this card. */
    selected?: boolean;
}

function SingleItemCard({
    gameSlug,
    gameDisplay,
    item,
    onAct,
    onDone,
    selected = false,
}: SingleItemCardProps) {
    const isSelfClaim = item.runId == null && item.manualTimeId != null;

    const runsTarget = runsTargetFor(item);

    const act = (verb: ModVerb, target: RunActionTarget) =>
        onAct({ verb, target, affectedKeys: [item.key] });

    return (
        <div
            className={clsx(
                styles.card,
                SEV_SPINE[item.severity],
                selected && styles.selected,
            )}
            data-triage-card={item.key}
            tabIndex={-1}
        >
            <div className={styles.cardTop}>
                <span className={clsx(styles.pill, SEV_PILL[item.severity])}>
                    {item.severity}
                </span>
                <SourcePills sources={item.sources} />
                <span className={styles.age}>
                    <abbr title={moment(item.createdAt).format('LLLL')}>
                        {moment(item.createdAt).fromNow()}
                    </abbr>
                </span>
            </div>

            <ItemMeta item={item} />

            {item.note && <div className={styles.note}>{item.note}</div>}

            {isSelfClaim && item.manualTimeId != null ? (
                <ManualTimeVerdictRow
                    gameSlug={gameSlug}
                    manualTimeId={item.manualTimeId}
                    onDone={onDone}
                />
            ) : (
                <div className={styles.actions}>
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
                        <>
                            <Link
                                href={`/games-v2/${gameSlug}/manage/moderation/runner/${item.userId}`}
                                className={clsx(
                                    'btn btn-sm btn-outline-secondary',
                                    styles.pushEnd,
                                )}
                            >
                                View runner
                            </Link>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                    const t = banTarget(item, gameDisplay);
                                    if (t) act('ban', t);
                                }}
                            >
                                Ban runner…
                            </button>
                        </>
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
    selectedKey: string | null;
}

function RunnerGroupCard({
    gameSlug,
    gameDisplay,
    runnerName,
    userId,
    items,
    onAct,
    onItemDone,
    selectedKey,
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

    const Caret = open ? ChevronDown : ChevronRight;

    return (
        <div className={styles.group}>
            <div className={styles.groupHead}>
                <button
                    type="button"
                    className={styles.disclosure}
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                >
                    <Caret
                        size={14}
                        className={styles.caret}
                        aria-hidden="true"
                    />
                    {userId != null ? (
                        <UserLink username={runnerName} />
                    ) : (
                        <span>{runnerName}</span>
                    )}
                </button>
                <span className={styles.groupCountText}>
                    {items.length} items needing attention
                </span>
                <div className={clsx(styles.actions, styles.pushEnd)}>
                    {userId != null && (
                        <Link
                            href={`/games-v2/${gameSlug}/manage/moderation/runner/${userId}`}
                            className="btn btn-sm btn-outline-secondary"
                        >
                            View runner
                        </Link>
                    )}
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
                <div className={styles.groupBody}>
                    {items.map((it) => (
                        <SingleItemCard
                            key={it.key}
                            gameSlug={gameSlug}
                            gameDisplay={gameDisplay}
                            item={it}
                            onAct={onAct}
                            onDone={() => onItemDone([it.key])}
                            selected={it.key === selectedKey}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
