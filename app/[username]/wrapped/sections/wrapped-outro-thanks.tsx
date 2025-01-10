import { memo, useRef } from "react";
import { WrappedWithData } from "../wrapped-types";
import { SectionBody } from "./section-body";
import { SectionTitle } from "./section-title";
import { SectionWrapper } from "./section-wrapper";
// import { useHeartsAnimation } from "../use-hearts-animation.hook";
import styles from "../hearts.module.scss";

interface WrappedOutroThanksProps {
    wrapped: WrappedWithData;
}

export const WrappedOutroThanks = memo<WrappedOutroThanksProps>(
    ({ wrapped }) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const heartRef = useRef<HTMLDivElement>(null);
        // useHeartsAnimation({
        //     containerRef,
        //     heartRef,
        //     shouldShowHearts: true,
        // });
        return (
            <SectionWrapper>
                <SectionTitle title="That's a wrap on 2024!" />
                <SectionBody ref={heartRef}>
                    <div
                        ref={containerRef}
                        className={`w-75 align-items-center p-8 rounded-lg shadow-md ${styles.heartbeatContainer}`}
                    >
                        I'll fix this tomorrow {wrapped.year}
                    </div>
                </SectionBody>
            </SectionWrapper>
        );
    },
);
WrappedOutroThanks.displayName = "WrappedOutroThanks";
