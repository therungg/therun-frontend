"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FC, PropsWithChildren, ReactNode, useState } from "react";
import { Form, Button } from "react-bootstrap";
import { eventTierShortNames } from "types/events.types";
import { EventLocation } from "./event-location";
import styles from "./event.styles.module.css";
import clsx from "clsx";
import { FaFilter } from "react-icons/fa";

const VIEW_MORE_THRESHOLD = 5;

export interface FilterInput {
    filters: {
        [key: string]: {
            [key: string]: number;
        };
    };
}

export const EventFilters: FC<PropsWithChildren<FilterInput>> = ({
    filters,
}) => {
    const [showFilters, setShowFilters] = useState(false);

    return (
        <aside>
            <div className="d-block d-sm-none mb-3">
                <Button
                    variant="outline-primary"
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-100 color-text"
                >
                    {showFilters ? (
                        <span>
                            Hide Filters <FaFilter />
                        </span>
                    ) : (
                        <span>
                            Show Filters <FaFilter />
                        </span>
                    )}
                </Button>
            </div>
            <div className={`${showFilters ? "d-block" : "d-none"} d-sm-block`}>
                <DateFilter />
                {Object.entries(filters)
                    .sort(([a], [b]) => {
                        const order = [
                            "organizer",
                            "type",
                            "tier",
                            "isOffline",
                            "location",
                            "language",
                        ];
                        return order.indexOf(a) - order.indexOf(b);
                    })
                    .map(([categoryKey, innerObject]) => (
                        <Filter
                            key={categoryKey}
                            categoryKey={categoryKey}
                            innerObject={innerObject}
                        />
                    ))}
            </div>
        </aside>
    );
};

const Filter = ({
    categoryKey,
    innerObject,
}: {
    categoryKey: string;
    innerObject: { [key: string]: number };
}) => {
    const values = Object.entries(innerObject).map(([key, value]) => ({
        key,
        value,
    }));
    const [search, setSearch] = useState("");

    const filteredValues = values.filter(({ key }) =>
        key.toLowerCase().includes(search.toLowerCase()),
    );

    const allowViewMore = filteredValues.length > VIEW_MORE_THRESHOLD;

    const [viewMore, setViewMore] = useState(false);

    return (
        <FilterBody header={categoryKey}>
            {values.length > VIEW_MORE_THRESHOLD && (
                <Form.Group className="mb-1">
                    <Form.Control
                        size="sm"
                        type="text"
                        id={categoryKey}
                        placeholder={`Search ${categoryKey}`}
                        value={search}
                        className="w-sm-75"
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setViewMore(false);
                        }}
                    />
                </Form.Group>
            )}
            <div className="cursor-pointer">
                {filteredValues
                    .slice(0, VIEW_MORE_THRESHOLD)
                    .map(({ key, value }) => (
                        <EventFilter
                            key={key}
                            label={key}
                            categoryKey={categoryKey}
                            value={value}
                        />
                    ))}
                {allowViewMore && (
                    <div
                        className="text-primary cursor-pointer my-1"
                        onClick={() => setViewMore(!viewMore)}
                    >
                        {viewMore
                            ? `Show less ▲`
                            : `Show ${
                                  filteredValues.length - VIEW_MORE_THRESHOLD
                              } more ▼`}
                    </div>
                )}
                {viewMore &&
                    filteredValues
                        .slice(-(filteredValues.length - VIEW_MORE_THRESHOLD))
                        .map(({ key, value }) => (
                            <EventFilter
                                key={key}
                                label={key}
                                categoryKey={categoryKey}
                                value={value}
                            />
                        ))}
            </div>
        </FilterBody>
    );
};

const EventFilter = ({
    categoryKey,
    label,
    value,
}: {
    categoryKey: string;
    label: string;
    value: number;
}) => {
    const searchParams = new URLSearchParams(useSearchParams());
    const router = useRouter();

    const categoryKeyValue = `${categoryKey}-${label}`;
    const existingFilter = searchParams.get("filter." + categoryKey);
    const isChecked = existingFilter
        ? existingFilter.split(",").includes(label)
        : false;
    return (
        <Form.Check
            className="cursor-pointer"
            key={categoryKeyValue}
            type="checkbox"
            id={categoryKeyValue}
            label={
                <FilterValue
                    category={categoryKey}
                    filterKey={label}
                    filterValue={value}
                />
            }
            checked={isChecked}
            onChange={() => {
                const params = changeFilter(searchParams, categoryKey, label);
                router.push(`?${params.toString()}`);
            }}
        />
    );
};

const FilterBody: FC<PropsWithChildren<{ header: string }>> = ({
    children,
    header,
}) => {
    const [hidden, setHidden] = useState(false);

    return (
        <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1 w-75">
                <h5 className="fw-bold">
                    <FilterCategory category={header} />
                </h5>
                <span
                    className="cursor-pointer text-muted w-sm-75"
                    onClick={() => setHidden(!hidden)}
                >
                    {hidden ? "▲" : "▼"}
                </span>
            </div>
            <hr
                className={clsx(
                    "mt-0 mb-2 ms-1 me-4",
                    styles["event-filter-divider"],
                )}
            />
            {!hidden && children}
        </div>
    );
};

const DateFilter = () => {
    const searchParams = new URLSearchParams(useSearchParams());
    const router = useRouter();
    const categoryKey = "date";

    const values = {
        all: "All Events",
        upcoming: "Upcoming Events",
        current: "Current Events",
    };

    const existingFilter = searchParams.get("filter." + categoryKey) || "all";

    return (
        <FilterBody header="Start Date">
            {Object.entries(values).map(([key, value]) => {
                const isChecked = existingFilter
                    ? existingFilter.split(",").includes(key)
                    : false;

                return (
                    <Form.Check
                        className="cursor-pointer"
                        key={key}
                        type="radio"
                        label={<span className="cursor-pointer">{value}</span>}
                        id={"date" + "-" + key}
                        name="date"
                        defaultChecked={isChecked}
                        onChange={() => {
                            const params = changeFilter(
                                searchParams,
                                categoryKey,
                                key,
                            );
                            router.push(`?${params.toString()}`);
                        }}
                    />
                );
            })}
        </FilterBody>
    );
};

const changeFilter = (
    params: URLSearchParams,
    category: string,
    key: string,
) => {
    category = "filter." + category;
    const currentCategoryFilter = params.get(category);
    if (currentCategoryFilter && category !== "filter.date") {
        const keyIsSet = currentCategoryFilter.split(",").includes(key);
        if (keyIsSet) {
            const newCategoryFilter = currentCategoryFilter
                .split(",")
                .filter((item) => item !== key)
                .join(",");
            if (newCategoryFilter) {
                params.set(category, newCategoryFilter);
            } else {
                params.delete(category);
            }
        } else {
            const newCategoryFilter = `${currentCategoryFilter},${key}`;
            params.set(category, newCategoryFilter);
        }
    } else {
        params.set(category, key);
    }

    return params;
};

const FilterCategory = ({ category }: { category: string }) => {
    if (category.toLowerCase() === "isoffline") {
        category = "Online/Offline";
    }

    return <span className="fw-bold text-capitalize">{category}</span>;
};

const FilterValue = ({
    category,
    filterKey,
    filterValue,
}: {
    category: string;
    filterKey: string | number | ReactNode;
    filterValue: number;
}) => {
    switch (category) {
        case "tier":
            filterKey =
                eventTierShortNames[
                    filterKey as keyof typeof eventTierShortNames
                ] || filterKey;
            break;
        case "location":
            filterKey = <EventLocation location={filterKey as string} />;
            break;
        case "isOffline":
            filterKey = filterKey === "true" ? "Offline" : "Online";
            break;
        default:
            break;
    }

    return (
        <span className={styles["event-filter"]}>
            {filterKey}{" "}
            <span
                className={clsx(
                    "text-muted fs-smaller",
                    styles["event-filter"],
                )}
            >
                ({filterValue})
            </span>
        </span>
    );
};
