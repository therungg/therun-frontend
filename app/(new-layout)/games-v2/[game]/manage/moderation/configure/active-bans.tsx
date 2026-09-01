'use client';

import { useEffect, useState, useTransition } from 'react';
import { ShieldCheck } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import chrome from '~src/components/console-chrome/console.module.scss';
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
        <>
            <tr className={styles.row}>
                <td className={styles.runnerCell}>
                    <span className={styles.runner}>
                        <UserLink username={rule.targetDisplayName} />
                    </span>
                    {rule.reason && (
                        <span className={styles.banReason}>{rule.reason}</span>
                    )}
                </td>
                <td>
                    {rule.categoryName ? (
                        <span className={styles.scopePill}>
                            {rule.categoryName}
                        </span>
                    ) : (
                        <span className={styles.scopePillGame}>Whole game</span>
                    )}
                </td>
                <td className={styles.byCell}>{rule.excludedByName}</td>
                <td className={styles.dateCell}>
                    {new Date(rule.createdAt).toLocaleDateString()}
                </td>
                <td className={styles.actionCell}>
                    {!expanded && (
                        <button
                            type="button"
                            className={styles.liftBtn}
                            onClick={() => {
                                setExpanded(true);
                                setError(null);
                            }}
                        >
                            Lift ban
                        </button>
                    )}
                </td>
            </tr>
            {expanded && (
                <tr className={styles.liftRow}>
                    <td colSpan={5}>
                        <div className={styles.liftForm}>
                            <label
                                htmlFor={`lift-reason-${rule.ruleId}`}
                                className={styles.liftLabel}
                            >
                                Reason for lifting (min {MIN_REASON} characters)
                            </label>
                            <textarea
                                id={`lift-reason-${rule.ruleId}`}
                                className={styles.liftTextarea}
                                rows={2}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={isPending}
                            />
                            {error && (
                                <div className={styles.errorAlert} role="alert">
                                    {error}
                                </div>
                            )}
                            <div className={styles.liftActions}>
                                <button
                                    type="button"
                                    className={styles.cancelBtn}
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
                                    className={styles.confirmBtn}
                                    onClick={handleLift}
                                    disabled={isPending || !reasonOk}
                                >
                                    {isPending ? 'Lifting…' : 'Confirm lift'}
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
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
            <header className={chrome.paneHeader}>
                <div>
                    <div className={chrome.paneEyebrow}>Queue</div>
                    <h2 className={chrome.paneTitle}>Active bans</h2>
                </div>
                <div className={chrome.paneActions}>
                    {!loading && !error && rules.length > 0 && (
                        <span className={chrome.paneCount}>
                            {rules.length} active
                        </span>
                    )}
                </div>
            </header>
            <p className={chrome.paneLede}>
                Standing exclusions that keep a runner off this game&apos;s
                boards. Lifting one reinstates the affected runs.
            </p>

            {loading ? (
                <div className={styles.loading} role="status">
                    <span className={styles.srOnly}>Loading active bans</span>
                    <div className={styles.skeletonRow} aria-hidden="true" />
                    <div className={styles.skeletonRow} aria-hidden="true" />
                    <div className={styles.skeletonRow} aria-hidden="true" />
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
                    <p className={styles.emptyText}>
                        This game has no standing exclusions.
                    </p>
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Runner</th>
                                <th>Scope</th>
                                <th>Banned by</th>
                                <th>Date</th>
                                <th>
                                    <span className={styles.srOnly}>
                                        Actions
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((rule) => (
                                <BanRow
                                    key={rule.ruleId}
                                    gameSlug={gameSlug}
                                    rule={rule}
                                    onLifted={onLifted}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
