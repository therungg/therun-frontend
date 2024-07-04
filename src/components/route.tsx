"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface RouteProps {
    path: string;
    label: string;
    nested?: boolean;
}

export const Route = React.memo<RouteProps>(
    ({ path, label, nested = false }) => {
        const pathname = usePathname();
        console.log({ path, pathname, nested });
        const isActive = React.useMemo(
            () => pathname == path,
            [pathname, path],
        );
        return (
            <li
                className={`ps-3 ${
                    nested ? "ms-3" : ""
                } d-inline-flex align-items-center rounded nav-item`}
            >
                <Link
                    className={
                        isActive
                            ? "link-primary fw-bold text-decoration-underline nav-link"
                            : "nav-link"
                    }
                    href={path}
                    passHref
                >
                    {label}
                </Link>
            </li>
        );
    },
);

Route.displayName = "Route";
