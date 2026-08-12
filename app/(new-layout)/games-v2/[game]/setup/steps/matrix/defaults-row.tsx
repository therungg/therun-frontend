'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { BulkCategoryFields } from '~src/lib/category-mgmt';
import {
    type BoardDefaults,
    categoriesNotOn,
    categoryMinMs,
    otherTimeField,
    otherTiming,
    type TimingChoice,
    timingChoiceFields,
    timingChoiceOf,
    timingLabel,
} from '~src/lib/setup/board-defaults';
import { findGameMinPolicy } from '~src/lib/setup/game-minimum';
import { formatTimeInput, parseTimeInput } from '~src/lib/time-input';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../../types/moderation.types';
import { setBoardMinimumAction } from '../../actions/set-board-minimum.action';
import { setCategoryMinimumAction } from '../../actions/set-category-minimum.action';
import { updateGameMetadataAction } from '../../actions/update-game-metadata.action';
import styles from './matrix.module.scss';
import { RulesDialog } from './rules-dialog';

interface Props {
    gameSlug: string;
    gameId: number;
    defaults: BoardDefaults;
    policies: BoardPolicyRow[];
    columnCount: number;
    /**
     * Whether the matrix is drawing its two RTA columns. They only exist on a
     * board with a game-time category, and row zero has to match the header it
     * sits under.
     */
    showsRtaColumns: boolean;
    /** Featured categories, for the "apply to the rest?" offer. */
    categories: ResolvedCategory[];
    onApplyToCategories: (
        categoryIds: number[],
        fields: BulkCategoryFields,
    ) => void;
}

/** A default that just changed, and the categories it has not reached. */
interface Offer {
    label: string;
    categories: ResolvedCategory[];
    /** How to bring them along — a category write, or N policy writes. */
    apply: (categories: ResolvedCategory[]) => void;
}

/**
 * The board defaults, as row zero of the matrix rather than a caption above it.
 *
 * Every cell below renders as a deviation *from these values*, so they belong
 * in the same columns as the thing they are compared against — a separate
 * strip made the reader hold "RTA · min 10:00 · lowest wins" in their head and
 * map it onto a grid by hand. Here the comparison is vertical and free.
 *
 * They are also editable here. They used to be read-only with a link back to
 * step 1, which meant discovering a wrong default in step 4 cost a round trip
 * and a lost place in the list. Step 1 still owns them; this is the same
 * values, reachable from where their consequences are visible.
 *
 * Changing a default does NOT rewrite existing categories — board defaults are
 * a stamp source, not an inheritance tier (see board-defaults.ts). What changes
 * is which cells below read as deviations.
 */
export function DefaultsRow({
    gameSlug,
    gameId,
    defaults,
    policies,
    columnCount,
    showsRtaColumns,
    categories,
    onApplyToCategories,
}: Props) {
    const router = useRouter();
    const [isSaving, startSave] = useTransition();
    const [openTemplate, setOpenTemplate] = useState(false);
    const [offer, setOffer] = useState<Offer | null>(null);

    /**
     * Raised after a default is written, never before: the offer is a
     * follow-up to something that already happened, so declining it leaves the
     * board in a coherent state rather than half-applied. Asked only when at
     * least one category is not already on the new value.
     *
     * Only timing, minimum and ranking ask. Milliseconds is cosmetic and the
     * rules template is a starting point rather than a value a category is
     * "on" — sweeping either across a board is not what a moderator means by
     * changing the default.
     */
    const offerFollowUp = <T,>(
        label: string,
        nextValue: T,
        readValue: (c: ResolvedCategory) => T,
        apply: (categories: ResolvedCategory[]) => void,
    ) => {
        const behind = categoriesNotOn(categories, nextValue, readValue);
        if (behind.length === 0) return;
        setOffer({ label, categories: behind, apply });
    };

    const applyFields =
        (fields: BulkCategoryFields) => (cs: ResolvedCategory[]) =>
            onApplyToCategories(
                cs.map((c) => c.id),
                fields,
            );

    type MetadataFields = Omit<
        Parameters<typeof updateGameMetadataAction>[0],
        'gameSlug' | 'gameId'
    >;

    const save = (fields: MetadataFields): void => {
        startSave(async () => {
            const res = await updateGameMetadataAction({
                ...fields,
                gameSlug,
                gameId,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            router.refresh();
        });
    };

    /**
     * The minimum's follow-up cannot ride `bulkUpdateCategoriesAction`: a
     * minimum is a min_time policy per category, not a category column, so
     * bringing categories along is N writes rather than one transaction. Only
     * categories carrying a *conflicting* minimum of their own are in the set
     * — one with none already follows the board.
     */
    const applyMinimum = (ms: number) => (cs: ResolvedCategory[]) => {
        startSave(async () => {
            for (const category of cs) {
                const res = await setCategoryMinimumAction({
                    gameSlug,
                    categoryId: category.id,
                    timing: category.primaryTiming,
                    minMs: ms,
                });
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
            }
            router.refresh();
        });
    };

    const saveMinimum = (raw: string) => {
        const trimmed = raw.trim();
        const ms = trimmed === '' ? null : parseTimeInput(trimmed);
        if (trimmed !== '' && ms === undefined) {
            toast.error('Time must be h:mm:ss, m:ss, or m:ss.SSS.');
            return;
        }
        startSave(async () => {
            const res = await setBoardMinimumAction({
                gameSlug,
                // A minimum is bound to one clock; with no stated board
                // default, real time is the reading, matching boardDefaults.
                timing: defaults.primaryTiming ?? 'rt',
                minMs: ms ?? null,
                policyId: findGameMinPolicy(policies)?.id ?? null,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            router.refresh();
            if (ms === null || ms === undefined) return;
            offerFollowUp(
                formatTimeInput(ms),
                ms,
                // A category with no minimum of its own already follows the
                // board, so it reads as already on the new value.
                (c) => categoryMinMs(c, policies) ?? ms,
                applyMinimum(ms),
            );
        });
    };

    const hasTemplate = (defaults.rulesTemplate ?? '').trim().length > 0;
    // The clock the board does not rank by — the only one there is a decision
    // about, since the ranking one can never be hidden.
    const otherLabel = timingLabel(
        otherTiming(defaults.primaryTiming ?? 'rt'),
        defaults.gameTimeLabel ?? 'igt',
    );

    return (
        <>
            <tr className={styles.defaultsRow}>
                {/* No icon here: a board-wide one would be the game cover,
                    which already exists. The per-category slot lives in the
                    name cell below. */}
                <td className={styles.defaultsName}>Board default</td>

                <td>
                    <select
                        className={styles.defaultsControl}
                        value={
                            defaults.primaryTiming === null
                                ? ''
                                : timingChoiceOf(
                                      defaults.primaryTiming,
                                      defaults.gameTimeLabel ?? 'igt',
                                  )
                        }
                        disabled={isSaving}
                        aria-label="Board default timing"
                        onChange={(e) => {
                            const next = e.target.value as TimingChoice;
                            save({
                                primaryTiming: next === 'rt' ? 'rt' : 'gt',
                                // RTA leaves the label alone — see
                                // timingChoiceFields.
                                ...(next === 'rt'
                                    ? {}
                                    : {
                                          gameTimeLabel:
                                              next === 'lrt' ? 'lrt' : 'igt',
                                      }),
                            });
                            offerFollowUp(
                                timingLabel(
                                    next === 'rt' ? 'rt' : 'gt',
                                    next === 'lrt' ? 'lrt' : 'igt',
                                ),
                                next,
                                (c) =>
                                    timingChoiceOf(
                                        c.primaryTiming,
                                        c.gameTimeLabel,
                                    ),
                                applyFields(timingChoiceFields(next)),
                            );
                        }}
                    >
                        {/* Only offered when the board has no default yet —
                            there is no write that clears primaryTiming, and
                            offering one that silently does nothing is worse
                            than not offering it. */}
                        {defaults.primaryTiming === null && (
                            <option value="">Not set</option>
                        )}
                        <option value="rt">RTA</option>
                        <option value="gt">IGT</option>
                        <option value="lrt">LRT</option>
                    </select>
                </td>

                {showsRtaColumns && (
                    <>
                        <td>
                            <select
                                className={styles.defaultsControl}
                                value={defaults.showOtherTime ? 'on' : 'off'}
                                disabled={isSaving}
                                aria-label={`Board default show ${otherLabel}`}
                                onChange={(e) =>
                                    save(
                                        otherTimeField(
                                            defaults.primaryTiming ?? 'rt',
                                            e.target.value === 'on',
                                        ),
                                    )
                                }
                            >
                                <option value="on">Show {otherLabel}</option>
                                <option value="off">Hide {otherLabel}</option>
                            </select>
                        </td>

                        {/* RTA fallback has no board-wide default on purpose: ranking
                    RTA against IGT is a per-category judgment call, so row
                    zero holds the same em dash as any other unset value. */}
                        <td title="No board default — set per category">—</td>
                    </>
                )}

                <td>
                    <input
                        type="text"
                        inputMode="numeric"
                        className={`${styles.defaultsControl} ${styles.minInput}`}
                        defaultValue={
                            defaults.minMs === null
                                ? ''
                                : formatTimeInput(defaults.minMs)
                        }
                        placeholder="Not set"
                        disabled={isSaving}
                        aria-label="Board default minimum time"
                        onBlur={(e) => {
                            const next = e.target.value.trim();
                            const current =
                                defaults.minMs === null
                                    ? ''
                                    : formatTimeInput(defaults.minMs);
                            if (next !== current) saveMinimum(next);
                        }}
                    />
                </td>

                <td>
                    <button
                        type="button"
                        className={`${styles.rulesChip} ${
                            hasTemplate
                                ? styles.rulesCustom
                                : styles.rulesDefault
                        }`}
                        aria-haspopup="dialog"
                        aria-label={`Board rules template — ${
                            hasTemplate ? 'set' : 'not set'
                        }`}
                        onClick={() => setOpenTemplate((v) => !v)}
                    >
                        {hasTemplate ? 'Template' : '—'}
                    </button>
                </td>

                <td>
                    <select
                        className={styles.defaultsControl}
                        value={
                            defaults.sortAscending === null
                                ? ''
                                : defaults.sortAscending
                                  ? 'asc'
                                  : 'desc'
                        }
                        disabled={isSaving}
                        aria-label="Board default ranking direction"
                        onChange={(e) => {
                            const next =
                                e.target.value === ''
                                    ? null
                                    : e.target.value === 'asc';
                            save({ sortAscending: next });
                            // "Not set" states nothing to follow, so there
                            // is nothing to offer.
                            if (next === null) return;
                            offerFollowUp(
                                next ? 'lowest first' : 'highest first',
                                next,
                                (c) => c.sortAscending ?? true,
                                applyFields({ sortAscending: next }),
                            );
                        }}
                    >
                        <option value="">Not set</option>
                        <option value="asc">Lowest</option>
                        <option value="desc">Highest</option>
                    </select>
                </td>

                <td>
                    <select
                        className={styles.defaultsControl}
                        value={
                            defaults.showMilliseconds === null
                                ? ''
                                : defaults.showMilliseconds
                                  ? 'on'
                                  : 'off'
                        }
                        disabled={isSaving}
                        aria-label="Board default milliseconds"
                        onChange={(e) => {
                            const next =
                                e.target.value === ''
                                    ? null
                                    : e.target.value === 'on';
                            save({ showMilliseconds: next });
                        }}
                    >
                        <option value="">Not set</option>
                        <option value="on">On</option>
                        <option value="off">Off</option>
                    </select>
                </td>
            </tr>

            {offer && (
                <tr className={styles.offerRow}>
                    <td colSpan={columnCount}>
                        <div className={styles.offer}>
                            <span className={styles.offerText}>
                                Board default is now <b>{offer.label}</b>.{' '}
                                {offer.categories.length}{' '}
                                {offer.categories.length === 1
                                    ? 'category does'
                                    : 'categories do'}{' '}
                                not use it. Apply it to{' '}
                                {offer.categories.length === 1 ? 'it' : 'them'}{' '}
                                too?
                            </span>

                            <button
                                type="button"
                                className={styles.offerPrimary}
                                disabled={isSaving}
                                onClick={() => {
                                    offer.apply(offer.categories);
                                    setOffer(null);
                                }}
                            >
                                Apply to all {offer.categories.length}
                            </button>
                            <button
                                type="button"
                                className={styles.offerAction}
                                onClick={() => setOffer(null)}
                            >
                                Don&rsquo;t change
                            </button>
                        </div>
                    </td>
                </tr>
            )}

            {openTemplate && (
                <tr>
                    <td colSpan={columnCount}>
                        <RulesDialog
                            title="Board rules template"
                            lede="Starting text for categories with no rules of their own. Changing it does not rewrite the ones already using it."
                            initial={defaults.rulesTemplate ?? ''}
                            busy={isSaving}
                            placeholder="No template. Every category writes its own rules."
                            onClose={() => setOpenTemplate(false)}
                            onSave={(text) => {
                                save({ rulesTemplate: text || null });
                                setOpenTemplate(false);
                            }}
                        />
                    </td>
                </tr>
            )}
        </>
    );
}
