'use client';

import { useId, useRef, useState } from 'react';
import { DurationField } from '~src/components/time-input/duration-field';
import type { GameMetadata } from '~src/lib/game-mgmt';
import {
    otherTiming,
    type TimingChoice,
    timingChoiceFields,
    timingChoiceOf,
    timingLabel,
} from '~src/lib/setup/board-defaults';
import { SegmentedControl, SwitchField } from '../../manage/shared/form-kit';
import { BoardDialog } from '../../shared/board-dialog';
import {
    createCategoryAction,
    updateCategorySettingsAction,
} from '../actions/create-category.action';
import styles from './create-category-dialog.module.scss';

/** A category's settings as this form reads and writes them. */
export interface CategorySettings {
    id: number;
    display: string;
    primaryTiming: 'rt' | 'gt';
    gameTimeLabel: 'igt' | 'lrt';
    hideRealTime: boolean;
    hideGameTime: boolean;
    rtaFallback: boolean;
    showMilliseconds: boolean;
    /** The category's own minimum; null = none, the board's applies. */
    minMs: number | null;
    rules: string;
}

export interface CreatedCategory extends CategorySettings {}

interface Props {
    open: boolean;
    onClose: () => void;
    game: { id: number; name: string };
    /** Board defaults the form starts from. Null = the categories' own column
     *  defaults (RTA, both clocks shown, milliseconds on). */
    metadata: GameMetadata | null;
    /** Every category the game has, archived and level boards included — the
     *  backend keys categories by name, so any of them collides. */
    existingNames: string[];
    onCreated?: (category: CreatedCategory, warning?: string) => void;
    /** Set to edit this category instead of creating one. The name is fixed. */
    category?: CategorySettings;
    onUpdated?: (category: CategorySettings, warning?: string) => void;
    /** See `invalidate` on createCategoryAction. Defaults to true. */
    invalidate?: boolean;
}

interface FormState {
    display: string;
    timing: TimingChoice;
    showOther: boolean;
    rtaFallback: boolean;
    showMilliseconds: boolean;
    minMs: number | null;
    rules: string;
}

function initialState(
    metadata: GameMetadata | null,
    category?: CategorySettings,
): FormState {
    if (category) {
        const bothHidden = category.hideRealTime && category.hideGameTime;
        return {
            display: category.display,
            timing: timingChoiceOf(
                category.primaryTiming,
                category.gameTimeLabel,
            ),
            showOther:
                bothHidden ||
                (category.primaryTiming === 'gt'
                    ? !category.hideRealTime
                    : !category.hideGameTime),
            rtaFallback: category.rtaFallback,
            showMilliseconds: category.showMilliseconds,
            minMs: category.minMs,
            rules: category.rules,
        };
    }
    const primary = metadata?.primaryTiming ?? 'rt';
    const hideRealTime = metadata?.hideRealTime ?? false;
    const hideGameTime = metadata?.hideGameTime ?? false;
    // Both-hidden is invalid; legacy metadata can still carry it.
    const bothHidden = hideRealTime && hideGameTime;
    return {
        display: '',
        timing: timingChoiceOf(primary, metadata?.gameTimeLabel ?? 'igt'),
        showOther:
            bothHidden || (primary === 'gt' ? !hideRealTime : !hideGameTime),
        rtaFallback: false,
        showMilliseconds: metadata?.showMilliseconds ?? true,
        minMs: null,
        rules: '',
    };
}

/** The backend's category identity: lowercased, whitespace stripped. */
function nameKey(name: string): string {
    return name.toLowerCase().replace(/\s/g, '');
}

/**
 * A new category, straight onto the board.
 *
 * Everything else that puts a category on the board picks from what runners
 * have already submitted to, which leaves a board that is still being set up,
 * or a category nobody has run yet, with no way in. The form carries the same
 * settings the Category settings table does, so the category lands finished
 * rather than needing a second trip.
 */
export function CreateCategoryDialog({
    open,
    onClose,
    game,
    metadata,
    existingNames,
    onCreated,
    category,
    onUpdated,
    invalidate = true,
}: Props) {
    const editing = category !== undefined;
    const [form, setForm] = useState<FormState>(() =>
        initialState(metadata, category),
    );
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const ids = useId();

    // This instance is reused across opens, so leaving it by any route clears
    // what was typed.
    const close = () => {
        setForm(initialState(metadata, category));
        setError(null);
        onClose();
    };

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const primary: 'rt' | 'gt' = form.timing === 'rt' ? 'rt' : 'gt';
    // Editing to RTA keeps the stored label, the same as the board-wide
    // control: the secondary clock goes on being called what it was.
    const gameTimeLabel =
        form.timing === 'rt' && category
            ? category.gameTimeLabel
            : form.timing === 'lrt'
              ? 'lrt'
              : 'igt';
    const otherLabel = timingLabel(otherTiming(primary), gameTimeLabel);

    const trimmed = form.display.trim();
    const taken = editing ? null : takenName(trimmed, existingNames);

    const saved = (id: number): CategorySettings => ({
        id,
        display: trimmed,
        primaryTiming: primary,
        gameTimeLabel,
        hideRealTime: primary === 'gt' && !form.showOther,
        hideGameTime: primary === 'rt' && !form.showOther,
        rtaFallback: primary === 'gt' && form.rtaFallback,
        showMilliseconds: form.showMilliseconds,
        minMs: form.minMs,
        rules: form.rules,
    });

    const update = async (current: CategorySettings) => {
        setError(null);
        setPending(true);
        const next = saved(current.id);
        const res = await updateCategorySettingsAction({
            gameSlug: game.name,
            gameId: game.id,
            categoryId: current.id,
            primaryTiming: next.primaryTiming,
            gameTimeLabel: next.gameTimeLabel,
            hideRealTime: next.hideRealTime,
            hideGameTime: next.hideGameTime,
            rtaFallback: next.rtaFallback,
            showMilliseconds: next.showMilliseconds,
            rules: next.rules,
            // A minimum is bound to one clock, so a clock change rewrites it
            // even when the number stayed the same.
            minMs:
                next.minMs !== current.minMs ||
                next.primaryTiming !== current.primaryTiming
                    ? next.minMs
                    : undefined,
            invalidate,
        });
        setPending(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        onUpdated?.(next, res.warning);
        onClose();
    };

    const submit = async () => {
        if (pending) return;
        if (category) {
            await update(category);
            return;
        }
        if (!trimmed) {
            setError('Name the category.');
            nameRef.current?.focus();
            return;
        }
        if (taken) {
            setError(`This game already has a category called “${taken}”.`);
            nameRef.current?.focus();
            return;
        }
        setError(null);
        setPending(true);

        const fields = timingChoiceFields(form.timing);
        const res = await createCategoryAction({
            gameSlug: game.name,
            gameId: game.id,
            display: trimmed,
            primaryTiming: fields.primaryTiming,
            gameTimeLabel,
            hideRealTime: primary === 'gt' && !form.showOther,
            hideGameTime: primary === 'rt' && !form.showOther,
            rtaFallback: primary === 'gt' && form.rtaFallback,
            rules: form.rules,
            showMilliseconds: form.showMilliseconds,
            minMs: form.minMs,
            invalidate,
        });
        setPending(false);

        if ('error' in res) {
            setError(res.error);
            return;
        }
        onCreated?.(saved(res.result.id), res.warning);
        close();
    };

    return (
        <BoardDialog
            open={open}
            onClose={() => {
                if (!pending) close();
            }}
            labelledBy={`${ids}-title`}
            size="lg"
            initialFocusRef={editing ? undefined : nameRef}
            closeOnBackdropClick={!pending}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                }}
            >
                <div className={styles.header}>
                    <h5 className={styles.title} id={`${ids}-title`}>
                        {editing ? category.display : 'New category'}
                    </h5>
                </div>
                <div className={styles.body}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor={`${ids}-name`}>
                            Name
                        </label>
                        <input
                            ref={nameRef}
                            id={`${ids}-name`}
                            type="text"
                            className={`form-control form-control-sm ${styles.input}`}
                            placeholder="e.g. Any%"
                            maxLength={200}
                            value={form.display}
                            disabled={pending || editing}
                            onChange={(e) => {
                                set('display', e.target.value);
                                setError(null);
                            }}
                        />
                    </div>

                    <SegmentedControl
                        label="Timing"
                        value={form.timing}
                        options={[
                            { value: 'rt', label: 'RTA' },
                            { value: 'gt', label: 'IGT' },
                            { value: 'lrt', label: 'LRT' },
                        ]}
                        disabled={pending}
                        onChange={(v) => set('timing', v as TimingChoice)}
                    />

                    <SwitchField
                        id={`${ids}-other`}
                        label={`Show ${otherLabel}`}
                        checked={form.showOther}
                        disabled={pending}
                        onChange={(checked) => set('showOther', checked)}
                    />
                    {primary === 'gt' && (
                        <SwitchField
                            id={`${ids}-fallback`}
                            label="Accept RTA as fallback"
                            hint={`Runs with no ${timingLabel('gt', gameTimeLabel)} rank by their RTA.`}
                            checked={form.rtaFallback}
                            disabled={pending}
                            onChange={(checked) => set('rtaFallback', checked)}
                        />
                    )}
                    <SwitchField
                        id={`${ids}-ms`}
                        label="Show milliseconds"
                        checked={form.showMilliseconds}
                        disabled={pending}
                        onChange={(checked) => set('showMilliseconds', checked)}
                    />

                    <div className={styles.field}>
                        <DurationField
                            size="sm"
                            label="Min. time"
                            value={form.minMs}
                            onChange={(ms) => set('minMs', ms)}
                            placeholder="None"
                            disabled={pending}
                        />
                    </div>

                    <div className={styles.field}>
                        <label
                            className={styles.label}
                            htmlFor={`${ids}-rules`}
                        >
                            Rules
                        </label>
                        <textarea
                            id={`${ids}-rules`}
                            className={styles.textarea}
                            rows={5}
                            placeholder="No rules set for this category."
                            value={form.rules}
                            disabled={pending}
                            onChange={(e) => set('rules', e.target.value)}
                        />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}
                </div>
                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.cancel}
                        onClick={close}
                        disabled={pending}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={styles.primary}
                        disabled={pending || !trimmed}
                    >
                        {editing
                            ? pending
                                ? 'Saving…'
                                : 'Save'
                            : pending
                              ? 'Creating…'
                              : 'Create category'}
                    </button>
                </div>
            </form>
        </BoardDialog>
    );
}

/** The existing category a name collides with, if any. */
function takenName(name: string, existing: string[]): string | null {
    if (!name) return null;
    const key = nameKey(name);
    return existing.find((n) => nameKey(n) === key) ?? null;
}
