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
import { createCategoryAction } from '../actions/create-category.action';
import styles from './create-category-dialog.module.scss';

export interface CreatedCategory {
    id: number;
    display: string;
    primaryTiming: 'realtime' | 'gametime';
}

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
    onCreated: (category: CreatedCategory, warning?: string) => void;
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

function initialState(metadata: GameMetadata | null): FormState {
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
    invalidate = true,
}: Props) {
    const [form, setForm] = useState<FormState>(() => initialState(metadata));
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const ids = useId();

    // This instance is reused across opens, so leaving it by any route clears
    // what was typed.
    const close = () => {
        setForm(initialState(metadata));
        setError(null);
        onClose();
    };

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const primary: 'rt' | 'gt' = form.timing === 'rt' ? 'rt' : 'gt';
    const gameTimeLabel = form.timing === 'lrt' ? 'lrt' : 'igt';
    const otherLabel = timingLabel(otherTiming(primary), gameTimeLabel);

    const trimmed = form.display.trim();
    const taken = takenName(trimmed, existingNames);

    const submit = async () => {
        if (pending) return;
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
        onCreated(
            {
                id: res.result.id,
                display: trimmed,
                primaryTiming: fields.primaryTiming,
            },
            res.warning,
        );
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
            initialFocusRef={nameRef}
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
                        New category
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
                            disabled={pending}
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
                        {pending ? 'Creating…' : 'Create category'}
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
