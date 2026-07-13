'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
    createPrepAction,
    deletePrepAction,
    savePrepAction,
} from '~app/(fast50)/fast50/prep/actions';
import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import {
    emptyPrepData,
    type PrepSession,
    type PrepSessionData,
    type PrepSessionSummary,
    type PrepSlideRef,
} from '~src/lib/fast50/prep.types';
import { DeckBuilder } from './deck-builder';
import { InterviewPanel } from './interview-panel';
import styles from './prep-studio.module.scss';
import { PreviewPane } from './preview-pane';

export const Studio = ({
    runner,
    dossierPre,
    dossierPost,
    sessions,
    initial,
}: {
    runner: { username: string; game: string; category: string };
    dossierPre: RunnerDossier;
    dossierPost: RunnerDossier | null;
    sessions: PrepSessionSummary[];
    initial: PrepSession | null;
}) => {
    const router = useRouter();
    const [session, setSession] = useState<PrepSession | null>(initial);
    const [label, setLabel] = useState(initial?.label ?? '');
    const [data, setData] = useState<PrepSessionData>(
        initial?.data ?? emptyPrepData(),
    );
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [newLabel, setNewLabel] = useState('');
    const [deckTab, setDeckTab] = useState<'pre' | 'post'>('pre');
    const [selected, setSelected] = useState<PrepSlideRef | null>(null);

    const studioPath = `/fast50/prep/${encodeURIComponent(runner.username)}/${encodeURIComponent(runner.game)}/${encodeURIComponent(runner.category)}`;

    const onChange = (next: PrepSessionData) => {
        setData(next);
        setDirty(true);
    };

    const onSave = async () => {
        if (!session || saving) return;
        setSaving(true);
        setError(null);
        try {
            const updated = await savePrepAction(session.id, { label, data });
            setSession(updated);
            setData(updated.data);
            setLabel(updated.label);
            setDirty(false);
            setSavedAt(new Date());
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const onCreate = async (duplicate: boolean) => {
        const trimmed = newLabel.trim();
        if (!trimmed) return;
        if (dirty && !window.confirm('Discard unsaved changes?')) return;
        setError(null);
        try {
            const created = await createPrepAction({
                ...runner,
                label: trimmed,
                data: duplicate ? data : undefined,
            });
            setNewLabel('');
            router.push(`${studioPath}?session=${created.id}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Create failed');
        }
    };

    const onDelete = async () => {
        if (!session) return;
        if (!window.confirm(`Delete prep session '${session.label}'?`)) return;
        try {
            await deletePrepAction(session.id);
            router.push(studioPath);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed');
        }
    };

    // Ctrl+S saves; leaving with unsaved changes warns.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                onSave();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    return (
        <>
            <div className={styles.header}>
                <h1 className={styles.headerTitle}>
                    {runner.username} — {runner.game} — {runner.category}
                </h1>
                <select
                    value={session?.id ?? ''}
                    onChange={(e) => {
                        if (
                            dirty &&
                            !window.confirm('Discard unsaved changes?')
                        )
                            return;
                        router.push(
                            e.target.value
                                ? `${studioPath}?session=${e.target.value}`
                                : studioPath,
                        );
                    }}
                >
                    {sessions.length === 0 ? (
                        <option value="">no sessions yet</option>
                    ) : null}
                    {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.label}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="New session label (e.g. fast50 #3)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                />
                <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={() => onCreate(false)}
                >
                    New
                </button>
                <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={() => onCreate(true)}
                    disabled={!session}
                >
                    Duplicate
                </button>
                <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={onDelete}
                    disabled={!session}
                >
                    Delete
                </button>
                <Link className={styles.buttonGhost} href="/fast50/prep">
                    ← runners
                </Link>
                <Link
                    className={styles.buttonGhost}
                    href={`/fast50/screen/${encodeURIComponent(runner.username)}/${encodeURIComponent(runner.game)}/${encodeURIComponent(runner.category)}?deck=${deckTab}${session ? `&session=${session.id}` : ''}`}
                    target="_blank"
                >
                    Open deck ↗
                </Link>
            </div>

            {session ? (
                <>
                    <div className={styles.row}>
                        <label className={styles.field}>
                            Session label
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => {
                                    setLabel(e.target.value);
                                    setDirty(true);
                                }}
                            />
                        </label>
                        <button
                            type="button"
                            className={styles.button}
                            onClick={onSave}
                            disabled={!dirty || saving}
                        >
                            {saving
                                ? 'Saving…'
                                : dirty
                                  ? 'Save (Ctrl+S)'
                                  : 'Saved'}
                        </button>
                        {savedAt ? (
                            <span className={styles.savedAt}>
                                saved {savedAt.toLocaleTimeString()}
                            </span>
                        ) : null}
                        {error ? (
                            <span className={styles.error}>{error}</span>
                        ) : null}
                    </div>

                    <div className={styles.studio}>
                        <InterviewPanel
                            data={data}
                            splits={dossierPre.splits.map((s) => ({
                                index: s.index,
                                name: s.name,
                            }))}
                            onChange={onChange}
                        />
                        <div>
                            <div className={styles.tabs}>
                                <button
                                    type="button"
                                    className={styles.tab}
                                    data-active={deckTab === 'pre' || undefined}
                                    onClick={() => setDeckTab('pre')}
                                >
                                    pre-run
                                </button>
                                <button
                                    type="button"
                                    className={styles.tab}
                                    data-active={
                                        deckTab === 'post' || undefined
                                    }
                                    onClick={() => setDeckTab('post')}
                                    disabled={!dossierPost}
                                >
                                    post-run
                                </button>
                            </div>
                            <DeckBuilder
                                deck={deckTab}
                                dossier={
                                    deckTab === 'post' && dossierPost
                                        ? dossierPost
                                        : dossierPre
                                }
                                data={data}
                                onChange={onChange}
                                selected={selected}
                                onSelect={setSelected}
                            />
                        </div>
                        <PreviewPane
                            dossier={
                                deckTab === 'post' && dossierPost
                                    ? dossierPost
                                    : dossierPre
                            }
                            data={data}
                            selected={selected}
                        />
                    </div>
                </>
            ) : (
                <p className={styles.itemMeta}>
                    Create a session to start prepping this run.
                </p>
            )}
        </>
    );
};
