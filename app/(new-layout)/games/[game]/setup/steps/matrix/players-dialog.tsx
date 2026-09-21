'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    findCategoryPlayersPolicy,
    isDefaultPlayersRange,
    playersRangeError,
    playersValueFromPolicy,
} from '~src/lib/setup/game-minimum';
import type { PlayersRange } from '../../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../../types/moderation.types';
import { writePlayersPolicyAction } from '../../../manage/moderation/policies/actions/policies-actions.action';
import {
    DEFAULT_PLAYERS_DRAFT,
    describePlayersRange,
    InlineError,
    type PlayersRangeDraft,
    PlayersRangeFields,
    playersDraftValue,
    playersPreviewValue,
    samePlayersDraft,
} from '../../../manage/shared/form-kit';
import { PolicyPreview } from '../../../manage/shared/policy-preview';
import styles from './matrix.module.scss';

interface Props {
    gameSlug: string;
    categoryId: number;
    /** What the board is called in the dialog's own copy. */
    categoryDisplay: string;
    /** The matrix's policy snapshot — the same rows the cell reads. */
    policies: BoardPolicyRow[];
    /** Whether this category splits into several boards. A setting here is
     *  category-wide and reaches every one of them, which is worth saying
     *  only where there are several to reach. */
    hasSubcategories: boolean;
    /** Re-reads the category's policies, so the cell behind the dialog shows
     *  the new value the moment this one closes. */
    onSaved: () => Promise<void>;
    onClose: () => void;
}

/**
 * One category's runner count, in a modal.
 *
 * The same write the Standards editor makes — `writePlayersPolicyAction` at
 * the category scope, with the same validation and the same dry-run preview
 * before it — reached from the row instead of from a screen of its own. A
 * cell would have been two number inputs, a Save and a paragraph about what
 * comes off the board, which is not a cell.
 */
export function PlayersDialog({
    gameSlug,
    categoryId,
    categoryDisplay,
    policies,
    hasSubcategories,
    onSaved,
    onClose,
}: Props) {
    const stored = playersValueFromPolicy(
        findCategoryPlayersPolicy(policies, categoryId),
    );
    const original: PlayersRangeDraft = stored ?? DEFAULT_PLAYERS_DRAFT;
    const [draft, setDraft] = useState<PlayersRangeDraft>(original);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Escape closes, like every other dismissible surface on the board.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const dirty = !samePlayersDraft(draft, original);
    const rangeError = dirty ? playersRangeError(draft) : null;
    // A row IS stored and it carries the permissive default — the one state a
    // blank editor can't tell apart from "nothing configured", and the reason
    // this board still reads as co-op.
    const storedDefault = !!stored && !dirty && isDefaultPlayersRange(original);

    const write = (value: PlayersRange | null) => {
        setError(null);
        setSaving(true);
        void (async () => {
            const res = await writePlayersPolicyAction(
                gameSlug,
                categoryId,
                null,
                value,
            );
            if ('error' in res) {
                setError(res.error);
                setSaving(false);
                return;
            }
            // A no-op (the draft round-tripped to what is already stored, or
            // to "nothing" with nothing to clear) isn't a save — don't claim
            // one.
            if (res.changed) toast.success(`Saved for ${categoryDisplay}.`);
            await onSaved();
            setSaving(false);
            onClose();
        })();
    };

    return (
        // Backdrop dismissal is a convenience; Escape and Close are the
        // keyboard paths.
        <div className={styles.dialogBackdrop} onClick={onClose}>
            <div
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-label={`Runners credited on ${categoryDisplay}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.dialogHeader}>
                    <p className={styles.dialogTitle}>{categoryDisplay}</p>
                    <p className={styles.dialogLede}>
                        How many runners a run on this board can credit. Leave
                        it alone and the board stays single player — set a
                        minimum of 2, or a maximum, to mark it for co-op.
                    </p>
                </div>

                <div className={styles.dialogBody}>
                    <div className={styles.sliceSettings}>
                        <PlayersRangeFields
                            idPrefix={`matrix-players-${categoryId}`}
                            value={draft}
                            onChange={setDraft}
                            disabled={saving}
                        />

                        {storedDefault ? (
                            <p className={styles.sliceNote}>
                                This board is marked for co-op with no limit on
                                runners.
                            </p>
                        ) : (
                            <p className={styles.sliceNote}>
                                {describePlayersRange(draft)}
                            </p>
                        )}

                        {/* An import writes ONE category-wide setting even
                            when only some of the category's subcategories are
                            co-op, so the solo slices read as co-op until
                            somebody narrows them. */}
                        {hasSubcategories && (
                            <p className={styles.sliceNote}>
                                This applies to every subcategory of{' '}
                                {categoryDisplay}. If only some of them credit
                                several runners, set those values their own
                                count in the Subcategories dialog and set the
                                others to 1 runner.
                            </p>
                        )}

                        <p className={styles.sliceNote}>
                            A change here re-checks the board in the background:
                            a run that stops fitting comes off until its runners
                            are fixed — it isn't rejected or deleted.
                        </p>

                        <PolicyPreview
                            gameSlug={gameSlug}
                            categoryId={categoryId}
                            subcategoryKey={null}
                            pendingValue={playersPreviewValue(draft, {
                                dirty,
                                storedDefault,
                            })}
                        />

                        {rangeError && <InlineError>{rangeError}</InlineError>}
                        <InlineError>{error}</InlineError>
                    </div>
                </div>

                <div className={styles.dialogFooter}>
                    <span className={styles.dialogSpacer} />
                    {/* Clearing the row is the way back to single player: the
                        default is never stored, so there is nothing to type
                        that means it. Offered only while there is a row to
                        clear. */}
                    {stored && (
                        <button
                            type="button"
                            className={styles.rulesChip}
                            disabled={saving}
                            onClick={() => write(null)}
                        >
                            {saving ? 'Clearing…' : 'Single player'}
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.rulesChip}
                        disabled={saving}
                        onClick={onClose}
                    >
                        Close
                    </button>
                    {dirty && !rangeError && (
                        <button
                            type="button"
                            className={styles.dialogSave}
                            disabled={saving}
                            onClick={() => write(playersDraftValue(draft))}
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
