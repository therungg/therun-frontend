'use client';

import { useMemo, useState } from 'react';
import type { VariableRow } from '../../../../../types/leaderboards.types';
import { BoardDialog } from '../shared/board-dialog';
import styles from './board-rules.module.scss';
import { buildRuleTiers, type RuleTier } from './rule-tiers';
import type { EmulatorPolicy } from './rules-panel';

/**
 * Every rule the selected board holds a runner to, in one dialog: the game's,
 * the level's, the category's, and whatever the selected subcategory values
 * add.
 *
 * They lived only in the submit dialog, which meant the rules of a board were
 * visible to someone submitting to it and to nobody else — including the
 * runner deciding whether their run counts.
 *
 * The three are not one document. A runner asking "does my run count" is
 * asking it of one tier at a time, so the dialog is a menu of tiers on the
 * left and the one being read on the right, rather than a scroll where the
 * category's rules run into the game's without a seam.
 */
export function BoardRules({
    gameRules,
    emulatorPolicy,
    levelRules,
    levelName,
    categoryRules,
    boardName,
    variables,
    selectedValues,
}: {
    gameRules: string | null;
    emulatorPolicy: EmulatorPolicy;
    levelRules: string | null;
    levelName: string | null;
    categoryRules: string | null;
    /** Names the dialog, so it is the rules OF something. */
    boardName: string;
    variables: VariableRow[];
    /** The values the board is currently sliced by, keyed by variable. */
    selectedValues: Record<string, string>;
}) {
    const [open, setOpen] = useState(false);
    const [tierId, setTierId] = useState<string | null>(null);

    const tiers = useMemo<RuleTier[]>(
        () =>
            buildRuleTiers({
                gameRules,
                emulatorPolicy,
                levelRules,
                levelName,
                categoryRules,
                variables,
                selectedValues,
            }),
        [
            gameRules,
            emulatorPolicy,
            levelRules,
            levelName,
            categoryRules,
            variables,
            selectedValues,
        ],
    );

    if (tiers.length === 0) return null;

    const active = tiers.find((t) => t.id === tierId) ?? tiers[0];

    return (
        <>
            <button
                type="button"
                className={styles.pill}
                onClick={() => setOpen(true)}
            >
                Rules
            </button>
            <BoardDialog
                open={open}
                onClose={() => setOpen(false)}
                labelledBy="board-rules-title"
                size="xl"
                themed
            >
                <div className={styles.header}>
                    <h5 className={styles.title} id="board-rules-title">
                        {boardName}
                    </h5>
                    <span className={styles.titleHint}>Rules</span>
                </div>
                <div className={styles.body}>
                    <div className={styles.layout}>
                        <nav className={styles.menu} aria-label="Rules">
                            {tiers.map((tier) => (
                                <button
                                    key={tier.id}
                                    type="button"
                                    className={`${styles.menuItem} ${
                                        tier.id === active.id
                                            ? styles.menuItemOn
                                            : ''
                                    }`}
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
                        <div className={styles.pane}>
                            <div className={styles.text}>{active.body}</div>
                        </div>
                    </div>
                </div>
            </BoardDialog>
        </>
    );
}
