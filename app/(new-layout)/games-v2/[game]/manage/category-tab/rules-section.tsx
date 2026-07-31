'use client';

import { type FormEvent, useEffect, useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import remarkGfm from 'remark-gfm';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { FormSection, InlineError, SectionFooter } from '../shared/form-kit';
import kit from '../shared/form-kit.module.scss';
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
        <FormSection
            title="Rules"
            lede="Markdown is supported. Shown to runners on the public leaderboard page above the table."
        >
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

                <InlineError>{formError}</InlineError>
                <SectionFooter>
                    <button
                        type="submit"
                        className={kit.saveBtn}
                        disabled={busy || !dirty}
                    >
                        {isSaving ? 'Saving…' : 'Save rules'}
                    </button>
                    <button
                        type="button"
                        className={kit.resetBtn}
                        onClick={() => {
                            setText(original);
                            setFormError(null);
                        }}
                        disabled={busy || !dirty}
                    >
                        Reset
                    </button>
                </SectionFooter>
            </form>
        </FormSection>
    );
}
