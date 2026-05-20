'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
        <section className="border rounded mb-3">
            <button
                type="button"
                className="btn btn-link w-100 text-decoration-none d-flex align-items-center gap-2 px-3 py-2 text-start"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                <strong>Rules</strong>
                {!open && (
                    <span className="text-muted small flex-grow-1 text-truncate">
                        {buildExcerpt(rules)}
                    </span>
                )}
            </button>
            {open && (
                <div className="px-3 pb-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {rules}
                    </ReactMarkdown>
                </div>
            )}
        </section>
    );
}
