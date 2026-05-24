'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import type { GameExclusionRuleRow } from '../../../../../../../types/moderation.types';
import { deleteRuleAction } from './actions/delete-rule.action';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    rules: GameExclusionRuleRow[];
}

const MIN_REASON = 10;

function RuleRow({
    gameSlug,
    rule,
    onDeleted,
}: {
    gameSlug: string;
    rule: GameExclusionRuleRow;
    onDeleted: (ruleId: number) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const reasonOk = reason.trim().length >= MIN_REASON;

    const handleDelete = () => {
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
                `Rule removed — ${n} run${n === 1 ? '' : 's'} reinstated.`,
            );
            onDeleted(rule.ruleId);
        });
    };

    return (
        <tr>
            <td>
                <UserLink username={rule.targetDisplayName} />
            </td>
            <td>{rule.categoryName ?? <em>Whole game</em>}</td>
            <td className="small text-muted">{rule.reason ?? '—'}</td>
            <td className="small">{rule.excludedByName}</td>
            <td className="small text-muted">
                {new Date(rule.createdAt).toLocaleDateString()}
            </td>
            <td className="text-end" style={{ minWidth: 260 }}>
                {!expanded ? (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => {
                            setExpanded(true);
                            setError(null);
                        }}
                    >
                        Delete rule
                    </button>
                ) : (
                    <div className="d-flex flex-column gap-1">
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
                                onClick={handleDelete}
                                disabled={isPending || !reasonOk}
                            >
                                {isPending ? 'Removing…' : 'Confirm delete'}
                            </button>
                        </div>
                    </div>
                )}
            </td>
        </tr>
    );
}

export function RulesView({ gameSlug, gameDisplay, rules }: Props) {
    const baseHref = `/games-v2/${gameSlug}/manage/moderation`;
    const [list, setList] = useState(rules);

    const onDeleted = (ruleId: number) =>
        setList((prev) => prev.filter((r) => r.ruleId !== ruleId));

    return (
        <div className="container py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h1 className="h4 mb-0">Exclusion rules — {gameDisplay}</h1>
                <Link
                    href={baseHref}
                    className="btn btn-sm btn-outline-secondary"
                >
                    Back to moderation
                </Link>
            </div>

            {list.length === 0 ? (
                <p className="text-muted">
                    No exclusion rules are configured for this game.
                </p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Scope</th>
                                <th>Reason</th>
                                <th>Excluded by</th>
                                <th>Created</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((rule) => (
                                <RuleRow
                                    key={rule.ruleId}
                                    gameSlug={gameSlug}
                                    rule={rule}
                                    onDeleted={onDeleted}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
