import React from "react";
import { clsx } from "clsx";

type ButtonVariant =
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark"
    | "link";
interface ButtonProps {
    variant?: ButtonVariant;
    onClick: () => void;
    className?: string;
}

export const Button: React.FC<React.PropsWithChildren<ButtonProps>> = ({
    children,
    variant = "primary",
    onClick,
    className,
}) => {
    const classes = clsx("btn", `btn-${variant}`, className);
    return (
        <button className={classes} onClick={onClick}>
            {children}
        </button>
    );
};
