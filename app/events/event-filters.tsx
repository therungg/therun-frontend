"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FC, PropsWithChildren, useState } from "react";
import { Form } from "react-bootstrap";
import { eventTierShortNames } from "types/events.types";

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
    return (
        <aside>
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
        <div className="mb-3" key={categoryKey}>
            <h5 className="fw-bold">
                <FilterCategory category={categoryKey} />
            </h5>
            {values.length > VIEW_MORE_THRESHOLD && (
                <Form.Group className="mb-1">
                    <Form.Control
                        size="sm"
                        type="text"
                        id={categoryKey}
                        placeholder={`Search ${categoryKey}`}
                        value={search}
                        className="w-75"
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
        </div>
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

const DateFilter = () => {
    const searchParams = new URLSearchParams(useSearchParams());
    const router = useRouter();
    const categoryKey = "date";

    const values = {
        all: "All Events",
        upcoming: "Upcoming Events",
        current: "Current Events",
    };

    const existingFilter =
        searchParams.get("filter." + categoryKey) || "upcoming";

    return (
        <div className="mb-3" key="date">
            <h5 className="fw-bold">
                <FilterCategory category="Start Date" />
            </h5>
            <div className="cursor-pointer">
                {Object.entries(values).map(([key, value]) => {
                    const isChecked = existingFilter
                        ? existingFilter.split(",").includes(key)
                        : false;

                    return (
                        <Form.Check
                            className="cursor-pointer"
                            key={key}
                            type="radio"
                            label={
                                <span className="cursor-pointer">{value}</span>
                            }
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
            </div>
        </div>
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
    filterKey: string | number;
    filterValue: number;
}) => {
    switch (category) {
        case "tier":
            filterKey =
                eventTierShortNames[
                    filterKey as keyof typeof eventTierShortNames
                ] || filterKey;
            break;
        case "isOffline":
            filterKey = filterKey === "true" ? "Offline" : "Online";
            break;
        default:
            break;
    }

    return (
        <span className="cursor-pointer">
            {filterKey}{" "}
            <span className="mu text-muted fs-smaller">({filterValue})</span>
        </span>
    );
};
