'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isTriageInert } from '../attention/triage-keyboard';
import type { BusyHandler, FormBackHandler } from './moderate-panel';
import { type ModerateVerb, verbFromKey } from './verbs';

/**
 * The shell plumbing every panel body shares: busy state reported to the
 * shell, Back registered while a form is open, and focus back on the verb
 * that opened the form (or More, when it lives in the menu).
 */
export function usePanelVerbs({
    formOpen,
    closeForm,
    onFormBack,
    onBusyChange,
}: {
    formOpen: boolean;
    /** Closes the open form. Back calls it unless a mutation is in flight. */
    closeForm: () => void;
    onFormBack: FormBackHandler;
    onBusyChange: BusyHandler;
}) {
    const [busy, setBusyState] = useState(false);
    const busyRef = useRef(false);
    const setBusy = useCallback(
        (b: boolean) => {
            busyRef.current = b;
            setBusyState(b);
            onBusyChange(b);
        },
        [onBusyChange],
    );
    useEffect(() => () => onBusyChange(false), [onBusyChange]);

    const closeRef = useRef(closeForm);
    useEffect(() => {
        closeRef.current = closeForm;
    });
    const back = useCallback(() => {
        if (busyRef.current) return;
        closeRef.current();
    }, []);

    useEffect(() => {
        if (!formOpen) return;
        onFormBack(back);
        return () => onFormBack(null);
    }, [formOpen, onFormBack, back]);

    const openerRef = useRef<ModerateVerb | null>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (formOpen || !openerRef.current) return;
        const verb = openerRef.current;
        openerRef.current = null;
        const root = footerRef.current;
        const target =
            root?.querySelector<HTMLElement>(`[data-verb="${verb}"]`) ??
            root?.querySelector<HTMLElement>('[data-more]');
        target?.focus();
    }, [formOpen]);

    return { busy, busyRef, setBusy, back, openerRef, footerRef, rootRef };
}

/**
 * Verb keys. Inert while typing, while a form is open or a mutation is in
 * flight; inline on a page, only while focus is inside the panel.
 */
export function usePanelVerbKeys({
    handle,
    formOpen,
    busyRef,
    rootRef,
}: {
    handle: (verb: ModerateVerb) => void;
    formOpen: boolean;
    busyRef: { readonly current: boolean };
    /** Any element inside the panel; used to find its mount. */
    rootRef: { readonly current: HTMLElement | null };
}) {
    const handleRef = useRef(handle);
    const formOpenRef = useRef(formOpen);
    useEffect(() => {
        handleRef.current = handle;
        formOpenRef.current = formOpen;
    });
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.repeat) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const active = document.activeElement as HTMLElement | null;
            if (
                isTriageInert({
                    activeTag: active?.tagName ?? null,
                    isContentEditable: active?.isContentEditable ?? false,
                    dialogOpen: formOpenRef.current || busyRef.current,
                })
            )
                return;
            const panel = rootRef.current?.closest('[data-mount]');
            if (
                panel?.getAttribute('data-mount') !== 'modal' &&
                !panel?.contains(active)
            )
                return;
            const verb = verbFromKey(e.key);
            if (!verb) return;
            e.preventDefault();
            handleRef.current(verb);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [busyRef, rootRef]);
}

/**
 * The verb the caller opened the panel with. Acts once, as soon as the body
 * can tell whether the verb applies: a heavy verb opens its form, a light one
 * runs. `handle` ignores a verb that does not apply.
 */
export function useInitialVerb({
    verb,
    ready,
    handle,
    onUsed,
}: {
    verb: ModerateVerb | undefined;
    /** The body's read has landed, so availability is real. */
    ready: boolean;
    handle: (verb: ModerateVerb) => void;
    /** Tells the shell the verb is spent, so a remount does not repeat it. */
    onUsed: () => void;
}) {
    const handleRef = useRef(handle);
    useEffect(() => {
        handleRef.current = handle;
    });
    const doneRef = useRef(false);
    useEffect(() => {
        if (!verb || !ready || doneRef.current) return;
        doneRef.current = true;
        onUsed();
        handleRef.current(verb);
    }, [verb, ready, onUsed]);
}
