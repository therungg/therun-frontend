"use client";
import Script from "next/script";
import { GoogleAnalytics } from "nextjs-google-analytics";
import React from "react";

export const Scripts = () => {
    return (
        <>
            <GoogleAnalytics
                trackPageViews={true}
                gaMeasurementId={process.env.ANALYTICS_MEASUREMENT_ID}
            />

            <Script id="initialize=colorscheme">
                {`document.documentElement.dataset.bsTheme = window.localStorage.getItem("theme") || "light";`}
            </Script>
        </>
    );
};
