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
    const [sessionSel, setSessionSel] = useState<Record<string, string>>({});

    // Read localStorage post-mount (SSR-safe) and again whenever a new
    // capture snapshot lands so the list stays live while armed.
    useEffect(() => {
        setCaptures(readCaptures());
    }, [lastEvent]);

    const onLookup = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = username.trim();
        if (!trimmed) {
            setResult({ error: 'Enter a username' });
            return;
        }
        startTransition(async () => {
            try {
                const res = await lookupRunner(trimmed);
                setResult(res);
                setLookedUp(trimmed);
            } catch {
                setResult({ error: 'Lookup failed — try again' });
            }
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
                        const rowKey = `${r.game}-${r.category}`;
                        const base = `/fast50/screen/${encodeURIComponent(lookedUp)}/${encodeURIComponent(r.game)}/${encodeURIComponent(r.category)}`;
                        const prepBase = `/fast50/prep/${encodeURIComponent(lookedUp)}/${encodeURIComponent(r.game)}/${encodeURIComponent(r.category)}`;
                        const selected =
                            sessionSel[rowKey] ??
                            (r.prepSessions[0]
                                ? String(r.prepSessions[0].id)
                                : '');
                        const sessionQs = selected
                            ? `&session=${selected}`
                            : r.prepSessions.length > 0
                              ? '&session=none'
                              : '';
                        return (
                            <li key={rowKey} className={styles.runRow}>
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
                                {r.prepError ? (
                                    <span
                                        className={`${styles.badge} ${styles.badgeDanger}`}
                                        title="prep lookup failed — backend unavailable?"
                                    >
                                        prep ?
                                    </span>
                                ) : null}
                                {r.prepSessions.length > 0 ? (
                                    <select
                                        aria-label="Prep session"
                                        className={styles.pickerSessionSelect}
                                        value={selected}
                                        onChange={(e) =>
                                            setSessionSel((s) => ({
                                                ...s,
                                                [rowKey]: e.target.value,
                                            }))
                                        }
                                    >
                                        {r.prepSessions.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                prep: {s.label}
                                            </option>
                                        ))}
                                        <option value="">no prep</option>
                                    </select>
                                ) : null}
                                {r.prepWarnings > 0 ? (
                                    <span
                                        className={`${styles.badge} ${styles.badgeDanger}`}
                                        title="prepped slides will be dropped — open the prep studio"
                                    >
                                        {r.prepWarnings} prep ⚠
                                    </span>
                                ) : null}
                                <span className={styles.runLinks}>
                                    <Link href={`${base}?deck=pre${sessionQs}`}>
                                        Pre-run deck
                                    </Link>
                                    <Link
                                        href={`${base}?deck=post${sessionQs}`}
                                    >
                                        Post-run deck
                                    </Link>
                                    <Link href={prepBase}>Prep →</Link>
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
