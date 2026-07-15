'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'react-bootstrap-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../game-page.module.scss';

interface Props {
    rules: string | null | undefined;
    categoryId: number;
}

const EXCERPT_LIMIT = 80;

function buildExcerpt(text: string): string {
    const oneLine = text.replace(/\s+/g, ' ').trim();
    return oneLine.length > EXCERPT_LIMIT
        ? `${oneLine.slice(0, EXCERPT_LIMIT - 1)}…`
        : oneLine;
}

export function RulesPanel({ rules, categoryId }: Props) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [categoryId]);

    if (!rules || rules.trim().length === 0) return null;

    return (
        <section className="mb-3">
            <button
                type="button"
                className={styles.rulesToggle}
                style={{ marginLeft: 0 }}
                onClick={() => setOpen((o) => !o)}
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
            {open && (
                <div className={styles.rulesBody}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {rules}
                    </ReactMarkdown>
                </div>
            )}
        </section>
    );
}
