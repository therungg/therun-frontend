'use server';

import { UsersTable } from '~app/(old-layout)/admin/roles/users-table';
import { getSession } from '~src/actions/session.action';
import { getAllRoles } from '~src/lib/roles';
import { getPaginatedUsers } from '~src/lib/users';
import { confirmPermission } from '~src/rbac/confirm-permission';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function RolesPage(props: { searchParams: SearchParams }) {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'roles');

    const searchParams = await props.searchParams;

    const page = Number(searchParams.page) || 1;
    const searchQuery = (searchParams.search as string) || '';
    const role = (searchParams.role as string) || '';

    const users = await getPaginatedUsers(page, 10, searchQuery, role, user.id);
    const roles = await getAllRoles(user.id);

    return (
        <>
            <UsersTable
                userPagination={users}
                searchQuery={searchQuery}
                roles={roles}
            />
        </>
    );
}
