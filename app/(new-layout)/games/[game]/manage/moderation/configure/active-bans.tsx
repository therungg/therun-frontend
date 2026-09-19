'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'react-bootstrap-icons';
import chrome from '~src/components/console-chrome/console.module.scss';
import { UserLink } from '~src/components/links/links';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type { GameExclusionRuleRow } from '../../../../../../../types/moderation.types';
import { ModeratePanel } from '../moderate/moderate-panel';
import { loadBansAction } from './actions/standards.action';
import styles from './active-bans.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    gameDisplay: string;
    /** Full board rows, for the moderate modal. */
    boardCategories: ResolvedCategory[];
    variables: VariableRow[];
    canSiteBan: boolean;
    /** canSeeBoards — the moderate panel links board names only when true. */
    boardsVisible: boolean;
}

function BanRow({
    rule,
    onModerate,
}: {
    rule: GameExclusionRuleRow;
    onModerate: (ruleId: number) => void;
}) {
    return (
        <tr className={styles.row}>
            <td className={styles.runnerCell}>
                <span className={styles.runner}>
                    <UserLink
                        username={rule.targetDisplayName}
                        to="leaderboards"
                    />
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
                <button
                    type="button"
                    className={styles.liftBtn}
                    onClick={() => onModerate(rule.ruleId)}
                >
                    Moderate
                </button>
            </td>
        </tr>
    );
}

export function ActiveBans({
    gameSlug,
    gameId,
    gameDisplay,
    boardCategories,
    variables,
    canSiteBan,
    boardsVisible,
}: Props) {
    const [rules, setRules] = useState<GameExclusionRuleRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openRuleId, setOpenRuleId] = useState<number | null>(null);
    // A slow response must not paint over a newer one.
    const requestId = useRef(0);

    const load = () => {
        const ticket = ++requestId.current;
        loadBansAction(gameSlug).then((res) => {
            if (ticket !== requestId.current) return;
            if ('error' in res) {
                setError(res.error);
            } else {
                setError(null);
                setRules(res.rules);
            }
            setLoading(false);
        });
    };

    useEffect(() => {
        setLoading(true);
        load();
        return () => {
            requestId.current++;
        };
        // load reads only gameSlug
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameSlug]);

    // After the list reloads under the modal (the open ban lifted), stay on
    // the rule if it is still listed, else take the next rule that survived,
    // else the one before it, else close. Worked out during render so the
    // modal never renders without a rule while one survives.
    const ruleOrder = rules.map((r) => r.ruleId);
    const ruleOrderSignature = ruleOrder.join('|');
    const [seenRuleOrder, setSeenRuleOrder] = useState<{
        signature: string;
        ruleIds: number[];
    }>({ signature: '', ruleIds: [] });
    if (seenRuleOrder.signature !== ruleOrderSignature) {
        setSeenRuleOrder({ signature: ruleOrderSignature, ruleIds: ruleOrder });
        if (openRuleId !== null && !ruleOrder.includes(openRuleId)) {
            const previous = seenRuleOrder.ruleIds;
            const survivors = new Set(ruleOrder);
            const at = previous.indexOf(openRuleId);
            let landing: number | null = null;
            if (at !== -1) {
                landing =
                    previous.slice(at + 1).find((id) => survivors.has(id)) ??
                    previous
                        .slice(0, at)
                        .reverse()
                        .find((id) => survivors.has(id)) ??
                    null;
            }
            setOpenRuleId(landing);
        }
    }

    const openIndex =
        openRuleId === null
            ? -1
            : rules.findIndex((r) => r.ruleId === openRuleId);
    const openRule = openIndex >= 0 ? rules[openIndex] : null;

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
                                    rule={rule}
                                    onModerate={setOpenRuleId}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {openRule && (
                <ModeratePanel
                    subject={{
                        kind: 'runner',
                        userId: openRule.targetId,
                        runnerName: openRule.targetDisplayName,
                        categoryId: openRule.categoryId,
                    }}
                    context={{
                        gameSlug,
                        gameId,
                        gameDisplay,
                        categories: boardCategories,
                        variables,
                        canSiteBan,
                        boardsVisible,
                    }}
                    mount="modal"
                    initialTab="runner"
                    position={{
                        index: openIndex + 1,
                        total: rules.length,
                    }}
                    onClose={() => setOpenRuleId(null)}
                    onMutated={load}
                    onPrev={
                        openIndex > 0
                            ? () => setOpenRuleId(rules[openIndex - 1].ruleId)
                            : undefined
                    }
                    onNext={
                        openIndex < rules.length - 1
                            ? () => setOpenRuleId(rules[openIndex + 1].ruleId)
                            : undefined
                    }
                />
            )}
        </section>
    );
}
