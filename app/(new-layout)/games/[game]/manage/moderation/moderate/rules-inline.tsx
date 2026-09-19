'use client';

import { useMemo, useState } from 'react';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import { buildRuleTiers } from '../../../rules/rule-tiers';
import type { EmulatorPolicy } from '../../../rules/rules-panel';
import styles from './moderate-panel.module.scss';

export interface RulesInlineProps {
    gameRules: string | null;
    emulatorPolicy: EmulatorPolicy;
    levelRules: string | null;
    levelName: string | null;
    categoryRules: string | null;
    variables: VariableRow[];
    selectedValues: Record<string, string>;
}

/**
 * The board's rules where the run is being judged, rather than a page away.
 *
 * Inline and not a dialog: a moderator measuring a run reads the rule against
 * the video, and a modal over the sheet would cover the one thing the rule is
 * about. Closed by default — the rules are a reference, not the task — and it
 * renders nothing at all when the board has no rules of any tier.
 */
export function RulesInline(props: RulesInlineProps) {
    const [open, setOpen] = useState(false);
    const [tierId, setTierId] = useState<string | null>(null);

    const tiers = useMemo(() => buildRuleTiers(props), [props]);
    if (tiers.length === 0) return null;

    const active = tiers.find((t) => t.id === tierId) ?? tiers[0];

    return (
        <section className={styles.part}>
            <button
                type="button"
                className={styles.rulesToggle}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <span className={styles.partLabel}>Rules</span>
                <span className={styles.rulesCount}>
                    {open
                        ? 'Hide'
                        : tiers.length === 1
                          ? tiers[0].label
                          : `${tiers.length} sets`}
                </span>
            </button>
            {open && (
                <div className={styles.rulesBox}>
                    {tiers.length > 1 && (
                        <nav className={styles.rulesTabs} aria-label="Rules">
                            {tiers.map((tier) => (
                                <button
                                    key={tier.id}
                                    type="button"
                                    className={
                                        tier.id === active.id
                                            ? `${styles.rulesTab} ${styles.rulesTabOn}`
                                            : styles.rulesTab
                                    }
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
                    <div className={styles.rulesText}>{active.body}</div>
                </div>
            )}
        </section>
    );
}
