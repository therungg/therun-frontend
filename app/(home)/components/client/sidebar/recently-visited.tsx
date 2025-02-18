"use client";

import { Card } from "react-bootstrap";
import { Clock } from "react-bootstrap-icons";

export default function RecentlyVisited() {
    return (
        <Card.Body>
            <div className="d-flex align-items-center gap-2 mb-4">
                <Clock className="text-warning" size={20} />
                <h2 className="fs-5 fw-semibold text-light opacity-90 mb-0">
                    Recently Visited
                </h2>
            </div>
            <div className="text-light opacity-70 small">
                <p className="mb-0">Nothing to see here.</p>
            </div>
        </Card.Body>
    );
}
