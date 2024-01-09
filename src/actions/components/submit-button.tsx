"use client";

// eslint-disable-next-line import/named
import { useFormStatus } from "react-dom";
import { Button } from "react-bootstrap";
import { ButtonVariant } from "react-bootstrap/types";

export interface SubmitButtonProps {
    innerText: string;
    pendingText: string;
    variant?: ButtonVariant;
}

export const SubmitButton = ({
    innerText,
    pendingText,
    variant = "primary",
}: SubmitButtonProps) => {
    const { pending } = useFormStatus();
    return (
        <Button disabled={pending} type={"submit"} variant={variant}>
            {!pending ? innerText : pendingText}
        </Button>
    );
};
