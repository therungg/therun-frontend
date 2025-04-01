"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FC, PropsWithChildren } from "react";
import { Form } from "react-bootstrap";
import { eventTierShortNames } from "types/events.types";

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
    const searchParams = new URLSearchParams(useSearchParams());
    const router = useRouter();

    return (
        <aside>
            {Object.entries(filters)
                .sort(([a], [b]) => {
                    const order = [
                        "organizer",
                        "type",
                        "tier",
                        "location",
                        "language",
                    ];
                    return order.indexOf(a) - order.indexOf(b);
                })
                .map(([categoryKey, innerObject]) => {
                    const values = Object.entries(innerObject).map(
                        ([key, value]) => ({ key, value }),
                    );
                    return (
                        <div className="mb-3" key={categoryKey}>
                            <h5 className="fw-bold">
                                <FilterCategory category={categoryKey} />
                            </h5>
                            <div className="cursor-pointer">
                                {values.map(({ key, value }) => {
                                    const categoryKeyValue = `${categoryKey}-${key}`;
                                    const existingFilter = searchParams.get(
                                        "filter." + categoryKey,
                                    );
                                    const isChecked = existingFilter
                                        ? existingFilter
                                              .split(",")
                                              .includes(key)
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
                                                    filterKey={key}
                                                    filterValue={value}
                                                />
                                            }
                                            checked={isChecked}
                                            onChange={() => {
                                                const params = changeFilter(
                                                    searchParams,
                                                    categoryKey,
                                                    key,
                                                );
                                                console.log("PUSH 1");
                                                router.push(
                                                    `?${params.toString()}`,
                                                );
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
        </aside>
    );
};

const changeFilter = (
    params: URLSearchParams,
    category: string,
    key: string,
) => {
    category = "filter." + category;
    const currentCategoryFilter = params.get(category);
    if (currentCategoryFilter) {
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
