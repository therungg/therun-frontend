import clsx from 'clsx';
import Image from 'next/image';
import { FC, HTMLAttributes, PropsWithChildren } from 'react';

interface CardWithImageProps extends HTMLAttributes<HTMLDivElement> {
    imageUrl: string;
    imageAlt: string;
    imageWidth?: number;
    imageHeight?: number;
}

export const CardWithImage: FC<PropsWithChildren<CardWithImageProps>> = ({
    imageUrl,
    imageAlt,
    imageWidth = 60,
    imageHeight = 70,
    children,
    ...props
}) => {
    imageUrl =
        imageUrl && imageUrl !== 'noimage'
            ? imageUrl
            : `/logo_dark_theme_no_text_transparent.png`;
    return (
        <div
            {...props}
            className={clsx(
                'border rounded-3 px-2 py-2 d-flex',
                props.className,
            )}
        >
            <div
                style={{
                    width: imageWidth,
                    height: imageHeight,
                    position: 'relative',
                    minWidth: imageWidth - 10,
                    minHeight: imageHeight,
                    borderRadius: 10,
                    overflow: 'hidden',
                }}
            >
                <Image
                    src={imageUrl}
                    fill
                    style={{
                        objectFit: 'cover',
                    }}
                    alt={imageAlt}
                    className="w-100"
                />
            </div>
            <div className="ms-3 me-2 w-100 text-nowrap">{children}</div>
        </div>
    );
};
