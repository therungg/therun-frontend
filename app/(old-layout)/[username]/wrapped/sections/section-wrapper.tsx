import React, { PropsWithChildren } from "react";

export const SectionWrapper = React.forwardRef<
    HTMLDivElement,
    PropsWithChildren
>(({ children }, ref) => {
    return (
        <div
            ref={ref}
            className="d-flex flex-column h-100 w-100 py-5 row-gap-5"
        >
            {children}
        </div>
    );
});
SectionWrapper.displayName = "SectionWrapper";
