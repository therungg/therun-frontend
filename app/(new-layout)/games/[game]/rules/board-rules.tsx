'use client';

import { useState } from 'react';
import { selectedValueRules } from '~src/lib/variables/value-rules';
import type { VariableRow } from '../../../../../types/leaderboards.types';
import { type EmulatorPolicy, RulesBody, RulesPanel } from './rules-panel';

/**
 * Every rule the selected board holds a runner to, in one disclosure: the
 * game's, the level's, the category's, and whatever each selected subcategory
 * value adds.
 *
 * It lived only in the submit dialog, which meant the rules of a board were
 * visible to someone submitting to it and to nobody else — including the
 * runner deciding whether their run counts. The board page is where the
 * question is asked, so the answer is on it.
 */
export function BoardRules({
    gameRules,
    emulatorPolicy,
    levelRules,
    levelName,
    categoryRules,
    variables,
    selectedValues,
}: {
    gameRules: string | null;
    emulatorPolicy: EmulatorPolicy;
    levelRules: string | null;
    levelName: string | null;
    categoryRules: string | null;
    variables: VariableRow[];
    /** The values the board is currently sliced by, keyed by variable. */
    selectedValues: Record<string, string>;
}) {
    const [open, setOpen] = useState(false);
    const subcategoryRules = selectedValueRules(variables, selectedValues);

    return (
        <div>
            <RulesPanel
                rules={categoryRules}
                gameRules={gameRules}
                levelRules={levelRules}
                levelName={levelName}
                subcategoryRules={subcategoryRules}
                emulatorPolicy={emulatorPolicy}
                open={open}
                onToggle={() => setOpen((was) => !was)}
            />
            {open && (
                <RulesBody
                    rules={categoryRules}
                    gameRules={gameRules}
                    levelRules={levelRules}
                    levelName={levelName}
                    subcategoryRules={subcategoryRules}
                    emulatorPolicy={emulatorPolicy}
                />
            )}
        </div>
    );
}
