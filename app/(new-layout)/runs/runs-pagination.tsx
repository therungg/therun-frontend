'use client';

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { PAGE_SIZE_OPTIONS } from './runs-explorer';
import styles from './runs-pagination.module.scss';

interface RunsPaginationProps {
    page: number;
    totalPages: number;
    totalCount: number;
    itemCount: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
}

function getPageNumbers(
    page: number,
    totalPages: number,
): (number | 'ellipsis')[] {
    // Always show first, last, current, and neighbors of current.
    // Fill gaps with ellipsis.
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
    ) {
        pages.add(i);
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const result: (number | 'ellipsis')[] = [];

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
            result.push('ellipsis');
        }
        result.push(sorted[i]);
    }

    return result;
}

function formatCount(n: number): string {
    return n.toLocaleString('en-US');
}

export function RunsPagination({
    page,
    totalPages,
    totalCount,
    itemCount,
    limit,
    onPageChange,
    onLimitChange,
}: RunsPaginationProps) {
    const pageNumbers = getPageNumbers(page, totalPages);

    return (
        <nav className={styles.pagination} aria-label="Pagination">
            <span className={styles.summary}>
                Showing {formatCount(itemCount)} of {formatCount(totalCount)}{' '}
                runs
            </span>

            <div className={styles.controls}>
                <button
                    type="button"
                    className={`${styles.pageBtn} ${styles.navBtn}`}
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    aria-label="Previous page"
                >
                    <FiChevronLeft size={14} />{' '}
                    <span className={styles.navLabel}>Prev</span>
                </button>

                <div className={styles.pageNumbers}>
                    {pageNumbers.map((item, i) =>
                        item === 'ellipsis' ? (
                            <span
                                key={`ellipsis-${i}`}
                                className={styles.ellipsis}
                            >
                                &hellip;
                            </span>
                        ) : (
                            <button
                                key={item}
                                type="button"
                                className={`${styles.pageBtn}${item === page ? ` ${styles.active}` : ''}`}
                                onClick={() => onPageChange(item)}
                                aria-label={`Page ${item}`}
                                aria-current={
                                    item === page ? 'page' : undefined
                                }
                            >
                                {item}
                            </button>
                        ),
                    )}
                </div>

                <button
                    type="button"
                    className={`${styles.pageBtn} ${styles.navBtn}`}
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    aria-label="Next page"
                >
                    <span className={styles.navLabel}>Next</span>{' '}
                    <FiChevronRight size={14} />
                </button>
            </div>

            <div className={styles.sizeSelector}>
                {PAGE_SIZE_OPTIONS.map((size) => (
                    <button
                        key={size}
                        type="button"
                        className={`${styles.sizeBtn}${size === limit ? ` ${styles.sizeBtnActive}` : ''}`}
                        onClick={() => onLimitChange(size)}
                    >
                        {size}
                    </button>
                ))}
            </div>
        </nav>
    );
}
