'use client';
import Script from 'next/script';
import React from 'react';

export const Scripts = () => {
    return (
        <Script id="initialize=colorscheme">
            {`document.documentElement.dataset.bsTheme = window.localStorage.getItem("theme") || "light";`}
        </Script>
    );
};
