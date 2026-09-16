'use client';

import { useId, useState, useTransition } from 'react';
import { CheckCircleFill } from 'react-bootstrap-icons';
import { selfSetEvidenceAction } from '~src/actions/self-evidence.action';
import styles from './waiting-on-you.module.scss';
import { useWaitingOnYou } from './waiting-on-you-provider';

function isHttpUrl(value: string): boolean {
    try {
        const u = new URL(value);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

/** Paste a link, save, and the run goes back on its board. */
export function AddVideoField({
    runId,
    autoFocus = false,
}: {
    runId: number;
    autoFocus?: boolean;
}) {
    const { fixed, markFixed } = useWaitingOnYou();
    const id = useId();
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    if (fixed.has(runId)) {
        return (
            <p className={styles.fixed}>
                <CheckCircleFill size={14} aria-hidden />
                Video added. The run is back on the board, waiting for a
                moderator.
            </p>
        );
    }

    const save = () => {
        const value = url.trim();
        if (!isHttpUrl(value)) {
            setError('Enter a full link, starting with https://');
            return;
        }
        setError(null);
        startTransition(async () => {
            const res = await selfSetEvidenceAction(runId, { vodUrl: value });
            if ('error' in res) setError(res.error);
            else markFixed(runId);
        });
    };

    return (
        <form
            className={styles.field}
            onSubmit={(e) => {
                e.preventDefault();
                save();
            }}
        >
            <label htmlFor={id} className="visually-hidden">
                Link to the video
            </label>
            <input
                id={id}
                type="url"
                inputMode="url"
                className={`form-control form-control-sm ${error ? 'is-invalid' : ''}`}
                placeholder="Paste a YouTube or Twitch link"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus={autoFocus}
                disabled={pending}
            />
            <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={pending || url.trim() === ''}
            >
                {pending ? 'Saving…' : 'Add video'}
            </button>
            {error ? <p className={styles.error}>{error}</p> : null}
        </form>
    );
}
