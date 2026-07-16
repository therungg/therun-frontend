'use client';

import { ChevronDown, ChevronRight } from 'react-bootstrap-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../game-page.module.scss';

const EXCERPT_LIMIT = 80;

function buildExcerpt(text: string): string {
    const oneLine = text.replace(/\s+/g, ' ').trim();
    return oneLine.length > EXCERPT_LIMIT
        ? `${oneLine.slice(0, EXCERPT_LIMIT - 1)}…`
        : oneLine;
}

export function RulesPanel({
    rules,
    open,
    onToggle,
}: {
    rules: string | null | undefined;
    open: boolean;
    onToggle: () => void;
}) {
    if (!rules || rules.trim().length === 0) return null;

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
            <strong>Rules</strong>
            {!open && (
                <span className="text-muted small text-truncate">
                    {buildExcerpt(rules)}
                </span>
            )}
        </button>
    );
}

export function RulesBody({ rules }: { rules: string }) {
    return (
        <div className={styles.rulesBody}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rules}</ReactMarkdown>
        </div>
    );
}
