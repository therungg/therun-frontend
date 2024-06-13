"use client";

// eslint-disable-next-line import/named
import { useFormStatus } from "react-dom";
import { Button, ButtonProps } from "react-bootstrap";
import { ButtonVariant } from "react-bootstrap/types";

export interface SubmitButtonProps extends ButtonProps {
    innerText: string;
    pendingText: string;
    variant?: ButtonVariant;
}

export const SubmitButton = ({
    innerText,
    pendingText,
    variant = "primary",
    ...buttonProps
}: SubmitButtonProps) => {
    const { pending } = useFormStatus();
    return (
        <Button
            disabled={pending}
            type="submit"
            variant={variant}
            {...buttonProps}
        >
            {!pending ? innerText : pendingText}
        </Button>
    );
};
