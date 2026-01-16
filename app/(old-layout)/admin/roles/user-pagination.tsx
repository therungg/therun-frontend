'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { PaginatedData } from '~src/components/pagination/pagination.types';
import { UserWithRoles } from '../../../../types/users.types';

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
        <div className="d-flex justify-content-between mt-3">
            <button
                className="btn btn-primary"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
            >
                Previous
            </button>
            <div>
                Page {currentPage} of {totalPages}
            </div>
            <button
                className="btn btn-primary"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
            >
                Next
            </button>
        </div>
    );
};
