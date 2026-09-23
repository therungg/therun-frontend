'use client';

import { useMemo, useState } from 'react';
import { parseSubcategoryKey } from '~src/lib/variables/keys';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import { buildRuleTiers } from '../../../rules/rule-tiers';
import type { EmulatorPolicy } from '../../../rules/rules-panel';
import { subcategoryVariablesFor } from '../../boards/subcategory-bands';
import styles from './moderate-panel.module.scss';
import type { SheetBoard, SheetContext } from './subject';

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
 * The rules a board is judged by. A level board keeps its own on its group;
 * the values the board is sliced by keep theirs on the variable, keyed the
 * way the key itself spells them.
 */
export function rulesInlineProps(
    board: Pick<SheetBoard, 'categoryId' | 'subcategoryKey'>,
    context: SheetContext,
): RulesInlineProps {
    const category = context.categories.find((c) => c.id === board.categoryId);
    const levelGroup =
        category?.groupId != null
            ? context.groups?.find(
                  (g) => g.id === category.groupId && g.kind === 'level',
              )
            : undefined;
    return {
        gameRules: context.gameRules ?? null,
        emulatorPolicy: context.emulatorPolicy ?? null,
        levelRules: levelGroup?.rules ?? null,
        levelName: levelGroup?.name ?? null,
        categoryRules: category?.rules ?? null,
        // The sheet holds every category's variables, and categories share
        // variable names ("Players"): only this board's own count.
        variables: subcategoryVariablesFor(board.categoryId, context.variables),
        selectedValues: Object.fromEntries(
            parseSubcategoryKey(board.subcategoryKey).map((part) => [
                part.name,
                part.value,
            ]),
        ),
    };
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
