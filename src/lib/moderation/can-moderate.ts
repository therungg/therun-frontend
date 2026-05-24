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
