import { memo } from "react";
import { CountUpProps, useCountUp } from "react-countup";

interface WrappedCounterProps extends CountUpProps {
    id: string;
    end: number;
}
export const WrappedCounter = memo<WrappedCounterProps>(
    ({ id, end, duration, formattingFn, style }) => {
        useCountUp({
            ref: id,
            end,
            enableScrollSpy: true,
            scrollSpyOnce: true,
            duration: duration ?? 4,
            formattingFn,
        });
        return <span style={style} id={id} />;
    },
);
WrappedCounter.displayName = "WrappedCounter";
