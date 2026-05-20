'use client';

import { type FormEvent, useEffect, useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import remarkGfm from 'remark-gfm';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { updateCategorySettingsAction } from './actions/update-category-settings.action';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory | null;
}

type Tab = 'edit' | 'preview';

export function RulesSection({ gameSlug, gameId, category }: Props) {
    const initial = category?.rules ?? '';
    const [text, setText] = useState(initial);
    const [original, setOriginal] = useState(initial);
    const [tab, setTab] = useState<Tab>('edit');
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, startSave] = useTransition();

    useEffect(() => {
        const next = category?.rules ?? '';
        setText(next);
        setOriginal(next);
        setTab('edit');
        setFormError(null);
    }, [category?.id, category?.rules]);

    if (!category) return null;

    const dirty = text !== original;
    const busy = isSaving;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);

        startSave(async () => {
            const res = await updateCategorySettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                rules: text.length > 0 ? text : null,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success('Rules saved');
            setOriginal(text);
        });
    };

    return (
        <section className="border rounded p-3 mb-4">
            <h2 className="h5 mb-1">Rules</h2>
            <p className="text-muted small mb-3">
                Markdown is supported. Shown to runners on the public
                leaderboard page above the table.
            </p>

            <ul className="nav nav-tabs mb-2" role="tablist">
                <li className="nav-item" role="presentation">
                    <button
                        type="button"
                        className={`nav-link${tab === 'edit' ? ' active' : ''}`}
                        onClick={() => setTab('edit')}
                    >
                        Edit
                    </button>
                </li>
                <li className="nav-item" role="presentation">
                    <button
                        type="button"
                        className={`nav-link${tab === 'preview' ? ' active' : ''}`}
                        onClick={() => setTab('preview')}
                    >
                        Preview
                    </button>
                </li>
            </ul>

            <form onSubmit={handleSubmit}>
                {tab === 'edit' ? (
                    <textarea
                        className="form-control"
                        rows={10}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={busy}
                        placeholder="Write the category rules in Markdown..."
                    />
                ) : (
                    <div
                        className="border rounded p-3"
                        style={{ minHeight: '12rem' }}
                    >
                        {text.length > 0 ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {text}
                            </ReactMarkdown>
                        ) : (
                            <p className="text-muted small mb-0">
                                Nothing to preview yet.
                            </p>
                        )}
                    </div>
                )}

                <div className="d-flex gap-2 mt-3">
                    <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={busy || !dirty}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                            setText(original);
                            setFormError(null);
                        }}
                        disabled={busy || !dirty}
                    >
                        Reset
                    </button>
                </div>

                {formError && (
                    <div className="alert alert-danger mt-2 mb-0 py-2">
                        {formError}
                    </div>
                )}
            </form>
        </section>
    );
}
