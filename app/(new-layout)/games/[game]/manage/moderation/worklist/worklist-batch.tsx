'use client';

import { ChevronRight } from 'react-bootstrap-icons';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type {
    WorklistBatch,
    WorklistItem,
} from '../../../../../../../types/worklist.types';
import {
    ageTone,
    batchLabelWithoutCount,
    batchQueueKey,
    batchSummary,
    runQueueKey,
    shortBoardList,
    waitingLabel,
} from './worklist-model';
import styles from './worklist-pane.module.scss';
import { WorklistRow } from './worklist-row';

type RowHandlers = {
    onApprove: (item: WorklistItem) => void;
    onInspect: (item: WorklistItem) => void;
};

type BatchProps = RowHandlers & {
    batch: WorklistBatch;
    variables: VariableRow[];
    now: Date;
    busy: boolean;
    expanded: boolean;
    /** The queue key the keyboard is on, if any. */
    focusedKey: string | null;
    onToggle: (batch: WorklistBatch) => void;
    onApproveAll: (batch: WorklistBatch) => void;
};

function Members({
    batch,
    variables,
    now,
    busy,
    focusedKey,
    onApprove,
    onInspect,
}: BatchProps) {
    return (
        <ul className={styles.members}>
            {batch.items.map((item) => (
                <WorklistRow
                    key={item.runId}
                    item={item}
                    variables={variables}
                    now={now}
                    busy={busy}
                    focused={focusedKey === runQueueKey(item)}
                    onApprove={onApprove}
                    onInspect={onInspect}
                />
            ))}
        </ul>
    );
}

function videoLabel(withVideo: number, total: number): string {
    if (withVideo === 0) return 'No video';
    if (withVideo === total) return total === 1 ? 'Video' : 'All with video';
    return `${withVideo} of ${total} with video`;
}

/**
 * The batch that clears the most with one click: every run from runners this
 * game has verified before, nothing flagged. It gets the page's one filled
 * button and enough facts to press it without opening the list.
 */
export function BatchHero(props: BatchProps) {
    const {
        batch,
        variables,
        now,
        busy,
        expanded,
        focusedKey,
        onToggle,
        onApproveAll,
    } = props;
    const key = batchQueueKey(batch);
    const focused = focusedKey === key;
    const count = batch.runIds.length;
    const { boards, oldest, withVideo } = batchSummary(batch, variables);

    return (
        <section
            className={styles.hero}
            data-queue-key={key}
            data-focused={focused || undefined}
            tabIndex={-1}
        >
            <div className={styles.heroHead}>
                <p className={styles.heroTitle}>
                    <span className={styles.heroCount}>
                        {count.toLocaleString()}
                    </span>{' '}
                    {batchLabelWithoutCount(batch)}
                </p>
                <button
                    type="button"
                    className={styles.heroApprove}
                    disabled={busy}
                    onClick={() => onApproveAll(batch)}
                >
                    {busy ? 'Approving…' : `Approve all ${count}`}
                    {focused && <kbd className={styles.kbd}>⇧A</kbd>}
                </button>
            </div>
            <ul className={styles.facts}>
                <li>
                    <strong>{boards.length}</strong>{' '}
                    {boards.length === 1 ? 'board' : 'boards'}
                    <span className={styles.factDetail}>
                        {shortBoardList(boards, 3)}
                    </span>
                </li>
                {oldest && (
                    <li>
                        oldest waiting{' '}
                        <strong
                            className={styles.wait}
                            data-tone={ageTone(oldest, now)}
                            suppressHydrationWarning
                        >
                            {waitingLabel(oldest, now)}
                        </strong>
                    </li>
                )}
                <li>{videoLabel(withVideo, count)}</li>
            </ul>
            <button
                type="button"
                className={styles.quietToggle}
                aria-expanded={expanded}
                onClick={() => onToggle(batch)}
            >
                <ChevronRight
                    className={styles.chevron}
                    data-open={expanded || undefined}
                    aria-hidden
                />
                {expanded ? 'Hide the runs' : 'Show the runs'}
            </button>
            {expanded && <Members {...props} />}
        </section>
    );
}

/** One runner's routine runs as a single line: who, how many, where, how old. */
export function BatchRow(props: BatchProps) {
    const {
        batch,
        variables,
        now,
        busy,
        expanded,
        focusedKey,
        onToggle,
        onApproveAll,
    } = props;
    const key = batchQueueKey(batch);
    const focused = focusedKey === key;
    const count = batch.runIds.length;
    const { boards, oldest, withVideo } = batchSummary(batch, variables);
    const tone = oldest ? ageTone(oldest, now) : 'fresh';
    const runner = batch.items[0]?.runnerName ?? batchLabelWithoutCount(batch);

    return (
        <li
            className={styles.batchRow}
            data-tone={tone}
            data-queue-key={key}
            data-focused={focused || undefined}
            tabIndex={-1}
        >
            <div className={styles.batchLine}>
                <button
                    type="button"
                    className={styles.batchToggle}
                    aria-expanded={expanded}
                    onClick={() => onToggle(batch)}
                >
                    <ChevronRight
                        className={styles.chevron}
                        data-open={expanded || undefined}
                        aria-hidden
                    />
                    <span className={styles.batchRunner}>{runner}</span>
                    <span className={styles.batchRuns}>{count} runs</span>
                    <span className={styles.batchBoards}>
                        {shortBoardList(boards)}
                    </span>
                    <span
                        className={styles.batchVideo}
                        data-none={withVideo === 0 || undefined}
                    >
                        {videoLabel(withVideo, count)}
                    </span>
                    <span
                        className={styles.wait}
                        data-tone={tone}
                        suppressHydrationWarning
                    >
                        {oldest ? waitingLabel(oldest, now) : ''}
                    </span>
                </button>
                <button
                    type="button"
                    className={styles.batchApprove}
                    disabled={busy}
                    onClick={() => onApproveAll(batch)}
                >
                    {busy ? 'Approving…' : `Approve ${count}`}
                    {focused && <kbd className={styles.kbd}>⇧A</kbd>}
                </button>
            </div>
            {expanded && <Members {...props} />}
        </li>
    );
}
