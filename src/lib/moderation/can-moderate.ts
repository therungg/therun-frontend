import { subject as caslSubject } from '@casl/ability';
import { defineAbilityFor } from '~src/rbac/ability';
import type { User } from '../../../types/session.types';

/**
 * Single gate for all per-game moderation tooling, mirroring the backend's lone
 * `verify-reject-run` permission. Equivalent to the check the per-run reject page
 * already uses: `edit` on `leaderboard` scoped to the game. Granted to global
 * `moderator`/`admin`, `board-admin`/`board-moderator`, and per-game
 * `moderatedGames`.
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
 * standards), distinct from canModerateGame's triage gate — a viewer can
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
