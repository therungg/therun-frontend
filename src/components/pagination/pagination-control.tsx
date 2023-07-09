import React, { useContext } from "react";
import { PaginationContext } from "~src/components/pagination/pagination.context";
import paginationStyles from "~src/components/css/Pagination.module.scss";
import { Pagination } from "react-bootstrap";
import { PaginationHook } from "~src/components/pagination/pagination.types";

export default function PaginationControl<T>({
    totalItems,
    totalPages,
    page,
}: PaginationHook<T>) {
    const { setCurrentPage } = useContext(PaginationContext);

    const onPaginationClick = (event): void => {
        let target = "";

        if (event.target.text) {
            target = event.target.text;
        } else if (event.target.innerHTML) {
            target = event.target.innerHTML;
        }

        if (!target) return;

        if (target.includes("«")) {
            setCurrentPage(1);
        } else if (target.includes("‹")) {
            setCurrentPage(page == 1 ? 1 : page - 1);
        } else if (target.includes("›")) {
            setCurrentPage(page == totalPages ? totalPages : page + 1);
        } else if (target.includes("»")) {
            setCurrentPage(totalPages);
        } else {
            if (parseInt(target)) setCurrentPage(parseInt(target));
        }
    };

    return (
        <div>
            <div className={paginationStyles.paginationWrapper}>
                <Pagination onClick={onPaginationClick} size="lg">
                    {buildItems(page, totalPages)}
                </Pagination>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
                Showing {(page - 1) * 10 + 1} -{" "}
                {page * 10 < totalPages ? page * 10 : totalPages} out of{" "}
                {totalItems}
            </div>
        </div>
    );
}

export const buildItems = (active: number, last: number) => {
    const items = [
        <Pagination.First key="first" />,
        <Pagination.Prev key="prev" />,
    ];

    if (active > 3) {
        items.push(<Pagination.Ellipsis />);
    }

    const begin = active < 4 ? 1 : active > last - 2 ? last - 4 : active - 2;
    const end = active > last - 2 ? last + 1 : begin + 5;

    for (let number = begin; number < end; number++) {
        items.push(
            <Pagination.Item
                className={paginationStyles.optional}
                key={number}
                active={number == active}
            >
                {number}
            </Pagination.Item>
        );
    }

    if (active < last - 2) {
        items.push(<Pagination.Ellipsis />);
    }

    items.push(<Pagination.Next key={"next"} />);
    items.push(<Pagination.Last key={"last"} />);

    return items;
};
