'use client';
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
import React from 'react';

export const Scripts = () => {
    return (
        <>
            <GoogleAnalytics gaId={process.env.ANALYTICS_MEASUREMENT_ID} />

            <Script id="initialize=colorscheme">
                {`document.documentElement.dataset.bsTheme = window.localStorage.getItem("theme") || "light";`}
            </Script>
        </>
    );
};
