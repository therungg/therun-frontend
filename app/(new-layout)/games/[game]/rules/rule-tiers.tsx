import { Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { selectedValueRules } from '~src/lib/variables/value-rules';
import type { VariableRow } from '../../../../../types/leaderboards.types';
import styles from './board-rules.module.scss';
import type { EmulatorPolicy } from './rules-panel';

const EMULATOR_POLICY_TEXT: Record<'allowed' | 'banned', string> = {
    allowed: 'Emulators are allowed.',
    banned: 'Emulators are banned.',
};

function nonEmpty(text: string | null | undefined): string | null {
    return text && text.trim().length > 0 ? text : null;
}

/** One tier of rules, and the text it shows. */
export interface RuleTier {
    id: string;
    label: string;
    body: React.ReactNode;
}

export interface RuleTierInput {
    gameRules: string | null;
    emulatorPolicy: EmulatorPolicy;
    levelRules: string | null;
    levelName: string | null;
    categoryRules: string | null;
    variables: VariableRow[];
    /** The values the board is sliced by, keyed by variable. */
    selectedValues: Record<string, string>;
}

/**
 * Every rule a board holds a runner to, in tiers: the game's, the level's,
 * the category's, and whatever the selected subcategory values add.
 *
 * The three are not one document. Someone asking "does this run count" is
 * asking it of one tier at a time, so they stay separate wherever they are
 * shown — the board page's dialog and the moderator's retime column read the
 * same tiers from here rather than each deciding what a tier is.
 */
export function buildRuleTiers({
    gameRules,
    emulatorPolicy,
    levelRules,
    levelName,
    categoryRules,
    variables,
    selectedValues,
}: RuleTierInput): RuleTier[] {
    const out: RuleTier[] = [];
    const policy =
        emulatorPolicy === 'allowed' || emulatorPolicy === 'banned'
            ? EMULATOR_POLICY_TEXT[emulatorPolicy]
            : null;
    const game = nonEmpty(gameRules);
    if (game || policy) {
        out.push({
            id: 'game',
            label: 'Game rules',
            body: (
                <>
                    {policy && <p className={styles.policy}>{policy}</p>}
                    {game && (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {game}
                        </ReactMarkdown>
                    )}
                </>
            ),
        });
    }
    const level = nonEmpty(levelRules);
    if (level) {
        out.push({
            id: 'level',
            label: levelName ? `${levelName} rules` : 'Level rules',
            body: (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {level}
                </ReactMarkdown>
            ),
        });
    }
    const category = nonEmpty(categoryRules);
    if (category) {
        out.push({
            id: 'category',
            label: 'Category rules',
            body: (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {category}
                </ReactMarkdown>
            ),
        });
    }
    // The rules the values this board is sliced by carry — one heading each,
    // because whoever reads them has to know which choice they belong to.
    const subs = selectedValueRules(variables, selectedValues);
    if (subs.length > 0) {
        out.push({
            id: 'subcategory',
            label:
                subs.length === 1
                    ? `${subs[0].label} rules`
                    : 'Subcategory rules',
            body: (
                <>
                    {subs.map((sub, i) => (
                        <Fragment key={sub.label}>
                            {i > 0 && <hr className={styles.divider} />}
                            {subs.length > 1 && <strong>{sub.label}</strong>}
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {sub.rules}
                            </ReactMarkdown>
                        </Fragment>
                    ))}
                </>
            ),
        });
    }
    return out;
}
