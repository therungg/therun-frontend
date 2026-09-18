'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import {
    type CopyChoices,
    type CopyStep,
    eligibleCopySources,
    planCategoryCopy,
} from '~src/lib/setup/copy-category';
import { normalizeVariableName } from '~src/lib/variables/keys';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import { usePopoverFocus } from '../../shared/use-popover-focus';
import { updateCategorySettingsAction } from '../category-tab/actions/update-category-settings.action';
import {
    createPolicyAction,
    updatePolicyAction,
} from '../moderation/policies/actions/policies-actions.action';
import { updateTimingSettingsAction } from '../timing/actions/update-timing-settings.action';
import { createVariableAction } from '../variables/actions/create-variable.action';
import { loadCombinationsAction } from '../variables/actions/load-combinations.action';
import { saveCombinationsAction } from '../variables/actions/save-combinations.action';
import { updateVariableAction } from '../variables/actions/update-variable.action';
import styles from './copy-from-control.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    target: ResolvedCategory;
    categories: ResolvedCategory[];
    variables: VariableRow[];
    policies: BoardPolicyRow[];
}

const ALL_CHOICES: CopyChoices = {
    rules: true,
    timing: true,
    minimum: true,
    variables: true,
};

function stepLabel(step: CopyStep): string {
    switch (step.kind) {
        case 'rules':
            return CONCEPT_LABEL.rules;
        case 'timing':
            return CONCEPT_LABEL.timing;
        case 'minimum':
            return CONCEPT_LABEL.standards;
        case 'variable':
            return `Variable “${step.body.name}”`;
        case 'combinations':
            return CONCEPT_LABEL.combinations;
    }
}

export function CopyFromControl({
    gameSlug,
    gameId,
    target,
    categories,
    variables,
    policies,
}: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const sources = useMemo(
        () => eligibleCopySources(categories, target),
        [categories, target],
    );

    const [sourceId, setSourceId] = useState<number | ''>(sources[0]?.id ?? '');
    const [choices, setChoices] = useState<CopyChoices>(ALL_CHOICES);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [appliedLabels, setAppliedLabels] = useState<string[]>([]);

    const close = () => {
        setOpen(false);
        setError(null);
        setAppliedLabels([]);
    };

    usePopoverFocus({ open, onClose: close, panelRef });

    // Outside-click closes too; Escape and Tab-trap come from usePopoverFocus.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const source = sources.find((c) => c.id === sourceId) ?? null;

    const plan = useMemo(
        () =>
            source
                ? planCategoryCopy({
                      source,
                      target,
                      choices,
                      variables,
                      policies,
                  })
                : null,
        [source, target, choices, variables, policies],
    );

    const toggle = (key: keyof CopyChoices) => {
        setChoices((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    async function execStep(
        step: CopyStep,
    ): Promise<{ ok: true } | { error: string }> {
        switch (step.kind) {
            case 'rules': {
                const res = await updateCategorySettingsAction({
                    gameSlug,
                    gameId,
                    categoryId: target.id,
                    rules: step.rules,
                });
                return 'error' in res ? { error: res.error } : { ok: true };
            }
            case 'timing': {
                const res = await updateTimingSettingsAction({
                    gameSlug,
                    gameId,
                    categoryId: target.id,
                    primaryTiming: step.primaryTiming,
                    gameTimeLabel: step.gameTimeLabel,
                    hideRealTime: step.hideRealTime,
                    hideGameTime: step.hideGameTime,
                });
                return 'error' in res ? { error: res.error } : { ok: true };
            }
            case 'minimum': {
                const res =
                    step.targetPolicyId != null
                        ? await updatePolicyAction(
                              gameSlug,
                              step.targetPolicyId,
                              step.value,
                          )
                        : await createPolicyAction(gameSlug, {
                              policyType: 'min_time',
                              value: step.value,
                              categoryId: target.id,
                          });
                return 'error' in res ? { error: res.error } : { ok: true };
            }
            case 'variable': {
                const normalized = normalizeVariableName(step.body.name);
                const existing = variables.find(
                    (v) =>
                        v.categoryId === target.id &&
                        v.nameNormalized === normalized,
                );
                const res = existing
                    ? await updateVariableAction({
                          gameSlug,
                          gameId,
                          body: step.body,
                      })
                    : await createVariableAction({
                          gameSlug,
                          gameId,
                          body: step.body,
                      });
                return 'error' in res ? { error: res.error } : { ok: true };
            }
            case 'combinations': {
                const loaded = await loadCombinationsAction({
                    gameSlug,
                    gameId,
                    categoryId: step.sourceCategoryId,
                });
                if ('error' in loaded) return { error: loaded.error };
                const keys = loaded.result.combinations
                    .filter((c) => c.valid)
                    .map((c) => c.subcategoryKey);
                const saved = await saveCombinationsAction({
                    gameSlug,
                    gameId,
                    categoryId: target.id,
                    subcategoryKeys: keys,
                });
                return 'error' in saved ? { error: saved.error } : { ok: true };
            }
        }
    }

    const handleApply = async () => {
        if (!source || !plan || plan.steps.length === 0) return;
        setApplying(true);
        setError(null);
        const applied: string[] = [];
        for (const step of plan.steps) {
            const res = await execStep(step);
            if ('error' in res) {
                setError(res.error);
                setAppliedLabels(applied);
                setApplying(false);
                return;
            }
            applied.push(stepLabel(step));
        }
        setApplying(false);
        setOpen(false);
        setAppliedLabels([]);
        // Dedupe repeated "Variable “…”" labels down to one summary entry so
        // the toast reads as sections copied, not a per-variable list.
        const summary = Array.from(
            new Set(
                applied.map((label) =>
                    label.startsWith('Variable ') ? 'Variables' : label,
                ),
            ),
        );
        toast.success(`Copied from ${source.display}: ${summary.join(', ')}`);
        router.refresh();
    };

    if (sources.length === 0) return null;

    return (
        <div className={styles.root} ref={rootRef}>
            <button
                type="button"
                className={styles.trigger}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                Copy from…
            </button>
            {open && (
                <div
                    ref={panelRef}
                    className={styles.panel}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Copy from another category"
                >
                    <label className={styles.field} htmlFor="copy-from-source">
                        Source category
                    </label>
                    <select
                        id="copy-from-source"
                        className="form-select form-select-sm mb-2"
                        value={sourceId}
                        onChange={(e) => setSourceId(Number(e.target.value))}
                        disabled={applying}
                    >
                        {sources.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.display}
                            </option>
                        ))}
                    </select>

                    <div className={styles.checks}>
                        <label>
                            <input
                                type="checkbox"
                                checked={choices.rules}
                                onChange={() => toggle('rules')}
                                disabled={applying}
                            />{' '}
                            {CONCEPT_LABEL.rules}
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={choices.timing}
                                onChange={() => toggle('timing')}
                                disabled={applying}
                            />{' '}
                            {CONCEPT_LABEL.timing}
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={choices.minimum}
                                onChange={() => toggle('minimum')}
                                disabled={applying}
                            />{' '}
                            {CONCEPT_LABEL.standards}
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={choices.variables}
                                onChange={() => toggle('variables')}
                                disabled={applying}
                            />{' '}
                            {CONCEPT_LABEL.variables}
                        </label>
                    </div>

                    {plan && plan.overwrites.length > 0 && (
                        <p className={styles.warning}>
                            Replaces: {plan.overwrites.join(' · ')}
                        </p>
                    )}

                    {error && (
                        <div className="alert alert-danger py-2 mt-2 mb-0">
                            {error}
                            {appliedLabels.length > 0 && (
                                <div className="small mt-1">
                                    Already applied: {appliedLabels.join(', ')}
                                </div>
                            )}
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.confirm}
                            onClick={handleApply}
                            disabled={
                                applying || !plan || plan.steps.length === 0
                            }
                        >
                            {applying ? 'Applying…' : 'Apply'}
                        </button>
                        <button
                            type="button"
                            className={styles.cancel}
                            onClick={close}
                            disabled={applying}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
