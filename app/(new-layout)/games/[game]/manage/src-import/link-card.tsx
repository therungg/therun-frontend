'use client';

import {
    type FormEvent,
    useEffect,
    useId,
    useState,
    useTransition,
} from 'react';
import type { SrcGameCandidate } from '../../../../../../types/src-import.types';
import styles from './src-import.module.scss';
import {
    getSrcGameCandidatesAction,
    startSrcImportAction,
    unblockPurgeAction,
} from './src-import-actions';

/** Substring of the backend's 409 when a purge has tombstoned this board. */
const PURGE_BLOCK_MARKER = 'unblock it';

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

/**
 * The match, or nothing. A candidate counts only when it passed the backend's
 * exact test and no other therun game holds it; a near-miss is not a weaker
 * answer, it is no answer, and offering one to pick from only invites linking
 * the wrong board.
 */
export function autoPick(
    candidates: SrcGameCandidate[],
): SrcGameCandidate | null {
    const exact = candidates.filter((c) => c.exact && c.takenByGameId === null);
    return exact.length === 1 ? exact[0] : null;
}

interface Props {
    gameId: number;
    gameSlug: string;
    onLinked: () => Promise<void>;
    /** Only an admin can lift a purge's tombstone — the unblock button is theirs alone. */
    isAdmin: boolean;
}

/** Shown only when the game has never been imported: link it, import settings. */
export function LinkCard({ gameId, gameSlug, onLinked, isAdmin }: Props) {
    const inputId = useId();
    const [slug, setSlug] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const [unblocking, setUnblocking] = useState(false);
    const [unblockError, setUnblockError] = useState<string | null>(null);
    const url = srcUrlFromInput(slug);
    const blockedByPurge =
        error !== null && error.toLowerCase().includes(PURGE_BLOCK_MARKER);

    const unblock = async () => {
        setUnblocking(true);
        setUnblockError(null);
        const res = await unblockPurgeAction({ gameId });
        setUnblocking(false);
        if ('error' in res) {
            setUnblockError(res.error);
            return;
        }
        setError(null);
    };

    // What the board looks like it should be linked to. One source request,
    // once, when the card mounts — the search is a fuzzy title match on the
    // game's display name, so it does not change while the card is open.
    // A failure is silent: the manual field is how a board gets linked either
    // way, and a suggestion that didn't arrive is not an error the moderator
    // can do anything about.
    const [candidates, setCandidates] = useState<SrcGameCandidate[] | null>(
        null,
    );
    useEffect(() => {
        let live = true;
        void (async () => {
            const res = await getSrcGameCandidatesAction({ gameId, gameSlug });
            if (!live || 'error' in res) {
                if (live) setCandidates([]);
                return;
            }
            setCandidates(res.result);
            // Fill the field, never submit it: linking writes the board's
            // whole configuration, so the moderator confirms the match.
            const pick = autoPick(res.result);
            if (pick) setSlug((current) => current || pick.abbreviation);
        })();
        return () => {
            live = false;
        };
    }, [gameId, gameSlug]);

    const picked = candidates ? autoPick(candidates) : null;

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

            {candidates === null && (
                <p className={styles.suggestNote}>Looking for a match…</p>
            )}
            {picked && (
                <p className={styles.suggestNote}>
                    Looks like <strong>{picked.name}</strong> — filled in below.
                    Check it before linking.
                </p>
            )}

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
            {error && (
                <p className={styles.error}>
                    {error}
                    {blockedByPurge && isAdmin && (
                        <>
                            {' '}
                            <button
                                type="button"
                                className={styles.btn}
                                onClick={unblock}
                                disabled={unblocking}
                            >
                                {unblocking ? 'Unblocking…' : 'Unblock'}
                            </button>
                        </>
                    )}
                </p>
            )}
            {unblockError && <p className={styles.error}>{unblockError}</p>}
        </section>
    );
}
