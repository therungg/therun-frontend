import React from "react";
import { Button, ButtonProps } from "./Button";
import clsx from "clsx";

export interface IconButtonProps extends ButtonProps {
    icon: React.ReactNode;
    iconPosition?: "left" | "right";
}

export const IconButton: React.FC<React.PropsWithChildren<IconButtonProps>> = ({
    children,
    icon,
    iconPosition = "left",
    className,
    ...buttonProps
}) => {
    const flexDirection =
        iconPosition === "right" ? "flex-row-reverse" : "flex-row";
    const cls = clsx(
        className,
        "d-inline-flex",
        "justify-content-center",
        "align-items-center",
        "gap-1",
        flexDirection,
    );
    return (
        <Button className={cls} {...buttonProps}>
            <span>{icon}</span>
            {children}
        </Button>
    );
};
