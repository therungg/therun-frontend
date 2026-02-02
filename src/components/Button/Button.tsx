import { clsx } from 'clsx';
import React from 'react';

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
    | 'light'
    | 'dark'
    | 'link';

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

export const Button: React.FC<React.PropsWithChildren<ButtonProps>> = ({
    children,
    variant = 'primary',
    onClick,
    className,
    type = 'button',
    ...props
}) => {
    const classes = clsx('btn', `btn-${variant}`, className);
    return (
        <button type={type} className={classes} onClick={onClick} {...props}>
            {children}
        </button>
    );
};
