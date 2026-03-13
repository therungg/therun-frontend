import React, { ReactNode } from 'react';
import { Row } from 'react-bootstrap';

interface SectionTitleProps {
    title: ReactNode;
    subtitle?: ReactNode;
    extraRemark?: ReactNode;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
    title,
    subtitle = null,
    extraRemark = null,
}) => {
    return (
        <Row>
            <h2 className="display-4">{title}</h2>
            {subtitle && <h3 className="fw-light fs-3">{subtitle}</h3>}
            {extraRemark && (
                <p className="mt-1 mb-0 opacity-50 fs-5">
                    <span className="">{extraRemark}</span>
                </p>
            )}
        </Row>
    );
};
