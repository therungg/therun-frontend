'use client';

import Link from 'next/link';
import React, { useEffect, useState, useTransition } from 'react';
import { useRunCapture } from '~src/components/fast50/capture/use-run-capture';
import styles from '~src/components/fast50/deck/fast50.module.scss';
import { lookupRunner, type RunnerLookup } from './actions';

const CAPTURE_PREFIX = 'fast50-capture:';

interface CaptureEntry {
    key: string;
    username: string;
    game: string;
    category: string;
    savedAt: string;
}

const readCaptures = (): CaptureEntry[] => {
    if (typeof window === 'undefined') return [];
    const entries: CaptureEntry[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith(CAPTURE_PREFIX)) continue;
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        try {
            const parsed = JSON.parse(raw) as {
                savedAt?: string;
                run?: { user?: string; game?: string; category?: string };
            };
            if (!parsed?.run?.user || !parsed.savedAt) continue;
            entries.push({
                key,
                username: parsed.run.user,
                game: parsed.run.game ?? '',
                category: parsed.run.category ?? '',
                savedAt: parsed.savedAt,
            });
        } catch {
            // malformed entry — skip it
        }
    }
    return entries.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
};

export const Picker = () => {
    const [username, setUsername] = useState('');
    const [lookedUp, setLookedUp] = useState('');
    const [result, setResult] = useState<
        RunnerLookup | { error: string } | null
    >(null);
    const [pending, startTransition] = useTransition();

    const [armInput, setArmInput] = useState('');
    const [armedUsername, setArmedUsername] = useState<string | null>(null);
    const { lastEvent } = useRunCapture(armedUsername);

    const [captures, setCaptures] = useState<CaptureEntry[]>([]);

    // Read localStorage post-mount (SSR-safe) and again whenever a new
    // capture snapshot lands so the list stays live while armed.
    useEffect(() => {
        setCaptures(readCaptures());
    }, [lastEvent]);

    const onLookup = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = username.trim();
        startTransition(async () => {
            const res = await lookupRunner(trimmed);
            setResult(res);
            setLookedUp(trimmed);
        });
    };

    const onArm = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = armInput.trim();
        setArmedUsername(trimmed || null);
    };

    return (
        <>
            <h1 className={styles.pickerTitle}>fast50 — screen picker</h1>

            <form className={styles.pickerForm} onSubmit={onLookup}>
                <input
                    className={styles.pickerInput}
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button
                    className={styles.pickerButton}
                    type="submit"
                    disabled={pending}
                >
                    {pending ? 'Looking up…' : 'Lookup'}
                </button>
            </form>

            {result && 'error' in result ? (
                <p className={styles.pickerError}>{result.error}</p>
            ) : null}

            {result && 'runs' in result ? (
                <ul className={styles.runList}>
                    {result.runs.map((r) => {
                        const preDanger = r.preSlides < 4;
                        const postDanger = r.postSlides < 4;
                        const base = `/fast50/screen/${encodeURIComponent(lookedUp)}/${encodeURIComponent(r.game)}/${encodeURIComponent(r.category)}`;
                        return (
                            <li
                                key={`${r.game}-${r.category}`}
                                className={styles.runRow}
                            >
                                <span className={styles.runLabel}>
                                    {r.game} — {r.category}
                                </span>
                                <span
                                    className={`${styles.badge} ${preDanger ? styles.badgeDanger : ''}`}
                                    title={
                                        preDanger
                                            ? 'thin data — mostly anchors'
                                            : undefined
                                    }
                                >
                                    pre {r.preSlides}
                                </span>
                                <span
                                    className={`${styles.badge} ${postDanger ? styles.badgeDanger : ''}`}
                                    title={
                                        postDanger
                                            ? 'thin data — mostly anchors'
                                            : undefined
                                    }
                                >
                                    post {r.postSlides}
                                </span>
                                <span className={styles.runLinks}>
                                    <Link href={`${base}?deck=pre`}>
                                        Pre-run deck
                                    </Link>
                                    <Link href={`${base}?deck=post`}>
                                        Post-run deck
                                    </Link>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            ) : null}

            <section className={styles.captureSection}>
                <h2 className={styles.pickerSubtitle}>Capture live runner</h2>
                <form className={styles.pickerForm} onSubmit={onArm}>
                    <input
                        className={styles.pickerInput}
                        type="text"
                        placeholder="Username"
                        value={armInput}
                        onChange={(e) => setArmInput(e.target.value)}
                    />
                    <button className={styles.pickerButton} type="submit">
                        {armedUsername ? 'Re-arm' : 'Arm'}
                    </button>
                </form>

                {armedUsername ? (
                    <p className={styles.captureStatus}>
                        {lastEvent
                            ? `capturing ${armedUsername} — last update ${new Date(lastEvent).toLocaleTimeString()}`
                            : `armed for ${armedUsername} — waiting for update…`}
                    </p>
                ) : null}

                {captures.length > 0 ? (
                    <ul className={styles.captureList}>
                        {captures.map((c) => (
                            <li key={c.key} className={styles.captureItem}>
                                {c.username} — {c.game} — {c.category} (saved{' '}
                                {new Date(c.savedAt).toLocaleTimeString()})
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className={styles.captureStatus}>
                        No captures in this browser yet.
                    </p>
                )}
            </section>

            <footer className={styles.pickerFooter}>
                <Link href="/fast50/screen/demo">Demo deck →</Link>
            </footer>
        </>
    );
};
