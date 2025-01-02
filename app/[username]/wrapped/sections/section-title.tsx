import React, { ReactNode } from "react";
import { Row } from "react-bootstrap";

type NodeOrString = ReactNode | string;

interface SectionTitleProps {
    title: NodeOrString;
    subtitle?: NodeOrString;
    extraRemark?: NodeOrString;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
    title,
    subtitle = null,
    extraRemark = null,
}) => {
    return (
        <Row className="mt-5">
            <h2 className="display-4">{title}</h2>
            {subtitle && <h3 className="display-6">{subtitle}</h3>}
            {extraRemark && (
                <p className="mt-1 opacity-50">
                    <span className="">{extraRemark}</span>
                </p>
            )}
        </Row>
    );
};
