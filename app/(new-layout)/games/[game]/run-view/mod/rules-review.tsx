'use client';

import type {
    AutoVerifyCheckName,
    AutoVerifyCheckResult,
} from '../../../../../../types/moderation.types';
import {
    RulesInline,
    rulesInlineProps,
} from '../../manage/moderation/moderate/rules-inline';
import { buildRuleTiers } from '../../rules/rule-tiers';
import type { ModContext } from '../load-run-view';
import { AUTO_VERIFY_CHECK_LABELS } from '../run-badges';
import type { RunViewModel } from '../run-view';
import styles from './mod-layer.module.scss';

/** The automatic checks' results, then the rules the board judges runs by. */
export function RulesReview({
    model,
    mod,
}: {
    model: RunViewModel;
    mod: ModContext;
}) {
    const checks = Object.entries(
        model.autoVerifyResult?.checks ?? {},
    ) as Array<[AutoVerifyCheckName, AutoVerifyCheckResult]>;
    const rules = rulesInlineProps(mod.board, mod.sheet);
    const hasRules = buildRuleTiers(rules).length > 0;
    if (checks.length === 0 && !hasRules) return null;

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.eyebrow}>
                    {mod.board.categoryDisplay} rules
                </span>
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
            {hasRules && <RulesInline {...rules} />}
        </section>
    );
}
