'use client';

import { useId, useState, useTransition } from 'react';
import { BoxArrowUpRight, CameraVideoOff } from 'react-bootstrap-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Vod } from '~src/components/run/dashboard/vod';
import { isEmbeddableVod } from '~src/lib/vod-url';
import styles from './evidence-editor.module.scss';

type SaveResult = { ok: true } | { error: string };

export interface EvidenceEditorProps {
    vodUrl: string | null;
    description: string | null;
    perms: {
        canEditVod: boolean;
        canEditDescription: boolean;
        lockedReason: string | null;
    };
    onSaveVod: (url: string | null) => Promise<SaveResult>;
    onSaveDescription: (text: string | null) => Promise<SaveResult>;
}

/**
 * The one owner/mod control for a run's evidence — VOD + description. Dumb
 * by design: it renders what it's given and calls the callbacks it's given.
 * Callers (owner surfaces, mod surfaces) decide what `perms` and the save
 * callbacks actually do; this component has no idea which caller it's in.
 */
export function EvidenceEditor({
    vodUrl,
    description,
    perms,
    onSaveVod,
    onSaveDescription,
}: EvidenceEditorProps) {
    return (
        <div className={styles.evidenceEditor}>
            <VodBlock
                vodUrl={vodUrl}
                canEdit={perms.canEditVod}
                onSaveVod={onSaveVod}
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

function VodBlock({
    vodUrl,
    canEdit,
    onSaveVod,
}: {
    vodUrl: string | null;
    canEdit: boolean;
    onSaveVod: EvidenceEditorProps['onSaveVod'];
}) {
    // What we last saved, held locally so the block updates the instant the
    // callback resolves rather than waiting on a refetch from the caller.
    const [saved, setSaved] = useState<string | null | undefined>(undefined);
    const url = saved === undefined ? vodUrl : saved;

    const [editing, setEditing] = useState(false);
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const inputId = useId();

    const openEditor = () => {
        setText(url ?? '');
        setError(null);
        setEditing(true);
    };

    const save = (next: string | null) => {
        setError(null);
        startTransition(async () => {
            const res = await onSaveVod(next);
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
            <div className={styles.vodSection}>
                <form
                    className={styles.vodForm}
                    onSubmit={(e) => {
                        e.preventDefault();
                        save(text.trim() === '' ? null : text.trim());
                    }}
                >
                    <label className={styles.vodFormLabel} htmlFor={inputId}>
                        Video link
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
                            {isPending ? 'Saving…' : 'Attach'}
                        </button>
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            disabled={isPending}
                            onClick={() => setEditing(false)}
                        >
                            Cancel
                        </button>
                    </div>
                    {error != null && (
                        <p className="text-danger small mb-0">{error}</p>
                    )}
                    <p className={styles.vodHint}>
                        YouTube and Twitch links play inline here. Anything else
                        is saved as a link.
                    </p>
                    {url != null && (
                        <button
                            type="button"
                            className={styles.vodRemove}
                            disabled={isPending}
                            onClick={() => save(null)}
                        >
                            Remove the current link
                        </button>
                    )}
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
            {isEmbeddableVod(url) ? (
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
                        Video attached, opens on another host
                        <span className={styles.vodUrl}>{url}</span>
                    </span>
                </a>
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
                        Change link
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
                        onClick={() => save(text.trim() === '' ? null : text)}
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
