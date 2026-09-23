'use client';

import {
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { LeaderboardEntry } from '../../../../../../../types/leaderboards.types';
import { useDialogBehavior } from '../../../shared/board-dialog';
import { isTriageInert } from '../shared/triage-keyboard';
import { BulkBody } from './bulk-body';
import styles from './moderate-panel.module.scss';
import { RunTab } from './run-tab';
import { RunnerTab } from './runner-tab';
import {
    type SheetBoard,
    type SheetContext,
    type SheetSubject,
    subjectKey,
} from './subject';
import type { ModerateVerb } from './verbs';

export type PanelMount = 'modal' | 'inline';
export type PanelTab = 'run' | 'runner';

export interface ModeratePanelProps {
    subject: SheetSubject;
    context: SheetContext;
    mount: PanelMount;
    initialTab?: PanelTab;
    /**
     * Acted on once when the panel opens: a heavy verb opens its form, a light
     * verb runs. Ignored when the verb does not apply to the subject.
     */
    initialVerb?: ModerateVerb;
    /** Replaces the default reason when `initialVerb` is Approve. */
    initialVerbReason?: string;
    onClose?: () => void;
    onMutated: () => void;
    onPrev?: () => void;
    onNext?: () => void;
    /** "2 of 23" when opened from a list. */
    position?: { index: number; total: number };
}

/** What a tab hands the shell. `right` and `footer` are replaced by the heavy form while one is open. */
export interface PanelLayout {
    identity: ReactNode;
    left: ReactNode;
    right: ReactNode;
    footer: ReactNode;
    /** Link in the top bar: run page on the Run tab, runner page on the Runner tab. */
    pageLink: { href: string; label: string } | null;
}

/**
 * How a tab tells the shell a heavy form is open. Stable for the panel's
 * lifetime, so it is safe in effect deps.
 *
 * Contract for tabs:
 * - Call it with the form's Back function when the form opens.
 * - Call it with `null` on Back, after a successful confirm, and in the
 *   effect cleanup of whatever opened the form (unmount, subject change).
 * - The registered function must do nothing while the form is busy; the
 *   shell also ignores Esc entirely while `onBusyChange(true)` is reported.
 *
 * The shell uses the registration for Esc (Back instead of close) and to
 * lock tabs, prev/next and the page link while the form is open.
 */
export type FormBackHandler = (back: (() => void) | null) => void;

/** A tab reports a mutation in flight; Esc does nothing until it settles. Stable. */
export type BusyHandler = (busy: boolean) => void;

export function PanelFrame({
    layout,
    compact,
    formOpen = false,
}: {
    layout: PanelLayout;
    compact: boolean;
    formOpen?: boolean;
}) {
    if (compact) {
        return (
            <>
                <div className={styles.compactBody}>
                    {layout.identity}
                    {layout.right}
                </div>
                <div
                    className={styles.footer}
                    role="toolbar"
                    aria-label="Actions"
                >
                    {layout.footer}
                </div>
            </>
        );
    }
    return (
        <>
            <div className={styles.identity}>{layout.identity}</div>
            <div className={styles.columns}>
                <div className={styles.left}>{layout.left}</div>
                <div className={styles.right} data-form={formOpen || undefined}>
                    {layout.right}
                </div>
            </div>
            <div className={styles.footer} role="toolbar" aria-label="Actions">
                {layout.footer}
            </div>
        </>
    );
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
            <path d={dir === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    );
}

export function ModeratePanel(props: ModeratePanelProps) {
    const { mount } = props;
    // A run opened from the Runner tab replaces the subject until the caller
    // hands the panel a different one.
    const [subjectOverride, setSubjectOverride] = useState<SheetSubject | null>(
        null,
    );
    const propsKey = subjectKey(props.subject);
    useEffect(() => {
        setSubjectOverride(null);
    }, [propsKey]);
    const subject = subjectOverride ?? props.subject;
    const defaultTab: PanelTab = subjectOverride
        ? 'run'
        : (props.initialTab ?? (subject.kind === 'runner' ? 'runner' : 'run'));
    const onOpenRun = useCallback(
        (entry: LeaderboardEntry, board: SheetBoard) => {
            setSubjectOverride({ kind: 'run', entry, board });
            // The subject key may not change (the run the panel opened on,
            // or one already open), so the reset effect cannot be relied on.
            setTab('run');
        },
        [],
    );
    const [tab, setTab] = useState<PanelTab>(defaultTab);
    // The caller's verb belongs to the caller's subject. Spent once used, so
    // switching tabs or opening another run never repeats it.
    const verbToken = props.initialVerb
        ? `${propsKey}:${props.initialVerb}`
        : null;
    const [spentVerbToken, setSpentVerbToken] = useState<string | null>(null);
    const initialVerb =
        verbToken !== null && verbToken !== spentVerbToken && !subjectOverride
            ? props.initialVerb
            : undefined;
    const onInitialVerbUsed = useCallback(() => {
        setSpentVerbToken(verbToken);
    }, [verbToken]);
    const [formOpen, setFormOpen] = useState(false);
    const formBackRef = useRef<(() => void) | null>(null);
    const busyRef = useRef(false);
    const panelRef = useRef<HTMLDivElement>(null);
    // The portal target does not exist during SSR.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Handed to the tab as `onFormBack` and `onBusyChange`.
    const onFormBack = useCallback<FormBackHandler>((back) => {
        formBackRef.current = back;
        setFormOpen(back !== null);
    }, []);
    // Mirrors busyRef for rendering: Previous and Next wait for a mutation.
    const [busy, setBusy] = useState(false);
    const onBusyChange = useCallback<BusyHandler>((b) => {
        busyRef.current = b;
        setBusy(b);
    }, []);

    // Esc is Back while a heavy form is open, and closes the modal otherwise.
    // Nothing while a mutation is in flight.
    const onEscape = () => {
        if (busyRef.current) return;
        if (formBackRef.current) {
            formBackRef.current();
            return;
        }
        props.onClose?.();
    };

    useDialogBehavior({
        open: mount === 'modal' && mounted,
        onClose: onEscape,
        panelRef,
    });

    // j and k step through the caller's list without closing the modal.
    const stepRef = useRef({ prev: props.onPrev, next: props.onNext });
    useEffect(() => {
        stepRef.current = { prev: props.onPrev, next: props.onNext };
    });
    useEffect(() => {
        if (mount !== 'modal' || formOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.repeat) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key !== 'j' && e.key !== 'k') return;
            const active = document.activeElement as HTMLElement | null;
            if (
                isTriageInert({
                    activeTag: active?.tagName ?? null,
                    isContentEditable: active?.isContentEditable ?? false,
                    dialogOpen: busyRef.current,
                })
            )
                return;
            const step =
                e.key === 'j' ? stepRef.current.next : stepRef.current.prev;
            if (!step) return;
            e.preventDefault();
            step();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [mount, formOpen]);

    // Inline there is nothing to close, but Esc still backs out of a form
    // while focus is inside the panel.
    useEffect(() => {
        if (mount !== 'inline' || !formOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (busyRef.current) return;
            if (!panelRef.current?.contains(document.activeElement)) return;
            formBackRef.current?.();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [mount, formOpen]);

    // Reset only when the subject really changes, not on a new object for the
    // same run or runner. Tabs render with `key={subjectKey(subject)}`.
    const key = subjectKey(subject);
    useEffect(() => {
        setTab(defaultTab);
        formBackRef.current = null;
        busyRef.current = false;
        setBusy(false);
        setFormOpen(false);
    }, [key]);

    const runnerId =
        subject.kind === 'run'
            ? (subject.entry.userId ?? null)
            : subject.kind === 'runner'
              ? subject.userId
              : null;
    const showTabs = subject.kind !== 'bulk' && runnerId !== null;
    const compact = subject.kind === 'bulk';
    const isModal = mount === 'modal';

    const topBar = (pageLink: PanelLayout['pageLink']) => {
        const hasPosition = isModal && !!props.position;
        const hasLink = isModal && !!pageLink && !formOpen;
        const hasClose = isModal && !!props.onClose;
        return (
            <div className={styles.topBar}>
                {showTabs ? (
                    <div className={styles.tabs} role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'run'}
                            className={styles.tab}
                            onClick={() => setTab('run')}
                            disabled={subject.kind === 'runner' || formOpen}
                        >
                            Run
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'runner'}
                            className={styles.tab}
                            onClick={() => setTab('runner')}
                            disabled={formOpen}
                        >
                            Runner
                        </button>
                    </div>
                ) : (
                    <span className={styles.eyebrow}>
                        {compact ? 'Selection' : ''}
                    </span>
                )}
                <div className={styles.topNav}>
                    {!isModal ? (
                        <span className={styles.eyebrow}>Moderators only</span>
                    ) : null}
                    {hasPosition && props.position ? (
                        <>
                            {formOpen ? null : (
                                <button
                                    type="button"
                                    className={styles.iconBtn}
                                    aria-label="Previous run"
                                    onClick={props.onPrev}
                                    disabled={!props.onPrev || busy}
                                >
                                    <ChevronIcon dir="left" />
                                </button>
                            )}
                            <span className={styles.position}>
                                {props.position.index} of {props.position.total}
                            </span>
                            {formOpen ? null : (
                                <button
                                    type="button"
                                    className={styles.iconBtn}
                                    aria-label="Next run"
                                    onClick={props.onNext}
                                    disabled={!props.onNext || busy}
                                >
                                    <ChevronIcon dir="right" />
                                </button>
                            )}
                        </>
                    ) : null}
                    {hasPosition && (hasLink || hasClose) ? (
                        <span className={styles.divider} />
                    ) : null}
                    {hasLink && pageLink ? (
                        <a className={styles.pageLink} href={pageLink.href}>
                            {pageLink.label}
                        </a>
                    ) : null}
                    {hasLink && hasClose ? (
                        <span className={styles.divider} />
                    ) : null}
                    {hasClose ? (
                        <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label="Close"
                            onClick={props.onClose}
                        >
                            <CloseIcon />
                        </button>
                    ) : null}
                </div>
            </div>
        );
    };

    // Each tab owns its data and verb handlers and calls `render(layout)`; the shell wraps it.
    const wrap = (layout: PanelLayout) => (
        <>
            {topBar(layout.pageLink)}
            <PanelFrame layout={layout} compact={compact} formOpen={formOpen} />
        </>
    );
    const empty: PanelLayout = {
        identity: null,
        left: null,
        right: null,
        footer: null,
        pageLink: null,
    };
    const content =
        subject.kind === 'bulk' ? (
            <BulkBody
                key={key}
                subject={subject}
                context={props.context}
                onMutated={props.onMutated}
                onFormBack={onFormBack}
                onBusyChange={onBusyChange}
                render={wrap}
                initialVerb={initialVerb}
                onInitialVerbUsed={onInitialVerbUsed}
            />
        ) : subject.kind === 'run' && tab === 'run' ? (
            <RunTab
                key={key}
                subject={subject}
                context={props.context}
                onMutated={props.onMutated}
                onOpenRunner={() => setTab('runner')}
                initialVerbReason={
                    initialVerb ? props.initialVerbReason : undefined
                }
                onFormBack={onFormBack}
                onBusyChange={onBusyChange}
                render={wrap}
                initialVerb={initialVerb}
                onInitialVerbUsed={onInitialVerbUsed}
            />
        ) : tab === 'runner' && runnerId !== null ? (
            <RunnerTab
                key={key}
                userId={runnerId}
                runnerName={
                    subject.kind === 'run'
                        ? subject.entry.runnerName
                        : subject.runnerName
                }
                categoryId={
                    subject.kind === 'run'
                        ? subject.board.categoryId
                        : (subject.categoryId ?? null)
                }
                context={props.context}
                onMutated={props.onMutated}
                onOpenRun={onOpenRun}
                onRunnerPage={
                    mount === 'inline' && props.subject.kind === 'runner'
                }
                onFormBack={onFormBack}
                onBusyChange={onBusyChange}
                render={wrap}
                initialVerb={initialVerb}
                onInitialVerbUsed={onInitialVerbUsed}
            />
        ) : (
            wrap(empty)
        );

    const box = (
        <div
            ref={panelRef}
            className={
                !isModal
                    ? styles.inline
                    : compact
                      ? styles.modalCompact
                      : styles.modal
            }
            role={isModal ? 'dialog' : 'region'}
            aria-modal={isModal ? true : undefined}
            aria-label={
                compact
                    ? 'Moderate selection'
                    : tab === 'runner'
                      ? 'Moderate runner'
                      : 'Moderate run'
            }
            data-mount={mount}
        >
            {content}
        </div>
    );

    if (!isModal) return box;
    if (!mounted) return null;
    return createPortal(
        <div className={styles.layer}>
            <div
                className={styles.backdrop}
                aria-hidden="true"
                onMouseDown={formOpen ? undefined : props.onClose}
            />
            {box}
        </div>,
        document.body,
    );
}
