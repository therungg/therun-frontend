import type { User } from '../../types/session.types';
import type { Capability, Tournament } from '../../types/tournament.types';

export function isGlobalAdmin(user?: User | null): boolean {
    return !!user?.roles?.includes('admin');
}

export function isTournamentAdmin(
    user: User | null | undefined,
    t: Pick<Tournament, 'admins'>,
): boolean {
    if (!user?.username) return false;
    if (isGlobalAdmin(user)) return true;
    return (t.admins ?? []).includes(user.username);
}

export function hasCapability(
    user: User | null | undefined,
    t: Pick<Tournament, 'admins' | 'staff'>,
    cap: Capability,
): boolean {
    if (!user?.username) return false;
    if (isTournamentAdmin(user, t)) return true;
    return (t.staff ?? []).some(
        (s) => s.user === user.username && s.capabilities.includes(cap),
    );
}

export function canCreateTournament(user?: User | null): boolean {
    if (!user?.roles) return false;
    return (
        user.roles.includes('admin') ||
        user.roles.includes('tournament-creator')
    );
}

export function canDeleteTournament(user?: User | null): boolean {
    return isGlobalAdmin(user);
}

export function canManageAdmins(user?: User | null): boolean {
    return isGlobalAdmin(user);
}

export type LifecycleStatus = 'finalized' | 'locked' | 'archived' | 'active';

export function lifecycleStatus(
    t: Pick<Tournament, 'lockedAt' | 'finalizedAt' | 'hide'>,
): LifecycleStatus {
    if (t.finalizedAt) return 'finalized';
    if (t.lockedAt) return 'locked';
    if (t.hide) return 'archived';
    return 'active';
}
