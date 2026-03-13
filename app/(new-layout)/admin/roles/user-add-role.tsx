'use client';

import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'react-toastify';
import { addRoleToUserAction } from '~app/(new-layout)/admin/roles/actions/add-role-to-user.action';
import { assignableRoles } from '../../../../types/roles.types';
import { UserWithRoles } from '../../../../types/users.types';
import styles from '../admin.module.scss';

export const UserAddRole = ({ user }: { user: UserWithRoles }) => {
    const [, startTransition] = useTransition();
    const path = usePathname();

    const availableRoles = assignableRoles.filter(
        (role) => !user.roles.includes(role),
    );

    if (availableRoles.length === 0) return null;

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {availableRoles.map((role) => (
                <span
                    className={`${styles.badgeSuccess} ${styles.badgeClickable}`}
                    key={user.username + '-' + role}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                        if (
                            confirm(
                                `Are you sure you want to add the role ${role} for user ${user.username}?`,
                            )
                        ) {
                            startTransition(async () => {
                                await addRoleToUserAction(user.id, role, path);

                                toast.success(
                                    `Succesfully added role ${role} for user ${user.username}`,
                                );
                            });
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.currentTarget.click();
                        }
                    }}
                >
                    {role} +
                </span>
            ))}
        </div>
    );
};
