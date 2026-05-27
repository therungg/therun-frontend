'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { UserLink } from '~src/components/links/links';
import type { GameExclusionRuleRow } from '../../../../../../../types/moderation.types';
import { deleteRuleAction } from '../rules/actions/delete-rule.action';
import { loadBansAction } from './actions/standards.action';

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
        <li className="list-group-item">
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                <div className="small">
                    <strong>
                        <UserLink username={rule.targetDisplayName} />
                    </strong>{' '}
                    — banned from {rule.categoryName ?? <em>the whole game</em>}{' '}
                    · by {rule.excludedByName} ·{' '}
                    {new Date(rule.createdAt).toLocaleDateString()}
                    {rule.reason && (
                        <div className="text-muted">{rule.reason}</div>
                    )}
                </div>
                {!expanded ? (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                            setExpanded(true);
                            setError(null);
                        }}
                    >
                        Lift ban
                    </button>
                ) : (
                    <div
                        className="d-flex flex-column gap-1"
                        style={{ minWidth: 260 }}
                    >
                        <textarea
                            className="form-control form-control-sm"
                            rows={2}
                            placeholder={`Reason (min ${MIN_REASON} chars)`}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isPending}
                        />
                        {error && (
                            <div className="text-danger small">{error}</div>
                        )}
                        <div className="d-flex gap-2 justify-content-end">
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
        </li>
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
        <section className="mb-4">
            <h2 className="h5 mb-2">Active bans</h2>
            <p className="text-muted small">
                Standing exclusions that keep a runner off this game&apos;s
                boards. Lifting a ban reinstates their affected runs.
            </p>

            {loading ? (
                <p className="text-muted">Loading active bans…</p>
            ) : error ? (
                <div className="alert alert-danger py-2 mb-0">{error}</div>
            ) : rules.length === 0 ? (
                <p className="text-muted">No active bans.</p>
            ) : (
                <ul className="list-group">
                    {rules.map((rule) => (
                        <BanRow
                            key={rule.ruleId}
                            gameSlug={gameSlug}
                            rule={rule}
                            onLifted={onLifted}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}
