'use client';

import { useState, useTransition } from 'react';
import { Button } from 'react-bootstrap';
import { lifecycleStatus } from '~src/lib/tournament-permissions';
import type { Tournament } from '../../../../../types/tournament.types';
import { lifecycleActionServer } from '../../actions/lifecycle.action';
import { LifecycleStatusBadge } from './lifecycle-status-badge';

type Action = 'lock' | 'unlock' | 'finalize' | 'archive' | 'recalculate';

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
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            <p>
                Status: <LifecycleStatusBadge status={status} />
            </p>
            <div className="d-flex gap-2 flex-wrap">
                {!t.lockedAt && (
                    <Button
                        variant="warning"
                        onClick={() => dispatch('lock')}
                        disabled={isPending}
                    >
                        Lock
                    </Button>
                )}
                {t.lockedAt && !t.finalizedAt && (
                    <Button
                        variant="success"
                        onClick={() => dispatch('unlock')}
                        disabled={isPending}
                    >
                        Unlock
                    </Button>
                )}
                {!t.finalizedAt && (
                    <Button
                        variant="secondary"
                        onClick={() =>
                            dispatch(
                                'finalize',
                                'Finalize this tournament? This locks runs and closes it.',
                            )
                        }
                        disabled={isPending}
                    >
                        Finalize
                    </Button>
                )}
                <Button
                    variant="dark"
                    onClick={() => dispatch('archive')}
                    disabled={isPending}
                >
                    {t.hide ? 'Unarchive' : 'Archive'}
                </Button>
                <Button
                    variant="outline-primary"
                    onClick={() => dispatch('recalculate')}
                    disabled={isPending}
                >
                    Recalculate
                </Button>
            </div>
        </div>
    );
}
