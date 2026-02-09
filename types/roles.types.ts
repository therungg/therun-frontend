import { Role } from './session.types';

export const manageableRoles: Role[] = [
    'admin',
    'role-admin',
    'race-admin',
    'event-admin',
    'event-creator',
];

export const assignableRoles: ManageableRole[] = [
    'race-admin',
    'event-admin',
    'event-creator',
];

export type ManageableRole = (typeof manageableRoles)[number];

export interface RoleEntity {
    id: number;
    name: ManageableRole;
    description: string;
}
