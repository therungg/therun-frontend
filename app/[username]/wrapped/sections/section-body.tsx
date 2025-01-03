import { FC, PropsWithChildren } from "react";

export const SectionBody: FC<PropsWithChildren> = ({ children }) => {
    return (
        <div className="d-flex flex-column flex-grow-1 justify-content-center mt-4">
            {children}
        </div>
    );
};
