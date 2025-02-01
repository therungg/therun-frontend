import React from "react";
import { Button, ButtonProps } from "./Button";

export interface IconButtonProps extends ButtonProps {
    icon: React.ReactNode;
    iconPosition?: "left" | "right";
}

export const IconButton: React.FC<React.PropsWithChildren<IconButtonProps>> = ({
    children,
    icon,
    iconPosition = "left",
    ...buttonProps
}) => {
    return (
        <Button {...buttonProps}>
            {iconPosition === "left" && <span className="me-2">{icon}</span>}
            {children}
            {iconPosition === "right" && <span className="ms-2">{icon}</span>}
        </Button>
    );
};
