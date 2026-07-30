'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
    ArrowDownUp,
    BookmarkStarFill,
    EyeFill,
    Rulers,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import {
    findCategoryMinPolicy,
    findGameMinPolicy,
    minMsFromPolicy,
    minValueForTiming,
} from '~src/lib/setup/game-minimum';
import type { EffectiveVariable } from '~src/lib/variables/effective';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import { usePopoverFocus } from '../../shared/use-popover-focus';
import { updateCategorySettingsAction } from '../category-tab/actions/update-category-settings.action';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
} from '../moderation/policies/actions/policies-actions.action';
import {
    msToTimeInput,
    parseTimeInput,
} from '../moderation/shared/time-format';
import { updateTimingSettingsAction } from '../timing/actions/update-timing-settings.action';
import { updateVariableAction } from '../variables/actions/update-variable.action';
import styles from './board-curation.module.scss';
import { defaultCanonicalOf, variableUpsertBody } from './subcategory-bands';

export interface BoardControlsProps {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory;
    timing: 'rt' | 'gt';
    policies: BoardPolicyRow[];
    subcatVars: EffectiveVariable[];
    selectedValues: Record<string, string>;
    reorderMode: boolean;
    onToggleReorderMode: () => void;
    reload: () => void;
}

/**
 * The board's right-aligned control toolbar (Task 12): a category-scoped
 * minimum, the reorder-mode toggle (the actual nudge controls it exposes
 * live inline on the category tabs/group headers in `BoardCuration` and on
 * the subcategory bands in `SubcategoryBands` — this component only owns
 * the on/off switch), "set as default view", and the display popover.
 * Quiet by design — icon+label control-pills, matching the leaderboard's own
 * restrained control language rather than an admin toolbar bolted on top.
 */
export function BoardControls({
    gameSlug,
    gameId,
    category,
    timing,
    policies,
    subcatVars,
    selectedValues,
    reorderMode,
    onToggleReorderMode,
    reload,
}: BoardControlsProps) {
    return (
        <div className={styles.controlsBar}>
            <MinimumControl
                gameSlug={gameSlug}
                category={category}
                timing={timing}
                policies={policies}
                reload={reload}
            />
            <button
                type="button"
                className={`${styles.toolbarBtn} ${reorderMode ? styles.toolbarBtnActive : ''}`}
                aria-pressed={reorderMode}
                onClick={onToggleReorderMode}
            >
                <ArrowDownUp size={13} aria-hidden />
                {reorderMode ? 'Done reordering' : 'Reorder'}
            </button>
            <SetDefaultViewButton
                gameSlug={gameSlug}
                gameId={gameId}
                subcatVars={subcatVars}
                selectedValues={selectedValues}
                reload={reload}
            />
            <DisplayControl
                gameSlug={gameSlug}
                gameId={gameId}
                category={category}
                reload={reload}
            />
        </div>
    );
}

// ---- Minimum -----------------------------------------------------------

interface MinimumControlProps {
    gameSlug: string;
    category: ResolvedCategory;
    timing: 'rt' | 'gt';
    policies: BoardPolicyRow[];
    reload: () => void;
}

/**
 * One timing-bound input, seeded from the category-scoped policy or (if
 * unset) the inherited game-wide floor. Saving only ever creates/updates/
 * deletes the category-scoped policy — the game-wide one is never touched
 * from here, so clearing this input un-overrides back to the inherited
 * floor rather than deleting it.
 */
function MinimumControl({
    gameSlug,
    category,
    timing,
    policies,
    reload,
}: MinimumControlProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const close = () => {
        if (isSaving) return;
        setOpen(false);
    };

    usePopoverFocus({ open, onClose: close, panelRef });

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, isSaving]);

    const openPopover = () => {
        const existing =
            findCategoryMinPolicy(policies, category.id) ??
            findGameMinPolicy(policies);
        setInput(msToTimeInput(minMsFromPolicy(existing, timing)));
        setError(null);
        setOpen(true);
    };

    const handleSave = () => {
        setError(null);
        const parsed = parseTimeInput(input);
        if (parsed != null && Number.isNaN(parsed)) {
            setError('Enter a valid time (h:mm:ss, m:ss, or m:ss.SSS).');
            return;
        }

        // Only a category-scoped policy is ever read/written/deleted here —
        // a game-wide floor (categoryId null) stays untouched even when it's
        // what the input was seeded from.
        const existing = findCategoryMinPolicy(policies, category.id);

        startSaving(async () => {
            if (parsed == null) {
                if (!existing) {
                    // Nothing category-scoped to clear — the input was only
                    // showing the inherited game-wide floor.
                    setOpen(false);
                    return;
                }
                const res = await deletePolicyAction(gameSlug, existing.id);
                if ('error' in res) {
                    setError(res.error);
                    return;
                }
                toast.success('Minimum cleared.');
                setOpen(false);
                reload();
                router.refresh();
                return;
            }

            const value = minValueForTiming(timing, parsed);
            const res = existing
                ? await updatePolicyAction(gameSlug, existing.id, value)
                : await createPolicyAction(gameSlug, {
                      policyType: 'min_time',
                      value,
                      categoryId: category.id,
                  });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success('Minimum saved.');
            setOpen(false);
            reload();
            router.refresh();
        });
    };

    return (
        <div className={styles.popoverRoot} ref={rootRef}>
            <button
                type="button"
                className={styles.toolbarBtn}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => (open ? close() : openPopover())}
            >
                <Rulers size={13} aria-hidden />
                Minimum
            </button>
            {open && (
                <div
                    ref={panelRef}
                    className={styles.popoverPanel}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Minimum time"
                >
                    <label
                        htmlFor="board-min-input"
                        className={styles.popoverFieldLabel}
                    >
                        Reject {timing === 'gt' ? 'game time' : 'real time'}{' '}
                        under
                    </label>
                    <input
                        id="board-min-input"
                        type="text"
                        className="form-control form-control-sm"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g. 0:30 (empty = no minimum)"
                        disabled={isSaving}
                    />
                    {error && (
                        <div className={styles.popoverError}>{error}</div>
                    )}
                    <div className={styles.popoverActions}>
                        <button
                            type="button"
                            className={styles.slipAction}
                            onClick={close}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.applyBtn}
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---- Set as default view -------------------------------------------------

interface SetDefaultViewButtonProps {
    gameSlug: string;
    gameId: number;
    subcatVars: EffectiveVariable[];
    selectedValues: Record<string, string>;
    reload: () => void;
}

function SetDefaultViewButton({
    gameSlug,
    gameId,
    subcatVars,
    selectedValues,
    reload,
}: SetDefaultViewButtonProps) {
    const router = useRouter();
    const [isSaving, startSaving] = useTransition();

    const handleClick = () => {
        if (subcatVars.length === 0) return;
        const comboLabel = subcatVars
            .map(
                (v) =>
                    selectedValues[v.nameNormalized] ?? defaultCanonicalOf(v),
            )
            .join(' · ');
        startSaving(async () => {
            for (const v of subcatVars) {
                const canonical =
                    selectedValues[v.nameNormalized] ?? defaultCanonicalOf(v);
                const idx = v.values.findIndex(
                    (bucket) => bucket[0] === canonical,
                );
                if (idx === -1 || idx === v.defaultValueIndex) continue;
                const res = await updateVariableAction({
                    gameSlug,
                    gameId,
                    body: variableUpsertBody(v, { defaultValueIndex: idx }),
                });
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
            }
            toast.success(`New default: ${comboLabel}`);
            reload();
            router.refresh();
        });
    };

    return (
        <button
            type="button"
            className={styles.toolbarBtn}
            onClick={handleClick}
            disabled={isSaving || subcatVars.length === 0}
            title={
                subcatVars.length === 0
                    ? 'No subcategory variables to set a default for.'
                    : undefined
            }
        >
            <BookmarkStarFill size={13} aria-hidden />
            {isSaving ? 'Saving…' : 'Set as default view'}
        </button>
    );
}

// ---- Display --------------------------------------------------------------

interface DisplayState {
    showMilliseconds: boolean;
    hideRealTime: boolean;
    hideGameTime: boolean;
    sortAscending: boolean;
}

function displayStateOf(category: ResolvedCategory): DisplayState {
    return {
        showMilliseconds: category.showMilliseconds ?? false,
        hideRealTime: category.hideRealTime ?? false,
        hideGameTime: category.hideGameTime ?? false,
        sortAscending: category.sortAscending ?? true,
    };
}

interface DisplayControlProps {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory;
    reload: () => void;
}

/**
 * Milliseconds / Show RTA / Show IGT / Lower is better, each applied
 * immediately on toggle (no separate Save) — settings edits, not a
 * confirm-and-undo flow. The RTA/IGT pair guards the same both-hidden case
 * `TimingSettingsSection` does, blocking with an inline note instead of
 * round-tripping to the server's own guard.
 */
function DisplayControl({
    gameSlug,
    gameId,
    category,
    reload,
}: DisplayControlProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<DisplayState>(() =>
        displayStateOf(category),
    );
    const [guardError, setGuardError] = useState<string | null>(null);
    const [busyField, setBusyField] = useState<keyof DisplayState | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setState(displayStateOf(category));
    }, [category]);

    const close = () => {
        if (busyField != null) return;
        setOpen(false);
    };

    usePopoverFocus({ open, onClose: close, panelRef });

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, busyField]);

    const busy = busyField != null;

    const handleMilliseconds = (checked: boolean) => {
        setBusyField('showMilliseconds');
        (async () => {
            const res = await updateCategorySettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                showMilliseconds: checked,
            });
            setBusyField(null);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setState((prev) => ({ ...prev, showMilliseconds: checked }));
            reload();
            router.refresh();
        })();
    };

    const handleSortAscending = (checked: boolean) => {
        setBusyField('sortAscending');
        (async () => {
            const res = await updateCategorySettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                sortAscending: checked,
            });
            setBusyField(null);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setState((prev) => ({ ...prev, sortAscending: checked }));
            reload();
            router.refresh();
        })();
    };

    const handleHideRealTime = (hide: boolean) => {
        if (hide && state.hideGameTime) {
            setGuardError('Cannot hide both real time and game time.');
            return;
        }
        setGuardError(null);
        setBusyField('hideRealTime');
        (async () => {
            const res = await updateTimingSettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                hideRealTime: hide,
            });
            setBusyField(null);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setState((prev) => ({ ...prev, hideRealTime: hide }));
            reload();
            router.refresh();
        })();
    };

    const handleHideGameTime = (hide: boolean) => {
        if (hide && state.hideRealTime) {
            setGuardError('Cannot hide both real time and game time.');
            return;
        }
        setGuardError(null);
        setBusyField('hideGameTime');
        (async () => {
            const res = await updateTimingSettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                hideGameTime: hide,
            });
            setBusyField(null);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setState((prev) => ({ ...prev, hideGameTime: hide }));
            reload();
            router.refresh();
        })();
    };

    return (
        <div className={styles.popoverRoot} ref={rootRef}>
            <button
                type="button"
                className={styles.toolbarBtn}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <EyeFill size={13} aria-hidden />
                Display
            </button>
            {open && (
                <div
                    ref={panelRef}
                    className={styles.popoverPanel}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Display settings"
                >
                    <label className={styles.popoverCheck}>
                        <input
                            type="checkbox"
                            checked={state.showMilliseconds}
                            onChange={(e) =>
                                handleMilliseconds(e.target.checked)
                            }
                            disabled={busy}
                        />
                        Milliseconds
                    </label>
                    <label className={styles.popoverCheck}>
                        <input
                            type="checkbox"
                            checked={!state.hideRealTime}
                            onChange={(e) =>
                                handleHideRealTime(!e.target.checked)
                            }
                            disabled={busy}
                        />
                        Show real time
                    </label>
                    <label className={styles.popoverCheck}>
                        <input
                            type="checkbox"
                            checked={!state.hideGameTime}
                            onChange={(e) =>
                                handleHideGameTime(!e.target.checked)
                            }
                            disabled={busy}
                        />
                        Show game time
                    </label>
                    <label className={styles.popoverCheck}>
                        <input
                            type="checkbox"
                            checked={state.sortAscending}
                            onChange={(e) =>
                                handleSortAscending(e.target.checked)
                            }
                            disabled={busy}
                        />
                        Lower is better
                    </label>
                    {guardError && (
                        <div className={styles.popoverError}>{guardError}</div>
                    )}
                </div>
            )}
        </div>
    );
}
