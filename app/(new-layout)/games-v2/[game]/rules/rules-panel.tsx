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

function isNonEmpty(text: string | null | undefined): text is string {
    return !!text && text.trim().length > 0;
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
    open,
    onToggle,
    label = 'Rules',
}: {
    rules: string | null | undefined;
    /** Game-level rules — when present, the panel appears even if `rules` (category rules) is empty. */
    gameRules?: string | null | undefined;
    open: boolean;
    onToggle: () => void;
    label?: string;
}) {
    const hasCategoryRules = isNonEmpty(rules);
    const hasGameRules = isNonEmpty(gameRules);
    if (!hasCategoryRules && !hasGameRules) return null;

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
            {!open && hasCategoryRules && (
                <span className="text-muted small text-truncate">
                    {buildExcerpt(rules as string)}
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
    const hasCategoryRules = isNonEmpty(rules);
    const hasGameRules = isNonEmpty(gameRules);

    return (
        <div className={styles.rulesBody}>
            {(emulatorPolicy === 'allowed' || emulatorPolicy === 'banned') && (
                <p className={styles.emulatorPolicyLine}>
                    {EMULATOR_POLICY_TEXT[emulatorPolicy]}
                </p>
            )}
            {hasGameRules && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {gameRules as string}
                </ReactMarkdown>
            )}
            {hasGameRules && hasCategoryRules && (
                <hr className={styles.rulesDivider} />
            )}
            {hasCategoryRules && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {rules as string}
                </ReactMarkdown>
            )}
        </div>
    );
}
