import { PanelConfig } from './frontpage-config.types';
import { Role } from './session.types';

export interface User {
    id: number;
    username: string;
    frontpageConfig: PanelConfig | null;
}

export type UserWithRoles = User & { roles: Role[] };
