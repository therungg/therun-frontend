import { InferSelectModel } from 'drizzle-orm';
import { roles } from '~src/db/schema';
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
export type RoleEntity = InferSelectModel<typeof roles> & {
    name: ManageableRole;
};
