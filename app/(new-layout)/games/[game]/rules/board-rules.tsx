'use client';

import { Fragment, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { selectedValueRules } from '~src/lib/variables/value-rules';
import type { VariableRow } from '../../../../../types/leaderboards.types';
import page from '../game-page.module.scss';
import { BoardDialog } from '../shared/board-dialog';
import styles from './board-rules.module.scss';
import type { EmulatorPolicy } from './rules-panel';

const EMULATOR_POLICY_TEXT: Record<'allowed' | 'banned', string> = {
    allowed: 'Emulators are allowed.',
    banned: 'Emulators are banned.',
};

function nonEmpty(text: string | null | undefined): string | null {
    return text && text.trim().length > 0 ? text : null;
}

/** One entry in the dialog's left menu, and the text it shows. */
interface Tier {
    id: string;
    label: string;
    body: React.ReactNode;
}

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

    const tiers = useMemo<Tier[]>(() => {
        const out: Tier[] = [];
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
                        {policy && (
                            <p className={page.emulatorPolicyLine}>{policy}</p>
                        )}
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
        // The rules the values this board is sliced by carry — one heading
        // each, because a runner reading them has to know which choice they
        // belong to.
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
                                {i > 0 && <hr className={page.rulesDivider} />}
                                {subs.length > 1 && (
                                    <strong>{sub.label}</strong>
                                )}
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
    }, [
        gameRules,
        emulatorPolicy,
        levelRules,
        levelName,
        categoryRules,
        variables,
        selectedValues,
    ]);

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
                title={`${boardName} — rules`}
                size="xl"
                themed
            >
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
                                    tier.id === active.id ? 'true' : undefined
                                }
                                onClick={() => setTierId(tier.id)}
                            >
                                {tier.label}
                            </button>
                        ))}
                    </nav>
                    <div className={styles.pane}>
                        <div className={page.rulesBody}>{active.body}</div>
                    </div>
                </div>
            </BoardDialog>
        </>
    );
}
