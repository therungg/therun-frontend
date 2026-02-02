'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Pagination } from 'react-bootstrap';
import { PaginatedData } from '../pagination/pagination.types';

export function Paginate<T>({ data }: { data: PaginatedData<T> }) {
    return (
        <CustomPagination
            totalPages={data.totalPages}
            currentPage={data.page}
        />
    );
}

interface CustomPaginationProps {
    totalPages: number;
    currentPage: number;
}

const CustomPagination: React.FC<CustomPaginationProps> = ({
    totalPages,
    currentPage,
}) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const params = new URLSearchParams(searchParams.toString());
    const paginationItems = [];
    const maxPageNumbersToShow = 5;

    const getHref = (page: number) => {
        params.set('page', page.toString());

        return `${pathname}?${params.toString()}`;
    };

    if (totalPages <= maxPageNumbersToShow) {
        // Show all pages if total pages are small
        for (let page = 1; page <= totalPages; page++) {
            paginationItems.push(
                <Pagination.Item
                    key={page}
                    active={page === currentPage}
                    href={getHref(page)}
                >
                    {page}
                </Pagination.Item>,
            );
        }
    } else {
        const isAtStart = currentPage <= 3;
        const isAtEnd = currentPage >= totalPages - 2;
        const middlePages = Array.from(
            { length: 3 },
            (_, i) => currentPage - 1 + i,
        ).filter((page) => page > 1 && page < totalPages);

        // First page
        paginationItems.push(
            <Pagination.Item
                key={1}
                active={currentPage === 1}
                href={getHref(1)}
            >
                1
            </Pagination.Item>,
        );

        if (!isAtStart) {
            paginationItems.push(<Pagination.Ellipsis key="start-ellipsis" />);
        }

        middlePages.forEach((page) =>
            paginationItems.push(
                <Pagination.Item
                    key={page}
                    active={page === currentPage}
                    href={getHref(page)}
                >
                    {page}
                </Pagination.Item>,
            ),
        );

        if (!isAtEnd) {
            paginationItems.push(<Pagination.Ellipsis key="end-ellipsis" />);
        }

        // Last page
        paginationItems.push(
            <Pagination.Item
                key={totalPages}
                active={currentPage === totalPages}
                href={getHref(totalPages)}
            >
                {totalPages}
            </Pagination.Item>,
        );
    }

    return (
        <Pagination className="justify-content-center mt-4" size="lg">
            <Pagination.First disabled={currentPage === 1} href={getHref(1)} />
            <Pagination.Prev
                disabled={currentPage === 1}
                href={getHref(currentPage - 1)}
            />
            {paginationItems}
            <Pagination.Next
                disabled={currentPage === totalPages}
                href={getHref(currentPage + 1)}
            />
            <Pagination.Last
                disabled={currentPage === totalPages}
                href={getHref(totalPages)}
            />
        </Pagination>
    );
};
