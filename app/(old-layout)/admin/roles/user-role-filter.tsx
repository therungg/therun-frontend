'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { RoleEntity } from '../../../../types/roles.types';

interface RolesDropdownProps {
    roles: RoleEntity[];
}

export const UserRoleFilter: React.FC<RolesDropdownProps> = ({ roles }) => {
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const router = useRouter();

    const handleRoleChange = (role: string) => {
        setSelectedRole(role);
        router.push(`/admin/roles?role=${role}`);
    };

    return (
        <div className="mb-3">
            <select
                className="form-select"
                value={selectedRole || ''}
                onChange={(e) => handleRoleChange(e.target.value)}
            >
                <option value="">Filter by Role</option>
                {roles.map((role) => (
                    <option key={role.name} value={role.name}>
                        {role.name}
                    </option>
                ))}
            </select>
        </div>
    );
};
