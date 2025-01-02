import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import React from "react";
import { SectionWrapper } from "~app/[username]/wrapped/sections/section-wrapper";
import { SectionTitle } from "~app/[username]/wrapped/sections/section-title";
import { SectionBody } from "~app/[username]/wrapped/sections/section-body";

export const WrappedRunsAndPbs = ({
    wrapped,
}: {
    wrapped: WrappedWithData;
}) => {
    const pbPercentage = (wrapped.totalPbs / wrapped.totalFinishedRuns) * 100;

    return (
        <SectionWrapper>
            <SectionTitle
                title={"Here's some info about your PB's and finished runs!"}
                subtitle={`You finished ${wrapped.totalFinishedRuns} runs. ${
                    wrapped.totalPbs
                } - or ${pbPercentage.toFixed(2)}% - of them were a PB.`}
                extraRemark="We all know speedrunning is about records, not about having fun"
            />
            <SectionBody>
                {/*  Going to add info about PB's and finished runs here  */}
            </SectionBody>
        </SectionWrapper>
    );
};
