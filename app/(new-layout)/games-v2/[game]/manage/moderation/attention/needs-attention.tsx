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
import { toast } from 'react-toastify';
import chrome from '~src/components/console-chrome/console.module.scss';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    LeaderboardEntry,
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type { FlagSeverity } from '../../../../../../../types/moderation.types';
import { formatSubcategoryKey } from '../../../labels';
import { ModeratePanel } from '../moderate/moderate-panel';
import type { SheetBoard, SheetSubject } from '../moderate/subject';
import {
    type AttentionItem,
    type AttentionSource,
    formatSourceList,
    groupByRunner,
    parseKindFilter,
} from './attention-model';
import styles from './needs-attention.module.scss';
import {
    flattenTriageOrder,
    isTriageInert,
    moveSelection,
    parseTriageKey,
    queuePosition,
} from './triage-keyboard';

/** data-triage-card attribute name shared between the selector and the query. */
const TRIAGE_CARD_ATTR = 'data-triage-card';

const BTN_SECONDARY = styles.quietBtn;

const SOURCE_FILTERS: Array<{ value: SourceFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'flag', label: 'Flags' },
    { value: 'report', label: 'Reports' },
    { value: 'appeal', label: 'Appeals' },
    { value: 'self_claim', label: 'Self-claims' },
];

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
    gameId: number;
    gameDisplay: string;
    items: AttentionItem[];
    /** Human-readable names of inbox sources that failed to load (e.g.
     * "flags", "reports", "manual times"). Non-empty means the list below
     * may be incomplete — never claim "All clear" while this is non-empty. */
    degradedSources: string[];
    categories: Array<{ id: number; display: string }>;
    /** Full board rows, for the moderate modal. */
    boardCategories: ResolvedCategory[];
    variables: VariableRow[];
    canSiteBan: boolean;
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

const VERIFICATION_LABEL: Record<string, string> = {
    pending: 'Pending',
    verified: 'Verified',
    rejected: 'Rejected',
};

/** Auto-verify's failed-check flag reasons (run_flags.reason), labeled for
 * the triage queue. The only caller is guarded by isAutoVerifyFlagReason, so
 * every reason passed to flagReasonLabel is a key of this map. */
const AUTO_VERIFY_FLAG_LABEL: Record<string, string> = {
    consistency: 'Split data inconsistent',
    'live-match': 'Live timing mismatch',
    ambiguous_live_match: 'Ambiguous live match',
    no_live_match: 'No live timing',
    'gold-beat': 'Beat a gold split',
    'pb-jump': 'Large PB improvement',
    'prior-runs': 'Too few verified runs',
    'top-n': 'Top-N needs a human',
};

function flagReasonLabel(reason: string): string {
    return AUTO_VERIFY_FLAG_LABEL[reason];
}

/** Only auto-verify's own failed-check reasons get a triage label — the
 * pre-existing manual/report flag reasons keep showing just their note. */
function isAutoVerifyFlagReason(reason: string): boolean {
    return reason in AUTO_VERIFY_FLAG_LABEL;
}

/** What the moderate modal is open on: one item, or a runner from a group. */
type ModerateTarget =
    | { kind: 'item'; key: string }
    | {
          kind: 'runner';
          userId: number;
          runnerName: string;
          categoryId: number | null;
      };

/** The board an item sits on, or null when the console does not list it. */
function itemBoard(
    item: AttentionItem,
    boardCategories: ResolvedCategory[],
): SheetBoard | null {
    const category = boardCategories.find((c) => c.id === item.categoryId);
    if (!category) return null;
    return {
        categoryId: category.id,
        categorySlug: category.name,
        categoryDisplay: category.display,
        subcategoryKey: item.subcategoryKey,
        primaryTiming: category.primaryTiming === 'gt' ? 'gt' : 'rt',
    };
}

/** An attention item as a board row; a self-claim is a manual time. */
function itemEntry(item: AttentionItem, board: SheetBoard): LeaderboardEntry {
    const status = item.verificationStatus;
    return {
        runId: item.runId,
        manualTimeId: item.manualTimeId,
        source: item.runId == null ? 'manual' : 'run',
        rank: 0,
        runnerName: item.runnerName,
        userId: item.userId,
        isGuest: item.userId == null,
        time:
            board.primaryTiming === 'gt' && item.gameTimeMs != null
                ? item.gameTimeMs
                : item.timeMs,
        realTime: item.timeMs,
        gameTime: item.gameTimeMs,
        runDate: null,
        vodUrl: item.vodUrl,
        verificationStatus:
            status === 'verified' || status === 'rejected' ? status : 'pending',
        variables: null,
    };
}

export function NeedsAttention({
    gameSlug,
    gameId,
    gameDisplay,
    items: initialItems,
    degradedSources,
    categories,
    boardCategories,
    variables,
    canSiteBan,
    onCountChange,
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    // A mutation in the modal refreshes the route, which sends the fresh
    // server-computed list through this prop.
    const items = initialItems;
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('any');
    const [kindFilter, setKindFilter] = useState<AttentionSource | null>(() =>
        parseKindFilter(searchParams.get('kind')),
    );
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [moderate, setModerate] = useState<ModerateTarget | null>(null);
    // Runner-group disclosure state, lifted out of RunnerGroupCard (which
    // used to own it locally) so the roving keyboard selection and the
    // "{n} of {m}" queue indicator can compute the true rendered card order
    // without a DOM query — see flattenTriageOrder below.
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(
        new Set(),
    );
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

    // Severity tally for the pane header — the scan-first overview of the
    // whole queue (unfiltered, like the sidebar badge).
    const sevTally = useMemo(() => {
        const t: Record<FlagSeverity, number> = { high: 0, medium: 0, low: 0 };
        for (const it of items) t[it.severity] += 1;
        return t;
    }, [items]);

    // The exact key order cards render in — respects collapsed runner
    // groups, shared by the roving j/k handler and the queue-position badge.
    const orderedKeys = useMemo(
        () => flattenTriageOrder(groups, expandedGroups),
        [groups, expandedGroups],
    );
    const queuePos = useMemo(
        () => queuePosition(orderedKeys, selectedKey),
        [orderedKeys, selectedKey],
    );

    const toggleGroup = (userId: number) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    // Every item in the order the cards list them, collapsed groups
    // included: the modal's prev/next walks this.
    const modalOrder = useMemo(() => groups.flatMap((g) => g.items), [groups]);

    const openItem = (item: AttentionItem) => {
        if (!itemBoard(item, boardCategories)) {
            toast.error(
                "This run's board isn't in this console's list. Open it from the run page.",
            );
            return;
        }
        setModerate({ kind: 'item', key: item.key });
    };

    // After the list reloads under the modal (the open item decided away),
    // stay on it if it is still listed, else take the next item that
    // survived, else the one before it, else close. Worked out during render
    // so the modal never renders without an item while one survives.
    const orderSignature = modalOrder.map((i) => i.key).join('|');
    const [seenOrder, setSeenOrder] = useState<{
        signature: string;
        keys: string[];
    }>({ signature: '', keys: [] });
    if (seenOrder.signature !== orderSignature) {
        const next = modalOrder.map((i) => i.key);
        setSeenOrder({ signature: orderSignature, keys: next });
        if (moderate?.kind === 'item' && !next.includes(moderate.key)) {
            const previous = seenOrder.keys;
            const survivors = new Set(next);
            const at = previous.indexOf(moderate.key);
            let landing: string | null = null;
            if (at !== -1) {
                landing =
                    previous.slice(at + 1).find((k) => survivors.has(k)) ??
                    previous
                        .slice(0, at)
                        .reverse()
                        .find((k) => survivors.has(k)) ??
                    null;
            }
            setModerate(landing ? { kind: 'item', key: landing } : null);
        }
    }

    const modalIndex =
        moderate?.kind === 'item'
            ? modalOrder.findIndex((i) => i.key === moderate.key)
            : -1;
    const modalItem = modalIndex >= 0 ? modalOrder[modalIndex] : null;
    const modalBoard = modalItem ? itemBoard(modalItem, boardCategories) : null;
    const stepTo = (index: number) => {
        const item = modalOrder[index];
        if (item && itemBoard(item, boardCategories))
            setModerate({ kind: 'item', key: item.key });
    };

    let modalSubject: SheetSubject | null = null;
    if (moderate?.kind === 'runner') {
        modalSubject = {
            kind: 'runner',
            userId: moderate.userId,
            runnerName: moderate.runnerName,
            categoryId: moderate.categoryId,
        };
    } else if (modalItem && modalBoard) {
        modalSubject = {
            kind: 'run',
            entry: itemEntry(modalItem, modalBoard),
            board: modalBoard,
        };
    }

    // Fast triage: j/k (or Arrow Up/Down) move a roving selection between the
    // currently RENDERED cards (a collapsed runner group's items are simply
    // absent from the query, so they're skipped rather than requiring an
    // auto-expand); Enter opens the moderate modal on the selected card.
    // Inert while the modal is open or focus sits in a form field — see
    // triage-keyboard.ts for the pure decision logic.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            // The open modal owns the keyboard.
            if (moderate !== null) return;
            const active = document.activeElement as HTMLElement | null;
            if (
                isTriageInert({
                    activeTag: active?.tagName ?? null,
                    isContentEditable: !!active?.isContentEditable,
                    dialogOpen: false,
                })
            ) {
                return;
            }

            if (e.key === 'Enter') {
                if (e.ctrlKey || e.metaKey || e.altKey) return;
                if (selectedKey == null) return;
                // Enter on a focused control belongs to that control.
                if (active?.tagName === 'BUTTON' || active?.tagName === 'A')
                    return;
                const item = filtered.find((it) => it.key === selectedKey);
                if (!item) return;
                e.preventDefault();
                openItem(item);
                return;
            }

            const action = parseTriageKey(e);
            if (action !== 'up' && action !== 'down') return;
            if (orderedKeys.length === 0) return;
            e.preventDefault();
            setSelectedKey((cur) => moveSelection(orderedKeys, cur, action));
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
        // openItem closes over boardCategories only; safe to omit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moderate, selectedKey, filtered, orderedKeys]);

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
            <header className={chrome.paneHeader}>
                <div>
                    <div className={chrome.paneEyebrow}>Queue</div>
                    <h2 className={chrome.paneTitle}>Needs attention</h2>
                </div>
                <div className={chrome.paneActions}>
                    {items.length > 0 && (
                        <span className={styles.tally}>
                            {(['high', 'medium', 'low'] as const).map(
                                (sev) =>
                                    sevTally[sev] > 0 && (
                                        <span
                                            key={sev}
                                            className={styles.tallyItem}
                                        >
                                            <span
                                                className={styles.tallyDot}
                                                data-sev={sev}
                                                aria-hidden="true"
                                            />
                                            <span className={styles.tallyNum}>
                                                {sevTally[sev]}
                                            </span>
                                            {sev}
                                        </span>
                                    ),
                            )}
                        </span>
                    )}
                </div>
            </header>
            <p className={chrome.paneLede}>
                Open flags, reports, appeals and self-claims on this game&apos;s
                boards, highest severity first.
            </p>
            <div className={styles.toolbar}>
                <div className={styles.field}>
                    <span className={styles.fieldLabel} id="attention-source">
                        Source
                    </span>
                    <div
                        className={styles.chipRow}
                        role="group"
                        aria-labelledby="attention-source"
                    >
                        {SOURCE_FILTERS.map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                className={clsx(
                                    styles.filterChip,
                                    sourceFilter === value &&
                                        styles.filterChipActive,
                                )}
                                aria-pressed={sourceFilter === value}
                                onClick={() => setSourceFilter(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
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
                    {filtered.length === items.length
                        ? `${filtered.length} item${filtered.length === 1 ? '' : 's'}`
                        : `${filtered.length} of ${items.length}`}
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
                            className={clsx(BTN_SECONDARY, styles.retryBtn)}
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
                        <p className={styles.emptyText}>
                            Nothing needs attention right now.
                        </p>
                        <div className={styles.emptyLinks}>
                            <Link
                                href={`/games-v2/${encodeURIComponent(gameSlug)}/manage?pane=history`}
                                className={styles.emptyLink}
                            >
                                Review history
                            </Link>
                            <Link
                                href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation/roster`}
                                className={styles.emptyLink}
                            >
                                Browse runs
                            </Link>
                            <Link
                                href="/games-v2/manage"
                                className={styles.emptyLink}
                            >
                                All your games
                            </Link>
                        </div>
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
                                    BTN_SECONDARY,
                                    styles.degradedRetry,
                                )}
                                onClick={() => router.refresh()}
                            >
                                Retry
                            </button>
                        </div>
                    )}
                    <p className={styles.hint}>
                        <kbd>j</kbd>
                        <kbd>k</kbd> navigate · <kbd>Enter</kbd> moderate
                        {queuePos && (
                            <span className={styles.queuePosition}>
                                {queuePos.n} of {queuePos.m}
                            </span>
                        )}
                    </p>
                    <div className={styles.stack} ref={listRef}>
                        {groups.map((g) =>
                            g.items.length > 1 ? (
                                <RunnerGroupCard
                                    key={`u:${g.userId}`}
                                    gameSlug={gameSlug}
                                    runnerName={g.runnerName}
                                    userId={g.userId}
                                    items={g.items}
                                    onModerateItem={openItem}
                                    onModerateRunner={(target) =>
                                        setModerate(target)
                                    }
                                    selectedKey={selectedKey}
                                    open={
                                        g.userId != null &&
                                        expandedGroups.has(g.userId)
                                    }
                                    onToggleOpen={() =>
                                        g.userId != null &&
                                        toggleGroup(g.userId)
                                    }
                                />
                            ) : (
                                <SingleItemCard
                                    key={g.items[0].key}
                                    gameSlug={gameSlug}
                                    item={g.items[0]}
                                    onModerate={() => openItem(g.items[0])}
                                    selected={g.items[0].key === selectedKey}
                                />
                            ),
                        )}
                    </div>
                </>
            )}

            {modalSubject && (
                <ModeratePanel
                    subject={modalSubject}
                    context={{
                        gameSlug,
                        gameId,
                        gameDisplay,
                        categories: boardCategories,
                        variables,
                        canSiteBan,
                    }}
                    mount="modal"
                    initialTab={
                        modalSubject.kind === 'runner' ? 'runner' : undefined
                    }
                    position={
                        modalItem
                            ? {
                                  index: modalIndex + 1,
                                  total: modalOrder.length,
                              }
                            : undefined
                    }
                    onClose={() => setModerate(null)}
                    onMutated={() => router.refresh()}
                    onPrev={
                        modalItem && modalIndex > 0
                            ? () => stepTo(modalIndex - 1)
                            : undefined
                    }
                    onNext={
                        modalItem && modalIndex < modalOrder.length - 1
                            ? () => stepTo(modalIndex + 1)
                            : undefined
                    }
                />
            )}
        </div>
    );
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
                        <span className={styles.guestBadge}>guest</span>
                    </>
                ) : (
                    <UserLink username={item.runnerName} to="leaderboards" />
                )}
            </span>
            <span className={styles.category}>{item.categoryName}</span>
            {item.subcategoryKey && (
                <span className={styles.sub}>
                    {formatSubcategoryKey(item.subcategoryKey)}
                </span>
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
                <span className={styles.status}>
                    {VERIFICATION_LABEL[item.verificationStatus] ??
                        item.verificationStatus}
                </span>
            )}
        </div>
    );
}
interface SingleItemCardProps {
    gameSlug: string;
    item: AttentionItem;
    onModerate: () => void;
    /** Whether the keyboard triage selection ring is on this card. */
    selected?: boolean;
}

function SingleItemCard({
    gameSlug,
    item,
    onModerate,
    selected = false,
}: SingleItemCardProps) {
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

            {(item.flagReason || item.note) && (
                <div className={styles.note}>
                    {item.flagReason && isAutoVerifyFlagReason(item.flagReason)
                        ? flagReasonLabel(item.flagReason)
                        : null}
                    {item.flagReason &&
                    isAutoVerifyFlagReason(item.flagReason) &&
                    item.note
                        ? ' — '
                        : null}
                    {item.note}
                </div>
            )}

            <div className={styles.actions}>
                <button
                    type="button"
                    className={BTN_SECONDARY}
                    onClick={onModerate}
                >
                    Moderate
                </button>
                {item.userId != null && (
                    <Link
                        href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation/runner/${item.userId}`}
                        className={clsx(BTN_SECONDARY, styles.pushEnd)}
                    >
                        View runner
                    </Link>
                )}
            </div>
        </div>
    );
}

interface RunnerGroupCardProps {
    gameSlug: string;
    runnerName: string;
    userId: number | null;
    items: AttentionItem[];
    onModerateItem: (item: AttentionItem) => void;
    onModerateRunner: (target: ModerateTarget) => void;
    selectedKey: string | null;
    /** Disclosure state, lifted to the parent — flattenTriageOrder needs to
     * know which groups are expanded to compute the true rendered card
     * order, so this can't stay local component state. */
    open: boolean;
    onToggleOpen: () => void;
}

function RunnerGroupCard({
    gameSlug,
    runnerName,
    userId,
    items,
    onModerateItem,
    onModerateRunner,
    selectedKey,
    open,
    onToggleOpen,
}: RunnerGroupCardProps) {
    const firstWithCat = items.find((it) => it.categoryId != null);
    const Caret = open ? ChevronDown : ChevronRight;

    return (
        <div className={styles.group}>
            <div className={styles.groupHead}>
                <button
                    type="button"
                    className={styles.disclosure}
                    onClick={onToggleOpen}
                    aria-expanded={open}
                >
                    <Caret
                        size={14}
                        className={styles.caret}
                        aria-hidden="true"
                    />
                    {userId != null ? (
                        <UserLink username={runnerName} to="leaderboards" />
                    ) : (
                        <span>{runnerName}</span>
                    )}
                </button>
                <span className={styles.groupCountText}>
                    <span className={styles.groupCountNum}>{items.length}</span>{' '}
                    open
                </span>
                <div className={clsx(styles.actions, styles.pushEnd)}>
                    {userId != null && (
                        <>
                            <button
                                type="button"
                                className={BTN_SECONDARY}
                                onClick={() =>
                                    onModerateRunner({
                                        kind: 'runner',
                                        userId,
                                        runnerName,
                                        categoryId:
                                            firstWithCat?.categoryId ?? null,
                                    })
                                }
                            >
                                Moderate
                            </button>
                            <Link
                                href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation/runner/${userId}`}
                                className={BTN_SECONDARY}
                            >
                                View runner
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {open && (
                <div className={styles.groupBody}>
                    {items.map((it) => (
                        <SingleItemCard
                            key={it.key}
                            gameSlug={gameSlug}
                            item={it}
                            onModerate={() => onModerateItem(it)}
                            selected={it.key === selectedKey}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
