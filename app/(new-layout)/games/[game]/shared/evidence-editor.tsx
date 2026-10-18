'use client';

import { useId, useState, useTransition } from 'react';
import { BoxArrowUpRight, CameraVideoOff } from 'react-bootstrap-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Vod } from '~src/components/run/dashboard/vod';
import { isEmbeddableVod, videoLabel } from '~src/lib/vod-url';
import styles from './evidence-editor.module.scss';

type SaveResult = { ok: true } | { error: string };

export interface EvidenceEditorProps {
    videos: string[];
    description: string | null;
    perms: {
        canEditVod: boolean;
        canEditDescription: boolean;
        lockedReason: string | null;
    };
    onSaveVideos: (urls: string[]) => Promise<SaveResult>;
    onSaveDescription: (text: string | null) => Promise<SaveResult>;
    /** False where a player is already on the page: show the link instead. */
    showPlayer?: boolean;
}

/**
 * The one owner/mod control for a run's evidence — VOD + description. Dumb
 * by design: it renders what it's given and calls the callbacks it's given.
 * Callers (owner surfaces, mod surfaces) decide what `perms` and the save
 * callbacks actually do; this component has no idea which caller it's in.
 */
export function EvidenceEditor({
    videos,
    description,
    perms,
    onSaveVideos,
    onSaveDescription,
    showPlayer = true,
}: EvidenceEditorProps) {
    return (
        <div className={styles.evidenceEditor}>
            <VodBlock
                videos={videos}
                canEdit={perms.canEditVod}
                onSaveVideos={onSaveVideos}
                showPlayer={showPlayer}
            />
            <DescriptionBlock
                description={description}
                canEdit={perms.canEditDescription}
                onSaveDescription={onSaveDescription}
            />
            {perms.lockedReason != null && (
                <p className={styles.lockedNote}>{perms.lockedReason}</p>
            )}
        </div>
    );
}

export function VodBlock({
    videos,
    canEdit,
    onSaveVideos,
    showPlayer,
    onDone,
}: {
    videos: string[];
    canEdit: boolean;
    onSaveVideos: EvidenceEditorProps['onSaveVideos'];
    showPlayer: boolean;
    onDone?: () => void;
}) {
    const [saved, setSaved] = useState<string[] | undefined>(undefined);
    const list = saved ?? videos;
    const url = list[0] ?? null;

    const [editing, setEditing] = useState(canEdit && !showPlayer);
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const inputId = useId();

    const openEditor = () => {
        setText('');
        setError(null);
        setEditing(true);
    };

    const save = (next: string[], after?: () => void) => {
        setError(null);
        startTransition(async () => {
            const res = await onSaveVideos(next);
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setSaved(next);
            after?.();
        });
    };

    if (editing) {
        return (
            <div className={styles.vodSection}>
                {list.length > 0 && (
                    <ul className={styles.vodList}>
                        {list.map((v, i) => (
                            <li key={v} className={styles.vodListRow}>
                                <a
                                    href={v}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.vodListUrl}
                                    title={v}
                                >
                                    {videoLabel(v)}
                                </a>
                                {i === 0 ? (
                                    <span className={styles.vodPrimary}>
                                        Primary
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        disabled={isPending}
                                        onClick={() =>
                                            save([
                                                v,
                                                ...list.filter((x) => x !== v),
                                            ])
                                        }
                                    >
                                        Make primary
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={styles.vodRemove}
                                    disabled={isPending}
                                    onClick={() =>
                                        save(list.filter((x) => x !== v))
                                    }
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <form
                    className={styles.vodForm}
                    onSubmit={(e) => {
                        e.preventDefault();
                        const next = text.trim();
                        if (!next) return;
                        save([...list.filter((x) => x !== next), next], () =>
                            setText(''),
                        );
                    }}
                >
                    <label className={styles.vodFormLabel} htmlFor={inputId}>
                        {list.length > 0 ? 'Add another video' : 'Video link'}
                    </label>
                    <div className={styles.vodFormRow}>
                        {/* autoFocus is safe here: the field only mounts on
                            an explicit click asking to type into it. */}
                        <input
                            id={inputId}
                            type="url"
                            className={`form-control ${styles.vodInput}`}
                            placeholder="https://twitch.tv/videos/…"
                            value={text}
                            autoFocus
                            disabled={isPending}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isPending || text.trim() === ''}
                        >
                            {isPending ? 'Saving…' : 'Add'}
                        </button>
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            disabled={isPending}
                            onClick={onDone ?? (() => setEditing(false))}
                        >
                            Done
                        </button>
                    </div>
                    {error != null && (
                        <p className="text-danger small mb-0">{error}</p>
                    )}
                    <p className={styles.vodHint}>
                        YouTube and Twitch links play inline here. Anything else
                        is saved as a link. The primary video is the one split
                        jumps and retimes use.
                    </p>
                </form>
            </div>
        );
    }

    if (url == null) {
        if (!canEdit) {
            return (
                <div className={styles.vodSection}>
                    <span className={styles.noVod}>
                        <CameraVideoOff size={16} aria-hidden />
                        <span className={styles.noVodText}>
                            No video attached.
                        </span>
                    </span>
                </div>
            );
        }
        return (
            <div className={styles.vodSection}>
                <button
                    type="button"
                    className={styles.noVod}
                    onClick={openEditor}
                >
                    <CameraVideoOff size={16} aria-hidden />
                    <span className={styles.noVodText}>No video attached.</span>
                    <span className={styles.noVodCta}>Add a link</span>
                </button>
                {error != null && (
                    <p className="text-danger small mb-0">{error}</p>
                )}
            </div>
        );
    }

    return (
        <div className={styles.vodSection}>
            {showPlayer && isEmbeddableVod(url) ? (
                <div className={styles.vodFrame}>
                    <Vod vod={url} />
                </div>
            ) : (
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.vodLinkCard}
                >
                    <BoxArrowUpRight size={14} aria-hidden />
                    <span>
                        {isEmbeddableVod(url)
                            ? 'Video attached'
                            : 'Video attached, opens on another host'}
                        <span className={styles.vodUrl}>{url}</span>
                    </span>
                </a>
            )}
            {list.length > 1 && (
                <ul className={styles.vodList}>
                    {list.slice(1).map((v, i) => (
                        <li key={v}>
                            <a
                                href={v}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.factLink}
                            >
                                <BoxArrowUpRight size={12} aria-hidden /> Video{' '}
                                {i + 2}
                            </a>
                        </li>
                    ))}
                </ul>
            )}
            <div className={styles.vodActions}>
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.factLink}
                >
                    <BoxArrowUpRight size={12} aria-hidden /> Open in a new tab
                </a>
                {canEdit && (
                    <button
                        type="button"
                        className={styles.vodEditBtn}
                        onClick={openEditor}
                    >
                        {list.length > 1
                            ? 'Edit videos'
                            : 'Change or add videos'}
                    </button>
                )}
            </div>
            {error != null && <p className="text-danger small mb-0">{error}</p>}
        </div>
    );
}

function DescriptionBlock({
    description,
    canEdit,
    onSaveDescription,
}: {
    description: string | null;
    canEdit: boolean;
    onSaveDescription: EvidenceEditorProps['onSaveDescription'];
}) {
    const [saved, setSaved] = useState<string | null | undefined>(undefined);
    const value = saved === undefined ? description : saved;

    const [editing, setEditing] = useState(false);
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const openEditor = () => {
        setText(value ?? '');
        setError(null);
        setEditing(true);
    };

    const save = (next: string | null) => {
        setError(null);
        startTransition(async () => {
            const res = await onSaveDescription(next);
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setSaved(next);
            setEditing(false);
        });
    };

    if (editing) {
        return (
            <div className={styles.descriptionSection}>
                <textarea
                    className={`form-control ${styles.descriptionInput}`}
                    value={text}
                    disabled={isPending}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    autoFocus
                />
                <div className={styles.descriptionActions}>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={isPending}
                        onClick={() =>
                            save(text.trim() === '' ? null : text.trim())
                        }
                    >
                        {isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={isPending}
                        onClick={() => setEditing(false)}
                    >
                        Cancel
                    </button>
                    {value != null && (
                        <button
                            type="button"
                            className={styles.descriptionClear}
                            disabled={isPending}
                            onClick={() => save(null)}
                        >
                            Clear description
                        </button>
                    )}
                </div>
                {error != null && (
                    <p className="text-danger small mb-0">{error}</p>
                )}
            </div>
        );
    }

    return (
        <div className={styles.descriptionSection}>
            {value != null ? (
                <div className={styles.descriptionMarkdown}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {value}
                    </ReactMarkdown>
                </div>
            ) : (
                <p className={styles.descriptionEmpty}>No description.</p>
            )}
            {canEdit && (
                <button
                    type="button"
                    className={styles.descriptionEditBtn}
                    onClick={openEditor}
                >
                    {value != null ? 'Edit description' : 'Add a description'}
                </button>
            )}
            {error != null && <p className="text-danger small mb-0">{error}</p>}
        </div>
    );
}
