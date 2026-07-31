'use client';

import { ChevronDown, ChevronRight } from 'react-bootstrap-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../game-page.module.scss';

const EXCERPT_LIMIT = 80;

export type EmulatorPolicy = 'allowed' | 'banned' | null | undefined;

const EMULATOR_POLICY_TEXT: Record<'allowed' | 'banned', string> = {
    allowed: 'Emulators are allowed.',
    banned: 'Emulators are banned.',
};

/** Narrows to a trimmed non-empty string, or null. */
function nonEmpty(text: string | null | undefined): string | null {
    return text && text.trim().length > 0 ? text : null;
}

function emulatorPolicyText(policy: EmulatorPolicy): string | null {
    return policy === 'allowed' || policy === 'banned'
        ? EMULATOR_POLICY_TEXT[policy]
        : null;
}

function buildExcerpt(text: string): string {
    const oneLine = text.replace(/\s+/g, ' ').trim();
    return oneLine.length > EXCERPT_LIMIT
        ? `${oneLine.slice(0, EXCERPT_LIMIT - 1)}…`
        : oneLine;
}

export function RulesPanel({
    rules,
    gameRules,
    emulatorPolicy,
    open,
    onToggle,
    label = 'Rules',
}: {
    rules: string | null | undefined;
    /** Game-level rules — when present, the panel appears even if `rules` (category rules) is empty. */
    gameRules?: string | null | undefined;
    /** When present (and no other rules text exists) the panel still appears and the policy line stands in for the excerpt. */
    emulatorPolicy?: EmulatorPolicy;
    open: boolean;
    onToggle: () => void;
    label?: string;
}) {
    const categoryRules = nonEmpty(rules);
    const gameRulesText = nonEmpty(gameRules);
    const policyText = emulatorPolicyText(emulatorPolicy);
    if (!categoryRules && !gameRulesText && !policyText) return null;

    // The excerpt always prefers category rules (unchanged from before this
    // panel could open for game-rules/policy-only games). When there are no
    // category rules to excerpt, the emulator policy line stands in — it's
    // the most useful thing a runner can see collapsed on a policy-only
    // game. Plain game rules with no category rules and no policy still
    // show no excerpt (unchanged).
    const excerptText = categoryRules
        ? buildExcerpt(categoryRules)
        : policyText;

    return (
        <button
            type="button"
            className={styles.rulesToggle}
            onClick={onToggle}
            aria-expanded={open}
        >
            {open ? (
                <ChevronDown size={12} aria-hidden />
            ) : (
                <ChevronRight size={12} aria-hidden />
            )}
            <strong>{label}</strong>
            {!open && excerptText && (
                <span className="text-muted small text-truncate">
                    {excerptText}
                </span>
            )}
        </button>
    );
}

export function RulesBody({
    rules,
    gameRules,
    emulatorPolicy,
}: {
    rules?: string | null;
    /** Game-level rules — rendered first, above category rules, separated by a divider. */
    gameRules?: string | null;
    emulatorPolicy?: EmulatorPolicy;
}) {
    const categoryRules = nonEmpty(rules);
    const gameRulesText = nonEmpty(gameRules);
    const policyText = emulatorPolicyText(emulatorPolicy);

    return (
        <div className={styles.rulesBody}>
            {policyText && (
                <p className={styles.emulatorPolicyLine}>{policyText}</p>
            )}
            {gameRulesText && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {gameRulesText}
                </ReactMarkdown>
            )}
            {gameRulesText && categoryRules && (
                <hr className={styles.rulesDivider} />
            )}
            {categoryRules && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {categoryRules}
                </ReactMarkdown>
            )}
        </div>
    );
}
