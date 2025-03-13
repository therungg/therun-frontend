import { UserWithRoles } from "../../../types/users.types";
import { PaginatedData } from "~src/components/pagination/pagination.types";
import { UserSearch } from "~app/admin/roles/user-search";
import { UserPagination } from "~app/admin/roles/user-pagination";
import { RoleEntity } from "../../../types/roles.types";
import { UserRoleFilter } from "./user-role-filter";
import { UserRoleBadges } from "./user-role-badges";
import { UserAddRole } from "~app/admin/roles/user-add-role";

export const UsersTable = ({
    userPagination,
    searchQuery = "",
    roles,
}: {
    userPagination: PaginatedData<UserWithRoles>;
    searchQuery: string;
    roles: RoleEntity[];
}) => {
    const users = userPagination.items;

    return (
        <div className="container mt-5">
            <UserSearch searchQuery={searchQuery} />
            <UserRoleFilter roles={roles} />
            <div className="card shadow-sm border-0">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">User List</h4>
                    <span>{userPagination.totalItems} Users</span>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Roles</th>
                                    <th>Add Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="align-middle">
                                            {user.id}
                                        </td>
                                        <td className="align-middle fw-bold">
                                            {user.username}
                                        </td>
                                        <td className="align-middle">
                                            <UserRoleBadges user={user} />
                                        </td>
                                        <td>
                                            <UserAddRole user={user} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <UserPagination userPagination={userPagination} />
        </div>
    );
};
