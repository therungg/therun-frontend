'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import type {
    SrcMode,
    SrcRunSyncStatus,
} from '../../../../../../types/src-board-sync.types';
import styles from './src-sync.module.scss';
import { setSrcMode } from './src-sync-actions';

const CHOICES: { value: SrcMode; title: string; text: string }[] = [
    {
        value: 'none',
        title: 'Not connected',
        text: 'Only runs from The Run.',
    },
    {
        value: 'add',
        title: 'Add speedrun.com runs to this board',
        text: "Their runs appear next to ours and keep speedrun.com's verification. You only review runs that were uploaded to The Run and aren't on speedrun.com.",
    },
    {
        value: 'copy',
        title: 'Copy the speedrun.com board',
        text: 'This board shows exactly what speedrun.com shows. Nothing can be submitted, verified or changed here.',
    },
];

export function SrcModePicker({
    gameId,
    gameSlug,
    status,
    canEdit,
    disabled,
    onStatus,
}: {
    gameId: number;
    gameSlug: string;
    status: SrcRunSyncStatus;
    canEdit: boolean;
    disabled: boolean;
    onStatus: (status: SrcRunSyncStatus) => void;
}) {
    const router = useRouter();
    const name = useId();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const choose = async (srcMode: SrcMode) => {
        if (busy) return;
        setBusy(true);
        setError(null);
        const res = await setSrcMode(gameId, gameSlug, srcMode);
        setBusy(false);
        if ('result' in res) {
            onStatus(res.result);
            router.refresh();
        } else setError(res.error);
    };

    if (!canEdit || (disabled && status.srcMode === 'none')) {
        const current = CHOICES.find((c) => c.value === status.srcMode);
        return (
            <p className={styles.counts}>
                speedrun.com: {current?.title}. {current?.text}
            </p>
        );
    }

    return (
        <div className={styles.part}>
            <fieldset className={styles.choices} aria-busy={busy}>
                <legend className="visually-hidden">speedrun.com</legend>
                {CHOICES.filter(
                    (c) =>
                        !disabled ||
                        c.value === 'none' ||
                        c.value === status.srcMode,
                ).map((c) => (
                    <label
                        key={c.value}
                        className={styles.choice}
                        data-selected={status.srcMode === c.value}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={c.value}
                            checked={status.srcMode === c.value}
                            onChange={() => choose(c.value)}
                        />
                        <span>
                            <span className={styles.choiceTitle}>
                                {c.title}
                            </span>
                            <span className={styles.choiceText}>{c.text}</span>
                        </span>
                    </label>
                ))}
            </fieldset>
            {error && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
