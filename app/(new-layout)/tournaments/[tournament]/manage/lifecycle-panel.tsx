'use client';

import { useState, useTransition } from 'react';
import { lifecycleStatus } from '~src/lib/tournament-permissions';
import type { Tournament } from '../../../../../types/tournament.types';
import { lifecycleActionServer } from '../../actions/lifecycle.action';
import {
    FormSection,
    formStyles as styles,
} from '../../components/form-primitives';
import { LifecycleStatusBadge } from './lifecycle-status-badge';

type Action = 'lock' | 'unlock' | 'finalize' | 'archive' | 'recalculate';

interface ActionDef {
    key: Action;
    title: string;
    body: string;
    button: string;
    variant: 'primary' | 'success' | 'warning' | 'danger' | 'ghost';
    confirm?: string;
    visible: (t: Tournament) => boolean;
}

const ACTIONS: ActionDef[] = [
    {
        key: 'lock',
        title: 'Lock',
        body: 'Stop accepting new runs. Existing runs and leaderboards stay visible.',
        button: 'Lock tournament',
        variant: 'warning',
        visible: (t) => !t.lockedAt,
    },
    {
        key: 'unlock',
        title: 'Unlock',
        body: 'Resume run ingestion. New attempts will be matched again.',
        button: 'Unlock tournament',
        variant: 'success',
        visible: (t) => !!t.lockedAt && !t.finalizedAt,
    },
    {
        key: 'finalize',
        title: 'Finalize',
        body: 'Close the tournament permanently. Locks runs and stops ingestion. This is final.',
        button: 'Finalize tournament',
        variant: 'danger',
        confirm: 'Finalize this tournament? This locks runs and closes it.',
        visible: (t) => !t.finalizedAt,
    },
    {
        key: 'archive',
        title: 'Archive',
        body: 'Hide the tournament from the public list without deleting any data. Direct links still work.',
        button: 'Archive',
        variant: 'ghost',
        visible: (t) => !t.hide,
    },
    {
        key: 'archive',
        title: 'Unarchive',
        body: 'Show the tournament in the public list again.',
        button: 'Unarchive',
        variant: 'ghost',
        visible: (t) => !!t.hide,
    },
    {
        key: 'recalculate',
        title: 'Recalculate',
        body: 'Trigger a leaderboard recompute. Mostly a no-op since leaderboards are computed on read, but kept for forward compatibility.',
        button: 'Recalculate',
        variant: 'ghost',
        visible: () => true,
    },
];

const VARIANT_CLASS: Record<ActionDef['variant'], string> = {
    primary: styles.primaryButton,
    success: `${styles.miniButton} ${styles.miniButtonSuccess}`,
    warning: `${styles.miniButton} ${styles.miniButtonWarning}`,
    danger: styles.dangerButton,
    ghost: styles.ghostButton,
};

export function LifecyclePanel({ tournament }: { tournament: Tournament }) {
    const [t, setT] = useState<Tournament>(tournament);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const status = lifecycleStatus(t);

    function dispatch(action: Action, confirmText?: string) {
        if (confirmText && !confirm(confirmText)) return;
        setError(null);
        startTransition(async () => {
            const res = await lifecycleActionServer(t.name, action);
            if ('error' in res) {
                setError(res.error || 'Error');
                return;
            }
            const okVal = res.ok;
            if (
                okVal &&
                typeof okVal === 'object' &&
                'name' in okVal &&
                typeof (okVal as Tournament).name === 'string'
            ) {
                setT(okVal as Tournament);
            }
        });
    }

    return (
        <FormSection
            icon="◐"
            title="Lifecycle"
            description="Control the tournament's run-acceptance state and visibility. Some of these actions are irreversible."
        >
            {error && <div className={styles.errorAlert}>{error}</div>}

            <div className={styles.lifecycleStatus}>
                <span className={styles.lifecycleStatusLabel}>Status</span>
                <LifecycleStatusBadge status={status} />
            </div>

            <div className={styles.actionCardGrid}>
                {ACTIONS.filter((a) => a.visible(t)).map((a, idx) => (
                    <div
                        key={`${a.key}-${a.title}-${idx}`}
                        className={styles.actionCard}
                    >
                        <h4 className={styles.actionCardTitle}>{a.title}</h4>
                        <p className={styles.actionCardBody}>{a.body}</p>
                        <button
                            type="button"
                            className={VARIANT_CLASS[a.variant]}
                            onClick={() => dispatch(a.key, a.confirm)}
                            disabled={isPending}
                        >
                            {a.button}
                        </button>
                    </div>
                ))}
            </div>
        </FormSection>
    );
}
