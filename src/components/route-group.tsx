"use client";
import { usePathname } from "next/navigation";
import React from "react";
import { ChevronRight, ChevronDown } from "react-bootstrap-icons";
import { RouteProps } from "./route";

interface RouteGroupProps {
    label: string;
    children:
        | React.ReactElement<RouteProps>
        | Array<React.ReactElement<RouteProps>>;
}

export const RouteGroup = React.memo<RouteGroupProps>(({ label, children }) => {
    const pathname = usePathname();
    const isDefaultOpen = React.useMemo(() => {
        return React.Children.toArray(children).some(
            (child) => (child?.props as RouteProps).path === pathname,
        );
    }, [children, pathname]);

    const [isOpen, setIsOpen] = React.useState(isDefaultOpen);
    const toggleOpen = () => setIsOpen(!isOpen);

    const childrenWithProps = React.useMemo(() => {
        // https://stackoverflow.com/a/32371612
        return React.Children.map(children, (child) => {
            // Checking isValidElement is the safe way and avoids type errors
            if (React.isValidElement(child)) {
                return React.cloneElement(child, { nested: true });
            }
            return child;
        });
    }, [children]);

    return (
        <li className="nav-link mb-1">
            <button
                className="btn d-inline-flex align-items-center rounded"
                onClick={toggleOpen}
                aria-expanded={isOpen}
            >
                {isOpen ? (
                    <ChevronDown
                        fill="currentcolor"
                        className="me-1"
                        size={18}
                    />
                ) : (
                    <ChevronRight
                        fill="currentcolor"
                        className="me-1"
                        size={18}
                    />
                )}
                {label}
            </button>
            <div className={isOpen ? `collapse show` : `collapse`}>
                <ul className="list-unstyled navbar-nav">
                    {childrenWithProps}
                </ul>
            </div>
        </li>
    );
});

RouteGroup.displayName = "RouteGroup";
