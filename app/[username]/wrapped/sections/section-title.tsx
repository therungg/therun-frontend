import React, { PropsWithChildren } from "react";
import { Row } from "react-bootstrap";

export const SectionTitle: React.FC<PropsWithChildren> = ({ children }) => {
    return (
        <Row className="mt-5">
            <h2>{children}</h2>
        </Row>
    );
};
