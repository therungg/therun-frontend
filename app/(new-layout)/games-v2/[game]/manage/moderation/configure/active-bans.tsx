'use client';

import { useEffect, useState, useTransition } from 'react';
import { PersonSlash, ShieldCheck } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { UserLink } from '~src/components/links/links';
import type { GameExclusionRuleRow } from '../../../../../../../types/moderation.types';
import { deleteRuleAction } from '../rules/actions/delete-rule.action';
import { loadBansAction } from './actions/standards.action';
import styles from './active-bans.module.scss';

interface Props {
    gameSlug: string;
}

const MIN_REASON = 10;

function BanRow({
    gameSlug,
    rule,
    onLifted,
}: {
    gameSlug: string;
    rule: GameExclusionRuleRow;
    onLifted: (ruleId: number) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const reasonOk = reason.trim().length >= MIN_REASON;

    const handleLift = () => {
        if (!reasonOk) return;
        setError(null);
        startTransition(async () => {
            const res = await deleteRuleAction(
                gameSlug,
                rule.ruleId,
                reason.trim(),
            );
            if ('error' in res) {
                setError(res.error);
                return;
            }
            const n = res.result.reinstatedRunCount;
            toast.success(
                `Ban lifted — ${n} run${n === 1 ? '' : 's'} reinstated.`,
            );
            onLifted(rule.ruleId);
        });
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardRow}>
                <div className={styles.cardMeta}>
                    <span className={styles.runner}>
                        <UserLink username={rule.targetDisplayName} />
                    </span>
                    <span className={styles.metaLine}>
                        Banned from{' '}
                        {rule.categoryName ?? <em>the whole game</em>} · by{' '}
                        {rule.excludedByName}
                    </span>
                    <span className={styles.metaDate}>
                        {new Date(rule.createdAt).toLocaleDateString()}
                    </span>
                    {rule.reason && (
                        <div className={styles.banReason}>{rule.reason}</div>
                    )}
                </div>

                {!expanded ? (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => {
                            setExpanded(true);
                            setError(null);
                        }}
                    >
                        <PersonSlash
                            size={13}
                            aria-hidden="true"
                            className="me-1"
                        />
                        Lift ban
                    </button>
                ) : (
                    <div className={styles.liftForm}>
                        <textarea
                            className={styles.liftTextarea}
                            rows={2}
                            placeholder={`Reason (min ${MIN_REASON} chars)`}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isPending}
                        />
                        {error && (
                            <div className={styles.errorAlert}>{error}</div>
                        )}
                        <div className={styles.liftActions}>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => {
                                    setExpanded(false);
                                    setReason('');
                                    setError(null);
                                }}
                                disabled={isPending}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={handleLift}
                                disabled={isPending || !reasonOk}
                            >
                                {isPending ? 'Lifting…' : 'Confirm lift'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function ActiveBans({ gameSlug }: Props) {
    const [rules, setRules] = useState<GameExclusionRuleRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        loadBansAction(gameSlug).then((res) => {
            if (cancelled) return;
            if ('error' in res) {
                setError(res.error);
            } else {
                setRules(res.rules);
            }
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [gameSlug]);

    const onLifted = (ruleId: number) =>
        setRules((prev) => prev.filter((r) => r.ruleId !== ruleId));

    return (
        <section className={styles.section}>
            <h2 className={styles.heading}>Active bans</h2>
            <p className={styles.description}>
                Standing exclusions that keep a runner off this game&apos;s
                boards. Lifting a ban reinstates their affected runs.
            </p>

            {loading ? (
                <div className={styles.loading}>
                    <span>Loading active bans…</span>
                </div>
            ) : error ? (
                <div className={styles.errorAlert} role="alert">
                    {error}
                </div>
            ) : rules.length === 0 ? (
                <div className={styles.empty}>
                    <ShieldCheck
                        size={40}
                        className={styles.emptyIcon}
                        aria-hidden="true"
                    />
                    <p className={styles.emptyTitle}>No active bans</p>
                    <p className="mb-0">
                        This game has no standing exclusions.
                    </p>
                </div>
            ) : (
                <div className={styles.stack}>
                    {rules.map((rule) => (
                        <BanRow
                            key={rule.ruleId}
                            gameSlug={gameSlug}
                            rule={rule}
                            onLifted={onLifted}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
