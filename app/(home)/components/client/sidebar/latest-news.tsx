"use client";

import { Card } from "react-bootstrap";
import { ArrowUpRight, Newspaper, QuestionCircle } from "react-bootstrap-icons";
import GoldSplitFeed from "../../gold-split-feed";
import Link from "next/link";
import { Button } from "~src/components/Button/Button";

export const LatestNewsSection = () => (
    <Card.Body>
        <div className="d-flex align-items-center gap-2 mb-4">
            <Newspaper className="text-primary" size={20} />
            <h2 className="fs-5 fw-semibold text-light opacity-90 mb-0 d-flex align-items-center gap-2">
                Latest News
                <Link
                    href="/news/about"
                    className="d-inline-flex align-items-center text-decoration-none opacity-75 hover-opacity-100"
                >
                    <QuestionCircle size={16} className="me-1" />
                    <span style={{ fontSize: "0.8rem" }}>What is this?</span>
                </Link>
            </h2>
        </div>
        <div className="d-flex flex-column gap-4">
            <GoldSplitFeed />
        </div>
        <div className="d-flex justify-content-end">
            <Link href="/news">
                <Button variant="link" className="text-light opacity-70 small">
                    View all <ArrowUpRight />
                </Button>
            </Link>
        </div>
    </Card.Body>
);
