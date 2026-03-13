import { CSSProperties, memo } from 'react';
import { UseCountUpProps } from 'react-countup/build/useCountUp';
import { WrappedCounter } from '../wrapped-counter';

interface SectionStatsCardProps {
    stat: number;
    statDescription: React.ReactNode;
    statFormatter?: UseCountUpProps['formattingFn'];
    style?: CSSProperties;
}

export const SectionStatsCard = memo<SectionStatsCardProps>(
    ({ stat, statDescription, statFormatter, style }) => {
        return (
            <div className="d-flex flex-column">
                <h4 className="h-100 flex-center h4 fw-normal mb-2">
                    <div>{statDescription}</div>
                </h4>
                <div className="flex-center bg-body-secondary bg-opacity-50 mb-3 game-border border-2 border-secondary py-4 rounded-3">
                    <span className="display-4 fw-semibold">
                        <WrappedCounter
                            id="total-runs-count"
                            end={stat}
                            formattingFn={statFormatter}
                            style={style}
                        />
                    </span>
                </div>
            </div>
        );
    },
);
SectionStatsCard.displayName = 'SectionStatsCard';
