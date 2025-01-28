"use client";

import { useFormStatus } from "react-dom";
import { Button, ButtonProps } from "~src/components/Button/Button";

export interface SubmitButtonProps extends ButtonProps {
    innerText: string;
    pendingText: string;
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
