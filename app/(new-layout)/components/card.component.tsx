import clsx from 'clsx';
import Image from 'next/image';
import type { FC, HTMLAttributes, PropsWithChildren } from 'react';
import type { IconType } from 'react-icons';
import styles from './styles/card.component.module.scss';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    Icon?: IconType;
    interactive?: boolean;
}

export const Card: FC<PropsWithChildren<CardProps>> = ({
    Icon,
    children,
    interactive = false,
    ...props
}) => {
    return (
        <div
            {...props}
            className={clsx(
                'border rounded-3 px-2 py-2 d-flex',
                interactive && styles.card,
                props.className,
            )}
        >
            {Icon && (
                <div className={styles.cardIconWrapper}>
                    <Icon className="mb-1 ms-1" />
                </div>
            )}
            <div className="ms-1 me-2 w-100 text-nowrap">{children}</div>
        </div>
    );
};
