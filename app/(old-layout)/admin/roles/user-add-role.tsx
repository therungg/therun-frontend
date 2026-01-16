'use client';

import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { addRoleToUserAction } from '~app/(old-layout)/admin/roles/actions/add-role-to-user.action';
import { assignableRoles } from '../../../../types/roles.types';
import { UserWithRoles } from '../../../../types/users.types';

export const UserAddRole = ({ user }: { user: UserWithRoles }) => {
    const [, startTransition] = useTransition();
    const path = usePathname();

    return (
        <div className="mt-2">
            <div className="mt-2">
                {assignableRoles
                    .filter((role) => !user.roles.includes(role))
                    .map((role) => (
                        <Badge
                            pill
                            bg="success"
                            key={user.username + '-' + role}
                            className="me-1 d-inline-flex align-items-center cursor-pointer"
                            style={{
                                height: '2rem',
                            }}
                            onClick={() => {
                                if (
                                    confirm(
                                        `Are you sure you want to add the role ${role} for user ${user.username}?`,
                                    )
                                ) {
                                    startTransition(async () => {
                                        await addRoleToUserAction(
                                            user.id,
                                            role,
                                            path,
                                        );

                                        toast.success(
                                            `Succesfully added role ${role} for user ${user.username}`,
                                        );
                                    });
                                }
                            }}
                        >
                            {role} +
                        </Badge>
                    ))}
            </div>
        </div>
    );
};
