'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SUBMIT_PARAM } from '~src/lib/board-url';
import { parseSubmitParams, type SubmitParams } from './submit-params';

export interface SubmitDialogState extends SubmitParams {
    close: () => void;
}

/**
 * Submit-dialog open state for a page that can render it.
 *
 * Every route carrying a "Submit a run" link must call this AND render
 * `<SubmitRunDialog>`, because the dialog is opened by a query param rather
 * than a route — a page that links to `?submit=1` without mounting the dialog
 * just changes the URL and does nothing.
 */
export function useSubmitDialogState(): SubmitDialogState {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Closing drops the param, with replace rather than push so open/closed
    // don't become two history entries the Back button walks through.
    const close = () => {
        const next = new URLSearchParams(searchParams.toString());
        next.delete(SUBMIT_PARAM);
        const qs = next.toString();
        router.replace(qs ? `?${qs}` : '?', { scroll: false });
    };

    return {
        ...parseSubmitParams(new URLSearchParams(searchParams.toString())),
        close,
    };
}
