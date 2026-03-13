import { memo, useRef } from 'react';
import { CountUpProps, useCountUp } from 'react-countup';

interface WrappedCounterProps extends CountUpProps {
    id: string;
    end: number;
}
export const WrappedCounter = memo<WrappedCounterProps>(
    ({ end, duration, formattingFn, style }) => {
        const countRef = useRef(null);
        useCountUp({
            ref: countRef,
            end,
            enableScrollSpy: true,
            scrollSpyOnce: true,
            duration: duration ?? 4,
            formattingFn,
        });
        return (
            <span
                ref={countRef}
                className="counter-align-text-top"
                style={style}
            />
        );
    },
);
WrappedCounter.displayName = 'WrappedCounter';
