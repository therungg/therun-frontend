import { Col } from "react-bootstrap";
import { WrappedCounter } from "../wrapped-counter";
import { memo } from "react";

interface SectionStatsCardProps {
    stat: number;
    statDescription: React.ReactNode;
}
export const SectionStatsCard = memo<SectionStatsCardProps>(
    ({ stat, statDescription }) => {
        return (
            <Col>
                <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-4 py-5 rounded-3">
                    <span className="display-1 fw-semibold text-decoration-underline">
                        <WrappedCounter id="total-runs-count" end={stat} />
                    </span>
                </div>
                <div className="flex-center h4">
                    <div>{statDescription}</div>
                </div>
            </Col>
        );
    },
);
SectionStatsCard.displayName = "SectionStatsCard";
