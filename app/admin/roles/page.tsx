"use server";

import { getPaginatedUsers } from "~src/lib/users";
import { UsersTable } from "~app/admin/roles/users-table";
import { getAllRoles } from "~src/lib/roles";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { getSession } from "~src/actions/session.action";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function RolesPage(props: { searchParams: SearchParams }) {
    const user = await getSession();
    confirmPermission(user, "moderate", "roles");

    const searchParams = await props.searchParams;

    const page = Number(searchParams.page) || 1;
    const searchQuery = (searchParams.search as string) || "";
    const role = (searchParams.role as string) || "";

    const users = await getPaginatedUsers(page, 10, searchQuery, role);
    const roles = await getAllRoles();

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
