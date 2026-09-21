'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { DurationField } from '~src/components/time-input/duration-field';
import { DurationToFormatted } from '~src/components/util/datetime';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import {
    isDefaultPlayersRange,
    playersRangeError,
    playersValueFromPolicy,
} from '~src/lib/setup/game-minimum';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import type {
    BoardPolicyRow,
    CreatePolicyInput,
    LeaderboardRosterRow,
    PolicyType,
} from '../../../../../../../types/moderation.types';
import {
    DEFAULT_PLAYERS_DRAFT,
    describePlayersRange,
    FormSection,
    InlineError,
    type PlayersRangeDraft,
    PlayersRangeFields,
    playersDraftValue,
    playersPreviewValue,
    SectionFooter,
    samePlayersDraft,
} from '../../shared/form-kit';
import kit from '../../shared/form-kit.module.scss';
import { PolicyPreview } from '../../shared/policy-preview';
import {
    createPolicyAction,
    deletePolicyAction,
    updatePolicyAction,
    writePlayersPolicyAction,
} from '../policies/actions/policies-actions.action';
import { loadRosterAction } from '../roster/actions/load-roster.action';
import { loadStandardsAction } from './actions/standards.action';
import styles from './standards.module.scss';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    category: ResolvedCategory;
    canEdit: boolean;
    /** Whether this category is split into subcategories. A players setting
     * here is CATEGORY-WIDE — it reaches every one of them — and that is
     * worth saying only where there are several boards to reach. */
    hasSubcategories?: boolean;
    /** Where the per-subcategory settings are edited, when there are any. */
    subcategoriesHref?: string;
}

function num(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
}

// Category-scoped, whole-category (no subcategory) policies are what the
// plain-language Standards surface manages.
function isCategoryScoped(p: BoardPolicyRow, categoryId: number): boolean {
    return p.categoryId === categoryId && p.subcategoryKey == null;
}

function findPolicy(
    policies: BoardPolicyRow[],
    type: PolicyType,
    categoryId: number,
): BoardPolicyRow | undefined {
    return policies.find(
        (p) => p.policyType === type && isCategoryScoped(p, categoryId),
    );
}

function minMsFromPolicies(
    policies: BoardPolicyRow[],
    categoryId: number,
    timing: 'rt' | 'gt',
): number | null {
    const min = findPolicy(policies, 'min_time', categoryId);
    if (!min) return null;
    const bound =
        timing === 'gt' ? min.value.minGameTimeMs : min.value.minTimeMs;
    return num(bound) ?? null;
}

// A category-scoped players policy, as a draft. No policy row at all is the
// permissive default too, so both read as the same blank draft — but a
// STORED row whose value happens to be the default is not collapsed here
// any more: `playersValueFromPolicy` returns it verbatim, and the component
// below shows that case its own banner + Remove rather than hiding it as
// blank fields (a row storing {min:1,max:null} still makes a board read as
// co-op, and a blank editor gave a moderator no way to find or clear it).
function playersFromPolicies(
    policies: BoardPolicyRow[],
    categoryId: number,
): PlayersRangeDraft {
    const policy = findPolicy(policies, 'players', categoryId);
    return playersValueFromPolicy(policy) ?? DEFAULT_PLAYERS_DRAFT;
}

export function Standards({
    gameSlug,
    gameDisplay,
    category,
    canEdit,
    hasSubcategories = false,
    subcategoriesHref,
}: Props) {
    const categoryId = category.id;
    // One minimum, bound to the category's primary timing — same fallback
    // rule as the board (board-curation.tsx): anything but 'gt' means 'rt'.
    const timing: 'rt' | 'gt' = category.primaryTiming === 'gt' ? 'gt' : 'rt';
    const [policies, setPolicies] = useState<BoardPolicyRow[]>([]);
    const [minMs, setMinMs] = useState<number | null>(null);
    const [originalMinMs, setOriginalMinMs] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, startSaving] = useTransition();

    const [playersDraft, setPlayersDraft] = useState<PlayersRangeDraft>(
        DEFAULT_PLAYERS_DRAFT,
    );
    const [originalPlayersDraft, setOriginalPlayersDraft] =
        useState<PlayersRangeDraft>(DEFAULT_PLAYERS_DRAFT);
    const [playersError, setPlayersError] = useState<string | null>(null);
    const [isSavingPlayers, startSavingPlayers] = useTransition();

    const [roster, setRoster] = useState<LeaderboardRosterRow[]>([]);
    const [rosterLoading, startRosterLoad] = useTransition();
    const [showSamples, setShowSamples] = useState(false);

    const loadForCategory = useCallback(
        async (catId: number) => {
            setLoading(true);
            setError(null);
            const res = await loadStandardsAction(gameSlug, catId);
            if ('error' in res) {
                setError(res.error);
                setLoading(false);
                return;
            }
            setPolicies(res.policies);
            const min = minMsFromPolicies(res.policies, catId, timing);
            setMinMs(min);
            setOriginalMinMs(min);
            const players = playersFromPolicies(res.policies, catId);
            setPlayersDraft(players);
            setOriginalPlayersDraft(players);
            setLoading(false);
        },
        [gameSlug, timing],
    );

    // Load policies + roster whenever the selected category changes.
    useEffect(() => {
        void loadForCategory(categoryId);
        startRosterLoad(async () => {
            const res = await loadRosterAction(gameSlug, categoryId, {});
            setRoster('error' in res ? [] : res.rows);
        });
    }, [categoryId, gameSlug, loadForCategory]);

    const dirty = minMs !== originalMinMs;
    const playersDirty = !samePlayersDraft(playersDraft, originalPlayersDraft);
    const existingPlayersPolicy = findPolicy(policies, 'players', categoryId);
    // A row IS stored here, and it happens to carry the default value — the
    // one case a blank editor can't tell apart from "nothing configured".
    // Only true while the draft hasn't been touched; the moment it's edited
    // this is an ordinary save/delete again.
    const storedDefault =
        !!existingPlayersPolicy &&
        !playersDirty &&
        isDefaultPlayersRange(originalPlayersDraft);

    const playersPendingValue = playersPreviewValue(playersDraft, {
        dirty: playersDirty,
        storedDefault,
    });

    const handleRemoveDefault = () => {
        if (!existingPlayersPolicy) return;
        startSavingPlayers(async () => {
            const res = await writePlayersPolicyAction(
                gameSlug,
                categoryId,
                null,
                null,
            );
            if ('error' in res) {
                setPlayersError(res.error);
                await loadForCategory(categoryId);
                return;
            }
            toast.success('Saved.');
            await loadForCategory(categoryId);
        });
    };

    const handleReset = () => {
        setMinMs(originalMinMs);
        setError(null);
    };

    const handlePlayersReset = () => {
        setPlayersDraft(originalPlayersDraft);
        setPlayersError(null);
    };

    const handlePlayersSave = () => {
        setPlayersError(null);

        const cid = categoryId;
        // Blank fields ARE the default ({min:1, max:null}) — never written as
        // its own row (house rule: a default row and no row must mean the
        // same thing, or a moderator "clearing" the setting would silently
        // leave a no-op policy behind). Validated here for a snappy inline
        // error, but `writePlayersPolicyAction` validates and collapses the
        // default again server-side — a client-only check is not a check.
        const rangeError = playersRangeError(playersDraft);
        if (rangeError) {
            setPlayersError(rangeError);
            return;
        }
        const value = playersDraftValue(playersDraft);

        startSavingPlayers(async () => {
            const res = await writePlayersPolicyAction(
                gameSlug,
                cid,
                null,
                value,
            );
            if ('error' in res) {
                setPlayersError(res.error);
                await loadForCategory(cid);
                return;
            }
            // A no-op (the draft round-tripped to what was already stored, or
            // to "nothing" with nothing to clear) isn't a save — don't claim
            // one. Reload either way, so the fields re-seed from what's
            // actually stored rather than staying dirty forever.
            if (res.changed) toast.success('Saved.');
            await loadForCategory(cid);
        });
    };

    const handleSave = () => {
        setError(null);

        const cid = categoryId;

        startSaving(async () => {
            // The minimum time maps to a single min_time policy: create it,
            // update it, or delete it depending on the field and what exists.
            // The value carries ONLY the primary-timing key — a save
            // deliberately drops any leftover minimum on the other clock,
            // since there is no UI showing (or clearing) it any more.
            type ActionResult =
                | { ok: true }
                | { ok: true; policy: BoardPolicyRow }
                | { error: string };

            const existing = findPolicy(policies, 'min_time', cid);
            let op: (() => Promise<ActionResult>) | null = null;

            const boundKey = timing === 'gt' ? 'minGameTimeMs' : 'minTimeMs';

            if (minMs === null) {
                if (existing) {
                    op = () => deletePolicyAction(gameSlug, existing.id);
                }
            } else if (existing) {
                if (num(existing.value[boundKey]) !== minMs) {
                    op = () =>
                        updatePolicyAction(gameSlug, existing.id, {
                            [boundKey]: minMs,
                        });
                }
            } else {
                const input: CreatePolicyInput = {
                    policyType: 'min_time',
                    value: { [boundKey]: minMs },
                    categoryId: cid,
                };
                op = () => createPolicyAction(gameSlug, input);
            }

            if (!op) {
                toast.info('No changes to save.');
                return;
            }

            const res = await op();
            if ('error' in res) {
                setError(res.error);
                // Reload to resync with whatever did persist.
                await loadForCategory(cid);
                return;
            }

            toast.success('Minimum time saved.');
            await loadForCategory(cid);
        });
    };

    // ── Live preview (client-side, reflects the UNSAVED field value) ──────
    const belowMin =
        minMs == null
            ? []
            : roster.filter((r) => {
                  // Mirrors backend checkMinimumEligibility: a run without
                  // game time is held to a game-time minimum via its RTA
                  // (IGT never exceeds RTA), so RTA-fallback entries count.
                  const t = timing === 'gt' ? (r.gameTime ?? r.time) : r.time;
                  return t != null && t < minMs;
              });

    return (
        <>
            <FormSection
                title="Minimum time"
                // A minimum is optional — done when one is saved, unmarked (not
                // "needs attention") otherwise. Saved state, so it can't flip
                // while typing; absent while the initial load is in flight.
                status={!loading && originalMinMs !== null ? 'done' : undefined}
                lede={
                    <>
                        Set the minimum time for{' '}
                        <strong>{category.display}</strong> in {gameDisplay}.
                        Changes apply once you save.
                    </>
                }
            >
                {loading ? (
                    <p className="text-muted">Loading standards…</p>
                ) : (
                    <>
                        {/* A reader who cannot edit gets the sentence, not a
                            greyed box — the same treatment as Runners
                            credited below: a visible control on this console
                            means it works. In-flight (isSaving) still greys,
                            because the control is theirs and the write is
                            momentary. */}
                        {canEdit ? (
                            <div className={styles.fieldCol}>
                                <div>
                                    <label
                                        htmlFor="std-min"
                                        className="form-label small mb-1"
                                    >
                                        Reject{' '}
                                        {timing === 'gt'
                                            ? 'in-game time'
                                            : 'real time'}{' '}
                                        under
                                    </label>
                                    <DurationField
                                        id="std-min"
                                        size="sm"
                                        value={minMs}
                                        onChange={setMinMs}
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted small mb-0">
                                {minMs === null ? (
                                    'No minimum time is set for this board.'
                                ) : (
                                    <>
                                        {timing === 'gt'
                                            ? 'In-game times'
                                            : 'Real times'}{' '}
                                        under{' '}
                                        <DurationToFormatted
                                            duration={minMs}
                                            withMillis
                                        />{' '}
                                        are rejected.
                                    </>
                                )}
                            </p>
                        )}

                        {/* ── Live preview ─────────────────────────────────── */}
                        <div className={styles.preview}>
                            {rosterLoading ? (
                                <span className="text-muted small">
                                    Computing preview…
                                </span>
                            ) : (
                                <>
                                    <div>
                                        With this minimum:{' '}
                                        <strong>{belowMin.length}</strong> run
                                        {belowMin.length === 1 ? '' : 's'} below
                                        minimum.
                                    </div>
                                    {belowMin.length > 0 && (
                                        <button
                                            type="button"
                                            className="btn btn-link btn-sm px-0"
                                            onClick={() =>
                                                setShowSamples((v) => !v)
                                            }
                                        >
                                            {showSamples
                                                ? 'Hide affected runs'
                                                : `Show affected runs (${belowMin.length})`}
                                        </button>
                                    )}
                                    {showSamples && belowMin.length > 0 && (
                                        <ul className="list-unstyled small mb-0 mt-1">
                                            {belowMin.slice(0, 50).map((r) => {
                                                const t =
                                                    timing === 'gt'
                                                        ? (r.gameTime ?? r.time)
                                                        : r.time;
                                                return (
                                                    <li key={r.runId}>
                                                        {r.runnerName} —{' '}
                                                        {t != null ? (
                                                            <DurationToFormatted
                                                                duration={t}
                                                                withMillis
                                                            />
                                                        ) : (
                                                            '—'
                                                        )}{' '}
                                                        <span className="text-muted">
                                                            {timing === 'gt' &&
                                                            r.gameTime == null
                                                                ? '(RTA, below minimum)'
                                                                : '(below minimum)'}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                            {belowMin.length > 50 && (
                                                <li className="text-muted">
                                                    …and {belowMin.length - 50}{' '}
                                                    more
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </>
                            )}
                        </div>

                        {/* ── Save / read-only note ────────────────────────── */}
                        {canEdit ? (
                            <div className="mt-3">
                                {/* Rendered only while there's something to
                                    save or discard — a greyed pair sitting
                                    idle is against house style. In-flight
                                    (isSaving) still shows them disabled: the
                                    draft stays dirty for the whole write. */}
                                {dirty && (
                                    <SectionFooter>
                                        <button
                                            type="button"
                                            className={kit.saveBtn}
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                            type="button"
                                            className={kit.resetBtn}
                                            onClick={handleReset}
                                            disabled={isSaving}
                                        >
                                            Reset
                                        </button>
                                    </SectionFooter>
                                )}
                                <InlineError>{error}</InlineError>
                            </div>
                        ) : (
                            <p className="text-muted small mt-3 mb-0">
                                You don't have the right to change this board's
                                settings.
                            </p>
                        )}
                    </>
                )}
            </FormSection>

            <FormSection
                title="Runners credited"
                // Same doneness rule as Minimum time: unmarked, not "needs
                // attention", since no limit is a perfectly normal board.
                status={
                    !loading &&
                    !samePlayersDraft(
                        originalPlayersDraft,
                        DEFAULT_PLAYERS_DRAFT,
                    )
                        ? 'done'
                        : undefined
                }
                lede={
                    <>
                        How many runners a run on{' '}
                        <strong>{category.display}</strong> can credit. Leave
                        this alone and the board stays open to any number — set
                        it to require or cap how many runners a run credits. To
                        mark the board as co-op, set a minimum of 2 or set a
                        maximum: a minimum of 1 with no maximum is the same as
                        no setting at all.
                    </>
                }
            >
                {loading ? (
                    <p className="text-muted">Loading standards…</p>
                ) : (
                    <>
                        {/* A reader who cannot edit gets the sentence, not
                            greyed boxes: a visible control on this console
                            means it works. The summary below says the same
                            thing the fields would, so nothing is lost. */}
                        {canEdit && (
                            <PlayersRangeFields
                                idPrefix="std-players"
                                value={playersDraft}
                                onChange={setPlayersDraft}
                                disabled={isSavingPlayers}
                            />
                        )}

                        {storedDefault ? (
                            <p className="text-muted small mt-2 mb-0">
                                This board is marked for co-op with no limit on
                                runners.
                            </p>
                        ) : (
                            <p className="text-muted small mt-2 mb-0">
                                {describePlayersRange(playersDraft)}
                            </p>
                        )}

                        {/* An import writes ONE category-wide setting even
                            when only some of the category's subcategories are
                            co-op, so the solo slices read as co-op until
                            somebody narrows them. Nothing tells a moderator
                            that, and this is where they are standing. */}
                        {hasSubcategories &&
                            (storedDefault ||
                                !samePlayersDraft(
                                    originalPlayersDraft,
                                    DEFAULT_PLAYERS_DRAFT,
                                )) && (
                                <p className="text-muted small mt-2 mb-0">
                                    This applies to every subcategory of{' '}
                                    {category.display}. If only some of them
                                    credit several runners, set those values
                                    their own count and set the others to 1
                                    runner
                                    {subcategoriesHref ? (
                                        <>
                                            {' '}
                                            in{' '}
                                            <Link href={subcategoriesHref}>
                                                {CONCEPT_LABEL.variables}
                                            </Link>
                                        </>
                                    ) : null}
                                    .
                                </p>
                            )}

                        <p className="text-muted small mt-2 mb-0">
                            A change here re-checks the board in the background:
                            a run that stops fitting comes off until its runners
                            are fixed — it isn't rejected or deleted.
                        </p>

                        {canEdit && (
                            <PolicyPreview
                                gameSlug={gameSlug}
                                categoryId={categoryId}
                                subcategoryKey={null}
                                pendingValue={playersPendingValue}
                            />
                        )}

                        {canEdit ? (
                            <div className="mt-3">
                                {storedDefault && (
                                    <SectionFooter>
                                        <button
                                            type="button"
                                            className={kit.saveBtn}
                                            onClick={handleRemoveDefault}
                                            disabled={isSavingPlayers}
                                        >
                                            {isSavingPlayers
                                                ? 'Removing…'
                                                : 'Remove'}
                                        </button>
                                    </SectionFooter>
                                )}
                                {/* Rendered only while dirty — see the note on
                                    Minimum time's footer above. */}
                                {playersDirty && (
                                    <SectionFooter>
                                        <button
                                            type="button"
                                            className={kit.saveBtn}
                                            onClick={handlePlayersSave}
                                            disabled={isSavingPlayers}
                                        >
                                            {isSavingPlayers
                                                ? 'Saving…'
                                                : 'Save'}
                                        </button>
                                        <button
                                            type="button"
                                            className={kit.resetBtn}
                                            onClick={handlePlayersReset}
                                            disabled={isSavingPlayers}
                                        >
                                            Reset
                                        </button>
                                    </SectionFooter>
                                )}
                                <InlineError>{playersError}</InlineError>
                            </div>
                        ) : (
                            <p className="text-muted small mt-3 mb-0">
                                You don't have the right to change this board's
                                settings.
                            </p>
                        )}
                    </>
                )}
            </FormSection>
        </>
    );
}
