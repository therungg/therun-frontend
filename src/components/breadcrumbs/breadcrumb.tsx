"use client";

import { Breadcrumb as BootstrapBreadCrumb } from "react-bootstrap";

export interface BreadcrumbItem {
    href?: string;
    content: string;
}

export const Breadcrumb = ({
    breadcrumbs,
}: {
    breadcrumbs: BreadcrumbItem[];
}) => {
    return (
        <BootstrapBreadCrumb>
            {breadcrumbs.map((breadcrumb, i) => {
                const href = breadcrumb.href || "#";
                return (
                    <BootstrapBreadCrumb.Item
                        active={i + 1 === breadcrumbs.length}
                        key={breadcrumb.content}
                        href={href}
                    >
                        {breadcrumb.content}
                    </BootstrapBreadCrumb.Item>
                );
            })}
        </BootstrapBreadCrumb>
    );
};
