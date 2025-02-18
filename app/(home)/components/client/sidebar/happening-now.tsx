"use client";

import { Card } from "react-bootstrap";
import { Calendar } from "react-bootstrap-icons";

export default function HappeningNowSection() {
    return (
        <Card.Body>
            <div className="d-flex align-items-center gap-2 mb-4">
                <Calendar />
                <h2 className="fs-5 fw-semibold text-light opacity-90 mb-0">
                    Happening Now
                </h2>
            </div>
            <div className="d-flex flex-column gap-4"></div>
        </Card.Body>
    );
}
