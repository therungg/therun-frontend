import type { ReactNode } from 'react';
import type {
    GameExclusionRuleRow,
    ModTiming,
    SecondaryTimeInput,
    UserExclusionRuleInput,
} from '../../../../../../../types/moderation.types';
import { deleteRuleAction } from '../rules/actions/delete-rule.action';
import type { RunnerBanState } from '../runner/[userId]/runner-model';
import { undoReason } from '../shared/action-model';
import { anonymizeUserAction } from '../shared/actions/anonymize-rules.action';
import {
    excludeAction,
    previewExcludeAction,
} from '../shared/actions/exclude.action';
import {
    createManualTimeAction,
    deleteManualTimeAction,
} from '../shared/actions/manual-times.action';
import type { UndoResult } from '../shared/undo-toast';
import type { HeavyFormSpec } from './heavy-form';
import styles from './moderate-panel.module.scss';
import {
    type ConfirmResult,
    MIN_REASON,
    runHeavySpec,
} from './run-heavy-verbs';
import { unwrap } from './run-verbs';
import { boardKey } from './runner-columns';

export type HeavyRunnerVerb = 'ban' | 'hide_identity' | 'add_run';
export type RunnerScope = 'category' | 'game';

export interface RunnerRefs {
    userId: number;
    runnerName: string;
    /** The category the panel was opened from; null offers the game only. */
    categoryId: number | null;
    categoryDisplay: string | null;
    gameDisplay: string;
}

// ---- Ban state ----------------------------------------------------------------

export function bannedScope(ban: RunnerBanState): 'none' | 'category' | 'game' {
    if (ban.gameRule) return 'game';
    return ban.categoryRules.length > 0 ? 'category' : 'none';
}

/** "Banned from Super Mario 64", "Banned from 16 Star", "Banned from 2 categories". */
export function banLabel(
    ban: RunnerBanState,
    gameDisplay: string,
): string | null {
    if (ban.gameRule) return `Banned from ${gameDisplay}`;
    const rules = ban.categoryRules;
    if (rules.length === 0) return null;
    if (rules.length === 1)
        return `Banned from ${rules[0].categoryName ?? 'a category'}`;
    return `Banned from ${rules.length} categories`;
}

/**
 * The rule Lift ban deletes: the game-wide one, else the one on the category
 * the panel was opened from, else the first category rule.
 */
export function ruleToLift(
    ban: RunnerBanState,
    categoryId: number | null,
): GameExclusionRuleRow | null {
    return (
        ban.gameRule ??
        ban.categoryRules.find((r) => r.categoryId === categoryId) ??
        ban.categoryRules[0] ??
        null
    );
}

/** A rule at exactly this scope already exists: a new ban creates nothing. */
export function banRuleExists(
    ban: RunnerBanState,
    scope: RunnerScope,
    categoryId: number | null,
): boolean {
    if (scope === 'game') return ban.gameRule !== null;
    return ban.categoryRules.some((r) => r.categoryId === categoryId);
}

const banRule = (
    userId: number,
    scope: RunnerScope,
    categoryId: number | null,
): UserExclusionRuleInput => ({
    type: 'user',
    targetId: userId,
    categoryId: scope === 'category' ? categoryId : null,
});

export interface BanPreview {
    runs: number;
    boards: number;
    /** `boardKey`s of the boards the runner comes off. */
    comesOff: ReadonlySet<string>;
}

export async function previewBan(
    gameSlug: string,
    userId: number,
    scope: RunnerScope,
    categoryId: number | null,
): Promise<{ error: string } | { preview: BanPreview }> {
    const res = await previewExcludeAction(gameSlug, {
        rule: banRule(userId, scope, categoryId),
    });
    if ('error' in res) return res;
    const boards = res.preview.affectedLeaderboards.filter(
        (lb) => lb.affectedInThisLeaderboard > 0,
    );
    return {
        preview: {
            runs: res.preview.affectedRunCount,
            boards: boards.length,
            comesOff: new Set(
                boards.map((lb) => boardKey(lb.categoryId, lb.subcategoryKey)),
            ),
        },
    };
}

export async function liftBan(
    gameSlug: string,
    ruleId: number,
): Promise<{ error: string } | { ok: true; reinstated: number }> {
    const res = await deleteRuleAction(gameSlug, ruleId, 'Ban lifted');
    if ('error' in res) return res;
    return { ok: true, reinstated: res.result.reinstatedRunCount };
}

// ---- Confirm ------------------------------------------------------------------

export type RunnerConfirmInput =
    | { verb: 'ban'; reason: string; scope: RunnerScope }
    | { verb: 'hide_identity'; reason: string; scope: RunnerScope }
    | {
          verb: 'add_run';
          reason: string;
          categoryId: number;
          subcategoryKey: string;
          boardName: string;
          timing: ModTiming;
          timeMs: number | null;
          secondary: SecondaryTimeInput | null;
          evidenceUrl: string;
          runDate: string;
      };

const scopeName = (runner: RunnerRefs, scope: RunnerScope) =>
    scope === 'category' && runner.categoryDisplay
        ? runner.categoryDisplay
        : runner.gameDisplay;

export async function confirmRunnerVerb(
    gameSlug: string,
    runner: RunnerRefs,
    input: RunnerConfirmInput,
): Promise<ConfirmResult> {
    switch (input.verb) {
        case 'ban': {
            const res = await excludeAction(gameSlug, {
                rule: banRule(runner.userId, input.scope, runner.categoryId),
                reason: input.reason,
            });
            if ('error' in res) return res;
            // A rule payload always comes back as CreateRuleResult.
            if (!('ruleId' in res.result)) return { ok: true, undo: null };
            if (res.result.alreadyExists) {
                return {
                    ok: true,
                    undo: null,
                    message: 'Already banned at this scope. Nothing changed.',
                };
            }
            const ruleId = res.result.ruleId;
            return {
                ok: true,
                message: `Banned: ${runner.runnerName} from ${scopeName(runner, input.scope)}`,
                undo: () =>
                    unwrap(
                        deleteRuleAction(gameSlug, ruleId, undoReason('ban')),
                    ),
            };
        }
        case 'hide_identity': {
            const res = await anonymizeUserAction(gameSlug, {
                userId: runner.userId,
                reason: input.reason,
                categoryId:
                    input.scope === 'category' ? runner.categoryId : null,
            });
            if ('error' in res) return res;
            return {
                ok: true,
                undo: null,
                message: res.result.alreadyExists
                    ? 'Already hidden at this scope. Nothing changed.'
                    : `Hidden: now shown as ${res.result.rule.displayName}`,
            };
        }
        case 'add_run': {
            if (input.timeMs == null) return { error: 'Type the time first.' };
            const res = await createManualTimeAction(gameSlug, {
                runnerRef: { userId: runner.userId },
                categoryId: input.categoryId,
                subcategoryKey: input.subcategoryKey,
                timing: input.timing,
                timeMs: input.timeMs,
                secondary: input.secondary,
                evidenceUrl: input.evidenceUrl.trim() || null,
                runDate: input.runDate || null,
                reason: input.reason,
            });
            if ('error' in res) return res;
            const ids = [res.result.id, res.result.secondaryId].filter(
                (id): id is number => id != null,
            );
            return {
                ok: true,
                message: `Run added: ${runner.runnerName} on ${input.boardName}`,
                undo: async (): Promise<UndoResult> => {
                    for (const id of ids) {
                        const del = await deleteManualTimeAction(
                            gameSlug,
                            id,
                            'Undo of add run',
                        );
                        if ('error' in del) return { error: del.error };
                    }
                    return { ok: true };
                },
            };
        }
    }
}

// ---- Form specs ---------------------------------------------------------------

export interface RunnerSpecArgs {
    runner: RunnerRefs;
    scope: RunnerScope;
    /** Ban: null while the preview loads. */
    banPreview?: BanPreview | null;
    /** Ban: a rule at this scope already exists. */
    banRuleExists?: boolean;
    /** Add run: the board picked, "16 Star · No emulator". */
    addBoardName?: string;
    /** Add run: the times are not filled in yet. */
    addBlocked?: boolean;
    addRank?: number | null;
    /** Scope cards or the add-run fields, owned by the caller's state. */
    fields?: ReactNode;
}

const Mono = ({ n }: { n: number }) => <span className={styles.mono}>{n}</span>;

export function runnerHeavySpec(
    verb: HeavyRunnerVerb,
    a: RunnerSpecArgs,
): HeavyFormSpec {
    const { runner } = a;
    switch (verb) {
        case 'ban': {
            const where = scopeName(runner, a.scope);
            const p = a.banPreview ?? null;
            return {
                verb,
                runnerName: runner.runnerName,
                whatChanges: p ? (
                    <>
                        <Mono n={p.runs} /> run{p.runs === 1 ? '' : 's'} come
                        {p.runs === 1 ? 's' : ''} off <Mono n={p.boards} />{' '}
                        board{p.boards === 1 ? '' : 's'}.
                    </>
                ) : (
                    '…'
                ),
                told: `is told they were removed from ${where}, with this reason.`,
                undoHint: 'Lift ban',
                notUndoable: a.banRuleExists
                    ? 'a ban rule with this scope already exists. Lift it with Lift ban instead.'
                    : null,
                reasonKeys: false,
                minReason: MIN_REASON,
                actionLabel: `Ban from ${where}`,
                tone: 'danger',
                // The numbers come first: the action waits for the preview.
                blocked: p === null,
                fields: a.fields,
            };
        }
        case 'hide_identity':
            return runHeavySpec('hide_identity', {
                runnerName: runner.runnerName,
                isManual: false,
                timeMs: null,
                boardName: '',
                categoryDisplay: runner.categoryDisplay ?? '',
                gameDisplay: runner.gameDisplay,
                hideScope: a.scope,
                fields: a.fields,
            });
        case 'add_run':
            return {
                verb,
                runnerName: runner.runnerName,
                whatChanges: `A run is added for ${runner.runnerName} on ${a.addBoardName ?? ''}.${
                    a.addRank != null ? ` Lands at #${a.addRank}.` : ''
                }`,
                undoHint: 'Undo from the toast right after',
                notUndoable: null,
                reasonKeys: false,
                minReason: MIN_REASON,
                actionLabel: 'Add run',
                tone: 'primary',
                blocked: a.addBlocked ?? true,
                fields: a.fields,
            };
    }
}
