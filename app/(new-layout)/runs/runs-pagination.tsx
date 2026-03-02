'use client';

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import styles from './runs-pagination.module.scss';

interface RunsPaginationProps {
    page: number;
    hasMore: boolean;
    onPageChange: (page: number) => void;
}

export function RunsPagination({
    page,
    hasMore,
    onPageChange,
}: RunsPaginationProps) {
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

            <span className={styles.pageIndicator}>Page {page}</span>

            <button
                type="button"
                className={`${styles.pageBtn} ${styles.navBtn}`}
                disabled={!hasMore}
                onClick={() => onPageChange(page + 1)}
                aria-label="Next page"
            >
                <span>Next</span> <FiChevronRight size={14} />
            </button>
        </nav>
    );
}
