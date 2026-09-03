'use client';

import { type FormEvent, useId, useState, useTransition } from 'react';
import styles from './src-import.module.scss';
import { startSrcImportAction } from './src-import-actions';

export const SRC_PREFIX = 'https://www.speedrun.com/';

/**
 * The user types only the part after the prefix (the game abbreviation), but
 * a pasted full URL still works: any source origin is stripped back to its
 * path and re-joined onto the canonical prefix. '' when there is nothing to
 * send.
 */
export function srcUrlFromInput(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    const path = trimmed
        .replace(/^(?:https?:\/\/)?(?:www\.)?speedrun\.com\/?/i, '')
        .replace(/^\/+/, '');
    return path ? `${SRC_PREFIX}${path}` : '';
}

interface Props {
    gameId: number;
    gameSlug: string;
    onLinked: () => Promise<void>;
}

/** Shown only when the game has never been imported: link it, import settings. */
export function LinkCard({ gameId, gameSlug, onLinked }: Props) {
    const inputId = useId();
    const [slug, setSlug] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const url = srcUrlFromInput(slug);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!url || pending) return;
        setError(null);
        startTransition(async () => {
            const res = await startSrcImportAction({
                gameId,
                gameSlug,
                url,
                kind: 'settings',
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setSlug('');
            await onLinked();
        });
    };

    return (
        <section className={styles.section} aria-labelledby="import-link">
            <div>
                <h3 id="import-link" className={styles.title}>
                    Link this board
                </h3>
                <p className={styles.desc}>
                    Paste the board’s speedrun.com URL. Its settings are
                    imported right away; runs can be imported after that.
                </p>
            </div>
            <form className={styles.form} onSubmit={submit}>
                <label htmlFor={inputId} className="visually-hidden">
                    speedrun.com game URL
                </label>
                <span className={styles.urlGroup}>
                    <span className={styles.urlPrefix} aria-hidden>
                        {SRC_PREFIX}
                    </span>
                    <input
                        id={inputId}
                        className={styles.urlInput}
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="sm64"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        disabled={pending}
                        required
                    />
                </span>
                <button
                    type="submit"
                    className={styles.btn}
                    disabled={pending || !url}
                >
                    {pending ? 'Starting…' : 'Link and import settings'}
                </button>
            </form>
            {error && <p className={styles.error}>{error}</p>}
        </section>
    );
}
