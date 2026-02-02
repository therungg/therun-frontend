import React, { useContext } from 'react';
import { Pagination } from 'react-bootstrap';
import { PaginationContext } from '~src/components/pagination/pagination.context';
import { PaginationHook } from '~src/components/pagination/pagination.types';

export default function PaginationControl<T>({
    totalItems,
    totalPages,
    page,
    pageSize,
    minimalLayout = false,
}: PaginationHook<T> & { minimalLayout?: boolean }) {
    const { setCurrentPage } = useContext(PaginationContext);

    const onPaginationClick = (event): void => {
        let target = '';

        if (event.target.text) {
            target = event.target.text;
        } else if (event.target.innerHTML) {
            target = event.target.innerHTML;
        }

        if (!target) return;

        if (target.includes('«')) {
            setCurrentPage(1);
        } else if (target.includes('‹')) {
            setCurrentPage(page == 1 ? 1 : page - 1);
        } else if (target.includes('›')) {
            setCurrentPage(page == totalPages ? totalPages : page + 1);
        } else if (target.includes('»')) {
            setCurrentPage(totalPages);
        } else {
            if (parseInt(target)) setCurrentPage(parseInt(target));
        }
    };

    return (
        <>
            <Pagination
                className="w-100 justify-content-center"
                onClick={onPaginationClick}
                size="lg"
            >
                {buildItems(page, totalPages, minimalLayout)}
            </Pagination>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                Showing {(page - 1) * pageSize + 1} -{' '}
                {page * pageSize > totalItems ? totalItems : page * pageSize}{' '}
                out of {totalItems}
            </div>
        </>
    );
}

export const buildItems = (
    active: number,
    last: number,
    minimalLayout: boolean = false,
) => {
    const maxItems = minimalLayout ? 3 : 5;
    const middle = minimalLayout ? 2 : 3;

    const items = [
        <Pagination.First key="first" />,
        <Pagination.Prev key="prev" />,
    ];

    if (active > middle) {
        items.push(<Pagination.Ellipsis key="ellipsisOne" />);
    }

    const begin =
        active < maxItems - 1
            ? 1
            : active > last - (middle - 1)
              ? last - middle
              : active - (middle - 1);
    const end = active > last - (middle - 1) ? last + 1 : begin + maxItems;

    for (let number = begin; number < end; number++) {
        items.push(
            <Pagination.Item
                className="d-none d-md-block d-lg-none d-xxl-block"
                key={number}
                active={number == active}
            >
                {number}
            </Pagination.Item>,
        );
    }

    if (active < last - 2) {
        items.push(<Pagination.Ellipsis key="ellipsisTwo" />);
    }

    items.push(<Pagination.Next key="next" />);
    items.push(<Pagination.Last key="last" />);

    return items;
};
