'use client';

import Link from 'next/link';
import React, { useState, useTransition } from 'react';
import styles from '~src/components/fast50/prep/prep-studio.module.scss';
import { lookupRunner, type RunnerLookup } from '../screen/actions';

export const PrepIndex = () => {
    const [username, setUsername] = useState('');
    const [lookedUp, setLookedUp] = useState('');
    const [result, setResult] = useState<
        RunnerLookup | { error: string } | null
    >(null);
    const [pending, startTransition] = useTransition();

    const onLookup = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = username.trim();
        if (!trimmed) return;
        startTransition(async () => {
            try {
                setResult(await lookupRunner(trimmed));
                setLookedUp(trimmed);
            } catch {
                setResult({ error: 'Lookup failed — try again' });
            }
        });
    };

    return (
        <>
            <div className={styles.header}>
                <h1 className={styles.headerTitle}>fast50 — prep studio</h1>
                <Link className={styles.buttonGhost} href="/fast50/screen">
                    ← screen picker
                </Link>
            </div>
            <form className={styles.row} onSubmit={onLookup}>
                <input
                    className={styles.field}
                    type="text"
                    placeholder="Runner username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button
                    className={styles.button}
                    type="submit"
                    disabled={pending}
                >
                    {pending ? 'Looking up…' : 'Lookup'}
                </button>
            </form>
            {result && 'error' in result ? (
                <p className={styles.error}>{result.error}</p>
            ) : null}
            {result && 'runs' in result ? (
                <ul className={styles.runList}>
                    {result.runs.map((r) => (
                        <li
                            key={`${r.game}-${r.category}`}
                            className={styles.runRow}
                        >
                            <span className={styles.itemLabel}>
                                {r.game} — {r.category}
                            </span>
                            <span className={styles.itemMeta}>
                                pre {r.preSlides} · post {r.postSlides}
                            </span>
                            <Link
                                className={styles.button}
                                href={`/fast50/prep/${encodeURIComponent(lookedUp)}/${encodeURIComponent(r.game)}/${encodeURIComponent(r.category)}`}
                            >
                                Open prep studio
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : null}
        </>
    );
};
