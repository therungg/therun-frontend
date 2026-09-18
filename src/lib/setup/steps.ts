import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../types/leaderboards.types';
import { SETUP_STEP_ORDER, type SetupStepId } from './completeness';
import {
    isWorkspaceSub,
    kindOfCategory,
    type WorkspaceKind,
    type WorkspaceSubId,
    workspaceScreen,
    workspaceScreens,
} from './workspace';

export interface SetupStepMeta {
    id: SetupStepId;
    /** 1-8, the step number shown in the rail and the step eyebrow. */
    num: number;
    label: string;
    skippable: boolean;
    /**
     * Step works across a wide table rather than down a form, so the shell
     * gives it the full page width instead of the reading-width column the
     * form steps want.
     */
    wide?: boolean;
    /** Set on the two workspace steps, whose screens are sub-steps. */
    kind?: WorkspaceKind;
}

/**
 * Canonical step presentation. `completeness.ts` owns step *status*; this owns
 * how a step is named and numbered, so the wizard rail, the console checklist
 * card and the boards-step review list can't drift apart again.
 *
 * Order must match SETUP_STEP_ORDER.
 */
export const SETUP_STEPS: SetupStepMeta[] = [
    {
        id: 'import',
        num: 1,
        label: 'Import from speedrun.com',
        skippable: true,
    },
    { id: 'details', num: 2, label: 'Game details', skippable: true },
    { id: 'theme', num: 3, label: 'Theme', skippable: true, wide: true },
    {
        id: 'categories',
        num: 4,
        label: 'Categories',
        skippable: true,
        wide: true,
        kind: 'categories',
    },
    {
        id: 'levels',
        num: 5,
        label: 'Levels',
        skippable: true,
        wide: true,
        kind: 'levels',
    },
    { id: 'verification', num: 6, label: 'Verification', skippable: false },
    {
        id: 'match-runners',
        num: 7,
        label: 'Match runners',
        skippable: true,
        wide: true,
    },
    { id: 'boards', num: 8, label: 'Boards', skippable: false, wide: true },
];

export const SETUP_STEP_LABELS: Record<SetupStepId, string> =
    Object.fromEntries(SETUP_STEPS.map((s) => [s.id, s.label])) as Record<
        SetupStepId,
        string
    >;

export function setupStepMeta(id: SetupStepId): SetupStepMeta {
    const meta = SETUP_STEPS.find((s) => s.id === id);
    if (!meta) throw new Error(`Unknown setup step: ${id}`);
    return meta;
}

export function setupStepIndex(id: SetupStepId): number {
    return SETUP_STEPS.findIndex((s) => s.id === id);
}

/** Where the wizard is: a step, and for a workspace step, its screen. */
export interface SetupLocation {
    step: SetupStepId;
    sub: WorkspaceSubId | null;
}

export function firstLocationOf(step: SetupStepId): SetupLocation {
    const kind = setupStepMeta(step).kind;
    return { step, sub: kind ? workspaceScreens(kind)[0].id : null };
}

/** Every place Next can go, in order. */
export function setupSequence(): SetupLocation[] {
    return SETUP_STEPS.flatMap<SetupLocation>((s) =>
        s.kind
            ? workspaceScreens(s.kind).map((w) => ({ step: s.id, sub: w.id }))
            : [{ step: s.id, sub: null }],
    );
}

export function adjacentLocation(
    location: SetupLocation,
    dir: -1 | 1,
): SetupLocation | null {
    const sequence = setupSequence();
    const index = sequence.findIndex(
        (l) => l.step === location.step && l.sub === location.sub,
    );
    if (index < 0) return null;
    return sequence[index + dir] ?? null;
}

/** "Groups" for the next screen of the same step, "Levels" for another step. */
export function locationLabel(
    target: SetupLocation,
    from: SetupLocation,
): string {
    const kind = setupStepMeta(target.step).kind;
    if (kind && target.step === from.step && target.sub) {
        return workspaceScreen(kind, target.sub)?.label ?? '';
    }
    return setupStepMeta(target.step).label;
}

/**
 * Retired `?step=` values, mapped onto where that work lives now. Bookmarks,
 * links in old Discord messages and the console's own deep links all predate
 * the change, so the ids keep resolving rather than silently dumping the
 * moderator on whatever step happens to be incomplete.
 */
export const LEGACY_STEP_MAP: Record<string, SetupLocation> = {
    defaults: { step: 'details', sub: null },
    exceptions: { step: 'categories', sub: 'settings' },
    finish: { step: 'boards', sub: null },
    groups: { step: 'categories', sub: 'groups' },
    'category-setup': { step: 'categories', sub: 'settings' },
    variables: { step: 'categories', sub: 'subcategories' },
};

/**
 * Resolves raw `?step=` / `?sub=` values, honouring the legacy map. A
 * workspace step with a missing or unknown sub lands on its first screen.
 * Returns null when the step names nothing — callers fall back to
 * `firstIncomplete`. Shared by the setup page (server) and the wizard shell
 * (client) so a cold deep link and a client-side one agree.
 */
export function resolveSetupLocation(
    rawStep: string | null | undefined,
    rawSub: string | null | undefined,
): SetupLocation | null {
    if (!rawStep) return null;
    if (SETUP_STEP_ORDER.includes(rawStep as SetupStepId)) {
        const step = rawStep as SetupStepId;
        const kind = setupStepMeta(step).kind;
        if (!kind) return { step, sub: null };
        return isWorkspaceSub(kind, rawSub)
            ? { step, sub: rawSub }
            : firstLocationOf(step);
    }
    return LEGACY_STEP_MAP[rawStep] ?? null;
}

/**
 * `?cat=<id>` opens Settings for the kind that category belongs to — a level's
 * id lands on Levels › Settings even from a link that said Categories. Only
 * applies with no step, or a link that already asked for Settings.
 */
export function withCategoryDeepLink(
    location: SetupLocation | null,
    catId: number | null,
    categories: ReadonlyArray<Pick<ResolvedCategory, 'id' | 'groupId'>>,
    groups: ReadonlyArray<Pick<ResolvedGroup, 'id' | 'kind'>>,
): SetupLocation | null {
    if (catId == null) return location;
    if (location && location.sub !== 'settings') return location;
    const kind = kindOfCategory(catId, categories, groups);
    return kind ? { step: kind, sub: 'settings' } : location;
}

export function setupHref(
    gameSlug: string,
    location: SetupLocation,
    extra?: Record<string, string>,
): string {
    const params = new URLSearchParams({ step: location.step });
    if (location.sub) params.set('sub', location.sub);
    for (const [key, value] of Object.entries(extra ?? {})) {
        params.set(key, value);
    }
    return `/games/${encodeURIComponent(gameSlug)}/setup?${params.toString()}`;
}

export { SETUP_STEP_ORDER };
