'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import { createVariableAction } from '../../manage/variables/actions/create-variable.action';
import { deleteVariableAction } from '../../manage/variables/actions/delete-variable.action';
import type { StepProps } from '../types';

interface Template {
    name: string;
    role: 'subcategory' | 'filter';
    values: string[];
    blurb: string;
}

const TEMPLATES: Template[] = [
    {
        name: 'Platform',
        role: 'filter',
        values: ['PC', 'Switch', 'PS5', 'Xbox'],
        blurb: 'One board, viewers can narrow by platform',
    },
    {
        name: 'Version',
        role: 'filter',
        values: ['1.0', 'Latest'],
        blurb: 'Filter by game version or patch',
    },
    {
        name: 'Difficulty',
        role: 'subcategory',
        values: ['Easy', 'Normal', 'Hard'],
        blurb: 'Each difficulty gets its own rankings',
    },
    {
        name: 'Character',
        role: 'subcategory',
        values: ['Character 1', 'Character 2'],
        blurb: 'Each character gets its own rankings',
    },
];

interface EditorState {
    name: string;
    role: 'subcategory' | 'filter';
    valuesText: string;
}

export function StepVariables({ data, onAdvance }: StepProps) {
    const router = useRouter();
    const [variables, setVariables] = useState<VariableRow[]>(data.variables);
    const [editor, setEditor] = useState<EditorState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const openTemplate = (t: Template) =>
        setEditor({
            name: t.name,
            role: t.role,
            valuesText: t.values.join(', '),
        });

    const saveVariable = () => {
        if (!editor) return;
        startSaving(async () => {
            setError(null);
            const values = editor.valuesText
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
                .map((v) => [v]);
            if (values.length < 2) {
                setError('A variable needs at least two values.');
                return;
            }
            const res = await createVariableAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                body: {
                    categoryId: null, // game-wide; scope per-category later in the console
                    name: editor.name.trim(),
                    role: editor.role,
                    values,
                },
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setVariables((vs) => [...vs, res.result]);
            setEditor(null);
            toast.success(`Variable "${res.result.name}" created`);
            router.refresh();
        });
    };

    const removeVariable = (v: VariableRow) => {
        startSaving(async () => {
            const res = await deleteVariableAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId: v.categoryId,
                name: v.name,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setVariables((vs) => vs.filter((x) => x.id !== v.id));
            router.refresh();
        });
    };

    return (
        <section>
            <h2 className="h4">Variables</h2>
            <div className="row g-3 mb-3">
                <div className="col-md-6">
                    <div className="border rounded p-3 h-100">
                        <strong>Subcategory</strong>
                        <p className="mb-0 small text-muted">
                            Splits your leaderboard into separate boards — e.g.
                            Difficulty: Easy and Hard each get their own
                            rankings.
                        </p>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="border rounded p-3 h-100">
                        <strong>Filter</strong>
                        <p className="mb-0 small text-muted">
                            One board, viewers can narrow it — e.g. Platform.
                            Everyone still competes together.
                        </p>
                    </div>
                </div>
            </div>

            <p className="mb-1">Start from a template:</p>
            <div className="d-flex gap-2 flex-wrap mb-3">
                {TEMPLATES.map((t) => (
                    <button
                        key={t.name}
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        title={t.blurb}
                        onClick={() => openTemplate(t)}
                    >
                        {t.name}
                    </button>
                ))}
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() =>
                        setEditor({
                            name: '',
                            role: 'filter',
                            valuesText: '',
                        })
                    }
                >
                    + Custom variable
                </button>
            </div>

            {editor && (
                <div className="border rounded p-3 mb-3">
                    <label className="form-label" htmlFor="var-name">
                        Name
                    </label>
                    <input
                        id="var-name"
                        className="form-control"
                        value={editor.name}
                        onChange={(e) =>
                            setEditor({ ...editor, name: e.target.value })
                        }
                    />
                    <div className="mt-2">
                        <label className="form-check-label me-3">
                            <input
                                type="radio"
                                className="form-check-input me-1"
                                checked={editor.role === 'subcategory'}
                                onChange={() =>
                                    setEditor({
                                        ...editor,
                                        role: 'subcategory',
                                    })
                                }
                            />
                            Subcategory — separate boards per value
                        </label>
                        <label className="form-check-label">
                            <input
                                type="radio"
                                className="form-check-input me-1"
                                checked={editor.role === 'filter'}
                                onChange={() =>
                                    setEditor({ ...editor, role: 'filter' })
                                }
                            />
                            Filter — one board, narrowable
                        </label>
                    </div>
                    <label className="form-label mt-2" htmlFor="var-values">
                        Values (comma-separated)
                    </label>
                    <input
                        id="var-values"
                        className="form-control"
                        value={editor.valuesText}
                        onChange={(e) =>
                            setEditor({
                                ...editor,
                                valuesText: e.target.value,
                            })
                        }
                        placeholder="PC, Switch, PS5"
                    />
                    {error && (
                        <div className="alert alert-danger py-2 mt-2 mb-0">
                            {error}
                        </div>
                    )}
                    <div className="d-flex gap-2 mt-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={isSaving || !editor.name.trim()}
                            onClick={saveVariable}
                        >
                            {isSaving ? 'Saving…' : 'Save variable'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditor(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {variables.length > 0 && (
                <ul className="list-group mb-3">
                    {variables.map((v) => (
                        <li
                            key={v.id}
                            className="list-group-item d-flex align-items-center gap-2"
                        >
                            <strong>{v.name}</strong>
                            <span className="badge bg-secondary">{v.role}</span>
                            <span className="text-muted small">
                                {v.values.map((bucket) => bucket[0]).join(', ')}
                            </span>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger ms-auto"
                                disabled={isSaving}
                                onClick={() => removeVariable(v)}
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <p className="text-muted small">
                Fine-tune which value combinations are valid later in Manage →
                Combinations.
            </p>
            <button
                type="button"
                className="btn btn-primary"
                onClick={onAdvance}
            >
                Continue
            </button>
        </section>
    );
}
