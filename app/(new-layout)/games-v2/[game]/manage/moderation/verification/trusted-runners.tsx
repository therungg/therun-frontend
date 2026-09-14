'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { TrustGrant } from '../../../../../../../types/worklist.types';
import { FormSection, InlineError } from '../../shared/form-kit';
import {
    listTrustGrantsAction,
    revokeTrustAction,
} from '../worklist/actions/worklist.action';
import styles from './trusted-runners.module.scss';

/**
 * Everyone whose runs this game accepts without review, with who trusted
 * them, since when, and a way to take it back.
 */
export function TrustedRunners({
    gameSlug,
    categories,
}: {
    gameSlug: string;
    categories: Array<{ id: number; display: string }>;
}) {
    const [grants, setGrants] = useState<TrustGrant[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [revoking, setRevoking] = useState<number | null>(null);
    const [, startLoad] = useTransition();
    const requestId = useRef(0);

    const load = () => {
        const ticket = ++requestId.current;
        startLoad(async () => {
            const res = await listTrustGrantsAction(gameSlug);
            if (ticket !== requestId.current) return;
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setError(null);
            setGrants(res.grants);
        });
    };

    useEffect(load, [gameSlug]);

    const scopeLabel = (g: TrustGrant) =>
        g.categoryId === null
            ? 'Whole game'
            : (categories.find((c) => c.id === g.categoryId)?.display ??
              `Category ${g.categoryId}`);

    const revoke = async (g: TrustGrant) => {
        setRevoking(g.id);
        const res = await revokeTrustAction(gameSlug, g.id);
        setRevoking(null);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        load();
    };

    return (
        <FormSection
            title="Trusted runners"
            lede="Runs from these runners are verified without review."
        >
            <InlineError>{error}</InlineError>
            {grants !== null && grants.length === 0 && (
                <p className="text-muted small mb-0">No trusted runners yet.</p>
            )}
            {grants !== null && grants.length > 0 && (
                <div className={styles.list}>
                    {grants.map((g) => (
                        <div key={g.id} className={styles.row}>
                            <span className={styles.name}>
                                {g.username ?? `User ${g.userId}`}
                            </span>
                            <span className={styles.summary}>
                                {scopeLabel(g)} · since{' '}
                                {g.createdAt.slice(0, 10)}
                            </span>
                            <button
                                type="button"
                                className={styles.revokeBtn}
                                disabled={revoking === g.id}
                                onClick={() => revoke(g)}
                            >
                                Revoke
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </FormSection>
    );
}
