import { subject as caslSubject } from '@casl/ability';
import { defineAbilityFor } from '~src/rbac/ability';
import type { User } from '../../../types/session.types';

/**
 * Single gate for all per-game moderation tooling, mirroring the backend's lone
 * `verify-reject-run` permission. Equivalent to the check the per-run reject page
 * already uses: `edit` on `leaderboard` scoped to the game. Granted to global
 * `moderator`/`admin`, `board-admin`/`board-moderator`, and per-game
 * `moderatedGames` (verifier and up).
 */
export function canModerateGame(
    user: User | undefined,
    gameName: string,
): boolean {
    if (!user?.username) return false;
    return defineAbilityFor(user).can(
        'edit',
        caslSubject('leaderboard', { game: gameName }),
    );
}

/**
 * Gate for the CONFIGURE half of the console (categories/groups/variables/
 * standards): moderator and up, not verifiers. Also the read gate for the
 * admin panes. Distinct from canModerateGame's triage gate — a viewer can
 * hold either, both, or neither. Duplicated verbatim across
 * `manage/page.tsx` and `manage/moderation/page.tsx` before Task 18;
 * collapsed here so both pages' `!canModerate && !canConfigure` door check
 * stays in sync.
 */
export function canConfigureGame(
    user: User | undefined,
    gameName: string,
): boolean {
    if (!user?.username) return false;
    return defineAbilityFor(user).can(
        'edit',
        caslSubject('category-settings', { game: gameName }),
    );
}

/**
 * Gate for a game's identity: which IGDB entry it is matched to, and the
 * metadata that match feeds. Mirrors the backend's `edit-game`, which
 * `game-admin` holds — site admins pass through their unscoped grant.
 */
export function canEditGameIdentity(
    user: User | undefined,
    gameName: string,
): boolean {
    if (!user?.username) return false;
    return defineAbilityFor(user).can(
        'edit',
        caslSubject('game', { game: gameName }),
    );
}

/**
 * Board admin: the edit controls in the admin panes (team, verification
 * settings, merges, import, claims, identity). Mirrors the backend's
 * assign-game-mod / edit-verification-settings / merge-category /
 * import-board, which only game-admin holds at game scope.
 */
export function canAdminGame(
    user: User | undefined,
    gameName: string,
): boolean {
    if (!user?.username) return false;
    return defineAbilityFor(user).can(
        'edit',
        caslSubject('moderators', { game: gameName }),
    );
}
