'use client';

import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { removeRoleFromUserAction } from '~app/(old-layout)/admin/roles/actions/remove-role-from-user.action';
import { Can, subject } from '~src/rbac/Can.component';
import { ManageableRole } from '../../../../types/roles.types';
import { UserWithRoles } from '../../../../types/users.types';

const ROLE_ORDER: ManageableRole[] = [
    'admin',
    'role-admin',
    'event-admin',
    'event-creator',
    'race-admin',
];

export const ROLE_COLORS: Partial<Record<ManageableRole, string>> = {
    admin: 'danger',
    'role-admin': 'dark',
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
        sortedRoles.map((role) => {
            const badgeColor = ROLE_COLORS[role as ManageableRole] || 'success';

            return (
                <Badge
                    pill
                    bg={badgeColor}
                    key={user.username + '-' + role}
                    className="me-1 d-inline-flex align-items-center"
                    style={{
                        height: '2rem',
                    }}
                >
                    {role}
                    <Can I="moderate" this={subject('roles', { role })}>
                        <button
                            className="btn btn-link btn-sm text-white ms-1 p-0"
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
                            ×
                        </button>
                    </Can>
                </Badge>
            );
        })
    ) : (
        <span className="text-muted">No Roles</span>
    );
};
