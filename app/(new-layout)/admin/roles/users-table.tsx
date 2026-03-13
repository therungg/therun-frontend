import { UserAddRole } from '~app/(new-layout)/admin/roles/user-add-role';
import { UserPagination } from '~app/(new-layout)/admin/roles/user-pagination';
import { UserSearch } from '~app/(new-layout)/admin/roles/user-search';
import { PaginatedData } from '~src/components/pagination/pagination.types';
import { RoleEntity } from '../../../../types/roles.types';
import { UserWithRoles } from '../../../../types/users.types';
import styles from '../admin.module.scss';
import { UserRoleBadges } from './user-role-badges';
import { UserRoleFilter } from './user-role-filter';

export const UsersTable = ({
    userPagination,
    searchQuery = '',
    roles,
}: {
    userPagination: PaginatedData<UserWithRoles>;
    searchQuery: string;
    roles: RoleEntity[];
}) => {
    const users = userPagination.items;

    return (
        <div className={styles.pageWide}>
            <h1 className={styles.pageTitle}>User Roles</h1>
            <UserSearch searchQuery={searchQuery} />
            <UserRoleFilter roles={roles} />
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h4 className={styles.panelTitle}>User List</h4>
                    <span className={styles.panelCount}>
                        {userPagination.totalItems} Users
                    </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                        <thead className={styles.tableHeader}>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Roles</th>
                                <th>Add Role</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tableBody}>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td style={{ fontWeight: 600 }}>
                                        {user.username}
                                    </td>
                                    <td>
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

            <UserPagination userPagination={userPagination} />
        </div>
    );
};
