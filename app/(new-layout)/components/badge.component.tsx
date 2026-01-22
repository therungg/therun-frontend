import clsx from 'clsx';
import type { FC, HTMLAttributes } from 'react';
import styles from './styles/badge.component.module.scss';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'primary' | 'info' | 'secondary';
    children: React.ReactNode;
}

export const Badge: FC<BadgeProps> = ({
    variant = 'default',
    children,
    className,
    ...props
}) => {
    return (
        <span
            {...props}
            className={clsx(
                styles.badge,
                styles[`badge-${variant}`],
                className,
            )}
        >
            {children}
        </span>
    );
};
