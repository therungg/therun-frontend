'use client';

import { FormEvent, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { RoleAssignment } from '../../../../types/role-assignments.types';
import styles from '../admin.module.scss';
import { assignGlobalAdminAction } from './actions/assign-global-admin.action';
import { revokeRoleAssignmentAction } from './actions/revoke-role-assignment.action';

interface Props {
    globalAdmins: RoleAssignment[];
}

export const RoleAssignmentsClient = ({ globalAdmins }: Props) => {
    const [username, setUsername] = useState('');
    const [isSubmitting, startSubmit] = useTransition();
    const [isRevoking, startRevoke] = useTransition();

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const value = username.trim();
        if (!value) return;

        startSubmit(async () => {
            try {
                const res = await assignGlobalAdminAction(value);
                toast.success(`Granted global-admin to ${res.username}`);
                setUsername('');
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : 'Failed to assign global-admin',
                );
            }
        });
    };

    const handleRevoke = (assignment: RoleAssignment) => {
        if (
            !confirm(
                `Revoke global-admin assignment #${assignment.id} (userId ${assignment.userId})?`,
            )
        ) {
            return;
        }
        startRevoke(async () => {
            try {
                await revokeRoleAssignmentAction(assignment.id);
                toast.success('Assignment revoked');
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : 'Failed to revoke',
                );
            }
        });
    };

    return (
        <div className={styles.page} style={{ maxWidth: '720px' }}>
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h4 className={styles.panelTitle}>Grant global-admin</h4>
                </div>
                <div className={styles.panelBody}>
                    <p
                        className={styles.pageSubtitle}
                        style={{ marginBottom: '1.5rem' }}
                    >
                        Grants the new-system <code>global-admin</code> role.
                        Site-wide authority over every series, game, and
                        category.
                    </p>
                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label
                                htmlFor="username"
                                className={styles.formLabel}
                            >
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                className={styles.formInput}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Twitch username"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={isSubmitting || !username.trim()}
                        >
                            {isSubmitting
                                ? 'Granting...'
                                : 'Grant global-admin'}
                        </button>
                    </form>
                </div>
            </div>

            <div className={styles.panel} style={{ marginTop: '1.5rem' }}>
                <div className={styles.panelHeader}>
                    <h4 className={styles.panelTitle}>Current global-admins</h4>
                    <span className={styles.panelCount}>
                        {globalAdmins.length}
                    </span>
                </div>
                <div className={styles.panelBody}>
                    {globalAdmins.length === 0 ? (
                        <span className={styles.noData}>
                            No global-admin assignments yet.
                        </span>
                    ) : (
                        <table className={styles.table}>
                            <thead className={styles.tableHeader}>
                                <tr>
                                    <th>Assignment ID</th>
                                    <th>User ID</th>
                                    <th>Assigned By</th>
                                    <th>Created</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody className={styles.tableBody}>
                                {globalAdmins.map((a) => (
                                    <tr key={a.id}>
                                        <td>{a.id}</td>
                                        <td>{a.userId}</td>
                                        <td>{a.assignedBy ?? '—'}</td>
                                        <td>
                                            {new Date(
                                                a.createdAt,
                                            ).toLocaleString()}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className={styles.btnDanger}
                                                disabled={isRevoking}
                                                onClick={() => handleRevoke(a)}
                                            >
                                                Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
