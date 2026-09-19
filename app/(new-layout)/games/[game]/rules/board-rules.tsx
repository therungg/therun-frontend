'use client';

import { useState } from 'react';
import { selectedValueRules } from '~src/lib/variables/value-rules';
import type { VariableRow } from '../../../../../types/leaderboards.types';
import { BoardDialog } from '../shared/board-dialog';
import styles from './board-rules.module.scss';
import { type EmulatorPolicy, RulesBody } from './rules-panel';

/**
 * Every rule the selected board holds a runner to: the game's, the level's,
 * the category's, and whatever each selected subcategory value adds.
 *
 * It lived only in the submit dialog, which meant the rules of a board were
 * visible to someone submitting to it and to nobody else — including the
 * runner deciding whether their run counts.
 *
 * It is a pill beside the board's name rather than a tier of the selector
 * plate: rules are long, they are read once, and a disclosure that pushes the
 * leaderboard down the page every time it opens is not where that reading
 * happens. The dialog is.
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
    const subcategoryRules = selectedValueRules(variables, selectedValues);

    const hasAny =
        Boolean(gameRules?.trim()) ||
        Boolean(levelRules?.trim()) ||
        Boolean(categoryRules?.trim()) ||
        subcategoryRules.length > 0 ||
        emulatorPolicy === 'allowed' ||
        emulatorPolicy === 'banned';
    if (!hasAny) return null;

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
                title={`${boardName} — rules`}
                size="lg"
                themed
            >
                <div className={styles.body}>
                    <RulesBody
                        rules={categoryRules}
                        gameRules={gameRules}
                        levelRules={levelRules}
                        levelName={levelName}
                        subcategoryRules={subcategoryRules}
                        emulatorPolicy={emulatorPolicy}
                    />
                </div>
            </BoardDialog>
        </>
    );
}
