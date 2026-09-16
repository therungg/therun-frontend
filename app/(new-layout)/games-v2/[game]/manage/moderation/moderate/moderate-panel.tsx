'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogBehavior } from '../../../shared/board-dialog';
import styles from './moderate-panel.module.scss';
import type { SheetContext, SheetSubject } from './subject';

export type PanelMount = 'modal' | 'inline';
export type PanelTab = 'run' | 'runner';

export interface ModeratePanelProps {
    subject: SheetSubject;
    context: SheetContext;
    mount: PanelMount;
    initialTab?: PanelTab;
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
 * Tabs report an open heavy form with the function that backs out of it, and
 * `null` once it closes. The shell uses it for Esc and to lock navigation.
 */
export type FormBackHandler = (back: (() => void) | null) => void;

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
    const { subject, mount } = props;
    const defaultTab: PanelTab =
        props.initialTab ?? (subject.kind === 'runner' ? 'runner' : 'run');
    const [tab, setTab] = useState<PanelTab>(defaultTab);
    const [formOpen, setFormOpen] = useState(false);
    const formBackRef = useRef<(() => void) | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    // The portal target does not exist during SSR.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Tasks hand this to the tab as `onFormBack`.
    const _onFormBack: FormBackHandler = (back) => {
        formBackRef.current = back;
        setFormOpen(back !== null);
    };

    // Esc is Back while a heavy form is open, and closes the modal otherwise.
    const onEscape = () => {
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

    // Inline there is nothing to close, but Esc still backs out of a form
    // while focus is inside the panel.
    useEffect(() => {
        if (mount !== 'inline' || !formOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (!panelRef.current?.contains(document.activeElement)) return;
            formBackRef.current?.();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [mount, formOpen]);

    useEffect(() => {
        setTab(defaultTab);
        formBackRef.current = null;
        setFormOpen(false);
    }, [subject, defaultTab]);

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
                                    disabled={!props.onPrev}
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
                                    disabled={!props.onNext}
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

    // Tasks 5 to 7 replace `layout` with the active tab's output:
    //   subject.kind === 'bulk'  -> <BulkBody ... render={(layout) => ...} />
    //   tab === 'run'            -> <RunTab ... onFormBack={_onFormBack} render={(layout) => ...} />
    //   tab === 'runner'         -> <RunnerTab ... onFormBack={_onFormBack} render={(layout) => ...} />
    // Each tab owns its data and verb handlers and calls `render(layout)`; the shell below wraps it.
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
    const content = wrap(empty);

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
