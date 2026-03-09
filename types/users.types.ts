import { FrontpageConfig } from './frontpage-config.types';
import { Role } from './session.types';

export interface User {
    id: number;
    username: string;
    frontpageConfig: FrontpageConfig | null;
}

export type UserWithRoles = User & { roles: Role[] };
