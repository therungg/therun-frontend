'use client';

import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'react-toastify';
import { removeRoleFromUserAction } from '~app/(new-layout)/admin/roles/actions/remove-role-from-user.action';
import { Can, subject } from '~src/rbac/Can.component';
import { ManageableRole } from '../../../../types/roles.types';
import { UserWithRoles } from '../../../../types/users.types';
import styles from '../admin.module.scss';

const ROLE_ORDER: ManageableRole[] = [
    'admin',
    'role-admin',
    'event-admin',
    'event-creator',
    'race-admin',
];

const ROLE_STYLE: Partial<Record<ManageableRole, string>> = {
    admin: 'badgeDanger',
    'role-admin': 'badgeMuted',
};

export const UserRoleBadges = ({ user }: { user: UserWithRoles }) => {
    const [isPending, startTransition] = useTransition();
    const path = usePathname();

    const sortedRoles = user.roles.sort((a, b) => {
        const indexA = ROLE_ORDER.indexOf(a as ManageableRole);
        const indexB = ROLE_ORDER.indexOf(b as ManageableRole);

        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
    });

    return sortedRoles.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {sortedRoles.map((role) => {
                const styleKey =
                    ROLE_STYLE[role as ManageableRole] || 'badgeSuccess';
                return (
                    <span
                        className={
                            styles[styleKey as keyof typeof styles] || ''
                        }
                        key={user.username + '-' + role}
                    >
                        {role}
                        <Can I="moderate" this={subject('roles', { role })}>
                            <button
                                className={styles.badgeRemove}
                                onClick={() => {
                                    if (
                                        confirm(
                                            `Are you sure you want to remove the role ${role} for user ${user.username}?`,
                                        )
                                    ) {
                                        startTransition(async () => {
                                            await removeRoleFromUserAction(
                                                user.id,
                                                role,
                                                path,
                                            );
                                            toast.success(
                                                `Succesfully removed role ${role} for user ${user.username}`,
                                            );
                                        });
                                    }
                                }}
                                disabled={isPending}
                            >
                                x
                            </button>
                        </Can>
                    </span>
                );
            })}
        </div>
    ) : (
        <span className={styles.noData}>No Roles</span>
    );
};

// Re-export for backwards compatibility
export const ROLE_COLORS: Partial<Record<ManageableRole, string>> = {
    admin: 'danger',
    'role-admin': 'dark',
};
