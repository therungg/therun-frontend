'use server';

import { PaginatedData } from '~src/components/pagination/pagination.types';
import { UserWithRoles } from '../../types/users.types';
import { apiFetch } from './api-client';

export async function getPaginatedUsers(
    page = 1,
    pageSize = 10,
    search = '',
    role = '',
    sessionId?: string,
): Promise<PaginatedData<UserWithRoles>> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    if (search) params.set('search', search);
    if (role) params.set('role', role);

    return apiFetch<PaginatedData<UserWithRoles>>(
        `/admin/users?${params.toString()}`,
        { sessionId },
    );
}
