'use client';

import moment from 'moment';
import {
    type ChangeEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    CloudArrowUp,
    Download,
    Layers,
    Lock,
    Trash,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import type { LayoutSummary } from 'types/layouts.types';
import { LAYOUT_MAX_BYTES, LAYOUT_NAME_REGEX } from 'types/layouts.types';
import {
    deleteLayout,
    getLayoutDownloadUrl,
    getLayoutsForUser,
    uploadLayout,
} from '~src/actions/layouts.action';
import Link from '~src/components/link';
import styles from './downloads.module.scss';
import { SectionHeader } from './section-header';

type LayoutsLoadState =
    | { status: 'idle' }
    | { status: 'loading' }
    | {
          status: 'loaded';
          layouts: LayoutSummary[];
          tier: number | null;
          cap: number | null;
          viewerIsOwner: boolean;
      }
    | { status: 'not-found'; viewerIsOwner: boolean }
    | { status: 'unauthenticated' }
    | { status: 'error' };

interface LayoutsSectionProps {
    username: string;
    /** When true, fetch on mount. For tab-lazy contexts, pass false and flip. */
    isActive: boolean;
}

export function LayoutsSection({ username, isActive }: LayoutsSectionProps) {
    const [state, setState] = useState<LayoutsLoadState>({ status: 'idle' });
    const loadedOnce = useRef(false);
    const [busy, setBusy] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setState({ status: 'loading' });
        const result = await getLayoutsForUser(username);
        if (result.status === 'ok') {
            setState({
                status: 'loaded',
                layouts: result.layouts,
                tier: result.tier,
                cap: result.cap,
                viewerIsOwner: result.viewerIsOwner,
            });
        } else if (result.status === 'not-found') {
            // Non-owner listing is 404 when the user has no layouts yet — we
            // can't detect viewerIsOwner here, so assume false (the owner case
            // will hit 'ok' with an empty array instead).
            setState({ status: 'not-found', viewerIsOwner: false });
        } else if (result.status === 'unauthenticated') {
            setState({ status: 'unauthenticated' });
        } else {
            setState({ status: 'error' });
        }
    }, [username]);

    useEffect(() => {
        if (!isActive) return;
        if (loadedOnce.current) return;
        loadedOnce.current = true;
        void load();
    }, [isActive, load]);

    const handleDownload = useCallback(
        async (layout: LayoutSummary) => {
            const result = await getLayoutDownloadUrl(username, layout.name);
            if (result.status !== 'ok') {
                toast.error(
                    result.status === 'unauthenticated'
                        ? 'You need to be signed in to download layouts.'
                        : result.status === 'not-found'
                          ? 'That layout no longer exists.'
                          : 'Failed to get download URL.',
                );
                return;
            }

            try {
                const res = await fetch(result.downloadUrl);
                if (!res.ok) throw new Error('bad status');
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = layout.name.toLowerCase().endsWith('.lsl')
                    ? layout.name
                    : `${layout.name}.lsl`;
                a.click();
                URL.revokeObjectURL(blobUrl);
            } catch {
                toast.error('Failed to download layout.');
            }
        },
        [username],
    );

    const handleDelete = useCallback(
        async (layout: LayoutSummary) => {
            if (
                !window.confirm(
                    `Delete layout "${layout.name}"? This can't be undone.`,
                )
            ) {
                return;
            }
            setBusy(true);
            const result = await deleteLayout(layout.name);
            setBusy(false);
            if (result.status === 'ok') {
                toast.success(`Deleted "${layout.name}".`);
                await load();
            } else {
                toast.error(
                    result.status === 'unauthenticated'
                        ? 'Sign in to delete layouts.'
                        : result.status === 'not-found'
                          ? 'Layout already gone.'
                          : 'Failed to delete layout.',
                );
            }
        },
        [load],
    );

    const handleUpload = useCallback(
        async (file: File) => {
            if (file.size > LAYOUT_MAX_BYTES) {
                toast.error('That file is over the 1 MiB limit.');
                return;
            }
            const rawName = file.name.replace(/\.lsl$/i, '').trim();
            const sanitized = rawName.replace(/[^A-Za-z0-9_\-. ]/g, '_');
            const defaultName =
                sanitized && LAYOUT_NAME_REGEX.test(sanitized)
                    ? sanitized
                    : 'layout';
            const chosen = window.prompt(
                'Name this layout (letters, digits, underscore, hyphen, dot, space; 1–100 chars):',
                defaultName,
            );
            if (chosen === null) return;
            const name = chosen.trim();
            if (!LAYOUT_NAME_REGEX.test(name)) {
                toast.error('Invalid name.');
                return;
            }

            setBusy(true);
            let body: string;
            try {
                body = await file.text();
            } catch {
                setBusy(false);
                toast.error('Could not read that file.');
                return;
            }
            const result = await uploadLayout(
                name,
                body,
                file.type || 'application/xml',
            );
            setBusy(false);

            if (result.status === 'ok') {
                toast.success(`Uploaded "${name}".`);
                await load();
                return;
            }
            switch (result.status) {
                case 'cap-reached':
                    toast.error(
                        `Non-supporters are capped at ${result.cap} layouts. Delete one or upgrade your tier.`,
                    );
                    break;
                case 'invalid-name':
                    toast.error('Invalid layout name.');
                    break;
                case 'empty-body':
                    toast.error('That file is empty.');
                    break;
                case 'too-large':
                    toast.error('That file is over the 1 MiB limit.');
                    break;
                case 'unauthenticated':
                    toast.error('Sign in to upload layouts.');
                    break;
                default:
                    toast.error('Upload failed.');
            }
        },
        [load],
    );

    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (f) void handleUpload(f);
    };

    const isLoaded = state.status === 'loaded';
    const isOwner = isLoaded ? state.viewerIsOwner : false;
    const layouts = isLoaded ? state.layouts : [];
    const tier = isLoaded ? state.tier : null;
    const cap = isLoaded ? state.cap : null;
    const atCap =
        isOwner && cap !== null && cap !== undefined && layouts.length >= cap;

    let kicker: string = 'Style & presentation';
    let pill: { text: string; strong?: boolean } = {
        text: `${layouts.length} stored`,
    };
    let subtitle =
        'Reusable .lsl files for LiveSplit — configure how splits are presented on stream and locally.';
    if (isLoaded) {
        if (isOwner) {
            if (cap === null) {
                kicker = tier ? `Tier ${tier} · Unlimited` : 'Unlimited';
                pill = { text: 'Unlimited slots', strong: true };
                subtitle =
                    'Your reusable .lsl files. As a supporter, you can upload as many as you like.';
            } else {
                kicker = `Your layouts · ${layouts.length} / ${cap}`;
                pill = { text: `${layouts.length} / ${cap} used` };
                subtitle = `Your reusable .lsl files. Up to ${cap} for non-supporters — supporters get unlimited.`;
            }
        } else {
            kicker = `Shared by ${username}`;
            pill = { text: `${layouts.length} public` };
            subtitle = `${username}'s reusable .lsl files — download any of them to use with your own LiveSplit.`;
        }
    }

    const showHighlight = isLoaded && isOwner && cap === null;

    const uploadAction = isOwner ? (
        <>
            <button
                type="button"
                className={styles.btnUpload}
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || atCap}
                title={
                    atCap
                        ? `Cap reached (${cap}). Delete one or upgrade to support for unlimited.`
                        : 'Upload a .lsl file'
                }
            >
                <CloudArrowUp size={14} aria-hidden="true" />
                <span>Upload layout</span>
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept=".lsl,application/xml,text/xml"
                onChange={onFileChange}
                style={{ display: 'none' }}
            />
        </>
    ) : null;

    return (
        <section className={styles.section}>
            <SectionHeader
                icon={<Layers size={28} />}
                kicker={kicker}
                title="LiveSplit layouts"
                subtitle={subtitle}
                tone={showHighlight ? 'success' : 'default'}
                action={uploadAction}
            />

            <div
                className={`${styles.layoutsCard} ${
                    showHighlight ? styles.layoutsCardHighlight : ''
                }`}
            >
                <div className={styles.layoutsCardMeta}>
                    <span
                        className={`${styles.metaPill} ${
                            pill.strong ? styles.metaPillStrong : ''
                        }`}
                    >
                        {pill.text}
                    </span>
                </div>

                <div className={styles.backupColumnBody}>
                    {state.status === 'loading' && (
                        <div className={styles.inlineEmpty}>
                            Loading layouts…
                        </div>
                    )}

                    {state.status === 'error' && (
                        <div className={styles.inlineEmpty}>
                            Couldn't load layouts. Check the server logs for
                            details.
                        </div>
                    )}

                    {state.status === 'unauthenticated' && (
                        <div className={styles.inlineEmpty}>
                            Sign in to view your layouts.
                        </div>
                    )}

                    {state.status === 'not-found' && (
                        <div className={styles.inlineEmpty}>
                            {username} hasn't uploaded any layouts.
                        </div>
                    )}

                    {isLoaded && layouts.length === 0 && (
                        <div className={styles.inlineEmpty}>
                            {isOwner
                                ? 'No layouts yet. Upload a .lsl file to get started.'
                                : `${username} hasn't uploaded any layouts.`}
                        </div>
                    )}

                    {isLoaded && layouts.length > 0 && (
                        <div className={styles.list}>
                            {layouts.map((layout) => {
                                const ts = moment(layout.uploadedAt);
                                return (
                                    <div
                                        key={layout.name}
                                        className={styles.row}
                                    >
                                        <div className={styles.rowPrimaryCol}>
                                            <div className={styles.rowPrimary}>
                                                {layout.name}
                                            </div>
                                            <div
                                                className={styles.rowSecondary}
                                            >
                                                {formatBytes(layout.sizeBytes)}{' '}
                                                · uploaded {ts.fromNow()}
                                            </div>
                                        </div>
                                        <div className={styles.rowAction}>
                                            <button
                                                type="button"
                                                className={styles.btnDownload}
                                                onClick={() =>
                                                    void handleDownload(layout)
                                                }
                                            >
                                                <Download
                                                    size={12}
                                                    aria-hidden="true"
                                                />
                                                <span>Download</span>
                                            </button>
                                            {isOwner && (
                                                <button
                                                    type="button"
                                                    className={styles.btnDanger}
                                                    onClick={() =>
                                                        void handleDelete(
                                                            layout,
                                                        )
                                                    }
                                                    disabled={busy}
                                                    title="Delete layout"
                                                    aria-label={`Delete ${layout.name}`}
                                                >
                                                    <Trash
                                                        size={12}
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {isLoaded && isOwner && atCap && (
                        <div className={styles.layoutsPaywallFoot}>
                            <Lock size={14} aria-hidden="true" />
                            <span>
                                You've filled your {cap} free slots. Supporters
                                get unlimited layouts.
                            </span>
                            <Link
                                href="/support"
                                className={`btn btn-sm btn-primary ${styles.paywallCta}`}
                            >
                                Become a supporter
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
