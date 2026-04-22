'use client';

import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import React, { useEffect } from 'react';
import { Bounce, ToastContainer, toast } from 'react-toastify';

export const Content: React.FunctionComponent<React.PropsWithChildren> = ({
    children,
}) => {
    const { systemTheme, resolvedTheme } = useTheme();
    const query = useSearchParams();

    const prefix = systemTheme === 'light' ? '/lightmode' : '';

    useEffect(() => {
        if (query.has('toast')) {
            const type = query.has('toastType')
                ? (query.get('toastType') as 'success' | 'error')
                : 'success';

            toast[type](query.get('toast'));
        }
    }, [query.get('toast')]);

    return (
        <div className="my-4 pb-5 main-container container">
            <link rel="icon" href={`${prefix}/favicon.ico`} />
            <link
                rel="apple-touch-icon"
                sizes="180x180"
                href={`${prefix}/apple-touch-icon.png`}
            />
            <link
                rel="icon"
                type="image/png"
                sizes="32x32"
                href={`${prefix}/favicon-32x32.png`}
            />
            <link
                rel="icon"
                type="image/png"
                sizes="16x16"
                href={`${prefix}/favicon-16x16.png`}
            />
            <link
                rel="mask-icon"
                href="/safari-pinned-tab.svg"
                color="#5bbad5"
            />
            <ToastContainer
                position="top-center"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                draggable
                pauseOnHover
                transition={Bounce}
                theme={resolvedTheme || 'dark'}
            />
            {children}
        </div>
    );
};
