'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
    ArrowDownUp,
    BookmarkStarFill,
    EyeFill,
    Rulers,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { DurationField } from '~src/components/time-input/duration-field';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import {
    findCategoryMinPolicy,
    findSubcategoryMinPolicy,
    minMsFromPolicy,
    minValueForTiming,
    resolveMinPolicy,
} from '~src/lib/setup/game-minimum';
import { buildSubcategoryKey } from '~src/lib/variables/keys';

import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import { usePopoverFocus } from '../../shared/use-popover-focus';
import { updateCategorySettingsAction } from '../category-tab/actions/update-category-settings.action';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
} from '../moderation/policies/actions/policies-actions.action';
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
    subcatVars: VariableRow[];
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
                subcatVars={subcatVars}
                selectedValues={selectedValues}
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
                timing={timing}
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
    subcatVars: VariableRow[];
    selectedValues: Record<string, string>;
    reload: () => void;
}

type MinimumScope = 'category' | 'subcategory';

/**
 * One timing-bound input, seeded from the scoped policy or (if unset) the
 * inherited floor one level up. Saving only ever creates/updates/deletes the
 * policy at the selected scope — anything broader stays untouched even when
 * it's what the input was seeded from, so clearing this input un-overrides
 * back to the inherited floor rather than deleting it.
 *
 * A scope toggle (category vs. this exact subcategory slice) appears only
 * when the current board has subcategory variables with values selected —
 * a category with no subcategory variables has nothing to scope to.
 */
function MinimumControl({
    gameSlug,
    category,
    timing,
    policies,
    subcatVars,
    selectedValues,
    reload,
}: MinimumControlProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [scope, setScope] = useState<MinimumScope>('category');
    const [minMs, setMinMs] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // The exact subcategory slice currently on screen, or null when the
    // category has no subcategory variables to slice by.
    const subcategoryKey = useMemo(() => {
        if (subcatVars.length === 0) return null;
        return buildSubcategoryKey(
            subcatVars.map((v) => ({
                name: v.nameNormalized,
                value:
                    selectedValues[v.nameNormalized] ?? defaultCanonicalOf(v),
            })),
        );
    }, [subcatVars, selectedValues]);

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
        // Default to the narrowest scope that actually has something set;
        // otherwise default to category (the pre-existing behavior).
        const initialScope: MinimumScope =
            subcategoryKey &&
            findSubcategoryMinPolicy(policies, category.id, subcategoryKey)
                ? 'subcategory'
                : 'category';
        setScope(initialScope);
        const existing =
            initialScope === 'subcategory' && subcategoryKey
                ? findSubcategoryMinPolicy(
                      policies,
                      category.id,
                      subcategoryKey,
                  )
                : resolveMinPolicy(policies, category.id, null);
        setMinMs(minMsFromPolicy(existing, timing));
        setError(null);
        setOpen(true);
    };

    // The policy this popover reads/writes/deletes at the currently chosen
    // scope — never anything broader, even when the input was seeded from
    // an inherited value.
    const existingAtScope =
        scope === 'subcategory' && subcategoryKey
            ? findSubcategoryMinPolicy(policies, category.id, subcategoryKey)
            : findCategoryMinPolicy(policies, category.id);

    // What actually governs this board slice right now, for the "currently
    // governed by" hint — falls back subcategory -> category -> game-wide.
    const effectivePolicy = resolveMinPolicy(
        policies,
        category.id,
        subcategoryKey,
    );
    const effectiveMs = minMsFromPolicy(effectivePolicy, timing);
    const effectiveScopeLabel =
        effectivePolicy?.subcategoryKey != null
            ? 'this subcategory'
            : effectivePolicy?.categoryId != null
              ? 'the whole category'
              : 'the whole game';

    const handleScopeChange = (next: MinimumScope) => {
        setScope(next);
        const existing =
            next === 'subcategory' && subcategoryKey
                ? findSubcategoryMinPolicy(
                      policies,
                      category.id,
                      subcategoryKey,
                  )
                : findCategoryMinPolicy(policies, category.id);
        setMinMs(minMsFromPolicy(existing, timing));
        setError(null);
    };

    const handleSave = () => {
        setError(null);
        const existing = existingAtScope;

        startSaving(async () => {
            if (minMs === null) {
                if (!existing) {
                    // Nothing set at this scope to clear — the input was
                    // only showing an inherited value.
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

            const value = minValueForTiming(timing, minMs);
            const res = existing
                ? await updatePolicyAction(gameSlug, existing.id, value)
                : await createPolicyAction(gameSlug, {
                      policyType: 'min_time',
                      value,
                      categoryId: category.id,
                      ...(scope === 'subcategory' && subcategoryKey
                          ? { subcategoryKey }
                          : {}),
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

    const canScopeToSubcategory = subcatVars.length > 0 && !!subcategoryKey;

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
                    {canScopeToSubcategory && (
                        <div role="radiogroup" aria-label="Minimum scope">
                            <label className={styles.popoverCheck}>
                                <input
                                    type="radio"
                                    name="min-scope"
                                    checked={scope === 'category'}
                                    onChange={() =>
                                        handleScopeChange('category')
                                    }
                                    disabled={isSaving}
                                />
                                Whole category
                            </label>
                            <label className={styles.popoverCheck}>
                                <input
                                    type="radio"
                                    name="min-scope"
                                    checked={scope === 'subcategory'}
                                    onChange={() =>
                                        handleScopeChange('subcategory')
                                    }
                                    disabled={isSaving}
                                />
                                This subcategory
                            </label>
                        </div>
                    )}
                    <label
                        htmlFor="board-min-input"
                        className={styles.popoverFieldLabel}
                    >
                        Reject {timing === 'gt' ? 'game time' : 'real time'}{' '}
                        under
                    </label>
                    <DurationField
                        id="board-min-input"
                        size="sm"
                        value={minMs}
                        onChange={setMinMs}
                        disabled={isSaving}
                    />
                    {effectiveMs !== null && (
                        <div className={styles.popoverHint}>
                            Currently governed by {effectiveScopeLabel}:{' '}
                            {formatTimeMs(effectiveMs)}
                        </div>
                    )}
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
    subcatVars: VariableRow[];
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
    /** The board's primary timing — that clock is always shown; the popover
     * only offers the secondary. */
    timing: 'rt' | 'gt';
    reload: () => void;
}

/**
 * Milliseconds / secondary-clock visibility / Lower is better, each applied
 * immediately on toggle (no separate Save) — settings edits, not a
 * confirm-and-undo flow. The primary clock is always shown, so only the
 * secondary gets a checkbox; the both-hidden case is unreachable from here
 * unless stored data already hides the primary, which the server guard
 * still catches.
 */
function DisplayControl({
    gameSlug,
    gameId,
    category,
    timing,
    reload,
}: DisplayControlProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<DisplayState>(() =>
        displayStateOf(category),
    );
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

    // Each toggle applies optimistically — a settings checkbox that sits
    // unchanged for the length of a server round-trip reads as a dead
    // click — and rolls back on error.
    const handleMilliseconds = (checked: boolean) => {
        setBusyField('showMilliseconds');
        setState((prev) => ({ ...prev, showMilliseconds: checked }));
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
                setState((prev) => ({ ...prev, showMilliseconds: !checked }));
                return;
            }
            reload();
            router.refresh();
        })();
    };

    const handleSortAscending = (checked: boolean) => {
        setBusyField('sortAscending');
        setState((prev) => ({ ...prev, sortAscending: checked }));
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
                setState((prev) => ({ ...prev, sortAscending: !checked }));
                return;
            }
            reload();
            router.refresh();
        })();
    };

    // Only the secondary clock's hide flag is ever written from here — the
    // primary is always shown, so its flag stays whatever it is (a legacy
    // hidden-primary row surfaces as the server's own both-hidden error).
    const secondaryField = timing === 'rt' ? 'hideGameTime' : 'hideRealTime';
    const handleShowSecondary = (show: boolean) => {
        setBusyField(secondaryField);
        setState((prev) => ({ ...prev, [secondaryField]: !show }));
        (async () => {
            const res = await updateTimingSettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                [secondaryField]: !show,
            });
            setBusyField(null);
            if ('error' in res) {
                toast.error(res.error);
                setState((prev) => ({ ...prev, [secondaryField]: show }));
                return;
            }
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
                            checked={!state[secondaryField]}
                            onChange={(e) =>
                                handleShowSecondary(e.target.checked)
                            }
                            disabled={busy}
                        />
                        Also show {timing === 'rt' ? 'game time' : 'real time'}
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
                </div>
            )}
        </div>
    );
}
