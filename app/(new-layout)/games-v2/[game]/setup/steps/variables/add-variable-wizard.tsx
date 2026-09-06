'use client';

import { useMemo, useState } from 'react';
import type { CategoryVariableSuggestion } from '~src/lib/leaderboard-variables';
import { SECTION, type VariableRoleId } from '~src/lib/variables/language';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import { normalizeName, RESERVED_NAMES } from './variable-keys';
import { VariableSuggestions } from './variable-suggestions';
import styles from './variables-grid.module.scss';

type StepId = 'suggestions' | 'name' | 'values' | 'default' | 'categories';

/** The steps that always run, in order. Suggestions is the optional prologue. */
const ASK_STEPS: StepId[] = ['name', 'values', 'default', 'categories'];

const STEP_TITLE: Record<StepId, string> = {
    suggestions: 'Start from what runners submit',
    name: 'Name',
    values: 'Values',
    default: 'Default value',
    categories: 'Where it applies',
};

/** One `label, alias, alias` line per value; blank lines ignored. */
function parseOptions(raw: string): string[][] {
    return raw
        .split('\n')
        .map((line) =>
            line
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean),
        )
        .filter((bucket) => bucket.length > 0);
}

interface Props {
    role: VariableRoleId;
    busy: boolean;
    takenNames: Set<string>;
    categories: ResolvedCategory[];
    /** Names seen in submitted runs — a manual add outside this set is a
     *  variable no run carries yet, which is worth saying out loud. */
    suggestedNames: Set<string>;
    suggestions: CategoryVariableSuggestion[];
    suggestionsLoading: boolean;
    suggestionsError: string | null;
    /** Every configured variable, so a suggestion can say it already exists. */
    existingVariables: VariableRow[];
    onCancel: () => void;
    onCreate: (
        name: string,
        key: string,
        options: string[][],
        defaultIndex: number,
        showValueOnBoard: boolean,
        categoryIds: number[],
    ) => void;
}

/**
 * Adding one, as its own screen and one question at a time.
 *
 * The old form asked everything at once, which reads as a wall on the first
 * one a moderator ever makes: a name, a key, a textarea whose comma grammar
 * has to be explained, a default, and a category list. Split into steps, each
 * screen asks one thing and can say what that thing is for.
 *
 * The prologue is the suggestions table — what runners actually submit, per
 * category. Picking one fills the rest in; "add your own" skips it. With
 * nothing to suggest the wizard opens on the first real question instead of
 * on an empty table.
 */
export function AddVariableWizard({
    role,
    busy,
    takenNames,
    categories,
    suggestedNames,
    suggestions,
    suggestionsLoading,
    suggestionsError,
    existingVariables,
    onCancel,
    onCreate,
}: Props) {
    const hasSuggestions = suggestions.length > 0 || suggestionsLoading;
    const [step, setStep] = useState<StepId>(
        hasSuggestions ? 'suggestions' : 'name',
    );

    const [name, setName] = useState('');
    // What runs are matched on. Follows the display name until edited — the
    // common case is that they are the same word.
    const [key, setKey] = useState('');
    const [keyTouched, setKeyTouched] = useState(false);
    const [raw, setRaw] = useState('');
    const [defaultLabel, setDefaultLabel] = useState('');
    // Filters only: create it already showing its value as a board column.
    const [showValueOnBoard, setShowValueOnBoard] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>(
        categories.map((c) => c.id),
    );

    const options = useMemo(() => parseOptions(raw), [raw]);
    const labels = options.map((o) => o[0]);
    const normalized = normalizeName((keyTouched ? key : name).trim());

    const nameError = (() => {
        if (!name.trim()) return null;
        if (RESERVED_NAMES.includes(normalized)) {
            return `"${normalized}" is reserved by the board's own filters. Pick another name.`;
        }
        if (takenNames.has(normalized)) {
            return `A variable keyed "${normalized}" already exists on this board.`;
        }
        return null;
    })();

    const stepIndex = ASK_STEPS.indexOf(step);
    const canContinue = (() => {
        switch (step) {
            case 'name':
                return name.trim().length > 0 && !nameError;
            case 'values':
                return options.length >= 2;
            case 'default':
                return defaultLabel.length > 0;
            case 'categories':
                return selectedIds.length > 0;
            default:
                return true;
        }
    })();

    const goNext = () => {
        const next = ASK_STEPS[stepIndex + 1];
        if (!next) return;
        // The default is one of the values, so it is chosen from them — and
        // the first one is the answer often enough to offer it.
        if (next === 'default' && !labels.includes(defaultLabel)) {
            setDefaultLabel(labels[0] ?? '');
        }
        setStep(next);
    };

    const goBack = () => {
        if (step === 'name') {
            if (hasSuggestions) setStep('suggestions');
            else onCancel();
            return;
        }
        const prev = ASK_STEPS[stepIndex - 1];
        if (prev) setStep(prev);
    };

    const create = () => {
        const defaultIndex = Math.max(0, labels.indexOf(defaultLabel));
        onCreate(
            name.trim(),
            normalized,
            options,
            defaultIndex,
            showValueOnBoard,
            selectedIds,
        );
    };

    const toggleCategory = (id: number) =>
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    const noun = role === 'subcategory' ? 'subcategory' : 'filter';

    return (
        <div className={styles.wizard}>
            <div className={styles.wizardHead}>
                <span className={styles.wizardStep}>
                    {step === 'suggestions'
                        ? 'Suggestions'
                        : `Step ${stepIndex + 1} of ${ASK_STEPS.length}`}
                </span>
                <h3 className={styles.wizardTitle}>{STEP_TITLE[step]}</h3>
            </div>

            {step === 'suggestions' && (
                <>
                    <VariableSuggestions
                        suggestions={suggestions}
                        loading={suggestionsLoading}
                        error={suggestionsError}
                        categories={categories}
                        existingVariables={existingVariables}
                        onAdd={(prefill) => {
                            setName(prefill.name);
                            setKey(normalizeName(prefill.name));
                            setKeyTouched(true);
                            setRaw(prefill.raw);
                            if (prefill.selectedIds.length > 0) {
                                setSelectedIds(prefill.selectedIds);
                            }
                            setStep('name');
                        }}
                    />
                    <div className={styles.wizardFoot}>
                        <button
                            type="button"
                            className={styles.wizardGhost}
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.wizardNext}
                            onClick={() => setStep('name')}
                        >
                            Add your own
                        </button>
                    </div>
                </>
            )}

            {step === 'name' && (
                <div className={styles.wizardBody}>
                    <label className={styles.wizardLabel} htmlFor="wiz-name">
                        What is it called?
                    </label>
                    <input
                        id="wiz-name"
                        className="form-control"
                        value={name}
                        placeholder={
                            role === 'subcategory' ? 'Platform' : 'Route'
                        }
                        onChange={(e) => {
                            setName(e.target.value);
                            if (!keyTouched) setKey(e.target.value);
                        }}
                    />
                    <p className={styles.wizardNote}>
                        Shown to runners above its values.
                    </p>

                    <label className={styles.wizardLabel} htmlFor="wiz-key">
                        What do runners call it in their splits?
                    </label>
                    <input
                        id="wiz-key"
                        className="form-control"
                        value={keyTouched ? key : name}
                        onChange={(e) => {
                            setKey(e.target.value);
                            setKeyTouched(true);
                        }}
                    />
                    <p className={styles.wizardNote}>
                        A run whose variable key matches this counts for this{' '}
                        {noun}. Stored as <code>{normalized || '—'}</code>,
                        which is also what the board puts in its URL.
                    </p>

                    {nameError && (
                        <p className={styles.wizardError}>{nameError}</p>
                    )}
                    {!nameError &&
                        name.trim().length > 0 &&
                        !suggestedNames.has(normalized) && (
                            <p className={styles.wizardNote}>
                                No submitted run carries this key yet, so every
                                run lands on the default value until one does.
                            </p>
                        )}
                </div>
            )}

            {step === 'values' && (
                <div className={styles.wizardBody}>
                    <label className={styles.wizardLabel} htmlFor="wiz-values">
                        Which values can it take?
                    </label>
                    <textarea
                        id="wiz-values"
                        className="form-control"
                        rows={6}
                        placeholder={'Nintendo 64, n64, nin64\nEmulator, emu'}
                        value={raw}
                        onChange={(e) => setRaw(e.target.value)}
                    />
                    <p className={styles.wizardNote}>
                        One value per line. Anything after a comma is another
                        spelling runners might submit for that same value — they
                        all count as the first one.
                    </p>
                    {options.length === 1 && (
                        <p className={styles.wizardNote}>
                            One value splits nothing. Add at least two.
                        </p>
                    )}
                    {options.length > 1 && (
                        <p className={styles.wizardNote}>
                            {options.length} values
                            {role === 'subcategory'
                                ? ` — every category this is added to becomes ${options.length} leaderboards.`
                                : '.'}
                        </p>
                    )}
                </div>
            )}

            {step === 'default' && (
                <div className={styles.wizardBody}>
                    <p className={styles.wizardNote}>
                        A run that doesn&apos;t say which {name.trim() || noun}{' '}
                        it is falls under this value — and it is the board
                        visitors land on.
                    </p>
                    <div className={styles.wizardChoices}>
                        {options.map((bucket) => (
                            <label
                                key={bucket[0]}
                                className={styles.wizardChoice}
                            >
                                <input
                                    type="radio"
                                    className="form-check-input me-2"
                                    name="wiz-default"
                                    checked={defaultLabel === bucket[0]}
                                    onChange={() => setDefaultLabel(bucket[0])}
                                />
                                {bucket[0]}
                                {bucket.length > 1 && (
                                    <span className={styles.wizardAliases}>
                                        also {bucket.slice(1).join(', ')}
                                    </span>
                                )}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {step === 'categories' && (
                <div className={styles.wizardBody}>
                    <p className={styles.wizardNote}>
                        Which categories carry this {noun}?
                    </p>
                    <div className={styles.wizardChoices}>
                        {categories.map((c) => (
                            <label key={c.id} className={styles.wizardChoice}>
                                <input
                                    type="checkbox"
                                    className="form-check-input me-2"
                                    checked={selectedIds.includes(c.id)}
                                    onChange={() => toggleCategory(c.id)}
                                />
                                {c.display}
                            </label>
                        ))}
                    </div>
                    {role === 'filter' && (
                        <label className={styles.wizardChoice}>
                            <input
                                type="checkbox"
                                className="form-check-input me-2"
                                checked={showValueOnBoard}
                                onChange={(e) =>
                                    setShowValueOnBoard(e.target.checked)
                                }
                            />
                            Show each runner&apos;s value as its own column
                        </label>
                    )}
                </div>
            )}

            {step !== 'suggestions' && (
                <div className={styles.wizardFoot}>
                    <button
                        type="button"
                        className={styles.wizardGhost}
                        disabled={busy}
                        onClick={goBack}
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        className={styles.wizardGhost}
                        disabled={busy}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    {step === 'categories' ? (
                        <button
                            type="button"
                            className={styles.wizardNext}
                            disabled={busy || !canContinue}
                            onClick={create}
                        >
                            {busy ? 'Adding…' : SECTION[role].add}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={styles.wizardNext}
                            disabled={busy || !canContinue}
                            onClick={goNext}
                        >
                            Continue
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
