import type { User } from '../../types/session.types';

/**
 * Whether this viewer can open board pages (`/games-v2/<game>`). Boards are
 * admin-only in production until launch; development shows them to everyone.
 * Links into boards are gated on this so nobody is sent to a 404.
 */
export function boardsVisibleFor(
    session: Pick<User, 'roles'> | null | undefined,
): boolean {
    return (
        process.env.NODE_ENV !== 'production' ||
        !!session?.roles?.includes('admin')
    );
}
