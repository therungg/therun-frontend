'use client';

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import styles from './runs-pagination.module.scss';

interface RunsPaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

function getPageNumbers(
    page: number,
    totalPages: number,
): (number | 'ellipsis')[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [1];

    if (page > 3) pages.push('ellipsis');

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (page < totalPages - 2) pages.push('ellipsis');

    if (totalPages > 1) pages.push(totalPages);

    return pages;
}

export function RunsPagination({
    page,
    totalPages,
    onPageChange,
}: RunsPaginationProps) {
    if (totalPages <= 1) return null;

    const pages = getPageNumbers(page, totalPages);

    return (
        <nav className={styles.pagination} aria-label="Pagination">
            <button
                type="button"
                className={`${styles.pageBtn} ${styles.navBtn}`}
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                aria-label="Previous page"
            >
                <FiChevronLeft size={14} /> <span>Prev</span>
            </button>

            {pages.map((item, idx) =>
                item === 'ellipsis' ? (
                    <span
                        key={`ellipsis-${idx}`}
                        className={styles.ellipsis}
                        aria-hidden="true"
                    >
                        ...
                    </span>
                ) : (
                    <button
                        key={item}
                        type="button"
                        className={`${styles.pageBtn}${item === page ? ` ${styles.active}` : ''}`}
                        onClick={() => onPageChange(item)}
                        aria-label={`Page ${item}`}
                        aria-current={item === page ? 'page' : undefined}
                    >
                        {item}
                    </button>
                ),
            )}

            <button
                type="button"
                className={`${styles.pageBtn} ${styles.navBtn}`}
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                aria-label="Next page"
            >
                <span>Next</span> <FiChevronRight size={14} />
            </button>
        </nav>
    );
}
