'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import type { StepProps } from '../types';

const STARTER_TEMPLATE = `Timing starts on [first input / cutscene end].
Timing ends on [final hit / last input].

- Video proof is [required / recommended] for all submissions.
- Allowed platforms and versions: [list them].
- No cheating, game modifications, or macros. Emulator: [allowed / banned].
`;

export function StepRules({ data, onAdvance }: StepProps) {
    const activeCategories = data.categories.filter((c) => c.active);
    const [rulesById, setRulesById] = useState<Record<number, string>>(
        Object.fromEntries(
            activeCategories.map((c) => [
                c.id,
                c.rules?.trim() ? c.rules : STARTER_TEMPLATE,
            ]),
        ),
    );
    const [savedIds, setSavedIds] = useState<Set<number>>(
        new Set(
            activeCategories
                .filter((c) => (c.rules ?? '').trim().length > 0)
                .map((c) => c.id),
        ),
    );
    const [selectedId, setSelectedId] = useState<number | null>(
        activeCategories[0]?.id ?? null,
    );
    const [isSaving, startSaving] = useTransition();

    if (activeCategories.length === 0) {
        return (
            <section>
                <h2 className="h4">Rules</h2>
                <p className="text-muted">
                    No active categories yet — set rules after choosing
                    categories.
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

    const selected = activeCategories.find((c) => c.id === selectedId);

    const saveOne = (categoryId: number, then?: () => void) => {
        startSaving(async () => {
            const res = await updateCategorySettingsAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId,
                rules: rulesById[categoryId] ?? '',
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setSavedIds((s) => new Set(s).add(categoryId));
            then?.();
        });
    };

    const copyToAll = () => {
        if (selectedId === null) return;
        const text = rulesById[selectedId];
        setRulesById((r) => {
            const next = { ...r };
            for (const c of activeCategories) next[c.id] = text;
            return next;
        });
        toast.info('Copied to all categories — save each to apply.');
    };

    const saveAllAndContinue = () => {
        startSaving(async () => {
            let failed = false;
            let skipped = 0;
            for (const c of activeCategories) {
                if (rulesById[c.id] === undefined) {
                    skipped += 1;
                    continue;
                }
                const isUntouchedTemplate =
                    rulesById[c.id] === STARTER_TEMPLATE &&
                    !(c.rules ?? '').trim();
                if (isUntouchedTemplate) {
                    skipped += 1;
                    continue;
                }
                const res = await updateCategorySettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: c.id,
                    rules: rulesById[c.id] ?? '',
                });
                if ('error' in res) {
                    toast.error(`${c.display}: ${res.error}`);
                    failed = true;
                } else {
                    setSavedIds((s) => new Set(s).add(c.id));
                }
            }
            if (!failed) {
                if (skipped > 0) {
                    toast.info(
                        `Skipped ${skipped} categor${skipped === 1 ? 'y' : 'ies'} still holding the unedited template — they'll show as "no rules" until you fill them in.`,
                    );
                }
                onAdvance();
            }
        });
    };

    return (
        <section>
            <h2 className="h4">Rules</h2>
            <p className="text-muted">
                Every category needs rules — we pre-filled a skeleton so you
                edit instead of writing from scratch. Replace the [bracketed]
                parts. Categories you leave untouched stay rule-less — the
                template is only saved once you edit it or save it yourself.
            </p>
            <div className="row g-3">
                <div className="col-md-4">
                    <div className="list-group">
                        {activeCategories.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                className={`list-group-item list-group-item-action d-flex justify-content-between ${
                                    c.id === selectedId ? 'active' : ''
                                }`}
                                onClick={() => setSelectedId(c.id)}
                            >
                                {c.display}
                                {savedIds.has(c.id) && <span>✓</span>}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="col-md-8">
                    {selected && (
                        <>
                            <textarea
                                className="form-control font-monospace"
                                rows={12}
                                value={rulesById[selected.id] ?? ''}
                                onChange={(e) =>
                                    setRulesById((r) => ({
                                        ...r,
                                        [selected.id]: e.target.value,
                                    }))
                                }
                            />
                            <div className="d-flex gap-2 mt-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    disabled={isSaving}
                                    onClick={() => saveOne(selected.id)}
                                >
                                    Save {selected.display}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={copyToAll}
                                >
                                    Copy these rules to all categories
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <button
                type="button"
                className="btn btn-primary mt-3"
                disabled={isSaving}
                onClick={saveAllAndContinue}
            >
                {isSaving ? 'Saving…' : 'Save all & continue'}
            </button>
        </section>
    );
}
