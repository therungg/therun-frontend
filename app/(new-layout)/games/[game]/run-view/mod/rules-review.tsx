'use client';

import { useState } from 'react';
import Link from '~src/components/link';
import { buildManageHref } from '~src/lib/board-url';
import type {
    AutoVerifyCheckName,
    AutoVerifyCheckResult,
} from '../../../../../../types/moderation.types';
import { rulesInlineProps } from '../../manage/moderation/moderate/rules-inline';
import rulesStyles from '../../rules/board-rules.module.scss';
import { buildRuleTiers } from '../../rules/rule-tiers';
import type { ModContext } from '../load-run-view';
import { AUTO_VERIFY_CHECK_LABELS } from '../run-badges';
import type { RunViewModel } from '../run-view';
import styles from './mod-layer.module.scss';

/**
 * The automatic checks' results, then the rules the board judges runs by,
 * open: the moderator reads them against the run, so they are not folded
 * away behind a toggle the way the sheet's reference copy is.
 */
export function RulesReview({
    model,
    mod,
}: {
    model: RunViewModel;
    mod: ModContext;
}) {
    const [tierId, setTierId] = useState<string | null>(null);
    const checks = Object.entries(
        model.autoVerifyResult?.checks ?? {},
    ) as Array<[AutoVerifyCheckName, AutoVerifyCheckResult]>;
    const tiers = buildRuleTiers(rulesInlineProps(mod.board, mod.sheet));
    if (checks.length === 0 && tiers.length === 0) return null;

    // The most specific tier first: the category's rules are the ones a run
    // on this board is most often judged by.
    const active = tiers.find((t) => t.id === tierId) ?? tiers.at(-1) ?? null;
    const editHref = `${buildManageHref(mod.sheet.gameSlug, 'rules')}&cat=${model.categoryId}`;

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.eyebrow}>
                    {mod.board.categoryDisplay} rules
                </span>
                <Link href={editHref} className={styles.headLink}>
                    Edit rules
                </Link>
            </div>
            {checks.length > 0 && (
                <div className={styles.checks}>
                    {checks.map(([name, check]) => (
                        <div key={name} className={styles.check}>
                            <span
                                className={`${styles.checkMark} ${check.pass ? styles.checkPass : styles.checkFail}`}
                                aria-label={check.pass ? 'Passed' : 'Failed'}
                            >
                                {check.pass ? '✓' : '✗'}
                            </span>
                            <span>
                                {AUTO_VERIFY_CHECK_LABELS[name] ?? name}
                                {!check.pass && check.reason && (
                                    <span className={styles.muted}>
                                        {' '}
                                        · {check.reason}
                                    </span>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {active && (
                <div
                    className={`${styles.rules} ${checks.length > 0 ? styles.rulesAfterChecks : ''}`}
                >
                    {tiers.length > 1 && (
                        <nav className={styles.rulesTabs} aria-label="Rules">
                            {tiers.map((tier) => (
                                <button
                                    key={tier.id}
                                    type="button"
                                    className={`${styles.rulesTab} ${tier.id === active.id ? styles.rulesTabOn : ''}`}
                                    aria-current={
                                        tier.id === active.id
                                            ? 'true'
                                            : undefined
                                    }
                                    onClick={() => setTierId(tier.id)}
                                >
                                    {tier.label}
                                </button>
                            ))}
                        </nav>
                    )}
                    {/* Set the way the board's own rules dialog sets them. */}
                    <div className={`${rulesStyles.text} ${styles.rulesText}`}>
                        {active.body}
                    </div>
                </div>
            )}
        </section>
    );
}
