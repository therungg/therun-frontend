import React, { PropsWithChildren } from "react";

export const SectionBody = React.forwardRef<HTMLDivElement, PropsWithChildren>(
    ({ children }, ref) => {
        return (
            <div
                ref={ref}
                className="d-flex flex-column flex-grow-1 align-items-center justify-content-center pt-4"
            >
                {children}
            </div>
        );
    },
);
SectionBody.displayName = "SectionBody";
