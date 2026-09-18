'use client';

import { Fragment } from 'react';
import { ChevronDown, ChevronRight } from 'react-bootstrap-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../game-page.module.scss';

const EXCERPT_LIMIT = 80;

export type EmulatorPolicy = 'allowed' | 'banned' | null | undefined;

/** One selected subcategory value that carries rules of its own. */
export interface SubcategoryRule {
    label: string;
    rules: string;
}

/** The ones that actually say something, in the order they were given. */
function withRules(
    rules: SubcategoryRule[] | null | undefined,
): SubcategoryRule[] {
    return (rules ?? []).filter((r) => nonEmpty(r.rules) !== null);
}

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
    levelRules,
    levelName,
    subcategoryRules,
    emulatorPolicy,
    open,
    onToggle,
    label = 'Rules',
}: {
    rules: string | null | undefined;
    /** Game-level rules — when present, the panel appears even if `rules` (category rules) is empty. */
    gameRules?: string | null | undefined;
    /** The active level's rules (category_groups.rules, kind: 'level'), when
     *  the selected board is a level board. Rendered between game rules and
     *  category rules, headed by `levelName`. */
    levelRules?: string | null | undefined;
    /** The level's own name — heads the level rules tier. */
    levelName?: string | null | undefined;
    /** Rules the selected subcategory values carry, innermost tier. A value
     *  ("No Death Abuse") can hold rules the category does not. */
    subcategoryRules?: SubcategoryRule[] | null;
    /** When present (and no other rules text exists) the panel still appears and the policy line stands in for the excerpt. */
    emulatorPolicy?: EmulatorPolicy;
    open: boolean;
    onToggle: () => void;
    label?: string;
}) {
    const categoryRules = nonEmpty(rules);
    const gameRulesText = nonEmpty(gameRules);
    const levelRulesText = nonEmpty(levelRules);
    const subRules = withRules(subcategoryRules);
    const policyText = emulatorPolicyText(emulatorPolicy);
    if (
        !categoryRules &&
        !gameRulesText &&
        !levelRulesText &&
        subRules.length === 0 &&
        !policyText
    )
        return null;

    // The excerpt always prefers category rules (unchanged from before this
    // panel could open for game-rules/policy-only games), then level rules,
    // then the emulator policy line — the most useful thing a runner can
    // see collapsed on a policy-only game. Plain game rules with none of
    // the above still show no excerpt (unchanged).
    const excerptText = categoryRules
        ? buildExcerpt(categoryRules)
        : levelRulesText
          ? buildExcerpt(levelRulesText)
          : subRules.length > 0
            ? buildExcerpt(subRules[0].rules)
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
    levelRules,
    levelName,
    subcategoryRules,
    emulatorPolicy,
}: {
    rules?: string | null;
    /** Game-level rules — rendered first, above category rules, separated by a divider. */
    gameRules?: string | null;
    /** The active level's rules, when the selected board is a level board —
     *  rendered between game rules and category rules, headed by `levelName`. */
    levelRules?: string | null;
    /** The level's own name — heads the level rules tier. */
    levelName?: string | null;
    /** Rules of the selected subcategory values, each headed by its label. */
    subcategoryRules?: SubcategoryRule[] | null;
    emulatorPolicy?: EmulatorPolicy;
}) {
    const categoryRules = nonEmpty(rules);
    const gameRulesText = nonEmpty(gameRules);
    const levelRulesText = nonEmpty(levelRules);
    const subRules = withRules(subcategoryRules);
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
            {gameRulesText && (levelRulesText || categoryRules) && (
                <hr className={styles.rulesDivider} />
            )}
            {levelRulesText && (
                <>
                    {levelName && <strong>{levelName}</strong>}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {levelRulesText}
                    </ReactMarkdown>
                </>
            )}
            {levelRulesText && categoryRules && (
                <hr className={styles.rulesDivider} />
            )}
            {categoryRules && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {categoryRules}
                </ReactMarkdown>
            )}
            {/* Innermost tier: what the chosen values add on top of the
                category. Each is headed by its own label, because a runner
                reading them has to know which choice they belong to. */}
            {subRules.map((sub, i) => (
                <Fragment key={sub.label}>
                    {(i > 0 ||
                        categoryRules ||
                        levelRulesText ||
                        gameRulesText) && (
                        <hr className={styles.rulesDivider} />
                    )}
                    <strong>{sub.label}</strong>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {sub.rules}
                    </ReactMarkdown>
                </Fragment>
            ))}
        </div>
    );
}
