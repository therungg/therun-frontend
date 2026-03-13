'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { PaginatedData } from '~src/components/pagination/pagination.types';
import { UserWithRoles } from '../../../../types/users.types';
import styles from '../admin.module.scss';

export const UserPagination = ({
    userPagination,
}: {
    userPagination: PaginatedData<UserWithRoles>;
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentPage = userPagination.page;
    const totalPages = userPagination.totalPages;

    const handlePageChange = (page: number) => {
        router.push(
            `/admin/roles?page=${page}&search=${
                searchParams.get('search') || ''
            }&role=${searchParams.get('role') || ''}`,
        );
    };

    return (
        <div className={styles.pagination}>
            <button
                className={styles.btnOutline}
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
            >
                Previous
            </button>
            <span className={styles.paginationInfo}>
                Page {currentPage} of {totalPages}
            </span>
            <button
                className={styles.btnOutline}
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
            >
                Next
            </button>
        </div>
    );
};
