'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { BulkCategoryFields } from '~src/lib/category-mgmt';
import {
    type BoardDefaults,
    type DefaultFollowUp,
    planDefaultFollowUp,
} from '~src/lib/setup/board-defaults';
import { findGameMinPolicy } from '~src/lib/setup/game-minimum';
import { formatTimeInput, parseTimeInput } from '~src/lib/time-input';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../../types/moderation.types';
import { setBoardMinimumAction } from '../../actions/set-board-minimum.action';
import { updateGameMetadataAction } from '../../actions/update-game-metadata.action';
import styles from './matrix.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    defaults: BoardDefaults;
    policies: BoardPolicyRow[];
    columnCount: number;
    /** Featured categories, for the "apply to the rest?" offer. */
    categories: ResolvedCategory[];
    onApplyToCategories: (
        categoryIds: number[],
        fields: BulkCategoryFields,
    ) => void;
}

/** A default that just changed, and who could still follow it. */
interface Offer {
    label: string;
    fields: BulkCategoryFields;
    plan: DefaultFollowUp;
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
     * board in a coherent state rather than half-applied.
     */
    const offerFollowUp = <T,>(
        label: string,
        previousDefault: T | null,
        nextValue: T,
        readValue: (c: ResolvedCategory) => T,
        fields: BulkCategoryFields,
    ) => {
        const plan = planDefaultFollowUp(
            categories,
            previousDefault,
            nextValue,
            readValue,
        );
        if (plan.following.length + plan.handSet.length === 0) return;
        setOffer({ label, fields, plan });
    };

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
        });
    };

    const hasTemplate = (defaults.rulesTemplate ?? '').trim().length > 0;

    return (
        <>
            <tr className={styles.defaultsRow}>
                <td />
                <td className={styles.defaultsName}>Board default</td>

                <td>
                    <select
                        className={styles.defaultsControl}
                        value={defaults.primaryTiming ?? ''}
                        disabled={isSaving}
                        aria-label="Board default timing"
                        onChange={(e) => {
                            const next = e.target.value as 'rt' | 'gt';
                            save({ primaryTiming: next });
                            offerFollowUp(
                                next === 'gt' ? 'IGT' : 'RTA',
                                defaults.primaryTiming,
                                next,
                                (c) => c.primaryTiming,
                                {
                                    primaryTiming:
                                        next === 'gt' ? 'gametime' : 'realtime',
                                },
                            );
                        }}
                    >
                        {/* Only offered when the board has no default yet —
                            there is no write that clears primaryTiming, and
                            offering one that silently does nothing is worse
                            than not offering it. */}
                        {defaults.primaryTiming === null && (
                            <option value="">no default</option>
                        )}
                        <option value="rt">RTA</option>
                        <option value="gt">IGT</option>
                    </select>
                </td>

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
                        placeholder="none"
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
                        aria-expanded={openTemplate}
                        onClick={() => setOpenTemplate((v) => !v)}
                    >
                        {hasTemplate ? 'template' : 'none'}
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
                            // "no default" states nothing to follow, so there
                            // is nothing to offer.
                            if (next === null) return;
                            offerFollowUp(
                                next ? 'lowest first' : 'highest first',
                                defaults.sortAscending,
                                next,
                                (c) => c.sortAscending ?? true,
                                { sortAscending: next },
                            );
                        }}
                    >
                        <option value="">no default</option>
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
                            if (next === null) return;
                            offerFollowUp(
                                next ? 'milliseconds on' : 'milliseconds off',
                                defaults.showMilliseconds,
                                next,
                                (c) => c.showMilliseconds ?? true,
                                { showMilliseconds: next },
                            );
                        }}
                    >
                        <option value="">no default</option>
                        <option value="on">On</option>
                        <option value="off">Off</option>
                    </select>
                </td>

                <td />
                <td />
            </tr>

            {offer && (
                <tr className={styles.offerRow}>
                    <td colSpan={columnCount}>
                        <div className={styles.offer}>
                            <span className={styles.offerText}>
                                Board default is now <b>{offer.label}</b>.{' '}
                                {offer.plan.following.length > 0 && (
                                    <>
                                        {offer.plan.following.length}{' '}
                                        {offer.plan.following.length === 1
                                            ? 'category was'
                                            : 'categories were'}{' '}
                                        following the old default
                                        {offer.plan.handSet.length > 0 && (
                                            <>
                                                , {offer.plan.handSet.length}{' '}
                                                set by hand
                                            </>
                                        )}
                                        .
                                    </>
                                )}
                                {offer.plan.following.length === 0 && (
                                    <>
                                        {offer.plan.handSet.length}{' '}
                                        {offer.plan.handSet.length === 1
                                            ? 'category does'
                                            : 'categories do'}{' '}
                                        not match it.
                                    </>
                                )}
                            </span>

                            {/* The safe apply comes first: categories that
                                were tracking the board keep tracking it, and
                                the hand-set ones need a second, louder click. */}
                            {offer.plan.following.length > 0 && (
                                <button
                                    type="button"
                                    className={styles.offerPrimary}
                                    disabled={isSaving}
                                    onClick={() => {
                                        onApplyToCategories(
                                            offer.plan.following.map(
                                                (c) => c.id,
                                            ),
                                            offer.fields,
                                        );
                                        setOffer(null);
                                    }}
                                >
                                    Apply to those {offer.plan.following.length}
                                </button>
                            )}
                            <button
                                type="button"
                                className={styles.offerAction}
                                disabled={isSaving}
                                onClick={() => {
                                    onApplyToCategories(
                                        [
                                            ...offer.plan.following,
                                            ...offer.plan.handSet,
                                        ].map((c) => c.id),
                                        offer.fields,
                                    );
                                    setOffer(null);
                                }}
                            >
                                Apply to all{' '}
                                {offer.plan.following.length +
                                    offer.plan.handSet.length}
                            </button>
                            <button
                                type="button"
                                className={styles.offerAction}
                                onClick={() => setOffer(null)}
                            >
                                Not now
                            </button>
                        </div>
                    </td>
                </tr>
            )}

            {openTemplate && (
                <tr className={styles.rulesRow}>
                    <td colSpan={columnCount}>
                        <TemplateEditor
                            template={defaults.rulesTemplate ?? ''}
                            busy={isSaving}
                            onSave={(text) => {
                                save({ rulesTemplate: text || null });
                                setOpenTemplate(false);
                                if (!text) return;
                                offerFollowUp(
                                    'the new rules template',
                                    (defaults.rulesTemplate ?? '').trim(),
                                    text,
                                    // A category with no rules of its own is
                                    // following the board as surely as one
                                    // holding the old template verbatim.
                                    (c) =>
                                        (c.rules ?? '').trim() ||
                                        (defaults.rulesTemplate ?? '').trim(),
                                    { rules: text },
                                );
                            }}
                            onClose={() => setOpenTemplate(false)}
                        />
                    </td>
                </tr>
            )}
        </>
    );
}

/**
 * The board's starter rules text. Not the same thing as a category's rules:
 * this is what "default" means in the Rules column below, and what a category's
 * "Use board template" button fills in.
 */
function TemplateEditor({
    template,
    busy,
    onSave,
    onClose,
}: {
    template: string;
    busy: boolean;
    onSave: (text: string) => void;
    onClose: () => void;
}) {
    const [text, setText] = useState(template);

    return (
        <div className={styles.rowPanel}>
            <div className={styles.paneHead}>
                <span className={styles.paneTitle}>Board rules template</span>
                <span className={styles.paneNote}>
                    Starting text for categories with no rules of their own.
                </span>
                <button
                    type="button"
                    className={styles.paneClose}
                    onClick={onClose}
                    aria-label="Close rules template"
                >
                    ✕
                </button>
            </div>
            <div className={styles.rulesPanel}>
                <textarea
                    className={styles.rulesTextarea}
                    value={text}
                    disabled={busy}
                    aria-label="Board rules template"
                    placeholder="No template — every category writes its own rules."
                    onChange={(e) => setText(e.target.value)}
                />
                <div className={styles.rulesFoot}>
                    <span className={styles.rulesActions}>
                        <button
                            type="button"
                            className={styles.rulesChip}
                            disabled={busy || text === template}
                            onClick={() => onSave(text.trim())}
                        >
                            {busy ? 'Saving…' : 'Save'}
                        </button>
                    </span>
                </div>
            </div>
        </div>
    );
}
