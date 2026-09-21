'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    findCategoryPlayersPolicy,
    isDefaultPlayersRange,
    NO_PLAYERS_RULE_SENTENCE,
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
    onSaved,
    onClose,
}: Props) {
    const stored = playersValueFromPolicy(
        findCategoryPlayersPolicy(policies, categoryId),
    );
    const original: PlayersRangeDraft = stored ?? DEFAULT_PLAYERS_DRAFT;
    const [draft, setDraft] = useState<PlayersRangeDraft>(original);
    // WHICH write is running, not just whether one is: the two buttons say
    // different things while they work, and "Clearing…" under a Save is a
    // lie about what the board is about to do.
    const [pending, setPending] = useState<'save' | 'clear' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const saving = pending !== null;

    // Escape closes, like every other dismissible surface on the board —
    // except while a write is in flight, when there is nothing to go back to
    // and the answer is still coming.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, saving]);

    const dirty = !samePlayersDraft(draft, original);
    const rangeError = dirty ? playersRangeError(draft) : null;
    // A row IS stored and it carries the permissive default — the one state a
    // blank editor can't tell apart from "nothing configured", and the reason
    // this board still reads as co-op.
    const storedDefault = !!stored && !dirty && isDefaultPlayersRange(original);

    const write = (value: PlayersRange | null, kind: 'save' | 'clear') => {
        setError(null);
        setPending(kind);
        void (async () => {
            const res = await writePlayersPolicyAction(
                gameSlug,
                categoryId,
                null,
                value,
            );
            if ('error' in res) {
                // The dialog stays open on a refusal, holding both the reason
                // and the draft that caused it — closing would take the only
                // copy of what they typed with it.
                setError(res.error);
                setPending(null);
                return;
            }
            // A no-op (the draft round-tripped to what is already stored, or
            // to "nothing" with nothing to clear) isn't a save — don't claim
            // one.
            if (res.changed) toast.success(`Saved for ${categoryDisplay}.`);
            await onSaved();
            setPending(null);
            onClose();
        })();
    };

    return (
        // Backdrop dismissal is a convenience; Escape and Close are the
        // keyboard paths.
        <div
            className={styles.dialogBackdrop}
            onClick={() => {
                if (!saving) onClose();
            }}
        >
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
                        Set how many runners a run in this category credits, if
                        it is co-op. This applies to every subcategory.
                    </p>
                    <p className={styles.dialogLede}>
                        If only certain subcategories are co-op, leave this
                        category single player and make those subcategories
                        co-op instead: click the subcategory count in the
                        categories table.
                    </p>
                </div>

                <div className={styles.dialogBody}>
                    <div className={styles.sliceSettings}>
                        <PlayersRangeFields
                            idPrefix={`matrix-players-${categoryId}`}
                            value={draft}
                            onChange={setDraft}
                            disabled={saving}
                            autoFocus
                        />

                        {storedDefault ? (
                            <p className={styles.sliceNote}>
                                Co-op with no runner limit.
                            </p>
                        ) : (
                            <p className={styles.sliceNote}>
                                {!stored && isDefaultPlayersRange(draft)
                                    ? NO_PLAYERS_RULE_SENTENCE
                                    : describePlayersRange(draft)}
                            </p>
                        )}

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
                            onClick={() => write(null, 'clear')}
                        >
                            {pending === 'clear'
                                ? 'Clearing…'
                                : 'Single player'}
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
                            onClick={() =>
                                write(playersDraftValue(draft), 'save')
                            }
                        >
                            {pending === 'save' ? 'Saving…' : 'Save'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
