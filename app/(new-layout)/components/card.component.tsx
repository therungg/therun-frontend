import clsx from 'clsx';
import Image from 'next/image';
import { FC, HTMLAttributes, PropsWithChildren } from 'react';
import { IconType } from 'react-icons';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    Icon?: IconType;
}

export const Card: FC<PropsWithChildren<CardProps>> = ({
    Icon,
    children,
    ...props
}) => {
    return (
        <div
            {...props}
            className={clsx(
                'border rounded-3 px-2 py-2 d-flex',
                props.className,
            )}
        >
            {Icon && (
                <div
                    style={{
                        width: 70,
                        position: 'relative',
                        minWidth: 60,
                    }}
                >
                    <Icon className="mb-1 ms-1" />
                </div>
            )}
            <div className="ms-1 me-2 w-100 text-nowrap">{children}</div>
        </div>
    );
};
