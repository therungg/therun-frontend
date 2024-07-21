"use client";
import { GoogleAnalytics } from "nextjs-google-analytics";
import React from "react";

export const Scripts = () => {
    return (
        <>
            <GoogleAnalytics
                trackPageViews={true}
                gaMeasurementId={process.env.ANALYTICS_MEASUREMENT_ID}
            />
        </>
    );
};
