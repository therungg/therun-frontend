"use client";
import { Card, Col, Container, Row } from "react-bootstrap";
import type { ReactNode } from "react";
import React from "react";
import { ArrowUpRight, Icon } from "react-bootstrap-icons";
import Link from "next/link";

export const HomeLayout = ({ children }: { children: ReactNode }) => {
    return (
        <div>
            <Container fluid className="py-4">
                <Row className="py-4 g-4">{children}</Row>
            </Container>
        </div>
    );
};

export const MainContainer = ({ children }: { children: ReactNode }) => (
    <Col lg={9}>
        <div className="d-flex flex-column gap-4">{children}</div>
    </Col>
);

export const SidebarContainer = ({ children }: { children: ReactNode }) => (
    <>
        {/* On lg and up, this will be visible */}
        <Col lg={3} className="d-none d-lg-block order-2">
            <div className="sticky-top" style={{ top: "1.5rem" }}>
                <Card className="bg-dark bg-opacity-50 border-light border-opacity-10">
                    <div
                        className="overflow-auto"
                        style={{ maxHeight: "calc(100vh - 8rem)" }}
                    >
                        {children}
                    </div>
                </Card>
            </div>
        </Col>

        {/* On mobile, children will render directly in the flow */}
        <div className="d-lg-none w-100">
            {React.Children.map(children, (child, index) => (
                <Col xs={12} className={`order-${index + 2}`}>
                    <Card className="bg-dark bg-opacity-50 border-light border-opacity-10 mb-4">
                        {child}
                    </Card>
                </Col>
            ))}
        </div>
    </>
);

interface ContentCardProps {
    title?: string;
    children: ReactNode;
    callToActionText?: string;
    callToActionHref?: string;
    callToActionIcon?: Icon;
    className?: string;
    scrollable?: boolean;
    maxHeight?: string | number;
    contentClassName?: string;
}

export const ContentCard = ({
    title,
    children,
    callToActionText,
    callToActionHref,
    callToActionIcon: CallToActionIcon = ArrowUpRight,
    className = "h-100",
    scrollable = false,
    maxHeight = "400px",
    contentClassName = "",
}: ContentCardProps) => (
    <Card
        className={`bg-dark bg-opacity-50 border-light border-opacity-10 ${className}`}
    >
        <Card.Body className="d-flex flex-column">
            {title && (
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-light opacity-90 fs-2 mb-0">{title}</h2>
                    {callToActionText && callToActionHref && (
                        <Link href={callToActionHref}>
                            <span className="me-1">{callToActionText}</span>
                            <CallToActionIcon size={16} />
                        </Link>
                    )}
                </div>
            )}
            <div
                className={`flex-grow-1 ${contentClassName}`}
                style={
                    scrollable
                        ? {
                              maxHeight,
                              overflowY: "auto",
                              overflowX: "hidden",
                              paddingRight: "8px",
                              marginRight: "-8px",
                          }
                        : undefined
                }
            >
                {children}
            </div>
        </Card.Body>
    </Card>
);
